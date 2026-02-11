const Student = require("../models/student.model.js");
const Teacher = require("../models/teacher.model.js");
const Turma = require("../models/turma.model.js");

class ListController {
  async students(req, res) {
    try {
      const { turmaId, status, ordem } = req.query;

      // Construir query base
      const query = {};
      
      // Filtrar por status se fornecido
      if (status) {
        query.status = status;
      }

      // Buscar alunos com filtros
      let students = await Student.find(query)
        .populate("userId", "name email idade cpf fotoPerfil")
        .populate("turmaId", "nome anoLetivo periodo")
        .populate("materias", "nome cargaHoraria")
        .populate("responsaveis", "nome telefone parentesco");

      // Buscar turma atual de cada aluno (turma ativa do ano letivo atual)
      const anoLetivoAtual = new Date().getFullYear();
      let studentsComTurmaAtual = await Promise.all(
        students.map(async (student) => {
          // Buscar turma atual do aluno (turma ativa do ano letivo atual onde o aluno está no array alunos)
          const turmaAtual = await Turma.findOne({
            alunos: student._id,
            anoLetivo: anoLetivoAtual,
            status: "ativa",
          }).select("nome anoLetivo periodo nivelEducacional status");

          // Se encontrou uma turma atual, usar ela; caso contrário, usar turmaId populado
          const turmaParaExibir = turmaAtual || student.turmaId;

          // Criar objeto de resposta com turma atualizada
          const studentObject = student.toObject();
          studentObject.turmaId = turmaParaExibir;

          return studentObject;
        }),
      );

      // Filtrar por turmaId se fornecido (após buscar turmas atuais)
      if (turmaId) {
        studentsComTurmaAtual = studentsComTurmaAtual.filter((student) => {
          const studentTurmaId = student.turmaId?._id?.toString() || student.turmaId?.toString();
          return studentTurmaId === turmaId;
        });
      }

      // Aplicar ordenação
      if (ordem) {
        switch (ordem) {
          case "a-z":
            studentsComTurmaAtual.sort((a, b) => {
              const nomeA = a.userId?.name || "";
              const nomeB = b.userId?.name || "";
              return nomeA.localeCompare(nomeB, "pt-BR");
            });
            break;
          case "z-a":
            studentsComTurmaAtual.sort((a, b) => {
              const nomeA = a.userId?.name || "";
              const nomeB = b.userId?.name || "";
              return nomeB.localeCompare(nomeA, "pt-BR");
            });
            break;
          case "recente":
            studentsComTurmaAtual.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            break;
          case "antigo":
            studentsComTurmaAtual.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateA - dateB;
            });
            break;
          default:
            // Ordenação padrão: mais recente primeiro
            studentsComTurmaAtual.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
        }
      } else {
        // Ordenação padrão: mais recente primeiro
        studentsComTurmaAtual.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
      }

      return res.json(studentsComTurmaAtual);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar alunos", details: error.message });
    }
  }

  async teacher(req, res) {
    try {
      const { turmaId, materiaId, status, ordem } = req.query;

      // Construir query base
      const query = {};
      
      // Filtrar por status se fornecido
      if (status) {
        query.status = status;
      }

      // Buscar professores com filtros
      let teachers = await Teacher.find(query)
        .populate("userId", "name email fotoPerfil")
        .populate("materias", "nome descricao status")
        .populate("turmas", "nome anoLetivo");

      // Filtrar por turmaId se fornecido
      if (turmaId) {
        teachers = teachers.filter((teacher) => {
          return teacher.turmas.some((turma) => {
            const turmaIdStr = turma?._id?.toString() || turma?.toString();
            return turmaIdStr === turmaId;
          });
        });
      }

      // Filtrar por materiaId se fornecido
      if (materiaId) {
        teachers = teachers.filter((teacher) => {
          return teacher.materias.some((materia) => {
            const materiaIdStr = materia?._id?.toString() || materia?.toString();
            return materiaIdStr === materiaId;
          });
        });
      }

      // Aplicar ordenação
      if (ordem) {
        switch (ordem) {
          case "a-z":
            teachers.sort((a, b) => {
              const nomeA = a.userId?.name || "";
              const nomeB = b.userId?.name || "";
              return nomeA.localeCompare(nomeB, "pt-BR");
            });
            break;
          case "z-a":
            teachers.sort((a, b) => {
              const nomeA = a.userId?.name || "";
              const nomeB = b.userId?.name || "";
              return nomeB.localeCompare(nomeA, "pt-BR");
            });
            break;
          case "recente":
            teachers.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            break;
          case "antigo":
            teachers.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateA - dateB;
            });
            break;
          default:
            // Ordenação padrão: mais recente primeiro
            teachers.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
        }
      } else {
        // Ordenação padrão: mais recente primeiro
        teachers.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
      }

      return res.json(teachers);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar professores", details: error.message });
    }
  }
}

module.exports = new ListController();
