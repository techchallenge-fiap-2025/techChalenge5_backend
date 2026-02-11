require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user.model.js");
const env = require("../config/env.js");

async function createAdmin() {
  try {
    console.log("⚙️MongoDB:", env.mongoUrl);

    await mongoose.connect(env.mongoUrl);

    const adminExists = await User.findOne({ role: "admin" });

    if (adminExists) {
      console.log("💥Admin já existe");
      process.exit();
    }

    const passwordHash = await bcrypt.hash("PlataformaEDC@2026", 10);

    await User.create({
      name: "Administrador",
      email: "admin@escola.com",
      password: passwordHash,
      role: "admin",
    });

    console.log("✅Admin criado com successo");
    process.exit();
  } catch (error) {
    console.log("Erro ao criar admi:", error);
    process.exit(1);
  }
}

createAdmin();
