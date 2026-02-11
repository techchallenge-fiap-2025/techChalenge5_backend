const User = require("../models/user.model.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const env = require("../config/env.js");

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validar campos obrigatórios
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "E-mail e senha são obrigatórios" });
      }

      const user = await User.findOne({ email }).select("+password");

      if (!user) {
        return res.status(401).json({ error: "E-mail ou senha inválidos" });
      }

      // Verificar se o usuário está ativo
      if (user.active === false) {
        return res
          .status(403)
          .json({
            error:
              "Sua conta foi bloqueada , entre em contato com admin@escola.com",
          });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ error: "E-mail ou senha inválidos" });
      }

      // Atualizar último login
      user.lastLoginAt = new Date();
      await user.save();

      // Verificar se jwtSecret está configurado
      if (!env.jwtSecret) {
        console.error("JWT_SECRET não está configurado");
        return res
          .status(500)
          .json({ error: "Erro de configuração do servidor" });
      }

      const token = jwt.sign(
        {
          id: user._id,
          role: user.role,
        },
        env.jwtSecret,
        { expiresIn: "8h" },
      );

      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          fotoPerfil: user.fotoPerfil || null,
        },
      });
    } catch (error) {
      console.error("Erro no login:", error);
      return res
        .status(500)
        .json({ error: "Erro ao fazer login", details: error.message });
    }
  }
}

module.exports = new AuthController();
