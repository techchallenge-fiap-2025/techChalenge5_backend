const mongoose = require("mongoose");

const ProgressoCursoSchema = new mongoose.Schema(
  {
    alunoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    cursoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Curso",
      required: true,
    },
    aulasConcluidas: [
      {
        cursoId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Curso",
        },
        capituloOrdem: {
          type: Number,
          required: true,
        },
        aulaOrdem: {
          type: Number,
          required: true,
        },
        tipo: {
          type: String,
          enum: ["video", "texto"],
          required: true,
        },
        dataConcluida: {
          type: Date,
          default: Date.now,
        },
        timestampVideo: {
          type: Number,
          default: 0,
        },
      },
    ],
    ultimaAulaVisualizada: {
      capituloOrdem: {
        type: Number,
      },
      aulaOrdem: {
        type: Number,
      },
    },
    status: {
      type: String,
      enum: ["em_andamento", "completo"],
      default: "em_andamento",
    },
    dataConclusao: {
      type: Date,
    },
    progressoPercentual: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Índice único para evitar duplicatas de progresso do mesmo aluno no mesmo curso
ProgressoCursoSchema.index({ alunoId: 1, cursoId: 1 }, { unique: true });

module.exports = mongoose.model("ProgressoCurso", ProgressoCursoSchema);
