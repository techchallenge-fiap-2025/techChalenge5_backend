const Materia = require("../models/materia.model.js");

class MateriaController {
  async create(req, res) {
    try {
      // Validar campos obrigatórios
      if (!req.body.nome || !req.body.nome.trim()) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      const nomeMateria = req.body.nome.trim();

      // Verificar se já existe matéria com este nome
      const materiaExistente = await Materia.findOne({ nome: nomeMateria });
      if (materiaExistente) {
        return res
          .status(400)
          .json({ error: `Matéria ${nomeMateria} já cadastrado` });
      }

      // Criar matéria com status "ativa" por padrão
      const materia = await Materia.create({
        nome: nomeMateria,
        descricao: req.body.descricao || "",
        status: "ativa",
      });
      return res.status(201).json(materia);
    } catch (error) {
      // Verificar se é erro de duplicação (nome único) - fallback caso a verificação acima não funcione
      if (error.code === 11000) {
        const nomeMateria = req.body.nome?.trim() || "com este nome";
        return res
          .status(400)
          .json({ error: `Matéria ${nomeMateria} já cadastrado` });
      }
      return res
        .status(500)
        .json({ error: "Erro ao criar matéria", details: error.message });
    }
  }

  async list(req, res) {
    try {
      const { status, ordem } = req.query;

      // Construir query base
      const query = {};
      
      // Filtrar por status se fornecido
      if (status) {
        query.status = status;
      }

      // Buscar matérias com filtros
      let materias = await Materia.find(query);

      // Aplicar ordenação
      if (ordem) {
        switch (ordem) {
          case "a-z":
            materias.sort((a, b) => {
              const nomeA = a.nome || "";
              const nomeB = b.nome || "";
              return nomeA.localeCompare(nomeB, "pt-BR");
            });
            break;
          case "z-a":
            materias.sort((a, b) => {
              const nomeA = a.nome || "";
              const nomeB = b.nome || "";
              return nomeB.localeCompare(nomeA, "pt-BR");
            });
            break;
          case "recente":
            materias.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateB - dateA;
            });
            break;
          case "antigo":
            materias.sort((a, b) => {
              const dateA = new Date(a.createdAt || 0);
              const dateB = new Date(b.createdAt || 0);
              return dateA - dateB;
            });
            break;
          default:
            // Ordenação padrão: alfabética (A-Z)
            materias.sort((a, b) => {
              const nomeA = a.nome || "";
              const nomeB = b.nome || "";
              return nomeA.localeCompare(nomeB, "pt-BR");
            });
        }
      } else {
        // Ordenação padrão: alfabética (A-Z)
        materias.sort((a, b) => {
          const nomeA = a.nome || "";
          const nomeB = b.nome || "";
          return nomeA.localeCompare(nomeB, "pt-BR");
        });
      }

      return res.json(materias);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar matérias", details: error.message });
    }
  }

  async getById(req, res) {
    try {
      const Teacher = require("../models/teacher.model.js");
      const materiaId = req.params.id;
      const { role, id: userId } = req.user;

      const materia = await Materia.findById(materiaId);

      if (!materia) {
        return res.status(404).json({ error: "Matéria não encontrada" });
      }

      // Se for professor, verificar se ele leciona esta matéria
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId });

        if (!teacher) {
          return res.status(403).json({ error: "Professor não encontrado" });
        }

        // Verificar se o professor leciona esta matéria
        const professorLeciona = teacher.materias.some((m) => {
          const mId =
            typeof m === "object" && m !== null
              ? m._id?.toString()
              : m?.toString();
          return mId === materiaId;
        });

        if (!professorLeciona) {
          return res
            .status(403)
            .json({
              error: "Você não tem permissão para visualizar esta matéria",
            });
        }
      }

      // Buscar todos os professores que lecionam esta matéria
      const professoresDaMateria = await Teacher.find({
        materias: materiaId,
      })
        .populate({
          path: "userId",
          select: "name fotoPerfil",
        })
        .select("userId status")
        .lean();

      // Converter para objeto com professores populados
      const materiaComProfessores = {
        ...materia.toObject(),
        professores: professoresDaMateria,
      };

      return res.json(materiaComProfessores);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar matéria", details: error.message });
    }
  }

  async update(req, res) {
    try {
      // Validar campos obrigatórios
      if (!req.body.nome || !req.body.nome.trim()) {
        return res.status(400).json({ error: "Nome é obrigatório" });
      }

      const nomeMateria = req.body.nome.trim();
      const materiaId = req.params.id;

      // Verificar se já existe outra matéria com este nome (exceto a atual)
      const materiaExistente = await Materia.findOne({
        nome: nomeMateria,
        _id: { $ne: materiaId },
      });

      if (materiaExistente) {
        return res
          .status(400)
          .json({ error: `Matéria ${nomeMateria} já cadastrado` });
      }

      const materia = await Materia.findByIdAndUpdate(
        materiaId,
        {
          nome: nomeMateria,
          descricao: req.body.descricao || "",
        },
        {
          new: true,
        },
      );

      if (!materia) {
        return res.status(404).json({ error: "Matéria não encontrada" });
      }

      return res.json(materia);
    } catch (error) {
      // Verificar se é erro de duplicação (nome único) - fallback
      if (error.code === 11000) {
        const nomeMateria = req.body.nome?.trim() || "com este nome";
        return res
          .status(400)
          .json({ error: `Matéria ${nomeMateria} já cadastrado` });
      }
      return res
        .status(500)
        .json({ error: "Erro ao atualizar matéria", details: error.message });
    }
  }

  async delete(req, res) {
    try {
      const Teacher = require("../models/teacher.model.js");
      const materiaId = req.params.id;

      // Verificar se a matéria existe
      const materia = await Materia.findById(materiaId);
      if (!materia) {
        return res.status(404).json({ error: "Matéria não encontrada" });
      }

      // Verificar se existem professores relacionados com esta matéria
      const professoresRelacionados = await Teacher.find({
        materias: materiaId,
      });

      if (professoresRelacionados.length > 0) {
        return res.status(400).json({
          error:
            "Materia não pode ser deletada pois existe professores relacionados",
        });
      }

      // Se não houver professores relacionados, deletar a matéria
      await Materia.findByIdAndDelete(materiaId);

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar matéria", details: error.message });
    }
  }

  // Professor vê suas próprias matérias
  async minhasMaterias(req, res) {
    try {
      const Teacher = require("../models/teacher.model.js");
      const { id: userId } = req.user;

      // Buscar o professor pelo userId
      const teacher = await Teacher.findOne({ userId }).populate({
        path: "materias",
        select: "nome descricao status createdAt",
      });

      if (!teacher) {
        // Se não encontrar professor, retornar array vazio ao invés de erro
        return res.json([]);
      }

      // Retornar apenas as matérias do professor
      const materias = teacher.materias || [];
      return res.json(materias);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar matérias", details: error.message });
    }
  }
}

module.exports = new MateriaController();
