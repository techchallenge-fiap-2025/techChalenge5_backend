const mongoose = require("mongoose");

const GradeSchema = new mongoose.Schema(
  {
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
    periodo: {
      type: String,
      required: true,
    },
    // Referências às notas de atividades (NotaAtividade)
    atividades: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NotaAtividade",
      },
    ],
    // Média final calculada (pode ser calculada automaticamente ou manualmente)
    mediaFinal: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
  },
  { timestamps: true }
);

// Índice único para evitar duplicatas de boletim do mesmo aluno na mesma matéria/turma/período
GradeSchema.index(
  { alunoId: 1, materiaId: 1, turmaId: 1, periodo: 1 },
  { unique: true }
);

module.exports = mongoose.model("Grade", GradeSchema);
