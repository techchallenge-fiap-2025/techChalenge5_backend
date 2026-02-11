const mongoose = require("mongoose");

const MaterialSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    descricao: {
      type: String,
    },
    status: {
      type: String,
      enum: ["ativa", "desativa"],
      default: "ativa",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Materia", MaterialSchema);
