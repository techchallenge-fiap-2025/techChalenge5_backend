require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const User = require("../models/user.model.js");
const AulaSemanal = require("../models/aulaSemanal.model.js");
const Turma = require("../models/turma.model.js");
const Materia = require("../models/materia.model.js");
const Teacher = require("../models/teacher.model.js");
const env = require("../config/env.js");

async function createAulasSemanais() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    const aulasExistentes = await AulaSemanal.countDocuments();

    if (aulasExistentes > 0) {
      console.log("💥 Aulas semanais já existem");
      process.exit();
    }

    const turmas = await Turma.find();
    const materias = await Materia.find();
    const professores = await Teacher.find().populate("userId", "name");

    if (
      turmas.length === 0 ||
      materias.length === 0 ||
      professores.length === 0
    ) {
      console.log("❌ Crie turmas, matérias e professores primeiro!");
      process.exit(1);
    }

    const aulas = [
      {
        diaSemana: 1, // Segunda-feira
        horarioInicio: "08:00",
        horarioFim: "09:00",
        turmaNome: "1º Ano A",
        materiaNome: "Matemática",
        professorNome: "João Silva",
      },
      {
        diaSemana: 1,
        horarioInicio: "09:00",
        horarioFim: "10:00",
        turmaNome: "1º Ano A",
        materiaNome: "Português",
        professorNome: "Maria Santos",
      },
      {
        diaSemana: 2, // Terça-feira
        horarioInicio: "08:00",
        horarioFim: "09:00",
        turmaNome: "1º Ano A",
        materiaNome: "Física",
        professorNome: "Pedro Oliveira",
      },
      {
        diaSemana: 3, // Quarta-feira
        horarioInicio: "08:00",
        horarioFim: "09:00",
        turmaNome: "2º Ano A",
        materiaNome: "Matemática",
        professorNome: "João Silva",
      },
      {
        diaSemana: 3,
        horarioInicio: "09:00",
        horarioFim: "10:00",
        turmaNome: "2º Ano A",
        materiaNome: "Química",
        professorNome: "Ana Costa",
      },
      {
        diaSemana: 4, // Quinta-feira
        horarioInicio: "08:00",
        horarioFim: "09:00",
        turmaNome: "3º Ano A",
        materiaNome: "História",
        professorNome: "Carlos Mendes",
      },
    ];

    for (const aulaData of aulas) {
      const turma = turmas.find((t) => t.nome === aulaData.turmaNome);
      const materia = materias.find((m) => m.nome === aulaData.materiaNome);
      const professor = professores.find(
        (p) => p.userId.name === aulaData.professorNome
      );

      if (!turma || !materia || !professor) {
        console.log(
          `⚠️ Dados não encontrados para aula ${aulaData.materiaNome}, pulando...`
        );
        continue;
      }

      await AulaSemanal.create({
        diaSemana: aulaData.diaSemana,
        horarioInicio: aulaData.horarioInicio,
        horarioFim: aulaData.horarioFim,
        turmaId: turma._id,
        materiaId: materia._id,
        professorId: professor._id,
        status: "ativa",
      });

      console.log(
        `✅ Aula ${aulaData.materiaNome} - ${aulaData.turmaNome} criada`
      );
    }

    console.log(`✅ ${aulas.length} aulas semanais criadas com sucesso`);
    process.exit();
  } catch (error) {
    console.log("❌ Erro ao criar aulas semanais:", error.message);
    process.exit(1);
  }
}

createAulasSemanais();
