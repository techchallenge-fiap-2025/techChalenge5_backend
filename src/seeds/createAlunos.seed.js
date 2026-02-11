require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model.js");
const Student = require("../models/student.model.js");
const Turma = require("../models/turma.model.js");
const Materia = require("../models/materia.model.js");
const TurmaModel = require("../models/turma.model.js");
const env = require("../config/env.js");

async function createAlunos() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    const alunosExistentes = await Student.countDocuments();

    if (alunosExistentes > 0) {
      console.log("💥 Alunos já existem");
      process.exit();
    }

    const turmas = await Turma.find();
    const materias = await Materia.find();

    if (turmas.length === 0) {
      console.log("❌ Crie as turmas primeiro!");
      process.exit(1);
    }

    if (materias.length === 0) {
      console.log("❌ Crie as matérias primeiro!");
      process.exit(1);
    }

    const alunos = [
      {
        name: "Lucas Pereira",
        email: "lucas.pereira@escola.com",
        password: "aluno123",
        idade: 16,
        cpf: "98765432101",
        turmaNome: "1º Ano A",
        endereco: {
          rua: "Rua dos Estudantes",
          numero: "10",
          bairro: "Centro",
          cidade: "São Paulo",
          estado: "SP",
        },
      },
      {
        name: "Julia Ferreira",
        email: "julia.ferreira@escola.com",
        password: "aluno123",
        idade: 16,
        cpf: "98765432102",
        turmaNome: "1º Ano A",
        endereco: {
          rua: "Avenida da Juventude",
          numero: "20",
          bairro: "Jardim",
          cidade: "São Paulo",
          estado: "SP",
        },
      },
      {
        name: "Rafael Alves",
        email: "rafael.alves@escola.com",
        password: "aluno123",
        idade: 17,
        cpf: "98765432103",
        turmaNome: "1º Ano B",
        endereco: {
          rua: "Rua da Escola",
          numero: "30",
          bairro: "Vila Nova",
          cidade: "São Paulo",
          estado: "SP",
        },
      },
      {
        name: "Isabela Souza",
        email: "isabela.souza@escola.com",
        password: "aluno123",
        idade: 17,
        cpf: "98765432104",
        turmaNome: "2º Ano A",
        endereco: {
          rua: "Rua das Crianças",
          numero: "40",
          bairro: "Bela Vista",
          cidade: "São Paulo",
          estado: "SP",
        },
      },
      {
        name: "Gabriel Lima",
        email: "gabriel.lima@escola.com",
        password: "aluno123",
        idade: 18,
        cpf: "98765432105",
        turmaNome: "2º Ano A",
        endereco: {
          rua: "Avenida do Conhecimento",
          numero: "50",
          bairro: "Centro",
          cidade: "São Paulo",
          estado: "SP",
        },
      },
      {
        name: "Mariana Rocha",
        email: "mariana.rocha@escola.com",
        password: "aluno123",
        idade: 18,
        cpf: "98765432106",
        turmaNome: "3º Ano A",
        endereco: {
          rua: "Rua da Aprendizagem",
          numero: "60",
          bairro: "Jardim",
          cidade: "São Paulo",
          estado: "SP",
        },
      },
    ];

    for (const alunoData of alunos) {
      const turma = turmas.find((t) => t.nome === alunoData.turmaNome);
      if (!turma) {
        console.log(
          `⚠️ Turma ${alunoData.turmaNome} não encontrada, pulando...`
        );
        continue;
      }

      const passwordHash = await bcrypt.hash(alunoData.password, 10);

      const user = await User.create({
        name: alunoData.name,
        email: alunoData.email,
        password: passwordHash,
        role: "aluno",
        idade: alunoData.idade,
        cpf: alunoData.cpf,
        endereco: alunoData.endereco,
      });

      const student = await Student.create({
        userId: user._id,
        turmaId: turma._id,
        materias: materias.map((m) => m._id),
        status: "ativo",
      });

      // Adicionar aluno à turma
      await TurmaModel.findByIdAndUpdate(turma._id, {
        $push: { alunos: student._id },
      });

      console.log(`✅ Aluno ${alunoData.name} criado`);
    }

    console.log(`✅ ${alunos.length} alunos criados com sucesso`);
    process.exit();
  } catch (error) {
    console.log("❌ Erro ao criar alunos:", error.message);
    process.exit(1);
  }
}

createAlunos();
