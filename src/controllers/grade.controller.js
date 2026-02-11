const Grade = require("../models/grade.model.js");
const Student = require("../models/student.model.js");
const Teacher = require("../models/teacher.model.js");
const NotaAtividade = require("../models/notaAtividade.model.js");

class GradeController {
  // Criar ou atualizar Grade
  async create(req, res) {
    try {
      const { alunoId, materiaId, turmaId, periodo } = req.body;
      const { role, id } = req.user;

      // Apenas professor ou admin podem criar Grade
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (!teacher) {
          return res.status(403).json({ error: "Professor não encontrado" });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const grade = await Grade.create({
        alunoId,
        professorId:
          role === "professor"
            ? (
                await Teacher.findOne({ userId: id })
              )._id
            : req.body.professorId,
        materiaId,
        turmaId,
        periodo,
        atividades: [],
      });

      return res.status(201).json(grade);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao criar boletim", details: error.message });
    }
  }


  // Listar Grades (professor vê seus alunos, aluno vê seu boletim, admin vê todos)
  async list(req, res) {
    try {
      const { role, id } = req.user;
      const { alunoId, materiaId, turmaId, periodo } = req.query;

      let query = {};

      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (!teacher) {
          return res.status(403).json({ error: "Professor não encontrado" });
        }
        query.professorId = teacher._id;
      } else if (role === "aluno") {
        const student = await Student.findOne({ userId: id });
        if (!student) {
          return res.status(403).json({ error: "Aluno não encontrado" });
        }
        query.alunoId = student._id;
      }

      if (alunoId) query.alunoId = alunoId;
      if (materiaId) query.materiaId = materiaId;
      if (turmaId) query.turmaId = turmaId;
      if (periodo) query.periodo = periodo;

      const grades = await Grade.find(query)
        .populate("alunoId", "userId")
        .populate("professorId", "userId")
        .populate("materiaId", "nome")
        .populate("turmaId", "nome")
        .populate({
          path: "atividades",
          populate: {
            path: "atividadeId",
            select: "nome tipo data horarioInicio horarioFim",
          },
        })
        .sort({ periodo: -1, createdAt: -1 });

      return res.json(grades);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar boletins", details: error.message });
    }
  }

  // Aluno vê seu boletim completo
  async meuBoletim(req, res) {
    try {
      const { id } = req.user;
      const student = await Student.findOne({ userId: id });

      if (!student) {
        return res.status(403).json({ error: "Aluno não encontrado" });
      }

      const grades = await Grade.find({ alunoId: student._id })
        .populate("materiaId", "nome cargaHoraria")
        .populate({
          path: "atividades",
          populate: {
            path: "atividadeId",
            select: "nome tipo data horarioInicio horarioFim",
          },
        })
        .sort({ periodo: -1, materiaId: 1 });

      return res.json(grades);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar boletim", details: error.message });
    }
  }

  // Visualizar Grade específico
  async getById(req, res) {
    try {
      const grade = await Grade.findById(req.params.id)
        .populate("alunoId", "userId")
        .populate("professorId", "userId")
        .populate("materiaId", "nome")
        .populate("turmaId", "nome")
        .populate({
          path: "atividades",
          populate: {
            path: "atividadeId",
            select: "nome tipo data horarioInicio horarioFim",
          },
        });

      if (!grade) {
        return res.status(404).json({ error: "Boletim não encontrado" });
      }

      return res.json(grade);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar boletim", details: error.message });
    }
  }

  // Atualizar Grade
  async update(req, res) {
    try {
      const { role, id } = req.user;
      const grade = await Grade.findById(req.params.id);

      if (!grade) {
        return res.status(404).json({ error: "Boletim não encontrado" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          grade.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({ error: "Você não tem permissão para editar este boletim" });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const gradeAtualizado = await Grade.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      )
        .populate("alunoId", "userId")
        .populate("professorId", "userId")
        .populate("materiaId", "nome")
        .populate("turmaId", "nome");

      // Recalcular média se necessário
      await this.recalcularMedia(gradeAtualizado);
      await gradeAtualizado.save();

      return res.json(gradeAtualizado);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar boletim", details: error.message });
    }
  }

  // Recalcular média final
  async recalcularMedia(grade) {
    try {
      const notasAtividades = await NotaAtividade.find({
        _id: { $in: grade.atividades },
      }).populate("atividadeId");

      let somaNotas = 0;
      let quantidadeNotas = 0;

      // Somar notas das atividades (apenas atividades com nota e status válido)
      notasAtividades.forEach((notaAtividade) => {
        const atividade = notaAtividade.atividadeId;
        
        // Verificar se atividade existe antes de acessar propriedades
        if (!atividade) {
          return; // Pular se atividade não estiver populada
        }
        
        // Para provas: só conta se presente e tem nota
        if (atividade.tipo === "prova") {
          if (
            notaAtividade.status === "presente" &&
            notaAtividade.valor !== null &&
            notaAtividade.valor !== undefined
          ) {
            somaNotas += parseFloat(notaAtividade.valor) || 0;
            quantidadeNotas++;
          }
        }
        // Para trabalhos: só conta se entregue e tem nota
        else if (atividade.tipo === "trabalho") {
          if (
            notaAtividade.status === "entregue" &&
            notaAtividade.valor !== null &&
            notaAtividade.valor !== undefined
          ) {
            somaNotas += parseFloat(notaAtividade.valor) || 0;
            quantidadeNotas++;
          }
        }
      });

      // Calcular média
      grade.mediaFinal = quantidadeNotas > 0 ? somaNotas / quantidadeNotas : 0;
    } catch (error) {
      console.error("Erro ao recalcular média:", error);
    }
  }

  // Deletar Grade (apenas admin)
  async delete(req, res) {
    try {
      const grade = await Grade.findByIdAndDelete(req.params.id);

      if (!grade) {
        return res.status(404).json({ error: "Boletim não encontrado" });
      }

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar boletim", details: error.message });
    }
  }
}

const instance = new GradeController();
module.exports = instance;
