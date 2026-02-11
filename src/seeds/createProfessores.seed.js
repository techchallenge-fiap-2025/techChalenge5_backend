require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model.js");
const Teacher = require("../models/teacher.model.js");
const Materia = require("../models/materia.model.js");
const env = require("../config/env.js");

async function createProfessores() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    const professoresExistentes = await Teacher.countDocuments();

    if (professoresExistentes > 0) {
      console.log("💥 Professores já existem");
      process.exit();
    }

    const materias = await Materia.find();
    if (materias.length === 0) {
      console.log("❌ Crie as matérias primeiro!");
      process.exit(1);
    }

    const professores = [
      {
        name: "João Silva",
        email: "joao.silva@escola.com",
        password: "professor123",
        role: "professor",
        idade: 35,
        cpf: "12345678901",
        endereco: {
          rua: "Rua das Flores",
          numero: "100",
          bairro: "Centro",
          cidade: "São Paulo",
          estado: "SP",
        },
        materiaNome: "Matemática",
      },
      {
        name: "Maria Santos",
        email: "maria.santos@escola.com",
        password: "professor123",
        role: "professor",
        idade: 32,
        cpf: "12345678902",
        endereco: {
          rua: "Avenida Principal",
          numero: "200",
          bairro: "Jardim",
          cidade: "São Paulo",
          estado: "SP",
        },
        materiaNome: "Português",
      },
      {
        name: "Pedro Oliveira",
        email: "pedro.oliveira@escola.com",
        password: "professor123",
        role: "professor",
        idade: 40,
        cpf: "12345678903",
        endereco: {
          rua: "Rua dos Professores",
          numero: "300",
          bairro: "Vila Nova",
          cidade: "São Paulo",
          estado: "SP",
        },
        materiaNome: "Física",
      },
      {
        name: "Ana Costa",
        email: "ana.costa@escola.com",
        password: "professor123",
        role: "professor",
        idade: 28,
        cpf: "12345678904",
        endereco: {
          rua: "Rua da Educação",
          numero: "400",
          bairro: "Bela Vista",
          cidade: "São Paulo",
          estado: "SP",
        },
        materiaNome: "Química",
      },
      {
        name: "Carlos Mendes",
        email: "carlos.mendes@escola.com",
        password: "professor123",
        role: "professor",
        idade: 45,
        cpf: "12345678905",
        endereco: {
          rua: "Avenida dos Estudantes",
          numero: "500",
          bairro: "Centro",
          cidade: "São Paulo",
          estado: "SP",
        },
        materiaNome: "História",
      },
    ];

    for (const profData of professores) {
      const materia = materias.find((m) => m.nome === profData.materiaNome);
      if (!materia) {
        console.log(
          `⚠️ Matéria ${profData.materiaNome} não encontrada, pulando...`
        );
        continue;
      }

      const passwordHash = await bcrypt.hash(profData.password, 10);

      const user = await User.create({
        name: profData.name,
        email: profData.email,
        password: passwordHash,
        role: profData.role,
        idade: profData.idade,
        cpf: profData.cpf,
        endereco: profData.endereco,
      });

      await Teacher.create({
        userId: user._id,
        materias: [materia._id],
        status: "ativo",
      });

      console.log(`✅ Professor ${profData.name} criado`);
    }

    console.log(`✅ ${professores.length} professores criados com sucesso`);
    process.exit();
  } catch (error) {
    console.log("❌ Erro ao criar professores:", error.message);
    process.exit(1);
  }
}

createProfessores();
