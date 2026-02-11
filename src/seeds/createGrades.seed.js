require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const User = require("../models/user.model.js");
const Grade = require("../models/grade.model.js");
const Atividade = require("../models/atividade.model.js");
const Student = require("../models/student.model.js");
const Teacher = require("../models/teacher.model.js");
const Turma = require("../models/turma.model.js");
const Materia = require("../models/materia.model.js");
const env = require("../config/env.js");

async function createGrades() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    const gradesExistentes = await Grade.countDocuments();

    if (gradesExistentes > 0) {
      console.log("💥 Grades já existem");
      process.exit();
    }

    const alunos = await Student.find();
    const professores = await Teacher.find().populate("userId", "name");
    const turmas = await Turma.find();
    const materias = await Materia.find();

    if (
      alunos.length === 0 ||
      professores.length === 0 ||
      materias.length === 0
    ) {
      console.log("❌ Crie alunos, professores e matérias primeiro!");
      process.exit(1);
    }

    const matematica = materias.find((m) => m.nome === "Matemática");
    const portugues = materias.find((m) => m.nome === "Português");
    const joao = professores.find((p) => p.userId.name === "João Silva");
    const maria = professores.find((p) => p.userId.name === "Maria Santos");

    if (!matematica || !portugues || !joao || !maria) {
      console.log("❌ Professores ou matérias não encontrados!");
      process.exit(1);
    }

    const periodo = "2024-1";

    for (const aluno of alunos) {
      const turma = turmas.find(
        (t) => t._id.toString() === aluno.turmaId.toString()
      );

      // Grade de Matemática
      const gradeMatematica = await Grade.create({
        alunoId: aluno._id,
        professorId: joao._id,
        materiaId: matematica._id,
        turmaId: turma._id,
        periodo: periodo,
        provas: [],
        atividades: [],
      });

      // Criar atividades de Matemática
      const atividadesMatematica = [
        {
          nome: "Trabalho de Álgebra",
          tipo: "trabalho",
          valor: 8.5,
          data: new Date("2024-03-10"),
          alunoId: aluno._id,
          professorId: joao._id,
          materiaId: matematica._id,
          turmaId: turma._id,
          periodo: periodo,
        },
        {
          nome: "Trabalho de Geometria",
          tipo: "trabalho",
          valor: 7.0,
          data: new Date("2024-03-25"),
          alunoId: aluno._id,
          professorId: joao._id,
          materiaId: matematica._id,
          turmaId: turma._id,
          periodo: periodo,
        },
        {
          nome: "Atividade 1",
          tipo: "prova",
          valor: 9.0,
          data: new Date("2024-03-05"),
          alunoId: aluno._id,
          professorId: joao._id,
          materiaId: matematica._id,
          turmaId: turma._id,
          periodo: periodo,
        },
        {
          nome: "Atividade 2",
          tipo: "prova",
          valor: 8.0,
          data: new Date("2024-03-12"),
          alunoId: aluno._id,
          professorId: joao._id,
          materiaId: matematica._id,
          turmaId: turma._id,
          periodo: periodo,
        },
      ];

      for (const atividadeData of atividadesMatematica) {
        const atividade = await Atividade.create(atividadeData);
        gradeMatematica.atividades.push(atividade._id);
      }

      gradeMatematica.mediaFinal = 8.125;
      await gradeMatematica.save();

      // Grade de Português
      const gradePortugues = await Grade.create({
        alunoId: aluno._id,
        professorId: maria._id,
        materiaId: portugues._id,
        turmaId: turma._id,
        periodo: periodo,
        provas: [],
        atividades: [],
      });

      // Criar atividades de Português
      const atividadesPortugues = [
        {
          nome: "Redação",
          tipo: "trabalho",
          valor: 9.5,
          data: new Date("2024-03-15"),
          alunoId: aluno._id,
          professorId: maria._id,
          materiaId: portugues._id,
          turmaId: turma._id,
          periodo: periodo,
        },
        {
          nome: "Análise de Texto",
          tipo: "prova",
          valor: 8.5,
          data: new Date("2024-03-08"),
          alunoId: aluno._id,
          professorId: maria._id,
          materiaId: portugues._id,
          turmaId: turma._id,
          periodo: periodo,
        },
      ];

      for (const atividadeData of atividadesPortugues) {
        const atividade = await Atividade.create(atividadeData);
        gradePortugues.atividades.push(atividade._id);
      }

      gradePortugues.mediaFinal = 9.0;
      await gradePortugues.save();

      console.log(`✅ Grades criadas para aluno ${aluno._id}`);
    }

    console.log(`✅ Grades criadas com sucesso`);
    process.exit();
  } catch (error) {
    console.log("❌ Erro ao criar grades:", error.message);
    process.exit(1);
  }
}

createGrades();
