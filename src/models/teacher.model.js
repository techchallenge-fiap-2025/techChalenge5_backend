const mongoose = require("mongoose");

const TeacherSchema = new mongoose.Schema(
  {
    //?Relacionamento com User Base
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    //?Turmas que o professor leciona
    turmas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Turma",
      },
    ],

    //?Materias que o professor leciona
    materias: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Materia",
      },
    ],

    //??Cursos extas criado pelo professor
    cursos: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Curso",
      },
    ],

    status: {
      type: String,
      enum: ["ativo", "afastado", "desligado"],
      default: "ativo",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Teacher", TeacherSchema);
