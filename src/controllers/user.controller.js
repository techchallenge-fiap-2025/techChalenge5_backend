const User = require("../models/user.model.js");
const Student = require("../models/student.model.js");
const Teacher = require("../models/teacher.model.js");
const bcrypt = require("bcryptjs");

class UserController {
  async create(req, res) {
    try {
      const {
        name,
        email,
        password,
        role,
        idade,
        cpf,
        endereco,
        turmaId,
        materias,
      } = req.body;

      if (!["aluno", "professor"].includes(role)) {
        return res.status(400).json({ error: "Role inválido" });
      }

      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ error: "Usuário já existe" });
      }

      if (cpf) {
        const cpfExists = await User.findOne({ cpf });
        if (cpfExists) {
          return res.status(400).json({ error: "CPF já cadastrado" });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        idade,
        cpf,
        endereco,
      });

      if (role === "aluno") {
        if (!turmaId) {
          await User.findByIdAndDelete(user._id);
          return res.status(400).json({ error: "Aluno precisa de turma" });
        }

        await Student.create({
          userId: user._id,
          turmaId,
          materias,
        });
      }

      if (role === "professor") {
        await Teacher.create({
          userId: user._id,
          materias,
        });
      }

      return res.status(201).json({ message: "Usuário criado com sucesso" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao criar usuário", details: error.message });
    }
  }

  async list(req, res) {
    try {
      const users = await User.find()
        .select("-password")
        .sort({ createdAt: -1 });

      return res.json(users);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar usuários", details: error.message });
    }
  }

  async getById(req, res) {
    try {
      const user = await User.findById(req.params.id).select("-password");

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      return res.json(user);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar usuário", details: error.message });
    }
  }

  async update(req, res) {
    try {
      const { password, ...updateData } = req.body;

      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const user = await User.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      }).select("-password");

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      return res.json(user);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar usuário", details: error.message });
    }
  }

  async delete(req, res) {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Deletar também Student ou Teacher associado
      if (user.role === "aluno") {
        await Student.findOneAndDelete({ userId: user._id });
      } else if (user.role === "professor") {
        await Teacher.findOneAndDelete({ userId: user._id });
      }

      await User.findByIdAndDelete(req.params.id);

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar usuário", details: error.message });
    }
  }
}

module.exports = new UserController();
