const AulaSemanal = require("../models/aulaSemanal.model.js");
const Teacher = require("../models/teacher.model.js");
const Turma = require("../models/turma.model.js");
const Student = require("../models/student.model.js");

class AulaSemanalController {
  // Admin cria agendamento de aula semanal
  async create(req, res) {
    try {
      const {
        diaSemana,
        horarioInicio,
        horarioFim,
        turmaId,
        materiaId,
        professorId,
        semestre,
      } = req.body;

      // Verificar se a turma existe
      const turma = await Turma.findById(turmaId);
      if (!turma) {
        return res.status(404).json({ error: "Turma não encontrada" });
      }

      // Verificar se o professor existe
      const teacher = await Teacher.findById(professorId);
      if (!teacher) {
        return res.status(404).json({ error: "Professor não encontrado" });
      }

      // Verificar conflito de horário
      const conflito = await AulaSemanal.findOne({
        professorId,
        diaSemana,
        horarioInicio: { $lt: horarioFim },
        horarioFim: { $gt: horarioInicio },
        status: "ativa",
      });

      if (conflito) {
        return res
          .status(400)
          .json({ error: "Professor já tem aula neste horário" });
      }

      const aulaSemanal = await AulaSemanal.create({
        diaSemana,
        horarioInicio,
        horarioFim,
        turmaId,
        materiaId,
        professorId,
        semestre,
      });

      // Adicionar turma ao professor se não estiver lá
      if (!teacher.turmas.includes(turmaId)) {
        await Teacher.findByIdAndUpdate(professorId, {
          $push: { turmas: turmaId },
        });
      }

      return res.status(201).json(aulaSemanal);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao criar aula semanal", details: error.message });
    }
  }

  // Listar aulas semanais
  async list(req, res) {
    try {
      const { role, id } = req.user;
      const { turmaId, materiaId, professorId, diaSemana } = req.query;

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

      if (turmaId) query.turmaId = turmaId;
      if (materiaId) query.materiaId = materiaId;
      if (professorId) query.professorId = professorId;
      if (diaSemana !== undefined) query.diaSemana = diaSemana;

      query.status = "ativa";

      const aulas = await AulaSemanal.find(query)
        .populate("turmaId", "nome anoLetivo periodo nivelEducacional")
        .populate("materiaId", "nome")
        .populate("professorId", "userId")
        .sort({ diaSemana: 1, horarioInicio: 1 });

      return res.json(aulas);
    } catch (error) {
      return res
        .status(500)
        .json({
          error: "Erro ao listar aulas semanais",
          details: error.message,
        });
    }
  }

  // Professor vê suas aulas semanais
  async minhasAulas(req, res) {
    try {
      const { id } = req.user;
      const teacher = await Teacher.findOne({ userId: id });

      if (!teacher) {
        return res.status(403).json({ error: "Professor não encontrado" });
      }

      const aulas = await AulaSemanal.find({
        professorId: teacher._id,
        status: "ativa",
      })
        .populate("turmaId", "nome anoLetivo periodo nivelEducacional")
        .populate("materiaId", "nome")
        .sort({ diaSemana: 1, horarioInicio: 1 });

      // Agrupar por dia da semana
      const aulasPorDia = {
        0: [], // Domingo
        1: [], // Segunda
        2: [], // Terça
        3: [], // Quarta
        4: [], // Quinta
        5: [], // Sexta
        6: [], // Sábado
      };

      aulas.forEach((aula) => {
        aulasPorDia[aula.diaSemana].push(aula);
      });

      return res.json({
        aulas,
        aulasPorDia,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar aulas", details: error.message });
    }
  }

  // Aluno vê próximas aulas (calendário)
  async proximasAulas(req, res) {
    try {
      const { id } = req.user;
      const student = await Student.findOne({ userId: id });

      if (!student) {
        return res.status(403).json({ error: "Aluno não encontrado" });
      }

      const hoje = new Date();
      const diaSemanaAtual = hoje.getDay(); // 0 = Domingo, 1 = Segunda, etc.

      // Buscar aulas da turma do aluno
      const aulas = await AulaSemanal.find({
        turmaId: student.turmaId,
        status: "ativa",
      })
        .populate("materiaId", "nome")
        .populate("professorId", "userId")
        .sort({ diaSemana: 1, horarioInicio: 1 });

      // Calcular próximas aulas da semana
      const proximasAulas = [];
      const diasSemana = [
        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
      ];

      for (let i = 0; i < 7; i++) {
        const dia = (diaSemanaAtual + i) % 7;
        const aulasDoDia = aulas.filter((aula) => aula.diaSemana === dia);

        if (aulasDoDia.length > 0) {
          proximasAulas.push({
            dia: diasSemana[dia],
            diaSemana: dia,
            aulas: aulasDoDia,
          });
        }
      }

      return res.json({
        aulas,
        proximasAulas,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          error: "Erro ao buscar próximas aulas",
          details: error.message,
        });
    }
  }

  // Visualizar aula específica
  async getById(req, res) {
    try {
      const aula = await AulaSemanal.findById(req.params.id)
        .populate("turmaId", "nome anoLetivo periodo nivelEducacional")
        .populate("materiaId", "nome")
        .populate("professorId", "userId");

      if (!aula) {
        return res.status(404).json({ error: "Aula não encontrada" });
      }

      return res.json(aula);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar aula", details: error.message });
    }
  }

  // Atualizar aula semanal
  async update(req, res) {
    try {
      const aula = await AulaSemanal.findById(req.params.id);

      if (!aula) {
        return res.status(404).json({ error: "Aula não encontrada" });
      }

      const aulaAtualizada = await AulaSemanal.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      )
        .populate("turmaId", "nome nivelEducacional")
        .populate("materiaId", "nome")
        .populate("professorId", "userId");

      return res.json(aulaAtualizada);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar aula", details: error.message });
    }
  }

  // Deletar aula semanal
  async delete(req, res) {
    try {
      const aula = await AulaSemanal.findByIdAndDelete(req.params.id);

      if (!aula) {
        return res.status(404).json({ error: "Aula não encontrada" });
      }

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar aula", details: error.message });
    }
  }
}

module.exports = new AulaSemanalController();
