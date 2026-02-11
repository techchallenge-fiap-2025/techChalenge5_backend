require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const User = require("../models/user.model.js");
const Responsavel = require("../models/responsavel.model.js");
const Student = require("../models/student.model.js");
const env = require("../config/env.js");

async function createResponsaveis() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    const responsaveisExistentes = await Responsavel.countDocuments();

    if (responsaveisExistentes > 0) {
      console.log("💥 Responsáveis já existem");
      process.exit();
    }

    const alunos = await Student.find().populate("userId", "name");

    if (alunos.length === 0) {
      console.log("❌ Crie os alunos primeiro!");
      process.exit(1);
    }

    const responsaveis = [
      {
        nome: "Roberto Pereira",
        cpf: "11122233344",
        telefone: "(11) 98765-4321",
        email: "roberto.pereira@email.com",
        parentesco: "pai",
        alunoNome: "Lucas Pereira",
      },
      {
        nome: "Fernanda Pereira",
        cpf: "11122233345",
        telefone: "(11) 98765-4322",
        email: "fernanda.pereira@email.com",
        parentesco: "mãe",
        alunoNome: "Lucas Pereira",
      },
      {
        nome: "Carlos Ferreira",
        cpf: "11122233346",
        telefone: "(11) 98765-4323",
        email: "carlos.ferreira@email.com",
        parentesco: "pai",
        alunoNome: "Julia Ferreira",
      },
      {
        nome: "Patricia Alves",
        cpf: "11122233347",
        telefone: "(11) 98765-4324",
        email: "patricia.alves@email.com",
        parentesco: "mãe",
        alunoNome: "Rafael Alves",
      },
      {
        nome: "Marcos Souza",
        cpf: "11122233348",
        telefone: "(11) 98765-4325",
        email: "marcos.souza@email.com",
        parentesco: "pai",
        alunoNome: "Isabela Souza",
      },
    ];

    for (const respData of responsaveis) {
      const aluno = alunos.find((a) => a.userId.name === respData.alunoNome);
      if (!aluno) {
        console.log(
          `⚠️ Aluno ${respData.alunoNome} não encontrado, pulando...`
        );
        continue;
      }

      const responsavel = await Responsavel.create({
        nome: respData.nome,
        cpf: respData.cpf,
        telefone: respData.telefone,
        email: respData.email,
        parentesco: respData.parentesco,
        alunos: [aluno._id],
        active: true,
      });

      // Associar responsável ao aluno
      await Student.findByIdAndUpdate(aluno._id, {
        $push: { responsaveis: responsavel._id },
      });

      console.log(`✅ Responsável ${respData.nome} criado`);
    }

    console.log(`✅ ${responsaveis.length} responsáveis criados com sucesso`);
    process.exit();
  } catch (error) {
    console.log("❌ Erro ao criar responsáveis:", error.message);
    process.exit(1);
  }
}

createResponsaveis();
