const { DataTypes } = require("sequelize");
const database = require("../db/db");

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
      type: DataTypes.ENUM("doctor", "patient"),
      allowNull: false,
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
      allowNull: true,
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
      validate: {
        isIn: [
          [
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
          ],
        ],
      },
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    paranoid: true,
    timestamps: true,
  }
);

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

// User associations
User.hasMany(Disease, { foreignKey: "doc_id", as: "Doctor" }); // For doctor
User.hasMany(Disease, { foreignKey: "patient_id", as: "Patient" }); // For patient

// Disease associations
Disease.belongsTo(User, { foreignKey: "doc_id", as: "Doctor" }); // For doctor
Disease.belongsTo(User, { foreignKey: "patient_id", as: "Patient" }); // For patient

User.hasMany(Cancel, { foreignKey: "doc_id", as: "CancelledByDoctor" });
User.hasMany(Cancel, { foreignKey: "patient_id", as: "CancelledByPatient" });
Disease.hasOne(Cancel, { foreignKey: "disease_id", as: "CancellationReason" });
Cancel.belongsTo(User, { foreignKey: "doc_id", as: "Doctor" });
Cancel.belongsTo(User, { foreignKey: "patient_id", as: "Patient" });
Cancel.belongsTo(Disease, { foreignKey: "disease_id", as: "Disease" });

User.sync();
Disease.sync();
Cancel.sync();

module.exports = { User, Disease, Cancel };
