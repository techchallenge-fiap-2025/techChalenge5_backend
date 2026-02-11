require("dotenv").config({
  path: require("path").resolve(__dirname, "../../.env"),
});
const mongoose = require("mongoose");
const User = require("../models/user.model.js");
const Atividade = require("../models/atividade.model.js");
const NotaAtividade = require("../models/notaAtividade.model.js");
const Teacher = require("../models/teacher.model.js");
const Turma = require("../models/turma.model.js");
const Materia = require("../models/materia.model.js");
const Student = require("../models/student.model.js");
const Grade = require("../models/grade.model.js");
const env = require("../config/env.js");

async function createAtividadesTeste() {
  try {
    console.log("⚙️ Conectando ao MongoDB...");
    await mongoose.connect(env.mongoUrl);

    // Verificar se já existem atividades de teste
    const atividadesExistentes = await Atividade.countDocuments({
      nome: { $in: ["Prova de Matemática - 1º Bimestre", "Prova de Português - 2º Bimestre", "Trabalho de História"] },
    });

    if (atividadesExistentes > 0) {
      console.log(`💥 Encontradas ${atividadesExistentes} atividades de teste existentes`);
      console.log("🗑️  Deletando atividades de teste existentes...");
      
      // Deletar atividades de teste existentes e suas notas relacionadas
      const atividadesParaDeletar = await Atividade.find({
        nome: { $in: ["Prova de Matemática - 1º Bimestre", "Prova de Português - 2º Bimestre", "Trabalho de História"] },
      });
      
      for (const atividade of atividadesParaDeletar) {
        // Deletar todas as NotaAtividade relacionadas
        await NotaAtividade.deleteMany({ atividadeId: atividade._id });
        
        // Remover referências do Grade
        const grades = await Grade.find({
          materiaId: atividade.materiaId,
          turmaId: atividade.turmaId,
          periodo: atividade.periodo,
        });

        for (const grade of grades) {
          const notasAtividades = await NotaAtividade.find({
            atividadeId: atividade._id,
            alunoId: grade.alunoId,
          });
          
          for (const nota of notasAtividades) {
            grade.atividades = grade.atividades.filter(
              (id) => id.toString() !== nota._id.toString()
            );
          }
          await grade.save();
        }
        
        // Deletar a atividade
        await Atividade.findByIdAndDelete(atividade._id);
      }
      
      console.log("✅ Atividades de teste antigas deletadas. Criando novas...");
    }

    // Buscar dados necessários
    const professores = await Teacher.find().populate("userId", "name");
    const turmas = await Turma.find();
    const materias = await Materia.find();

    if (professores.length === 0 || turmas.length === 0 || materias.length === 0) {
      console.log("❌ Crie professores, turmas e matérias primeiro!");
      await mongoose.disconnect();
      process.exit(1);
    }

    // Buscar primeira turma disponível
    const turma = turmas[0];
    const alunos = await Student.find({ turmaId: turma._id });

    if (alunos.length === 0) {
      console.log(`❌ Não há alunos na turma ${turma.nome}!`);
      await mongoose.disconnect();
      process.exit(1);
    }

    // Buscar primeira matéria e primeiro professor
    const materia = materias[0];
    const professor = professores[0];

    console.log(`📚 Usando turma: ${turma.nome}`);
    console.log(`📖 Usando matéria: ${materia.nome}`);
    console.log(`👨‍🏫 Usando professor: ${professor.userId.name}`);
    console.log(`👥 Alunos na turma: ${alunos.length}`);

    const periodo = "2026/1"; // Período padrão

    // Criar atividades
    const atividades = [
      {
        nome: "Prova de Matemática - 1º Bimestre",
        tipo: "prova",
        data: new Date("2026-01-20T08:00:00"), // 20/01/2026 às 08:00
        horarioInicio: "08:00",
        horarioFim: "10:00",
        professorId: professor._id,
        materiaId: materia._id,
        turmaId: turma._id,
        periodo,
        status: "ativa",
      },
      {
        nome: "Prova de Português - 2º Bimestre",
        tipo: "prova",
        data: new Date("2026-04-01T14:00:00"), // 01/04/2026 às 14:00
        horarioInicio: "14:00",
        horarioFim: "16:00",
        professorId: professor._id,
        materiaId: materias.length > 1 ? materias[1]._id : materia._id, // Usar segunda matéria se existir
        turmaId: turma._id,
        periodo,
        status: "ativa",
      },
      {
        nome: "Trabalho de História",
        tipo: "trabalho",
        data: new Date("2026-06-01T10:00:00"), // 01/06/2026 às 10:00
        horarioInicio: "10:00",
        horarioFim: "12:00",
        professorId: professor._id,
        materiaId: materias.length > 2 ? materias[2]._id : materia._id, // Usar terceira matéria se existir
        turmaId: turma._id,
        periodo,
        status: "ativa",
      },
    ];

    console.log("\n📝 Criando atividades...");

    for (const atividadeData of atividades) {
      // Criar a atividade
      const atividade = await Atividade.create(atividadeData);
      console.log(`✅ Atividade criada: ${atividade.nome} (${atividade.tipo})`);

      // Criar NotaAtividade para cada aluno da turma
      for (const aluno of alunos) {
        // Buscar ou criar Grade
        let grade = await Grade.findOne({
          alunoId: aluno._id,
          materiaId: atividadeData.materiaId,
          turmaId: turma._id,
          periodo,
        });

        if (!grade) {
          grade = await Grade.create({
            alunoId: aluno._id,
            professorId: professor._id,
            materiaId: atividadeData.materiaId,
            turmaId: turma._id,
            periodo,
            atividades: [],
          });
        }

        // Criar NotaAtividade
        const notaAtividade = await NotaAtividade.create({
          valor: null, // Nota começa vazia
          alunoId: aluno._id,
          professorId: professor._id,
          materiaId: atividadeData.materiaId,
          turmaId: turma._id,
          atividadeId: atividade._id,
          periodo,
          status: "pendente",
        });

        // Adicionar notaAtividade ao Grade se não estiver lá
        if (!grade.atividades.includes(notaAtividade._id)) {
          grade.atividades.push(notaAtividade._id);
          await grade.save();
        }
      }

      console.log(`   └─ ${alunos.length} notas criadas para os alunos`);
    }

    console.log("\n✅ Seed de atividades de teste concluído!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar atividades de teste:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAtividadesTeste();
