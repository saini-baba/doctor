const Joi = require("joi");
const bcrypt = require("bcrypt");
const { User, Disease } = require("../model/model");
const jwt = require("jsonwebtoken");
const { Op, Sequelize } = require("sequelize");

const reg_schema = Joi.object({
  name: Joi.string()
    .pattern(/^(?:Dr\.?\s)?[A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/)
    .required()
    .messages({
      "string.pattern.base": "pls enter a valid fullname",
      "any.required": "name is required",
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "pls enter valid email",
      "any.required": "email is required",
    }),
  password: Joi.string()
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
    )
    .required()
    .messages({
      "string.pattern.base":
        "password must be at least of 8 characters and include an uppercase letter, lowercase letter, number, and special character",
      "any.required": "Password is required.",
    }),
  role: Joi.string().valid("doctor", "patient").required().messages({
    "any.only": "role can be doctor or patient",
    "any.required": "role is required",
  }),
  specialization: Joi.string().optional(),
});

exports.reg = async (req, res) => {
  try {
    const { error, value } = reg_schema.validate(req.body);
    console.log(req.body);
    console.log(reg_schema.validate(req.body));
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email, password, role } = value;

    const sameEmail = await User.findOne({ where: { email: email } });
    if (sameEmail) {
      return res.status(400).send("user already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name: name,
      password: hashedPassword,
      email: email,
      role: role,
      specialization: value.specialization || null,
    });

    res.status(200).send("user registered successfully");
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.params;

    const foundUser = await User.findOne({ where: { email: email } });
    if (!foundUser) {
      return res.status(404).send("pls enter correct credentials");
    } else {
      const passwordMatch = await bcrypt.compare(password, foundUser.password);
      if (!passwordMatch) {
        return res.status(404).send("pls enter correct credentials");
      }
      const userData = foundUser.toJSON();
      delete userData.password;
      const token = jwt.sign(userData, "top_secret_key", {
        expiresIn: "10h",
      });
      res.status(200).json(token);
    }
  } catch (error) {
    console.error("Error in login", error);
    res.status(500).send("pls enter correct credentials");
  }
};

exports.all_doc = async (req, res) => {
  try {
    const { date } = req.params; 

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const doctors = await User.findAll({
      where: { role: "doctor" },
      attributes: [
        "id",
        "name",
        "email",
        "specialization",
        [
          Sequelize.literal(
            `(SELECT COUNT(*) FROM diseases WHERE diseases.doc_id = user.id AND diseases.status = 'Confirmed' AND DATE(diseases.appointment_date) = '${date}')`
          ),
          "confirmedCount",
        ],
      ],
      having: Sequelize.where(Sequelize.literal("confirmedCount"), {
        [Op.lt]: 14, 
      }),
    });

    if (!doctors.length) {
      return res.status(404).json({ message: "no doctors" });
    }

    return res.status(200).json(doctors);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.disease = async (req, res) => {
  try {
    const { doc_id, pa_id, time, status } = req.body;
    const imgPaths = req.body.newpaths;
    console.log("controller", imgPaths);
    console.log("controller", req.body.newpaths);
    const disease = await Disease.create({
      doc_id: doc_id,
      patient_id: pa_id,
      img: imgPaths,
      status: status,
      appointment_date: time,
    });
    res.status(201).send({ message: "data added successfully", disease });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({ error: "error:", error });
  }
};

exports.get_disease = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const diseases = await Disease.findAll({
      where: { doc_id: doctorId },
      include: [
        {
          model: User,
          as: "Doctor",
          attributes: ["name"],
        },
        {
          model: User,
          as: "Patient",
          attributes: ["name"],
        },
      ],
    });

    if (!diseases || diseases.length === 0) {
      return res.status(404).send({ message: "No appointment" });
    }
    res.status(200).send({ diseases });
  } catch (error) {
    console.error("error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.confirm = async (req, res) => {
  try {
    const { id, appointment_date, doc_id } = req.body;
    if (!id || !appointment_date || !doc_id) {
      return res
        .status(400)
        .json({ error: "id, appointment_date, doc_id are required" });
    }
    const updatedRow = await Disease.update(
      {
        appointment_date: appointment_date,
        status: "Confirmed",
      },
      {
        where: {
          id,
          doc_id,
        },
      }
    );

    if (updatedRow === 0) {
      return res.status(404).json({
        error: "disease record not found or doc_id does not match",
      });
    }

    res.status(200).json({
      message: "appointment date updated and status updated",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.complete = async (req, res) => {
  try {
    const { id, doc_id } = req.body;
    if (!id || !doc_id) {
      return res.status(400).json({ error: "id, doc_id are required" });
    }
    const updatedRow = await Disease.update(
      {
        status: "Completed",
      },
      {
        where: {
          id,
          doc_id,
        },
      }
    );

    if (updatedRow === 0) {
      return res.status(404).json({
        error: "disease record not found or doc_id does not match",
      });
    }
    res.status(200).json({
      message: "status updated",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id, patient_id } = req.body;
    if (!id || !patient_id) {
      return res.status(400).json({ error: "id and patient_id are required" });
    }
    const deleted = await Disease.destroy({
      where: {
        id,
        patient_id,
      },
    });

    if (deleted === 0) {
      return res.status(404).json({
        error: "disease id or patient_id does not match",
      });
    }

    res.status(200).json({
      message: "disease record deleted",
    });
  } catch {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
