const Joi = require("joi");
const bcrypt = require("bcrypt");
const { User, Disease ,Cancel} = require("../model/model");
const jwt = require("jsonwebtoken");
const { Op, Sequelize } = require("sequelize");
const { sendEmail } = require("../email/nodemailer");
const { sendEmailWithopt } = require("../email/nodemailer");
const crypto = require("crypto");

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
  specialization: Joi.optional(),
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

    const newUser = await User.create({
      name: name,
      password: hashedPassword,
      email: email,
      role: role,
      specialization: value.specialization || null,
    });

    res.status(200).json({ message: "user registered", user_id: newUser.id });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const foundUser = await User.findOne({ where: { email: email } });
    if (!foundUser) {
      return res.status(404).send("pls enter correct credentials");
    } else {
      if (!foundUser.verify) {
        return res.status(403).json({
          message: "account is not verified",
          user_id: foundUser.id,
        });
      }
      const passwordMatch = await bcrypt.compare(password, foundUser.password);
      if (!passwordMatch) {
        return res.status(404).send("pls enter correct credentials");
      }

      const userData = foundUser.toJSON();
      delete userData.password;

      const token = jwt.sign(userData, "top_secret_key", {
        expiresIn: "10h",
      });

      res.status(200).json({ token: token, role: userData.role });
    }
  } catch (error) {
    console.error("error:", error);
    res.status(500).send("Internal Server Error");
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
    const { doc_id, time } = req.body;
    const pa_id = req.user.id;
    const imgPaths = req.body.newpaths;
    console.log("controller", imgPaths);
    console.log("controller", req.body.newpaths);
    const disease = await Disease.create({
      doc_id: doc_id,
      patient_id: pa_id,
      img: imgPaths,
      status: "Accepted",
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
    const { status, date } = req.params;

    // Build the where condition dynamically
    const whereCondition = { doc_id: doctorId, status: status };

    // Apply date filter based on the status
    if (date) {
      if (status === "Accepted" || status === "Confirmed") {
        whereCondition.appointment_date = date;
      } else if (status === "Completed") {
        whereCondition.updatedAt = {
          [Op.between]: [
            new Date(date).setHours(0, 0, 0, 0),
            new Date(date).setHours(23, 59, 59, 999),
          ],
        };
      }
    }

    const diseases = await Disease.findAll({
      where: whereCondition,
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

exports.slot = async (req, res) => {
  try {
    const doc_id = req.user.id;
    const { date } = req.params;
    const allSlots = [
      "10:00 - 10:30",
      "10:30 - 11:00",
      "11:00 - 11:30",
      "11:30 - 12:00",
      "12:00 - 12:30",
      "12:30 - 01:00",
      "01:00 - 01:30",
      "02:30 - 03:00",
      "03:00 - 03:30",
      "03:30 - 04:00",
      "04:00 - 04:30",
    ];
    const takenSlotsData = await Disease.findAll({
      where: {
        appointment_date: date,
        doc_id: doc_id,
        status: "Confirmed",
      },
      attributes: ["slot_time"],
    });
    const takenSlots = takenSlotsData.map((disease) => disease.slot_time);
    const availableSlots = allSlots.filter(
      (slot) => !takenSlots.includes(slot)
    );
    res.status(200).send({
      availableSlots,
      message:
        availableSlots.length === 0
          ? "No available slots on this date"
          : undefined,
    });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.confirm = async (req, res) => {
  try {
    const { id, appointment_date } = req.body;
    const doc_id = req.user.id;

    if (!id || !doc_id) {
      return res.status(400).json({ error: "id and doc_id are required" });
    }

    const updateFields = { status: "Confirmed" };

    if (appointment_date) {
      updateFields.appointment_date = appointment_date;
    }

    const updatedRow = await Disease.update(updateFields, {
      where: {
        id,
        doc_id,
      },
    });

    if (updatedRow[0] === 0) {
      return res.status(404).json({
        error: "disease record not found",
      });
    }

    res.status(200).json({
      message: "appointment status updated",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.complete = async (req, res) => {
  try {
    const { id } = req.body;
    const doc_id = req.user.id;
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

exports.verify = async (req, res) => {
  const { user_id } = req.params;

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = jwt.sign({ userId: user.id }, "top_secret_key", {
      expiresIn: "10h",
    });

    const verifyUrl = `http://localhost:3001/user/${user.id}/verify/${token}`;
    await sendEmail(user.email, "Email Verification", verifyUrl);

    res.status(200).json({ message: "verification email sent" });
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.confirmVerification = async (req, res) => {
  const { user_id, token } = req.params;

  try {
    const decoded = jwt.verify(token, "top_secret_key");
    if (decoded.userId !== parseInt(user_id)) {
      return res.status(400).json({ message: "invalid token" });
    }

    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    user.verify = true;
    await user.save();

    res.status(200).json({ message: "email verified" });
  } catch (error) {
    console.error("error:", error);
    res.status(500).json({ message: "verification failed" });
  }
};

exports.verify_opt = async (req, res) => {
  const { user_id } = req.params;
  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const otp = crypto.randomInt(1000, 9999);
    user.otp = otp;
    await user.save();
    await sendEmailWithopt(user.email, "Email Verification", otp);
    res.status(200).json({ message: "verification email sent" });
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.verifyOtp = async (req, res) => {
  const { user_id, otp } = req.body;
  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    } else {
      const otpExpiryDuration = 5 * 60 * 1000;
      const otpExpired =
        new Date() - new Date(user.updatedAt) > otpExpiryDuration;

      if (user.otp !== parseInt(otp, 10) || otpExpired) {
        return res.status(400).json({ message: "Invalid or expired OTP" });
      } else {
        user.otp = null;
        user.verify = true;
        await user.save();
        res.status(200).json({ message: "Email verified successfully" });
      }
    }
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
