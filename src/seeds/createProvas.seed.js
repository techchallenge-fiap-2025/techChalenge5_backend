require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const User = require("../models/user.model.js");
const Atividade = require("../models/atividade.model.js");
const Teacher = require("../models/teacher.model.js");
const Turma = require("../models/turma.model.js");
const Materia = require("../models/materia.model.js");
const Student = require("../models/student.model.js");
const Grade = require("../models/grade.model.js");
const env = require("../config/env.js");

async function createAtividades() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    const atividadesExistentes = await Atividade.countDocuments();

    if (atividadesExistentes > 0) {
      console.log("💥 Atividades já existem");
      process.exit();
    }

    const professores = await Teacher.find().populate("userId", "name");
    const turmas = await Turma.find();
    const materias = await Materia.find();
    const alunos = await Student.find();

    if (
      professores.length === 0 ||
      turmas.length === 0 ||
      materias.length === 0 ||
      alunos.length === 0
    ) {
      console.log("❌ Crie professores, turmas, matérias e alunos primeiro!");
      process.exit(1);
    }

    const turma1A = turmas.find((t) => t.nome === "1º Ano A");
    const turma2A = turmas.find((t) => t.nome === "2º Ano A");
    const matematica = materias.find((m) => m.nome === "Matemática");
    const portugues = materias.find((m) => m.nome === "Português");
    const joao = professores.find((p) => p.userId.name === "João Silva");
    const maria = professores.find((p) => p.userId.name === "Maria Santos");

    if (!turma1A || !turma2A || !matematica || !portugues || !joao || !maria) {
      console.log("❌ Dados não encontrados!");
      process.exit(1);
    }

    const alunos1A = await Student.find({ turmaId: turma1A._id });
    const alunos2A = await Student.find({ turmaId: turma2A._id });

    const periodo = "2024-1";
    let atividadesCriadas = 0;

    // Função auxiliar para recalcular média do Grade
    const recalcularMedia = async (grade) => {
      try {
        const atividades = await Atividade.find({
          _id: { $in: grade.atividades },
        });

        let somaNotas = 0;
        let quantidadeNotas = 0;

        // Somar notas das atividades (apenas atividades com nota e status válido)
        atividades.forEach((atividade) => {
          // Para provas: só conta se presente e tem nota
          if (atividade.tipo === "prova") {
            if (
              atividade.status === "presente" &&
              atividade.valor !== null &&
              atividade.valor !== undefined
            ) {
              somaNotas += atividade.valor;
              quantidadeNotas++;
            }
          }
          // Para trabalhos: só conta se entregue e tem nota
          else if (atividade.tipo === "trabalho") {
            if (
              atividade.status === "entregue" &&
              atividade.valor !== null &&
              atividade.valor !== undefined
            ) {
              somaNotas += atividade.valor;
              quantidadeNotas++;
            }
          }
        });

        // Calcular média
        grade.mediaFinal =
          quantidadeNotas > 0 ? somaNotas / quantidadeNotas : 0;
      } catch (error) {
        console.error("Erro ao recalcular média:", error);
      }
    };

    // Função auxiliar para buscar ou criar Grade
    const getOrCreateGrade = async (
      alunoId,
      materiaId,
      turmaId,
      professorId
    ) => {
      let grade = await Grade.findOne({
        alunoId,
        materiaId,
        turmaId,
        periodo,
      });

      if (!grade) {
        grade = await Grade.create({
          alunoId,
          professorId,
          materiaId,
          turmaId,
          periodo,
          atividades: [],
        });
      }

      return grade;
    };

    // Criar provas e trabalhos para turma 1A
    for (let i = 0; i < alunos1A.length; i++) {
      const aluno = alunos1A[i];
      const isPar = i % 2 === 0;

      // Prova de Matemática - 1º Bimestre (com presença e nota)
      const provaMat1 = await Atividade.create({
        nome: "Prova de Matemática - 1º Bimestre",
        tipo: "prova",
        data: new Date("2024-03-15T08:00:00"),
        alunoId: aluno._id,
        professorId: joao._id,
        materiaId: matematica._id,
        turmaId: turma1A._id,
        periodo: periodo,
        status: isPar ? "presente" : "faltou",
        valor: isPar
          ? parseFloat((7.5 + Math.random() * 2.5).toFixed(1))
          : null, // Nota entre 7.5 e 10
      });

      const gradeMat = await getOrCreateGrade(
        aluno._id,
        matematica._id,
        turma1A._id,
        joao._id
      );
      gradeMat.atividades.push(provaMat1._id);
      await gradeMat.save();
      atividadesCriadas++;

      // Trabalho de Matemática - Álgebra (com entrega e nota)
      const trabalhoMat = await Atividade.create({
        nome: "Trabalho de Álgebra",
        tipo: "trabalho",
        data: new Date("2024-03-10T00:00:00"),
        alunoId: aluno._id,
        professorId: joao._id,
        materiaId: matematica._id,
        turmaId: turma1A._id,
        periodo: periodo,
        status: isPar ? "entregue" : "nao_entregue",
        valor: isPar
          ? parseFloat((8.0 + Math.random() * 2.0).toFixed(1))
          : null, // Nota entre 8.0 e 10
      });

      gradeMat.atividades.push(trabalhoMat._id);
      await gradeMat.save();
      atividadesCriadas++;

      // Prova de Português - 1º Bimestre (com presença e nota)
      const provaPort1 = await Atividade.create({
        nome: "Prova de Português - 1º Bimestre",
        tipo: "prova",
        data: new Date("2024-03-20T08:00:00"),
        alunoId: aluno._id,
        professorId: maria._id,
        materiaId: portugues._id,
        turmaId: turma1A._id,
        periodo: periodo,
        status: isPar ? "presente" : "presente", // Todos presentes
        valor: parseFloat((6.0 + Math.random() * 4.0).toFixed(1)), // Nota entre 6.0 e 10
      });

      const gradePort = await getOrCreateGrade(
        aluno._id,
        portugues._id,
        turma1A._id,
        maria._id
      );
      gradePort.atividades.push(provaPort1._id);
      await gradePort.save();
      atividadesCriadas++;

      // Trabalho de Português - Redação (com entrega e nota)
      const trabalhoPort = await Atividade.create({
        nome: "Redação - Tema Livre",
        tipo: "trabalho",
        data: new Date("2024-03-15T00:00:00"),
        alunoId: aluno._id,
        professorId: maria._id,
        materiaId: portugues._id,
        turmaId: turma1A._id,
        periodo: periodo,
        status: "entregue",
        valor: parseFloat((7.0 + Math.random() * 3.0).toFixed(1)), // Nota entre 7.0 e 10
      });

      gradePort.atividades.push(trabalhoPort._id);
      await gradePort.save();
      atividadesCriadas++;

      // Recalcular médias
      await recalcularMedia(gradeMat);
      await recalcularMedia(gradePort);
      await gradeMat.save();
      await gradePort.save();
    }

    // Criar provas e trabalhos para turma 2A
    for (let i = 0; i < alunos2A.length; i++) {
      const aluno = alunos2A[i];
      const isPar = i % 2 === 0;

      // Prova de Matemática - 1º Bimestre
      const provaMat = await Atividade.create({
        nome: "Prova de Matemática - 1º Bimestre",
        tipo: "prova",
        data: new Date("2024-03-18T08:00:00"),
        alunoId: aluno._id,
        professorId: joao._id,
        materiaId: matematica._id,
        turmaId: turma2A._id,
        periodo: periodo,
        status: isPar ? "presente" : "faltou",
        valor: isPar
          ? parseFloat((7.0 + Math.random() * 3.0).toFixed(1))
          : null,
      });

      const gradeMat = await getOrCreateGrade(
        aluno._id,
        matematica._id,
        turma2A._id,
        joao._id
      );
      gradeMat.atividades.push(provaMat._id);
      await gradeMat.save();
      atividadesCriadas++;

      // Trabalho de Matemática - Geometria
      const trabalhoMat = await Atividade.create({
        nome: "Trabalho de Geometria",
        tipo: "trabalho",
        data: new Date("2024-03-12T00:00:00"),
        alunoId: aluno._id,
        professorId: joao._id,
        materiaId: matematica._id,
        turmaId: turma2A._id,
        periodo: periodo,
        status: "entregue",
        valor: parseFloat((8.5 + Math.random() * 1.5).toFixed(1)), // Nota entre 8.5 e 10
      });

      gradeMat.atividades.push(trabalhoMat._id);
      await gradeMat.save();
      atividadesCriadas++;

      // Recalcular média
      await recalcularMedia(gradeMat);
      await gradeMat.save();
    }

    console.log(`✅ ${atividadesCriadas} atividades criadas com sucesso`);
    console.log(`✅ Provas e trabalhos adicionados aos boletins`);
    process.exit();
  } catch (error) {
    console.log("❌ Erro ao criar atividades:", error.message);
    console.error(error);
    process.exit(1);
  }
}

createAtividades();
