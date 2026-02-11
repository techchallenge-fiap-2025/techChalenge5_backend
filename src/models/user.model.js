const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema(
  {
    apelido: {
      type: String,
      trim: true,
    },
    cep: {
      type: String,
      trim: true,
      match: /^\d{5}-?\d{3}$/,
    },
    rua: { type: String, required: true },
    numero: { type: String, required: true },
    bairro: { type: String, required: true },
    cidade: { type: String, required: true },
    estado: { type: String, required: true },
    pais: {
      type: String,
      default: "Brasil",
      trim: true,
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "professor", "aluno"],
      required: true,
    },
    idade: {
      type: Number,
      min: 0,
    },
    cpf: {
      type: String,
      unique: true,
    },
    endereco: {
      type: AddressSchema,
    },
    fotoPerfil: {
      url: {
        type: String,
        trim: true,
      },
      publicId: {
        type: String,
        trim: true,
      },
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
