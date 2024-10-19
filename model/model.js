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
      type: DataTypes.ENUM("Accepted", "Confirmed", "Completed"),
      allowNull: false,
    },
    appointment_date: {
      type: DataTypes.DATE,
      allowNull: false,
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


User.sync();
Disease.sync();

module.exports = { User, Disease };
