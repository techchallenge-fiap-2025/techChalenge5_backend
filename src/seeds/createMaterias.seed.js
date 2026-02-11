require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const Materia = require("../models/materia.model.js");
const env = require("../config/env.js");

async function createMaterias() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    const materiasExistentes = await Materia.countDocuments();

    if (materiasExistentes > 0) {
      console.log("💥 Matérias já existem");
      process.exit();
    }

    const materias = [
      {
        nome: "Matemática",
        cargaHoraria: 80,
        descricao: "Álgebra, geometria e cálculo",
      },
      {
        nome: "Português",
        cargaHoraria: 80,
        descricao: "Gramática, literatura e redação",
      },
      {
        nome: "História",
        cargaHoraria: 60,
        descricao: "História do Brasil e mundial",
      },
      {
        nome: "Geografia",
        cargaHoraria: 60,
        descricao: "Geografia física e humana",
      },
      {
        nome: "Física",
        cargaHoraria: 80,
        descricao: "Mecânica, termodinâmica e eletromagnetismo",
      },
      {
        nome: "Química",
        cargaHoraria: 80,
        descricao: "Química orgânica e inorgânica",
      },
      {
        nome: "Biologia",
        cargaHoraria: 60,
        descricao: "Biologia celular e genética",
      },
      {
        nome: "Inglês",
        cargaHoraria: 40,
        descricao: "Língua inglesa",
      },
    ];

    await Materia.insertMany(materias);

    console.log(`✅ ${materias.length} matérias criadas com sucesso`);
    process.exit();
  } catch (error) {
    console.log("❌ Erro ao criar matérias:", error.message);
    process.exit(1);
  }
}

createMaterias();
