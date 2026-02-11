const mongoose = require("mongoose");

const AulaSemanalSchema = new mongoose.Schema(
  {
    diaSemana: {
      type: Number,
      required: true,
      min: 0,
      max: 6, // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    },
    horarioInicio: {
      type: String,
      required: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // Formato HH:MM
    },
    horarioFim: {
      type: String,
      required: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // Formato HH:MM
    },
    turmaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Turma",
      required: true,
    },
    materiaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Materia",
      required: true,
    },
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    status: {
      type: String,
      enum: ["ativa", "inativa"],
      default: "ativa",
    },
    semestre: {
      type: String,
      enum: ["1", "2"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("AulaSemanal", AulaSemanalSchema);
