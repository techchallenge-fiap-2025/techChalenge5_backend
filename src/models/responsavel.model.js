const mongoose = require("mongoose");

const ResponsavelSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    cpf: {
      type: String,
      required: true,
      unique: true,
    },
    telefone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    parentesco: {
      type: String,
      enum: ["pai", "mãe", "avo", "irmao", "tutor", "outro"],
      required: true,
    },
    alunos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Responsaveis", ResponsavelSchema);
