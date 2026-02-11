const mongoose = require("mongoose");
const env = require("./env.js");

const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUrl);
    console.log("✅ Mongo está conectado");
  } catch (error) {
    console.log("❌ Erro ao conectar no MongoDB:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
