const Turma = require("../models/turma.model.js");
const Student = require("../models/student.model.js");

class TurmaController {
  async create(req, res) {
    try {
      const { nome, periodo, nivelEducacional, anoLetivo, alunos, professores, materias } = req.body;

      // Validar campos obrigatórios
      if (!nome || !periodo || !nivelEducacional) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
      }

      // Definir ano letivo como ano atual se não fornecido
      const anoLetivoFinal = anoLetivo || new Date().getFullYear();

      // Validar se já existe turma com mesmo nome, anoLetivo e nivelEducacional
      const turmaExistente = await Turma.findOne({
        nome,
        anoLetivo: anoLetivoFinal,
        nivelEducacional,
      });

      if (turmaExistente) {
        // Formatar nivelEducacional para exibição
        const nivelFormatado = nivelEducacional === "maternal" 
          ? "Maternal" 
          : nivelEducacional === "fundamental" 
          ? "Fundamental" 
          : "Ensino Médio";
        
        return res.status(400).json({ 
          error: `A turma ${nome} de ${anoLetivoFinal}/ ${nivelFormatado} já existe` 
        });
      }

      // Validar se algum aluno já está em outra turma do mesmo ano letivo
      if (alunos && alunos.length > 0) {
        // Buscar todas as turmas do mesmo ano letivo
        const turmasDoAno = await Turma.find({
          anoLetivo: anoLetivoFinal,
        });

        // Verificar se algum aluno selecionado já está em alguma dessas turmas
        for (const alunoId of alunos) {
          // Verificar se o aluno está em alguma turma do mesmo ano letivo
          const turmaComAluno = turmasDoAno.find((turma) => {
            return turma.alunos.some(
              (id) => id.toString() === alunoId.toString()
            );
          });
          
          if (turmaComAluno) {
            // Buscar nome do aluno para mensagem de erro
            const aluno = await Student.findById(alunoId).populate("userId", "name");
            const nomeAluno = aluno?.userId?.name || "Aluno";
            
            return res.status(400).json({ 
              error: `O aluno ${nomeAluno} já está matriculado em uma turma do ano letivo ${anoLetivoFinal}` 
            });
          }
        }
      }

      const turma = await Turma.create({
        nome,
        periodo,
        nivelEducacional,
        anoLetivo: anoLetivoFinal,
        alunos: alunos || [],
        professores: professores || [],
        materias: materias || [],
        status: "ativa",
      });
      return res.status(201).json(turma);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao criar turma", details: error.message });
    }
  }

  async list(req, res) {
    try {
      const { status, nivelEducacional, anoLetivo, periodo, ordem } = req.query;

      // Construir query base
      const query = {};
      
      // Filtrar por status se fornecido
      if (status) {
        query.status = status;
      }

      // Filtrar por nível educacional se fornecido
      if (nivelEducacional) {
        query.nivelEducacional = nivelEducacional;
      }

      // Filtrar por ano letivo se fornecido
      if (anoLetivo) {
        query.anoLetivo = parseInt(anoLetivo);
      }

      // Filtrar por período se fornecido
      if (periodo) {
        query.periodo = periodo;
      }

      // Buscar turmas com filtros
      let turmas = await Turma.find(query)
        .populate("alunos", "userId")
        .populate("professores", "userId")
        .populate("materias", "nome");

      // Aplicar ordenação
      if (ordem) {
        switch (ordem) {
          case "a-z":
            turmas.sort((a, b) => {
              const nomeA = a.nome || "";
              const nomeB = b.nome || "";
              return nomeA.localeCompare(nomeB, "pt-BR");
            });
            break;
          case "z-a":
            turmas.sort((a, b) => {
              const nomeA = a.nome || "";
              const nomeB = b.nome || "";
              return nomeB.localeCompare(nomeA, "pt-BR");
            });
            break;
          case "recente":
            turmas.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            break;
          case "antigo":
            turmas.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateA - dateB;
            });
            break;
          default:
            // Ordenação padrão: mais recente primeiro
            turmas.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
        }
      } else {
        // Ordenação padrão: mais recente primeiro
        turmas.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
      }

      return res.json(turmas);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar turmas", details: error.message });
    }
  }

  // Professor vê suas próprias turmas
  async minhasTurmas(req, res) {
    try {
      const Teacher = require("../models/teacher.model.js");
      const { id: userId } = req.user;

      // Buscar o professor pelo userId
      const teacher = await Teacher.findOne({ userId })
        .populate({
          path: "turmas",
          select: "nome anoLetivo periodo nivelEducacional status createdAt",
        });

      if (!teacher) {
        // Se não encontrar professor, retornar array vazio
        return res.json([]);
      }

      // Retornar apenas as turmas do professor
      const turmas = teacher.turmas || [];
      return res.json(turmas);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar turmas", details: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { role, id: userId } = req.user;
      const turmaId = req.params.id;

      const turma = await Turma.findById(turmaId)
        .populate({
          path: "alunos",
          select: "userId status",
          populate: {
            path: "userId",
            select: "name email fotoPerfil",
          },
        })
        .populate({
          path: "professores",
          select: "userId status materias",
          populate: [
            {
              path: "userId",
              select: "name fotoPerfil",
            },
            {
              path: "materias",
              select: "nome",
            },
          ],
        })
        .populate("materias", "nome");

      if (!turma) {
        return res.status(404).json({ error: "Turma não encontrada" });
      }

      // Se for professor, verificar se ele faz parte desta turma ou leciona nesta turma
      if (role === "professor") {
        const Teacher = require("../models/teacher.model.js");
        const AulaSemanal = require("../models/aulaSemanal.model.js");
        const teacher = await Teacher.findOne({ userId });
        
        if (!teacher) {
          return res.status(403).json({ error: "Professor não encontrado" });
        }

        // Verificar se o professor está na lista de professores da turma
        const professorFazParte = turma.professores.some((prof) => {
          const profId = typeof prof === 'object' && prof !== null ? prof._id?.toString() : prof?.toString();
          return profId === teacher._id.toString();
        });

        // Se não está na lista, verificar se tem aulas semanais ativas nesta turma
        if (!professorFazParte) {
          const temAulasNaTurma = await AulaSemanal.findOne({
            turmaId: turmaId,
            professorId: teacher._id,
            status: "ativa",
          });

          if (!temAulasNaTurma) {
            return res.status(403).json({ error: "Você não tem permissão para visualizar esta turma" });
          }
        }
      }

      return res.json(turma);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar turma", details: error.message });
    }
  }

  async update(req, res) {
    try {
      const turma = await Turma.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      })
        .populate("alunos", "userId")
        .populate("professores", "userId")
        .populate("materias", "nome");

      if (!turma) {
        return res.status(404).json({ error: "Turma não encontrada" });
      }

      return res.json(turma);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar turma", details: error.message });
    }
  }

  async delete(req, res) {
    try {
      const turma = await Turma.findByIdAndDelete(req.params.id);

      if (!turma) {
        return res.status(404).json({ error: "Turma não encontrada" });
      }

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar turma", details: error.message });
    }
  }
}

module.exports = new TurmaController();
