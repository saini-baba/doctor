const { DataTypes } = require("sequelize");
const database = require("../db/db");

// User table with new fields
const User = database.db.define(
  "user",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("doctor", "patient", "admin"),
      allowNull: false,
    },

    verify: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    otp: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    doc_verification: {
      type: DataTypes.ENUM("verified", "under process", "rejected"),
      allowNull: false,
      defaultValue: "under process",
    },
  },
  {
    paranoid: true,
    timestamps: true,
  }
);

const User_Data = database.db.define(
  "user_data",
  {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    gender: {
      type: DataTypes.ENUM("Male", "Female", "Other"),
      allowNull: false,
    },
    location: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    paranoid: true,
    timestamps: true,
  }
);

const Disease = database.db.define(
  "disease",
  {
    doc_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    img: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "Accepted",
        "Confirmed",
        "Completed",
        "Cancelled",
        "Pending"
      ),
      allowNull: false,
    },
    appointment_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    slot_time: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // New columns
    prescription: {
      type: DataTypes.STRING,
      allowNull: true, // You can adjust this based on your needs
    },
    next_appointment_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    timestamps: true,
  }
);

// Cancel table remains the same
const Cancel = database.db.define(
  "cancel",
  {
    reason: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    doc_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    patient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    disease_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Disease,
        key: "id",
      },
    },
  },
  {
    paranoid: true,
    timestamps: true,
  }
);

const Slot = database.db.define(
  "slot",
  {
    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    slot: {
      type: DataTypes.JSON, // Use JSON to store array of slot strings
      allowNull: false,
    },
    day_off: {
      type: DataTypes.STRING, // Use JSON to store array of day names
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("available", "on leave"), // Fix ENUM values
      allowNull: false,
      defaultValue: "available",
    },
    leave_start_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    leave_end_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    available_time: {
      type: DataTypes.JSON, // Store start and end times as JSON
      allowNull: false,
    },
    lunch_time: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    fee: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM("Male", "Female", "Other"),
      allowNull: false,
    },
    location: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    experience: {
      type: DataTypes.FLOAT,
      allowNull: false, // Optional field
    },
    license_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    specialization: {
      type: DataTypes.ENUM(
        "Cosmetic dermatology",
        "Dermatopathology",
        "Mohs surgery",
        "Pediatric dermatology",
        "Immunodermatology",
        "Trichology"
      ),
      allowNull: false,
    },
  },
  {
    paranoid: true,
    timestamps: true,
  }
);

// Associations
User.hasMany(Disease, { foreignKey: "doc_id", as: "DoctorDiseases" });
User.hasMany(Disease, { foreignKey: "patient_id", as: "PatientDiseases" });

Disease.belongsTo(User, { foreignKey: "doc_id", as: "Doctor" });
Disease.belongsTo(User, { foreignKey: "patient_id", as: "Patient" });

User.hasMany(Cancel, { foreignKey: "doc_id", as: "CancelledByDoctor" });
User.hasMany(Cancel, { foreignKey: "patient_id", as: "CancelledByPatient" });

Disease.hasOne(Cancel, { foreignKey: "disease_id", as: "CancellationReason" });

Cancel.belongsTo(User, { foreignKey: "doc_id", as: "Doctor" });
Cancel.belongsTo(User, { foreignKey: "patient_id", as: "Patient" });
Cancel.belongsTo(Disease, { foreignKey: "disease_id", as: "Disease" });

// New Slot table associations
User.hasMany(Slot, { foreignKey: "doctor_id", as: "Slots" });
Slot.belongsTo(User, { foreignKey: "doctor_id", as: "Doctor" });

// Sync all tables
User.sync();
Disease.sync();
Cancel.sync();
Slot.sync();
User_Data.sync();

module.exports = { User, Disease, Cancel, Slot, User_Data };
