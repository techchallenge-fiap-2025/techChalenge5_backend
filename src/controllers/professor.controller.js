const User = require("../models/user.model.js");
const Teacher = require("../models/teacher.model.js");
const Curso = require("../models/curso.model.js");
const Student = require("../models/student.model.js");
const ProgressoCurso = require("../models/progressoCurso.model.js");
const bcrypt = require("bcryptjs");
const uploadService = require("../services/upload.service");

class ProfessorController {
  async create(req, res) {
    try {
      const {
        name,
        email,
        password,
        idade,
        cpf,
        cepEndereco,
        endereco,
        materiasIds,
      } = req.body;

      // Validar campos obrigatórios
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
      }

      // Validar CEP Endereço
      if (!cepEndereco || cepEndereco.replace(/\D/g, "").length !== 8) {
        return res.status(400).json({ error: "CEP Endereço é obrigatório e deve conter 8 dígitos" });
      }

      // Verificar se email já existe
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }

      // Verificar se CPF já existe
      if (cpf) {
        const cpfExists = await User.findOne({ cpf });
        if (cpfExists) {
          return res.status(400).json({ error: "CPF já cadastrado" });
        }
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Preparar endereço com CEP formatado
      const enderecoCompleto = {
        ...endereco,
        cep: cepEndereco.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2"),
      };

      // Criar usuário
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "professor",
        idade,
        cpf,
        endereco: enderecoCompleto,
        active: true,
      });

      // Criar professor (turmas serão definidas posteriormente nos formulários de turmas)
      const professor = await Teacher.create({
        userId: user._id,
        status: "ativo", // Status padrão conforme modelo
        turmas: [],
        materias: materiasIds || [],
      });

      return res.status(201).json({
        message: "Professor criado com sucesso",
        userId: user._id,
        professorId: professor._id,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao criar professor", details: error.message });
    }
  }

  async getMe(req, res) {
    try {
      const userId = req.user.id; // ID do User do token JWT
      const Turma = require("../models/turma.model.js");
      
      const professor = await Teacher.findOne({ userId })
        .populate({
          path: "userId",
          select: "-password", // Excluir senha
        })
        .populate({
          path: "materias",
          select: "nome",
        })
        .populate({
          path: "cursos",
          select: "titulo descricao capitulos alunosInscritos",
          populate: {
            path: "professorId",
            populate: {
              path: "userId",
              select: "name",
            },
          },
        });

      if (!professor) {
        return res.status(404).json({ error: "Professor não encontrado" });
      }

      const AulaSemanal = require("../models/aulaSemanal.model.js");
      const mongoose = require("mongoose");
      
      // Buscar todas as turmas onde o professor está no array professores
      const turmasPorProfessores = await Turma.find({
        professores: professor._id,
      })
        .select("_id nome anoLetivo periodo nivelEducacional status")
        .lean();

      // Buscar turmas através de aulas semanais ativas
      const aulasSemanais = await AulaSemanal.find({
        professorId: professor._id,
        status: "ativa",
      })
        .select("turmaId")
        .populate("turmaId", "_id")
        .lean();

      // Extrair IDs únicos das turmas das aulas semanais
      const turmasIdsDasAulas = [];
      aulasSemanais.forEach((aula) => {
        if (aula.turmaId) {
          const turmaId = typeof aula.turmaId === 'object' && aula.turmaId._id 
            ? aula.turmaId._id 
            : aula.turmaId;
          if (turmaId && !turmasIdsDasAulas.some(id => id.toString() === turmaId.toString())) {
            turmasIdsDasAulas.push(turmaId);
          }
        }
      });

      // Buscar turmas das aulas semanais que não estão já na lista de professores
      const idsTurmasPorProfessores = turmasPorProfessores.map(t => t._id);
      const turmasPorAulas = turmasIdsDasAulas.length > 0 
        ? await Turma.find({
            _id: { 
              $in: turmasIdsDasAulas.map(id => 
                typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
              ),
              $nin: idsTurmasPorProfessores.map(id => 
                typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
              )
            }
          })
            .select("_id nome anoLetivo periodo nivelEducacional status")
            .lean()
        : [];

      // Combinar ambas as listas e remover duplicatas
      const todasTurmas = [...turmasPorProfessores, ...turmasPorAulas];
      const turmasUnicas = todasTurmas.filter((turma, index, self) =>
        index === self.findIndex((t) => t._id.toString() === turma._id.toString())
      );

      // Converter para objeto com turmas populadas
      const professorComTurmas = {
        ...professor.toObject(),
        turmas: turmasUnicas,
      };

      return res.json(professorComTurmas);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar perfil do professor", details: error.message });
    }
  }

  async getById(req, res) {
    try {
      const professorId = req.params.id;
      const Turma = require("../models/turma.model.js");
      
      const professor = await Teacher.findById(professorId)
        .populate({
          path: "userId",
          select: "-password", // Excluir senha
        })
        .populate({
          path: "materias",
          select: "nome",
        })
        .populate({
          path: "cursos",
          select: "titulo descricao capitulos alunosInscritos",
          populate: {
            path: "professorId",
            populate: {
              path: "userId",
              select: "name",
            },
          },
        });

      if (!professor) {
        return res.status(404).json({ error: "Professor não encontrado" });
      }

      // Buscar todas as turmas onde o professor está no array professores
      const turmasDoProfessor = await Turma.find({
        professores: professorId,
      })
        .select("nome anoLetivo")
        .lean();

      // Converter para objeto com turmas populadas
      const professorComTurmas = {
        ...professor.toObject(),
        turmas: turmasDoProfessor,
      };

      return res.json(professorComTurmas);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar professor", details: error.message });
    }
  }

  async update(req, res) {
    try {
      const professorId = req.params.id;
      const {
        name,
        email,
        password,
        idade,
        cpf,
        cepEndereco,
        endereco,
        turmasIds,
        materiasIds,
      } = req.body;

      // Buscar professor
      const professor = await Teacher.findById(professorId);
      if (!professor) {
        return res.status(404).json({ error: "Professor não encontrado" });
      }

      // Buscar usuário associado
      const user = await User.findById(professor.userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Validar campos obrigatórios
      if (!name || !email) {
        return res.status(400).json({ error: "Nome e email são obrigatórios" });
      }

      // Verificar se email já existe (exceto o próprio usuário)
      if (email !== user.email) {
        const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
        if (emailExists) {
          return res.status(400).json({ error: "Email já cadastrado" });
        }
      }

      // Verificar se CPF já existe (exceto o próprio usuário)
      if (cpf && cpf !== user.cpf) {
        const cpfExists = await User.findOne({ cpf, _id: { $ne: user._id } });
        if (cpfExists) {
          return res.status(400).json({ error: "CPF já cadastrado" });
        }
      }

      // Validar CEP Endereço
      if (!cepEndereco || cepEndereco.replace(/\D/g, "").length !== 8) {
        return res.status(400).json({ error: "CEP Endereço é obrigatório e deve conter 8 dígitos" });
      }

      // Preparar endereço com CEP formatado
      const enderecoCompleto = {
        ...endereco,
        cep: cepEndereco.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2"),
      };

      // Atualizar dados do usuário
      user.name = name;
      user.email = email;
      if (idade !== undefined) user.idade = idade;
      if (cpf) user.cpf = cpf;
      user.endereco = enderecoCompleto;

      // Atualizar senha apenas se fornecida
      if (password && password.length > 0) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
      }

      await user.save();

      // Atualizar turmas e matérias do professor
      if (turmasIds !== undefined) {
        professor.turmas = turmasIds;
      }
      if (materiasIds !== undefined) {
        professor.materias = materiasIds;
      }
      await professor.save();

      // Buscar professor atualizado com populate
      const professorAtualizado = await Teacher.findById(professorId)
        .populate({
          path: "userId",
          select: "-password",
        })
        .populate({
          path: "turmas",
          select: "nome",
        })
        .populate({
          path: "materias",
          select: "nome",
        });

      return res.json({
        message: "Professor atualizado com sucesso",
        userId: user._id,
        professor: professorAtualizado,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar professor", details: error.message });
    }
  }

  async toggleActive(req, res) {
    try {
      const professorId = req.params.id;
      const professor = await Teacher.findById(professorId);

      if (!professor) {
        return res.status(404).json({ error: "Professor não encontrado" });
      }

      const user = await User.findById(professor.userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Alternar o status active
      user.active = !user.active;
      await user.save();

      // Se estiver bloqueando (active = false), mudar status do professor para "desligado"
      // Se estiver desbloqueando (active = true), mudar status do professor para "ativo"
      if (!user.active) {
        professor.status = "desligado";
      } else {
        professor.status = "ativo";
      }
      await professor.save();

      // Buscar professor atualizado com populate
      const professorAtualizado = await Teacher.findById(professorId)
        .populate({
          path: "userId",
          select: "-password",
        })
        .populate({
          path: "turmas",
          select: "nome",
        })
        .populate({
          path: "materias",
          select: "nome",
        })
        .populate({
          path: "cursos",
          select: "titulo descricao capitulos alunosInscritos",
          populate: {
            path: "professorId",
            populate: {
              path: "userId",
              select: "name",
            },
          },
        });

      return res.json({
        message: user.active ? "Usuário ativado com sucesso" : "Usuário bloqueado com sucesso",
        professor: professorAtualizado,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar status do usuário", details: error.message });
    }
  }

  async delete(req, res) {
    try {
      const professorId = req.params.id;
      const professor = await Teacher.findById(professorId);

      if (!professor) {
        return res.status(404).json({ error: "Professor não encontrado" });
      }

      const userId = professor.userId;

      // Buscar usuário para deletar foto do Cloudinary se existir
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Deletar foto do Cloudinary se existir
      if (user.fotoPerfil?.publicId) {
        try {
          await uploadService.deleteImage(user.fotoPerfil.publicId);
          console.log(`✅ Foto do Cloudinary deletada: ${user.fotoPerfil.publicId}`);
        } catch (error) {
          console.error("⚠️ Erro ao deletar foto do Cloudinary:", error.message);
          // Continua mesmo se não conseguir deletar a foto (não deve bloquear a deleção do usuário)
        }
      }

      // Buscar todos os cursos do professor
      const cursosDoProfessor = await Curso.find({ professorId: professorId });

      // Deletar cada curso do professor
      for (const curso of cursosDoProfessor) {
        try {
          // Remover curso dos alunos
          await Student.updateMany(
            { cursos: curso._id },
            { $pull: { cursos: curso._id } }
          );

          // Deletar progressos relacionados
          await ProgressoCurso.deleteMany({ cursoId: curso._id });

          // Deletar o curso
          await Curso.findByIdAndDelete(curso._id);
          console.log(`✅ Curso deletado: ${curso.titulo}`);
        } catch (error) {
          console.error(`⚠️ Erro ao deletar curso ${curso._id}:`, error.message);
          // Continua mesmo se não conseguir deletar um curso (não deve bloquear a deleção do professor)
        }
      }

      // Deletar professor (Teacher)
      await Teacher.findByIdAndDelete(professorId);

      // Deletar usuário (User)
      await User.findByIdAndDelete(userId);

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar professor", details: error.message });
    }
  }
}

module.exports = new ProfessorController();
