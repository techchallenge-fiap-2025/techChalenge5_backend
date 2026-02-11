const mongoose = require("mongoose");

// Model para Atividade (Prova/Trabalho criado pelo professor)
const AtividadeSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    tipo: {
      type: String,
      enum: ["prova", "trabalho"],
      required: true,
    },
    tipoAtividade: {
      type: String,
      enum: ["PV1", "PV2", "PV3", "TB1", "TB2"],
      required: true,
    },
    data: {
      type: Date,
      required: true,
    },
    horarioInicio: {
      type: String, // Formato "HH:mm"
      required: true,
    },
    horarioFim: {
      type: String, // Formato "HH:mm"
      required: true,
    },
    professorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: true,
    },
    materiaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Materia",
      required: true,
    },
    turmaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Turma",
      required: true,
    },
    semestre: {
      type: String,
      enum: ["1", "2"],
      required: true,
    },
    status: {
      type: String,
      enum: ["ativa", "cancelada", "concluida"],
      default: "ativa",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Atividade", AtividadeSchema);
