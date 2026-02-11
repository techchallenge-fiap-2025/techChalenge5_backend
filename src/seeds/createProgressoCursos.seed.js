require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const ProgressoCurso = require("../models/progressoCurso.model.js");
const Curso = require("../models/curso.model.js");
const Student = require("../models/student.model.js");
const env = require("../config/env.js");

async function createProgressoCursos() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    const progressosExistentes = await ProgressoCurso.countDocuments();

    if (progressosExistentes > 0) {
      console.log("💥 Progressos de cursos já existem");
      process.exit();
    }

    const cursos = await Curso.find();
    const alunos = await Student.find();

    if (cursos.length === 0 || alunos.length === 0) {
      console.log("❌ Crie cursos e alunos primeiro!");
      process.exit(1);
    }

    const cursoMatematica = cursos.find((c) => c.titulo.includes("Matemática"));

    if (!cursoMatematica) {
      console.log("❌ Curso de matemática não encontrado!");
      process.exit(1);
    }

    // Inscrever alguns alunos no curso
    for (let i = 0; i < Math.min(3, alunos.length); i++) {
      const aluno = alunos[i];

      // Adicionar aluno ao curso
      cursoMatematica.alunosInscritos.push(aluno._id);
      await cursoMatematica.save();

      // Adicionar curso ao aluno
      aluno.cursos.push(cursoMatematica._id);
      await aluno.save();

      // Criar progresso
      const progresso = await ProgressoCurso.create({
        alunoId: aluno._id,
        cursoId: cursoMatematica._id,
        videosAssistidos: [
          {
            cursoId: cursoMatematica._id,
            capituloOrdem: 1,
            aulaOrdem: 1,
            dataAssistida: new Date("2024-03-10"),
          },
        ],
        status: "em_andamento",
        progressoPercentual: 33, // 1 de 3 vídeos assistidos
      });

      console.log(`✅ Progresso criado para aluno ${aluno._id}`);
    }

    console.log(`✅ Progressos de cursos criados com sucesso`);
    process.exit();
  } catch (error) {
    console.log("❌ Erro ao criar progressos de cursos:", error.message);
    process.exit(1);
  }
}

createProgressoCursos();
