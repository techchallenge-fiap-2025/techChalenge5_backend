const Atividade = require("../models/atividade.model.js");
const NotaAtividade = require("../models/notaAtividade.model.js");
const Teacher = require("../models/teacher.model.js");
const Student = require("../models/student.model.js");
const Grade = require("../models/grade.model.js");
const AulaSemanal = require("../models/aulaSemanal.model.js");
const Attendance = require("../models/attendance.model.js");

class AtividadeController {
  // Criar atividade (prova ou trabalho) para toda a turma
  async create(req, res) {
    try {
      const { nome, tipo, tipoAtividade, data, horarioInicio, horarioFim, materiaId, turmaId, semestre } = req.body;
      const { role, id } = req.user;

      if (!["prova", "trabalho"].includes(tipo)) {
        return res
          .status(400)
          .json({ error: "Tipo inválido. Use 'prova' ou 'trabalho'" });
      }

      if (!tipoAtividade || !["PV1", "PV2", "PV3", "TB1", "TB2"].includes(tipoAtividade)) {
        return res
          .status(400)
          .json({ error: "Tipo de atividade inválido. Use PV1, PV2, PV3, TB1 ou TB2" });
      }

      const teacher = await Teacher.findOne({ userId: id });
      if (!teacher && role !== "admin") {
        return res
          .status(403)
          .json({ error: "Apenas professores podem criar atividades" });
      }

      // Verificar se a turma existe e buscar com alunos populados
      const Turma = require("../models/turma.model.js");
      const turma = await Turma.findById(turmaId).populate("alunos");
      if (!turma) {
        return res.status(404).json({ error: "Turma não encontrada" });
      }

      // Verificar se já existe uma atividade com o mesmo tipoAtividade no mesmo semestre, turma e matéria
      // Mongoose converte strings para ObjectId automaticamente, mas vamos garantir
      const atividadeExistente = await Atividade.findOne({
        tipoAtividade,
        semestre,
        turmaId,
        materiaId,
        status: "ativa",
      }).lean();

      if (atividadeExistente) {
        return res.status(400).json({
          error: `Já existe uma atividade ${tipoAtividade} cadastrada para esta turma e matéria no ${semestre}º semestre`,
        });
      }

      // Criar a atividade (prova/trabalho)
      const atividade = await Atividade.create({
        nome,
        tipo,
        tipoAtividade,
        data: new Date(data),
        horarioInicio,
        horarioFim,
        professorId: teacher._id,
        materiaId,
        turmaId,
        semestre,
        status: "ativa",
      });

      // Buscar alunos da turma - usar o array alunos da turma
      let alunos = [];
      if (turma.alunos && turma.alunos.length > 0) {
        // Extrair IDs dos alunos (podem estar populados ou não)
        const alunosIds = turma.alunos.map(aluno => 
          typeof aluno === 'object' && aluno !== null && aluno._id 
            ? aluno._id 
            : aluno
        ).filter(id => id); // Remover nulls/undefineds
        
        // Buscar alunos completos pelos IDs
        alunos = await Student.find({ _id: { $in: alunosIds } });
      } else {
        // Fallback: buscar alunos pelo campo turmaId do Student
        alunos = await Student.find({ turmaId });
      }
      
      // Garantir que temos alunos para criar as notas
      if (!alunos || alunos.length === 0) {
        return res.status(400).json({ 
          error: "A turma não possui alunos cadastrados. Adicione alunos à turma antes de criar atividades." 
        });
      }

      // Gerar periodo a partir do semestre (formato: "2026/1" ou "2026/2")
      const anoAtual = new Date().getFullYear();
      const periodo = `${anoAtual}/${semestre}`;

      // Verificar se há aula semanal no mesmo dia e horário
      const dataAtividade = new Date(data);
      const diaSemanaAtividade = dataAtividade.getDay(); // 0 = domingo, 1 = segunda, etc.
      
      // Buscar todas as aulas semanais que ocorrem no mesmo dia da semana, mesma turma e mesma matéria
      const aulasSemanais = await AulaSemanal.find({
        diaSemana: diaSemanaAtividade,
        turmaId,
        materiaId,
        status: "ativa",
      });

      // Verificar se alguma aula tem horário sobreposto com a atividade
      let aulaSemanal = null;
      for (const aula of aulasSemanais) {
        // Converter horários para minutos para facilitar comparação
        const converterParaMinutos = (horario) => {
          const [hora, minuto] = horario.split(':').map(Number);
          return hora * 60 + minuto;
        };

        const aulaInicioMinutos = converterParaMinutos(aula.horarioInicio);
        const aulaFimMinutos = converterParaMinutos(aula.horarioFim);
        const atividadeInicioMinutos = converterParaMinutos(horarioInicio);
        const atividadeFimMinutos = converterParaMinutos(horarioFim);

        // Verificar sobreposição de horários
        // Há sobreposição se: início da aula < fim da atividade E fim da aula > início da atividade
        if (aulaInicioMinutos < atividadeFimMinutos && aulaFimMinutos > atividadeInicioMinutos) {
          aulaSemanal = aula;
          break;
        }
      }

      // Criar NotaAtividade para cada aluno da turma
      const notasCriadas = [];
      for (const aluno of alunos) {
        // Buscar ou criar Grade
        let grade = await Grade.findOne({
          alunoId: aluno._id,
          materiaId,
          turmaId,
          periodo,
        });

        if (!grade) {
          grade = await Grade.create({
            alunoId: aluno._id,
            professorId: teacher._id,
            materiaId,
            turmaId,
            periodo,
            atividades: [],
          });
        }

        // Verificar se aluno faltou na aula (se houver aula no mesmo horário)
        let valorInicial = null;
        let statusInicial = "pendente";
        
        if (aulaSemanal) {
          // Normalizar data para início do dia para comparação
          const dataInicio = new Date(dataAtividade);
          dataInicio.setHours(0, 0, 0, 0);
          const dataFim = new Date(dataAtividade);
          dataFim.setHours(23, 59, 59, 999);

          // Buscar registro de presença do aluno nesta aula nesta data
          const presenca = await Attendance.findOne({
            alunoId: aluno._id,
            turmaId,
            materiaId,
            data: {
              $gte: dataInicio,
              $lte: dataFim,
            },
          });

          // Se o aluno faltou na aula, marcar nota como 0
          if (presenca && presenca.presente === false) {
            valorInicial = 0;
            if (tipo === "prova") {
              statusInicial = "faltou";
            } else if (tipo === "trabalho") {
              statusInicial = "nao_entregue";
            }
          }
        }

        // Criar NotaAtividade para o aluno
        const notaAtividade = await NotaAtividade.create({
          valor: valorInicial, // 0 se faltou na aula, null caso contrário
          alunoId: aluno._id,
          professorId: teacher._id,
          materiaId,
          turmaId,
          atividadeId: atividade._id,
          periodo,
          status: statusInicial,
        });

        // Adicionar notaAtividade ao Grade se não estiver lá
        if (!grade.atividades.includes(notaAtividade._id)) {
          grade.atividades.push(notaAtividade._id);
          await grade.save();
        }

        notasCriadas.push(notaAtividade);
      }

      return res.status(201).json({
        message: `Atividade criada e ${notasCriadas.length} notas criadas para os alunos`,
        atividade,
        notasCriadas: notasCriadas.length,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao criar atividade", details: error.message });
    }
  }

  // Listar atividades (professor vê suas atividades, admin vê todas)
  async list(req, res) {
    try {
      const { role, id } = req.user;
      const { materiaId, turmaId, semestre, tipo } = req.query;

      let query = {};

      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (!teacher) {
          return res.status(403).json({ error: "Professor não encontrado" });
        }
        query.professorId = teacher._id;
      } else if (role === "aluno") {
        const Turma = require("../models/turma.model.js");
        const student = await Student.findOne({ userId: id });
        if (!student) {
          return res.status(403).json({ error: "Aluno não encontrado" });
        }
        
        // Buscar turma atual do aluno (turma ativa do ano letivo atual)
        const anoLetivoAtual = new Date().getFullYear();
        const turmaAtual = await Turma.findOne({
          alunos: student._id,
          anoLetivo: anoLetivoAtual,
          status: "ativa",
        });
        
        // Se não encontrar turma ativa do ano atual, usar turmaId do modelo Student como fallback
        const turmaIdParaFiltro = turmaAtual ? turmaAtual._id : student.turmaId;
        
        if (!turmaIdParaFiltro) {
          return res.json([]);
        }
        
        query.turmaId = turmaIdParaFiltro;
      }
      // Admin vê todas as atividades

      if (materiaId) query.materiaId = materiaId;
      if (turmaId) query.turmaId = turmaId;
      if (semestre) query.semestre = semestre;
      if (tipo) query.tipo = tipo;

      const atividades = await Atividade.find(query)
        .populate("professorId", "userId")
        .populate("materiaId", "nome")
        .populate("turmaId", "nome nivelEducacional")
        .sort({ data: -1 });

      return res.json(atividades);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar atividades", details: error.message });
    }
  }

  // Visualizar atividade específica
  async getById(req, res) {
    try {
      const atividade = await Atividade.findById(req.params.id)
        .populate("professorId", "userId")
        .populate("materiaId", "nome")
        .populate({
          path: "turmaId",
          select: "nome nivelEducacional",
          populate: {
            path: "alunos",
            select: "userId status",
            populate: {
              path: "userId",
              select: "name email fotoPerfil",
            },
          },
        });

      if (!atividade) {
        return res.status(404).json({ error: "Atividade não encontrada" });
      }

      return res.json(atividade);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar atividade", details: error.message });
    }
  }

  // Atualizar atividade
  async update(req, res) {
    try {
      const { role, id } = req.user;
      const atividade = await Atividade.findById(req.params.id);

      if (!atividade) {
        return res.status(404).json({ error: "Atividade não encontrada" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          atividade.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({
              error: "Você não tem permissão para editar esta atividade",
            });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const atividadeAtualizada = await Atividade.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      )
        .populate("professorId", "userId")
        .populate("materiaId", "nome")
        .populate("turmaId", "nome nivelEducacional");

      return res.json(atividadeAtualizada);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar atividade", details: error.message });
    }
  }

  // Deletar atividade
  async delete(req, res) {
    try {
      const { role, id } = req.user;
      const atividade = await Atividade.findById(req.params.id);

      if (!atividade) {
        return res.status(404).json({ error: "Atividade não encontrada" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          atividade.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({
              error: "Você não tem permissão para deletar esta atividade",
            });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Deletar todas as NotaAtividade relacionadas
      await NotaAtividade.deleteMany({ atividadeId: atividade._id });

      // Remover referências do Grade
      // Gerar periodo a partir do semestre para buscar os grades
      const anoAtual = new Date(atividade.data).getFullYear();
      const periodo = `${anoAtual}/${atividade.semestre}`;
      
      const grades = await Grade.find({
        materiaId: atividade.materiaId,
        turmaId: atividade.turmaId,
        periodo,
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

      await Atividade.findByIdAndDelete(req.params.id);

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar atividade", details: error.message });
    }
  }
}

module.exports = new AtividadeController();
