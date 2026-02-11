const Responsavel = require("../models/responsavel.model.js");
const Student = require("../models/student.model.js");
const User = require("../models/user.model.js");

class ResponsavelController {
  // Criar responsável
  async create(req, res) {
    try {
      const { nome, cpf, telefone, email, parentesco, alunos } = req.body;

      // Validar campos obrigatórios
      if (!nome || !cpf || !telefone || !email || !parentesco) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
      }

      // Verificar se CPF já existe em User (alunos e professores)
      const cpfExistsInUser = await User.findOne({ cpf });
      if (cpfExistsInUser) {
        return res.status(400).json({ error: "O CPF já está cadastrado no sistema" });
      }

      // Verificar se CPF já existe em Responsavel
      const cpfExistsInResponsavel = await Responsavel.findOne({ cpf });
      if (cpfExistsInResponsavel) {
        return res.status(400).json({ error: "O CPF já está cadastrado no sistema" });
      }

      // Verificar se telefone já existe em Responsavel
      const telefoneExists = await Responsavel.findOne({ telefone });
      if (telefoneExists) {
        return res.status(400).json({ error: "Telefone já cadastrado no sisitema" });
      }

      // Verificar se email já existe em User (alunos e professores)
      const emailExistsInUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (emailExistsInUser) {
        return res.status(400).json({ error: "E-mail já cadastrado no sistema" });
      }

      // Verificar se email já existe em Responsavel
      const emailExistsInResponsavel = await Responsavel.findOne({ email: email.toLowerCase().trim() });
      if (emailExistsInResponsavel) {
        return res.status(400).json({ error: "E-mail já cadastrado no sistema" });
      }

      const responsavel = await Responsavel.create({
        nome,
        cpf,
        telefone,
        email: email.toLowerCase().trim(),
        parentesco,
        alunos: alunos || [],
        active: true, // Sempre ativo ao criar
      });

      // Associar responsável aos alunos
      if (alunos && alunos.length > 0) {
        for (const alunoId of alunos) {
          await Student.findByIdAndUpdate(alunoId, {
            $addToSet: { responsaveis: responsavel._id },
          });
        }
      }

      return res.status(201).json(responsavel);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao criar responsável", details: error.message });
    }
  }

  // Listar responsáveis
  async list(req, res) {
    try {
      const { alunoId, ordem } = req.query;
      let query = {};

      if (alunoId) {
        query.alunos = alunoId;
      }

      // Retornar todos os responsáveis (a página de listagem precisa ver todos)
      // O filtro de ativos será feito no frontend quando necessário (ex: formulários de aluno)

      let responsaveis = await Responsavel.find(query)
        .populate({
          path: "alunos",
          select: "userId status",
          populate: {
            path: "userId",
            select: "name email fotoPerfil",
          },
        });

      // Aplicar ordenação
      if (ordem) {
        switch (ordem) {
          case "a-z":
            responsaveis.sort((a, b) => {
              const nomeA = a.nome || "";
              const nomeB = b.nome || "";
              return nomeA.localeCompare(nomeB, "pt-BR");
            });
            break;
          case "z-a":
            responsaveis.sort((a, b) => {
              const nomeA = a.nome || "";
              const nomeB = b.nome || "";
              return nomeB.localeCompare(nomeA, "pt-BR");
            });
            break;
          case "recente":
            responsaveis.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            break;
          case "antigo":
            responsaveis.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateA - dateB;
            });
            break;
          default:
            // Ordenação padrão: alfabética (A-Z)
            responsaveis.sort((a, b) => {
              const nomeA = a.nome || "";
              const nomeB = b.nome || "";
              return nomeA.localeCompare(nomeB, "pt-BR");
            });
        }
      } else {
        // Ordenação padrão: alfabética (A-Z)
        responsaveis.sort((a, b) => {
          const nomeA = a.nome || "";
          const nomeB = b.nome || "";
          return nomeA.localeCompare(nomeB, "pt-BR");
        });
      }

      return res.json(responsaveis);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar responsáveis", details: error.message });
    }
  }

  // Visualizar responsável específico
  async getById(req, res) {
    try {
      const responsavel = await Responsavel.findById(req.params.id).populate({
        path: "alunos",
        select: "userId turmaId status",
        populate: [
          {
            path: "userId",
            select: "name fotoPerfil",
          },
          {
            path: "turmaId",
            select: "nome",
          },
        ],
      });

      if (!responsavel) {
        return res.status(404).json({ error: "Responsável não encontrado" });
      }

      return res.json(responsavel);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar responsável", details: error.message });
    }
  }

  // Atualizar responsável
  async update(req, res) {
    try {
      const { nome, cpf, telefone, email, parentesco } = req.body;
      const responsavelId = req.params.id;

      // Validar campos obrigatórios
      if (!nome || !cpf || !telefone || !email || !parentesco) {
        return res.status(400).json({ error: "Todos os campos são obrigatórios" });
      }

      // Buscar responsável atual
      const responsavelAtual = await Responsavel.findById(responsavelId);
      if (!responsavelAtual) {
        return res.status(404).json({ error: "Responsável não encontrado" });
      }

      // Verificar se CPF já existe em User (alunos e professores) - exceto o próprio
      if (cpf !== responsavelAtual.cpf) {
        const cpfExistsInUser = await User.findOne({ cpf });
        if (cpfExistsInUser) {
          return res.status(400).json({ error: "O CPF já está cadastrado no sistema" });
        }

        // Verificar se CPF já existe em Responsavel - exceto o próprio
        const cpfExistsInResponsavel = await Responsavel.findOne({ 
          cpf, 
          _id: { $ne: responsavelId } 
        });
        if (cpfExistsInResponsavel) {
          return res.status(400).json({ error: "O CPF já está cadastrado no sistema" });
        }
      }

      // Verificar se telefone já existe em Responsavel - exceto o próprio
      if (telefone !== responsavelAtual.telefone) {
        const telefoneExists = await Responsavel.findOne({ 
          telefone, 
          _id: { $ne: responsavelId } 
        });
        if (telefoneExists) {
          return res.status(400).json({ error: "Telefone já cadastrado no sisitema" });
        }
      }

      // Verificar se email já existe em User (alunos e professores) - exceto o próprio
      const emailLower = email.toLowerCase().trim();
      if (emailLower !== responsavelAtual.email?.toLowerCase()) {
        const emailExistsInUser = await User.findOne({ email: emailLower });
        if (emailExistsInUser) {
          return res.status(400).json({ error: "E-mail já cadastrado no sistema" });
        }

        // Verificar se email já existe em Responsavel - exceto o próprio
        const emailExistsInResponsavel = await Responsavel.findOne({ 
          email: emailLower, 
          _id: { $ne: responsavelId } 
        });
        if (emailExistsInResponsavel) {
          return res.status(400).json({ error: "E-mail já cadastrado no sistema" });
        }
      }

      // Atualizar responsável
      const responsavel = await Responsavel.findByIdAndUpdate(
        responsavelId,
        {
          nome,
          cpf,
          telefone,
          email: emailLower,
          parentesco,
        },
        {
          new: true,
        }
      ).populate("alunos", "userId");

      return res.json(responsavel);
    } catch (error) {
      return res
        .status(500)
        .json({
          error: "Erro ao atualizar responsável",
          details: error.message,
        });
    }
  }

  // Associar responsável a aluno
  async associarAluno(req, res) {
    try {
      const { responsavelId, alunoId } = req.body;

      const responsavel = await Responsavel.findById(responsavelId);
      if (!responsavel) {
        return res.status(404).json({ error: "Responsável não encontrado" });
      }

      const aluno = await Student.findById(alunoId);
      if (!aluno) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      // Adicionar aluno ao responsável
      if (!responsavel.alunos.includes(alunoId)) {
        responsavel.alunos.push(alunoId);
        await responsavel.save();
      }

      // Adicionar responsável ao aluno
      if (!aluno.responsaveis.includes(responsavelId)) {
        aluno.responsaveis.push(responsavelId);
        await aluno.save();
      }

      return res.json({ message: "Associação realizada com sucesso" });
    } catch (error) {
      return res
        .status(500)
        .json({
          error: "Erro ao associar responsável",
          details: error.message,
        });
    }
  }

  // Remover associação responsável-aluno
  async removerAssociacao(req, res) {
    try {
      const { responsavelId, alunoId } = req.body;

      // Remover do responsável
      await Responsavel.findByIdAndUpdate(responsavelId, {
        $pull: { alunos: alunoId },
      });

      // Remover do aluno
      await Student.findByIdAndUpdate(alunoId, {
        $pull: { responsaveis: responsavelId },
      });

      return res.json({ message: "Associação removida com sucesso" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao remover associação", details: error.message });
    }
  }

  // Alternar status ativo/inativo do responsável
  async toggleActive(req, res) {
    try {
      const responsavelId = req.params.id;
      const responsavel = await Responsavel.findById(responsavelId);

      if (!responsavel) {
        return res.status(404).json({ error: "Responsável não encontrado" });
      }

      // Alternar o status active
      responsavel.active = !responsavel.active;
      await responsavel.save();

      // Buscar responsável atualizado com populate
      const responsavelAtualizado = await Responsavel.findById(responsavelId)
        .populate({
          path: "alunos",
          select: "userId status",
          populate: {
            path: "userId",
            select: "name email fotoPerfil",
          },
        });

      return res.json({
        message: responsavel.active
          ? "Responsável ativado com sucesso"
          : "Responsável desativado com sucesso",
        responsavel: responsavelAtualizado,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar status do responsável", details: error.message });
    }
  }

  // Deletar responsável
  async delete(req, res) {
    try {
      const responsavel = await Responsavel.findById(req.params.id);

      if (!responsavel) {
        return res.status(404).json({ error: "Responsável não encontrado" });
      }

      // Remover responsável dos alunos
      for (const alunoId of responsavel.alunos) {
        await Student.findByIdAndUpdate(alunoId, {
          $pull: { responsaveis: responsavel._id },
        });
      }

      await Responsavel.findByIdAndDelete(req.params.id);

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar responsável", details: error.message });
    }
  }
}

module.exports = new ResponsavelController();
