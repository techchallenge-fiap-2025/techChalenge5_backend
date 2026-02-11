const mongoose = require("mongoose");

const TurmaSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    anoLetivo: {
      type: Number,
      required: true,
    },
    periodo: {
      type: String,
      enum: ["manha", "tarde", "noite", "integral"],
      required: true,
    },
    nivelEducacional: {
      type: String,
      enum: ["maternal", "fundamental", "ensinoMedio"],
      required: true,
    },

    //?Aluno matriculados
    alunos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
      },
    ],

    //?Professores vinculados
    professores: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teacher",
      },
    ],

    //?Materias da Turma
    materias: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Materia",
      },
    ],
    status: {
      type: String,
      enum: ["ativa", "encerrada"],
      default: "ativa",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Turma", TurmaSchema);
