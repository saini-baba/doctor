const Joi = require("joi");
const bcrypt = require("bcrypt");
const { User, Disease, Cancel, Slot, User_Data } = require("../model/model");
const jwt = require("jsonwebtoken");
const { Op, Sequelize } = require("sequelize");
const { sendEmail } = require("../email/nodemailer");
const { sendEmailWithopt } = require("../email/nodemailer");
const crypto = require("crypto");
const moment = require("moment");
const reg_schema = Joi.object({
  name: Joi.string()
    .pattern(/^(?:Dr\.?\s)?[A-Z][a-z]+\s[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/)
    .required()
    .messages({
      "string.pattern.base": "Please enter a valid full name",
      "any.required": "Name is required",
    }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please enter a valid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string()
    .pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character",
      "any.required": "Password is required",
    }),

  role: Joi.string().valid("doctor", "patient").required().messages({
    "any.only": "Role can be doctor or patient",
    "any.required": "Role is required",
  }),
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
      email: email,
      password: hashedPassword,
      role: role,
    });

    res.status(200).json({ message: "user registered", user_id: newUser.id });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const doc_data_schema = Joi.object({
  day_off: Joi.string()
    .valid(
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday"
    )
    .required()
    .messages({
      "any.only": "Day off must be one of the valid days of the week",
      "string.empty": "Day off cannot be empty",
      "any.required": "Day off is required",
    }),

  available_time: Joi.object({
    start: Joi.string().required().messages({
      "string.empty": "Start time is required for available time",
      "any.required": "Start time is required",
    }),
    end: Joi.string().required().messages({
      "string.empty": "End time is required for available time",
      "any.required": "End time is required",
    }),
  })
    .custom((value, helpers) => {
      const start = new Date(`1970-01-01T${value.start}`);
      const end = new Date(`1970-01-01T${value.end}`);

      if (end <= start) {
        return helpers.error("any.invalid", {
          message: "End time must be later than start time for available time",
        });
      }

      return value; // Valid case
    })
    .required()
    .messages({
      "any.required": "Available time is required",
      "any.invalid": "Invalid available time",
    }),

  lunch_time: Joi.object({
    start: Joi.string().required().messages({
      "string.empty": "Lunch start time is required",
      "any.required": "Lunch start time is required",
    }),
    end: Joi.string().required().messages({
      "string.empty": "Lunch end time is required",
      "any.required": "Lunch end time is required",
    }),
  })
    .custom((value, helpers) => {
      const start = new Date(`1970-01-01T${value.start}`);
      const end = new Date(`1970-01-01T${value.end}`);

      if (end <= start) {
        return helpers.error("any.invalid", {
          message: "End time must be later than start time for lunch time",
        });
      }

      return value; // Valid case
    })
    .required()
    .messages({
      "any.required": "Lunch time is required",
      "any.invalid": "Invalid lunch time",
    }),

  fee: Joi.number().positive().min(50).max(10000).required().messages({
    "number.base": "Fee must be a valid number",
    "number.positive": "Fee must be a positive number",
    "number.min": "Fee cannot be less than 50",
    "number.max": "Fee cannot exceed 10,000",
    "any.required": "Fee is required for doctors",
  }),

  gender: Joi.string().valid("Male", "Female", "Other").required().messages({
    "any.only": "Gender must be Male, Female, or Other",
    "string.empty": "Gender cannot be empty",
    "any.required": "Gender is required",
  }),

  location: Joi.object({
    city: Joi.string().min(2).max(50).required().messages({
      "string.empty": "City cannot be empty",
      "string.min": "City name must be at least 2 characters long",
      "string.max": "City name cannot exceed 50 characters",
      "any.required": "City is required",
    }),
    state: Joi.string()
      .valid(
        "Andhra Pradesh",
        "Arunachal Pradesh",
        "Assam",
        "Bihar",
        "Chhattisgarh",
        "Goa",
        "Gujarat",
        "Haryana",
        "Himachal Pradesh",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Madhya Pradesh",
        "Maharashtra",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Odisha",
        "Punjab",
        "Rajasthan",
        "Sikkim",
        "Tamil Nadu",
        "Telangana",
        "Tripura",
        "Uttar Pradesh",
        "Uttarakhand",
        "West Bengal",
        "Delhi",
        "Puducherry",
        "Chandigarh",
        "Andaman and Nicobar Islands",
        "Ladakh",
        "Lakshadweep",
        "Jammu and Kashmir"
      )
      .required()
      .messages({
        "any.only": "State must be a valid Indian state",
        "string.empty": "State cannot be empty",
        "any.required": "State is required",
      }),
  })
    .required()
    .messages({
      "any.required": "Location is required",
    }),

  age: Joi.number().integer().positive().min(25).max(70).required().messages({
    "number.base": "Age must be a valid number",
    "number.positive": "Please enter a valid age",
    "number.min": "Doctors must be at least 25 years old",
    "number.max": "Doctors cannot be older than 70 years",
    "any.required": "Age is required",
  }),

  experience: Joi.number().positive().min(0).max(50).required().messages({
    "number.base": "Experience must be a valid number",
    "number.positive": "Experience must be a positive number",
    "number.min": "Experience cannot be less than 0 years",
    "number.max": "Experience cannot exceed 50 years",
    "any.required": "Experience is required for doctors",
  }),

  license_number: Joi.string()
    .trim()
    .regex(/^[A-Za-z0-9-]{6,20}$/)
    .required()
    .messages({
      "string.empty": "License number cannot be empty",
      "string.pattern.base":
        "License number must be 6-20 characters long and may include letters, numbers, and hyphens",
      "any.required": "License number is required for doctors",
    }),

  specialization: Joi.string()
    .valid(
      "Cosmetic dermatology",
      "Dermatopathology",
      "Mohs surgery",
      "Pediatric dermatology",
      "Immunodermatology",
      "Trichology"
    )
    .required()
    .messages({
      "any.only": "Specialization must be one of the provided options",
      "string.empty": "Specialization cannot be empty",
      "any.required": "Specialization is required for doctors",
    }),
});

exports.doc_data = async (req, res) => {
  try {
    console.log(req.body);
    const { error, value } = doc_data_schema.validate(req.body);
    const doc_id = req.user.id;
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const {
      day_off,
      available_time,
      lunch_time,
      fee,
      gender,
      location,
      age,
      experience,
      license_number,
      specialization,
    } = value;

    const sameEmail = await Slot.findOne({ where: { doctor_id: doc_id } });
    if (sameEmail) {
      return res.status(400).send("user already exists");
    }
    const start = moment(available_time.start, "HH:mm");
    const end = moment(available_time.end, "HH:mm");
    const lunchStart = moment(lunch_time.start, "HH:mm");
    const lunchEnd = moment(lunch_time.end, "HH:mm");
    const slots = [];
    let current = start.clone();
    while (current.isBefore(end)) {
      const slotStart = current.clone();
      const slotEnd = current.clone().add(30, "minutes");
      if (slotEnd.isAfter(lunchStart) && slotStart.isBefore(lunchEnd)) {
        current.add(30, "minutes");
        continue;
      }
      slots.push(
        `${slotStart.format("hh:mm A")} - ${slotEnd.format("hh:mm A")}`
      );
      current.add(30, "minutes");
    }
    const newUser = await Slot.create({
      slot: slots,
      status: "available",
      day_off,
      fee,
      gender,
      location,
      age,
      experience,
      license_number,
      specialization,
      doctor_id: doc_id,
      available_time,
      lunch_time,
    });
    res.status(200).json({ message: "data added", user_id: newUser.id });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).send("Internal Server Error");
  }
};
const pat_data_schema = Joi.object({
  gender: Joi.string().valid("Male", "Female", "Other").required().messages({
    "any.only": "Gender must be Male, Female, or Other",
    "string.empty": "Gender cannot be empty",
    "any.required": "Gender is required",
  }),

  location: Joi.object({
    city: Joi.string().min(2).max(50).required().messages({
      "string.empty": "City cannot be empty",
      "string.min": "City name must be at least 2 characters long",
      "string.max": "City name cannot exceed 50 characters",
      "any.required": "City is required",
    }),
    state: Joi.string()
      .valid(
        "Andhra Pradesh",
        "Arunachal Pradesh",
        "Assam",
        "Bihar",
        "Chhattisgarh",
        "Goa",
        "Gujarat",
        "Haryana",
        "Himachal Pradesh",
        "Jharkhand",
        "Karnataka",
        "Kerala",
        "Madhya Pradesh",
        "Maharashtra",
        "Manipur",
        "Meghalaya",
        "Mizoram",
        "Nagaland",
        "Odisha",
        "Punjab",
        "Rajasthan",
        "Sikkim",
        "Tamil Nadu",
        "Telangana",
        "Tripura",
        "Uttar Pradesh",
        "Uttarakhand",
        "West Bengal",
        "Delhi",
        "Puducherry",
        "Chandigarh",
        "Andaman and Nicobar Islands",
        "Ladakh",
        "Lakshadweep",
        "Jammu and Kashmir"
      )
      .required()
      .messages({
        "any.only": "State must be a valid Indian state",
        "string.empty": "State cannot be empty",
        "any.required": "State is required",
      }),
  })
    .required()
    .messages({
      "any.required": "Location is required",
    }),

  age: Joi.number().integer().positive().min(1).max(110).required().messages({
    "number.base": "Age must be a valid number",
    "number.positive": "Please enter a valid age",
    "number.min": "Doctors must be at least 25 years old",
    "number.max": "Doctors cannot be older than 70 years",
    "any.required": "Age is required",
  }),
});

exports.patient_data = async (req, res) => {
  try {
    const { error, value } = pat_data_schema.validate(req.body);
    const pat_id = req.user.id;
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    const { gender, location, age } = value;

    const sameEmail = await User_Data.findOne({ where: { user_id: pat_id } });
    if (sameEmail) {
      return res.status(400).send("user already exists");
    }
    const newUser = await User_Data.create({
      gender,
      location,
      age,
      user_id: pat_id,
    });
    res.status(200).json({ message: "data added", user_id: newUser.id });
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
      return res.status(404).send("Please enter correct credentials.");
    } else {
      const passwordMatch = await bcrypt.compare(password, foundUser.password);
      if (!passwordMatch) {
        return res.status(404).send("Please enter correct credentials.");
      }
      if (!foundUser.verify) {
        return res.status(403).json({
          message: "Account is not verified.",
          user_id: foundUser.id,
        });
      }
      const userData = foundUser.toJSON();
      delete userData.password;
      let data = true;

      if (userData.role === "doctor") {
        const slotData = await Slot.findOne({
          where: { doctor_id: userData.id },
        });

        userData.data = !!slotData;
        const token = jwt.sign(userData, "top_secret_key", {
          expiresIn: "10h",
        });
        return res.status(200).json({
          token: token,
          role: userData.role,
          verification: userData.doc_verification,
          data: userData.data,
        });
      }
      if (userData.role === "patient") {
        const slotData = await User_Data.findOne({
          where: { user_id: userData.id },
        });
        userData.data = !!slotData;
        const token = jwt.sign(userData, "top_secret_key", {
          expiresIn: "10h",
        });
        return res.status(200).json({
          token: token,
          role: userData.role,
          data: userData.data,
        });
      }
      const token = jwt.sign(userData, "top_secret_key", {
        expiresIn: "10h",
      });
      res.status(200).json({
        token: token,
        role: userData.role,
      });
    }
  } catch (error) {
    console.error("Error:", error);
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

    const weekdayName = parsedDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    // Step 1: Get all confirmed appointments for the given date
    // Step 1: Fetch confirmed appointments
    const confirmedAppointments = await Disease.findAll({
      where: {
        status: "Confirmed",
        appointment_date: date,
      },
      attributes: ["doc_id", "slot_time"],
      raw: true, // Return plain JavaScript objects
    });

    // Step 2: Group confirmed appointments by `doc_id`
    const confirmedByDoctor = confirmedAppointments.reduce(
      (acc, appointment) => {
        if (!acc[appointment.doc_id]) {
          acc[appointment.doc_id] = new Set();
        }
        acc[appointment.doc_id].add(appointment.slot_time);
        return acc;
      },
      {}
    );

    // Step 3: Fetch all slots from the Slot table
    const slotEntries = await Slot.findAll({
      attributes: ["doctor_id", "slot", "day_off"],
      raw: true,
    });

    // Step 4: Filter out confirmed slots from available slots
    const availableSlots = slotEntries
      .map(({ doctor_id, slot, day_off }) => {
        const parsedSlots = JSON.parse(slot);
        if (day_off === weekdayName) return null;
        // Remove slots that are already confirmed for this doctor
        const filteredSlots = parsedSlots.filter((slotTime) => {
          return !(
            confirmedByDoctor[doctor_id] &&
            confirmedByDoctor[doctor_id].has(slotTime)
          );
        });

        // Only return doctors with available slots, else return null
        return filteredSlots.length > 0
          ? { doctor_id, availableSlots: filteredSlots }
          : null;
      })
      .filter(Boolean);
    // Step 6: Count available slots by doctor_id
    const doctorSlotCount = availableSlots.reduce(
      (acc, { doctor_id, availableSlots }) => {
        acc[doctor_id] = availableSlots.length;
        return acc;
      },
      {}
    );

    // Step 7: Fetch doctor data from `Slot` and `User` tables, filter by verification
    const doctorsData = await Slot.findAll({
      where: {
        doctor_id: Object.keys(doctorSlotCount),
      },
      attributes: [
        "doctor_id",
        "fee",
        "gender",
        "location",
        "age",
        "experience",
        "specialization",
      ],
      include: [
        {
          model: User,
          as: "Doctor",
          attributes: ["name", "email", "verify"],
          where: {
            verify: true, // Only include verified doctors
          },
        },
      ],
      raw: true,
      nest: true, // Ensures nested objects for `Doctor` data
    });

    // Step 8: Combine available slots with doctor data
    const result = doctorsData.map((doc) => ({
      doctor_id: doc.doctor_id,
      name: doc.Doctor.name,
      email: doc.Doctor.email,
      fee: doc.fee,
      gender: doc.gender,
      location: doc.location,
      age: doc.age,
      experience: doc.experience,
      specialization: doc.specialization,
      availableSlots: doctorSlotCount[doc.doctor_id] || 0, // Slot count
    }));
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.disease = async (req, res) => {
  try {
    const { doc_id, time, slot, description } = req.body;
    const pa_id = req.user.id;
    const imgPaths = req.body.newpaths;
    console.log("controller", imgPaths);
    console.log("controller", req.body.newpaths);
    const disease = await Disease.create({
      doc_id: doc_id,
      patient_id: pa_id,
      img: imgPaths,
      description: description,
      slot_time: slot,
      status: "Accepted",
      appointment_date: time,
    });
    res
      .status(201)
      .send({ message: "Appointment booked successfully", disease });
  } catch (error) {
    console.error("error", error);
    res.status(500).send({ error: "error:", error });
  }
};

exports.get_disease = async (req, res) => {
  try {
    const doctorId = req.user.id;
    const { status, date } = req.params;
    const whereCondition = { doc_id: doctorId, status: status };

    if (date) {
      if (["Accepted", "Confirmed", "Pending"].includes(status)) {
        whereCondition.appointment_date = date;
      } else if (["Completed", "Cancelled"].includes(status)) {
        whereCondition.updatedAt = {
          [Op.between]: [
            new Date(date).setHours(0, 0, 0, 0),
            new Date(date).setHours(23, 59, 59, 999),
          ],
        };
      }
    }

    console.log("Where Condition:", whereCondition);
    const includeOptions = [
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
      {
        model: Cancel,
        as: "CancellationReason", // Use the correct alias
        attributes: ["reason"],
        required: false, // Optional, only fetch if cancellation exists
      },
    ];

    const diseases = await Disease.findAll({
      where: whereCondition,
      include: includeOptions,
    });

    if (!diseases || diseases.length === 0) {
      return res.status(404).send({ message: "No appointment" });
    }

    res.status(200).send({ diseases });
  } catch (error) {
    console.error("Error fetching diseases:", error.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.all_dis = async (req, res) => {
  try {
    const patId = req.user.id;
    const { status, date } = req.params;
    const whereCondition = {
      patient_id: patId,
      status: status,
      createdAt: {
        [Op.between]: [
          new Date(date).setHours(0, 0, 0, 0),
          new Date(date).setHours(23, 59, 59, 999),
        ],
      },
    };

    // console.log("Where Condition:", whereCondition);
    const includeOptions = [
      {
        model: User,
        as: "Doctor",
        attributes: ["name"],
      },
      {
        model: Cancel,
        as: "CancellationReason",
        attributes: ["reason"],
        required: false,
      },
    ];

    const diseases = await Disease.findAll({
      where: whereCondition,
      include: includeOptions,
    });

    if (!diseases || diseases.length === 0) {
      return res.status(404).send({ message: "No appointment" });
    }

    res.status(200).send({ diseases });
  } catch (error) {
    console.error("Error fetching diseases:", error.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.cancel = async (req, res) => {
  try {
    const Id = req.user.id;
    const role = req.user.role;
    const { id, reason } = req.body;
    const disease = await Disease.findOne({
      where: {
        id: id,
        [role === "patient" ? "patient_id" : "doc_id"]: Id,
      },
    });

    console.log(disease);

    if (!disease) {
      return res.status(404).send({ message: "Disease not found" });
    }

    await disease.update({ status: "Cancelled" });
    let cancelReason;
    if (role === "doctor") {
      cancelReason = `Cancel reason by doctor: ${reason}`;
    } else {
      cancelReason = `Cancel reason by patient: ${reason}`;
    }

    await Cancel.create({
      reason: cancelReason,
      doc_id: disease.doc_id,
      patient_id: disease.patient_id,
      disease_id: disease.id,
    });
    res.status(200).send({
      message:
        "Disease status updated to Cancelled and cancellation reason recorded",
    });
  } catch (error) {
    console.error("Error fetching diseases:", error.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

exports.slot = async (req, res) => {
  try {
    const role = req.user.role;
    let doc_id;
    const { date, id } = req.params;
    if (role == "doctor") {
      doc_id = req.user.id;
    } else {
      doc_id = id;
    }

    const allSlots = await Slot.findOne({
      where: { doctor_id: doc_id },
      attributes: ["slot"],
    });

    if (!allSlots.slot) {
      return res
        .status(404)
        .json({ message: "No slots found for this doctor." });
    }
    if (!doc_id) {
      return res.status(400).send({ error: "Doctor ID is required" });
    }
    const takenSlotsData = await Disease.findAll({
      where: {
        appointment_date: date,
        doc_id: doc_id,
        status: "Confirmed",
      },
      attributes: ["slot_time"],
    });
    const takenSlots = takenSlotsData.map((disease) => disease.slot_time);
    const slots =
      typeof allSlots.slot === "string"
        ? JSON.parse(allSlots.slot)
        : allSlots.slot;
    const availableSlots = slots.filter((slot) => !takenSlots.includes(slot));
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
    const { id, slot } = req.body;
    const role = req.user.role;
    const user_id = req.user.id;
    console.log(id,slot);

    if (!id || !user_id) {
      return res.status(400).json({ error: "id and doc_id are required" });
    }

    const existingRecord = await Disease.findOne({
      where: {
        id,
        [role === "patient" ? "patient_id" : "doc_id"]: user_id,
      },
    });

    if (!existingRecord) {
      return res.status(404).json({
        error: "disease record not found",
      });
    }
    let updateFields;
    if (role === "doctor") {
      updateFields = {
        status: existingRecord.slot_time === slot ? "Confirmed" : "Pending",
        slot_time: slot,
      };
    } else {
      updateFields = {
        status: "Confirmed",
        slot_time: slot,
      };
    }

    const updatedRow = await Disease.update(updateFields, {
      where: {
        id,
        [role === "patient" ? "patient_id" : "doc_id"]: user_id,
      },
    });

    if (updatedRow[0] === 0) {
      return res.status(404).json({
        error: "Failed to update disease record",
      });
    }

    res.status(200).json({
      message: "Appointment status updated",
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.complete = async (req, res) => {
  try {
    const { id, prescription, next_appointment_date } = req.body;
    const doc_id = req.user.id;
    if (!id || !doc_id) {
      return res.status(400).json({ error: "id, doc_id are required" });
    }
    const updatedRow = await Disease.update(
      {
        prescription,
        next_appointment_date: next_appointment_date || null,
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
