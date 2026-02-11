require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const User = require("../models/user.model.js");
const Attendance = require("../models/attendance.model.js");
const Teacher = require("../models/teacher.model.js");
const Student = require("../models/student.model.js");
const Turma = require("../models/turma.model.js");
const Materia = require("../models/materia.model.js");
const env = require("../config/env.js");

async function createAttendances() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    const attendancesExistentes = await Attendance.countDocuments();

    if (attendancesExistentes > 0) {
      console.log("💥 Presenças já existem");
      process.exit();
    }

    const professores = await Teacher.find().populate("userId", "name");
    const turmas = await Turma.find();
    const materias = await Materia.find();

    if (
      professores.length === 0 ||
      turmas.length === 0 ||
      materias.length === 0
    ) {
      console.log("❌ Crie professores, turmas e matérias primeiro!");
      process.exit(1);
    }

    const turma1A = turmas.find((t) => t.nome === "1º Ano A");
    const matematica = materias.find((m) => m.nome === "Matemática");
    const joao = professores.find((p) => p.userId.name === "João Silva");

    if (!turma1A || !matematica || !joao) {
      console.log("❌ Dados não encontrados!");
      process.exit(1);
    }

    const alunos = await Student.find({ turmaId: turma1A._id });

    if (alunos.length === 0) {
      console.log("❌ Nenhum aluno encontrado na turma!");
      process.exit(1);
    }

    // Criar presenças para algumas aulas
    const datas = [
      new Date("2024-03-11T08:00:00"), // Segunda-feira
      new Date("2024-03-12T08:00:00"), // Terça-feira
      new Date("2024-03-18T08:00:00"), // Segunda-feira seguinte
    ];

    for (const data of datas) {
      for (const aluno of alunos) {
        // Alguns alunos presentes, outros faltaram
        const presente = Math.random() > 0.2; // 80% de presença

        await Attendance.create({
          alunoId: aluno._id,
          professorId: joao._id,
          turmaId: turma1A._id,
          materiaId: matematica._id,
          data: data,
          presente: presente,
        });
      }
      console.log(`✅ Presenças criadas para ${data.toLocaleDateString()}`);
    }

    console.log(`✅ Presenças criadas com sucesso`);
    process.exit();
  } catch (error) {
    console.log("❌ Erro ao criar presenças:", error.message);
    process.exit(1);
  }
}

createAttendances();
