const mongoose = require("mongoose");

// Model para NotaAtividade (Notas dos alunos nas atividades)
const NotaAtividadeSchema = new mongoose.Schema(
  {
    valor: {
      type: Number,
      min: 0,
      max: 10,
    },
    alunoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
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
    atividadeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Atividade",
      required: true,
    },
    periodo: {
      type: String,
      required: true,
    },
    // Para tipo "prova": presente, faltou, pendente
    // Para tipo "trabalho": entregue, nao_entregue, pendente
    status: {
      type: String,
      enum: ["presente", "faltou", "entregue", "nao_entregue", "pendente"],
      default: "pendente",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NotaAtividade", NotaAtividadeSchema);
