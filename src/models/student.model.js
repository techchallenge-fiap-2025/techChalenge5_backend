const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema(
  {
    //?Relacionamento com User Base
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    //?Turma do aluno
    turmaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Turma",
    },

    //?Responsaveirs Legais
    responsaveis: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Responsaveis",
      },
    ],

    //?Materias que o aluno cursa
    materias: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Materia",
      },
    ],

    //?Cursos extras / complementares
    cursos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Curso",
      },
    ],
    //?Status Academico
    status: {
      type: String,
      enum: ["ativo", "transferido", "formado" , "reprovado", "trancado"],
      default: "ativo",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", StudentSchema);
