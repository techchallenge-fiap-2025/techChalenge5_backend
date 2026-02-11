const NotaAtividade = require("../models/notaAtividade.model.js");
const Atividade = require("../models/atividade.model.js");
const Teacher = require("../models/teacher.model.js");
const Student = require("../models/student.model.js");
const Grade = require("../models/grade.model.js");
const GradeController = require("./grade.controller.js");

class NotaAtividadeController {
  // Listar notas de atividades
  async list(req, res) {
    try {
      const { role, id } = req.user;
      const { alunoId, materiaId, turmaId, periodo, tipo, atividadeId } = req.query;

      let query = {};

      // Se atividadeId for fornecido, não precisamos filtrar por professorId
      // porque a atividade já está associada ao professor correto
      if (role === "professor" && !atividadeId) {
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
      if (atividadeId) query.atividadeId = atividadeId;

      // Se tipo for especificado, buscar pela atividade
      if (tipo) {
        const atividades = await Atividade.find({ tipo });
        const atividadesIds = atividades.map(a => a._id);
        query.atividadeId = { $in: atividadesIds };
      }

      const notasAtividades = await NotaAtividade.find(query)
        .populate("alunoId", "_id userId")
        .populate("professorId", "userId")
        .populate("materiaId", "nome")
        .populate("turmaId", "nome")
        .populate("atividadeId", "nome tipo data horarioInicio horarioFim")
        .sort({ createdAt: -1 });

      return res.json(notasAtividades);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar notas de atividades", details: error.message });
    }
  }

  // Visualizar nota específica
  async getById(req, res) {
    try {
      const notaAtividade = await NotaAtividade.findById(req.params.id)
        .populate("alunoId", "userId")
        .populate("professorId", "userId")
        .populate("materiaId", "nome")
        .populate("turmaId", "nome")
        .populate("atividadeId", "nome tipo data horarioInicio horarioFim");

      if (!notaAtividade) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

      return res.json(notaAtividade);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar nota", details: error.message });
    }
  }

  // Adicionar/atualizar nota
  async adicionarNota(req, res) {
    try {
      const { role, id } = req.user;
      const { valor } = req.body;

      const notaAtividade = await NotaAtividade.findById(req.params.id);

      if (!notaAtividade) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          notaAtividade.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({
              error: "Você não tem permissão para editar esta nota",
            });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Converter valor para número decimal (float)
      let valorDecimal = null;
      if (valor !== null && valor !== undefined && valor !== "") {
        valorDecimal = parseFloat(valor);
        
        // Validar se é um número válido e está no range 0-10
        if (isNaN(valorDecimal)) {
          return res.status(400).json({ 
            error: "Valor inválido. A nota deve ser um número válido" 
          });
        }
        
        if (valorDecimal < 0 || valorDecimal > 10) {
          return res.status(400).json({ 
            error: "Valor inválido. A nota deve ser um número entre 0 e 10" 
          });
        }
      }

      // Atualizar o valor da nota
      notaAtividade.valor = valorDecimal;
      
      // Atualizar status baseado no tipo da atividade (se valor foi atribuído)
      if (valorDecimal !== null && valorDecimal !== undefined) {
        // Buscar a atividade para saber o tipo
        const Atividade = require("../models/atividade.model.js");
        const atividade = await Atividade.findById(notaAtividade.atividadeId);
        
        if (atividade) {
          if (atividade.tipo === "prova") {
            // Se tem nota, status deve ser "presente"
            notaAtividade.status = "presente";
          } else if (atividade.tipo === "trabalho") {
            // Se tem nota, status deve ser "entregue"
            notaAtividade.status = "entregue";
          }
        }
      }
      
      // Salvar a nota
      await notaAtividade.save();

      // Recalcular média do Grade
      try {
        const grade = await Grade.findOne({
          alunoId: notaAtividade.alunoId,
          materiaId: notaAtividade.materiaId,
          turmaId: notaAtividade.turmaId,
          periodo: notaAtividade.periodo,
        });

        if (grade) {
          await GradeController.recalcularMedia(grade);
          await grade.save();
        }
      } catch (gradeError) {
        // Log do erro mas não falha a operação de salvar a nota
        console.error("Erro ao recalcular média do Grade:", gradeError);
      }

      return res.json(notaAtividade);
    } catch (error) {
      console.error("Erro ao adicionar nota:", error);
      return res
        .status(500)
        .json({ 
          error: "Erro ao adicionar nota", 
          details: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
  }

  // Marcar presença/falta (para tipo "prova")
  async marcarPresencaFalta(req, res) {
    try {
      const { role, id } = req.user;
      const { status } = req.body; // "presente" ou "faltou"

      if (!["presente", "faltou"].includes(status)) {
        return res
          .status(400)
          .json({ error: "Status inválido. Use 'presente' ou 'faltou'" });
      }

      const notaAtividade = await NotaAtividade.findById(req.params.id)
        .populate("atividadeId");

      if (!notaAtividade) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

      if (notaAtividade.atividadeId.tipo !== "prova") {
        return res
          .status(400)
          .json({ error: "Esta funcionalidade é apenas para provas" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          notaAtividade.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({
              error: "Você não tem permissão para editar esta nota",
            });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      notaAtividade.status = status;
      if (status === "faltou") {
        notaAtividade.valor = null;
      }
      await notaAtividade.save();

      return res.json(notaAtividade);
    } catch (error) {
      return res
        .status(500)
        .json({
          error: "Erro ao marcar presença/falta",
          details: error.message,
        });
    }
  }

  // Marcar entrega (para tipo "trabalho")
  async marcarEntrega(req, res) {
    try {
      const { role, id } = req.user;
      const { entregue } = req.body; // true ou false

      const notaAtividade = await NotaAtividade.findById(req.params.id)
        .populate("atividadeId");

      if (!notaAtividade) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

      if (notaAtividade.atividadeId.tipo !== "trabalho") {
        return res
          .status(400)
          .json({ error: "Esta funcionalidade é apenas para trabalhos" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          notaAtividade.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({
              error: "Você não tem permissão para editar esta nota",
            });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      notaAtividade.status = entregue ? "entregue" : "nao_entregue";
      if (!entregue) {
        notaAtividade.valor = null;
      }
      await notaAtividade.save();

      return res.json(notaAtividade);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao marcar entrega", details: error.message });
    }
  }

  // Atualizar nota de atividade
  async update(req, res) {
    try {
      const { role, id } = req.user;
      const notaAtividade = await NotaAtividade.findById(req.params.id)
        .populate("atividadeId");

      if (!notaAtividade) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          notaAtividade.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({
              error: "Você não tem permissão para editar esta nota",
            });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Validar status baseado no tipo da atividade
      if (req.body.status) {
        if (notaAtividade.atividadeId.tipo === "prova") {
          if (!["presente", "faltou", "pendente"].includes(req.body.status)) {
            return res
              .status(400)
              .json({
                error:
                  "Status inválido para prova. Use 'presente', 'faltou' ou 'pendente'",
              });
          }
        } else if (notaAtividade.atividadeId.tipo === "trabalho") {
          if (
            !["entregue", "nao_entregue", "pendente"].includes(req.body.status)
          ) {
            return res
              .status(400)
              .json({
                error:
                  "Status inválido para trabalho. Use 'entregue', 'nao_entregue' ou 'pendente'",
              });
          }
        }
      }

      const notaAtualizada = await NotaAtividade.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
        }
      )
        .populate("alunoId", "userId")
        .populate("professorId", "userId")
        .populate("materiaId", "nome")
        .populate("turmaId", "nome")
        .populate("atividadeId", "nome tipo data horarioInicio horarioFim");

      // Recalcular média do Grade se valor foi alterado
      if (req.body.valor !== undefined) {
        const grade = await Grade.findOne({
          alunoId: notaAtividade.alunoId,
          materiaId: notaAtividade.materiaId,
          turmaId: notaAtividade.turmaId,
          periodo: notaAtividade.periodo,
        });

        if (grade) {
          await GradeController.recalcularMedia(grade);
          await grade.save();
        }
      }

      return res.json(notaAtualizada);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar nota", details: error.message });
    }
  }

  // Deletar nota de atividade
  async delete(req, res) {
    try {
      const { role, id } = req.user;
      const notaAtividade = await NotaAtividade.findById(req.params.id);

      if (!notaAtividade) {
        return res.status(404).json({ error: "Nota não encontrada" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          notaAtividade.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({
              error: "Você não tem permissão para deletar esta nota",
            });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Remover nota do Grade
      const grade = await Grade.findOne({
        alunoId: notaAtividade.alunoId,
        materiaId: notaAtividade.materiaId,
        turmaId: notaAtividade.turmaId,
        periodo: notaAtividade.periodo,
      });

      if (grade) {
        grade.atividades = grade.atividades.filter(
          (id) => id.toString() !== notaAtividade._id.toString()
        );
        await GradeController.recalcularMedia(grade);
        await grade.save();
      }

      await NotaAtividade.findByIdAndDelete(req.params.id);

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar nota", details: error.message });
    }
  }
}

module.exports = new NotaAtividadeController();
