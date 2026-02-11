require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const Turma = require("../models/turma.model.js");
const env = require("../config/env.js");

async function createTurmas() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    const turmasExistentes = await Turma.countDocuments();

    if (turmasExistentes > 0) {
      console.log("💥 Turmas já existem");
      process.exit();
    }

    const turmas = [
      {
        nome: "1º Ano A",
        anoLetivo: 2024,
        periodo: "manha",
        status: "ativa",
      },
      {
        nome: "1º Ano B",
        anoLetivo: 2024,
        periodo: "tarde",
        status: "ativa",
      },
      {
        nome: "2º Ano A",
        anoLetivo: 2024,
        periodo: "manha",
        status: "ativa",
      },
      {
        nome: "2º Ano B",
        anoLetivo: 2024,
        periodo: "tarde",
        status: "ativa",
      },
      {
        nome: "3º Ano A",
        anoLetivo: 2024,
        periodo: "manha",
        status: "ativa",
      },
    ];

    await Turma.insertMany(turmas);

    console.log(`✅ ${turmas.length} turmas criadas com sucesso`);
    process.exit();
  } catch (error) {
    console.log("❌ Erro ao criar turmas:", error.message);
    process.exit(1);
  }
}

createTurmas();
