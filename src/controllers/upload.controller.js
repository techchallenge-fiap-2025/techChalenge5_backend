const uploadService = require("../services/upload.service");
const User = require("../models/user.model");

class UploadController {
  /**
   * Upload de imagem de perfil
   * POST /api/upload/profile
   */
  async uploadProfile(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Nenhum arquivo enviado",
        });
      }

      const userId = req.user.id || req.user._id;

      // Fazer upload para o Cloudinary
      const uploadResult = await uploadService.uploadProfileImage(
        req.file.buffer,
        userId
      );

      // Atualizar foto de perfil do usuário
      const user = await User.findById(userId);

      // Se já tinha foto, deletar a antiga do Cloudinary
      if (user.fotoPerfil?.publicId) {
        try {
          await uploadService.deleteImage(user.fotoPerfil.publicId);
        } catch (error) {
          console.error("Erro ao deletar imagem antiga:", error);
          // Continua mesmo se não conseguir deletar a antiga
        }
      }

      // Atualizar usuário com nova foto
      user.fotoPerfil = {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
      };

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Foto de perfil atualizada com sucesso",
        data: {
          fotoPerfil: user.fotoPerfil,
        },
      });
    } catch (error) {
      console.error("Erro no upload de foto de perfil:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao fazer upload da foto de perfil",
        error: error.message,
      });
    }
  }

  /**
   * Upload de imagem genérica
   * POST /api/upload/image
   */
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Nenhum arquivo enviado",
        });
      }

      const folder = req.body.folder || "uploads";
      const options = {
        width: req.body.width ? parseInt(req.body.width) : undefined,
        height: req.body.height ? parseInt(req.body.height) : undefined,
        crop: req.body.crop || undefined,
      };

      const uploadResult = await uploadService.uploadImage(
        req.file.buffer,
        folder,
        options
      );

      return res.status(200).json({
        success: true,
        message: "Imagem enviada com sucesso",
        data: uploadResult,
      });
    } catch (error) {
      console.error("Erro no upload de imagem:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao fazer upload da imagem",
        error: error.message,
      });
    }
  }

  /**
   * Upload de foto de perfil para um usuário específico (admin)
   * POST /api/upload/profile/:userId
   */
  async uploadProfileForUser(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Nenhum arquivo enviado",
        });
      }

      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "UserId não fornecido",
        });
      }

      // Fazer upload para o Cloudinary
      const uploadResult = await uploadService.uploadProfileImage(
        req.file.buffer,
        userId
      );

      // Atualizar foto de perfil do usuário
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      // Se já tinha foto, deletar a antiga do Cloudinary
      if (user.fotoPerfil?.publicId) {
        try {
          await uploadService.deleteImage(user.fotoPerfil.publicId);
        } catch (error) {
          console.error("Erro ao deletar imagem antiga:", error);
          // Continua mesmo se não conseguir deletar a antiga
        }
      }

      // Atualizar usuário com nova foto
      user.fotoPerfil = {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
      };

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Foto de perfil atualizada com sucesso",
        data: {
          fotoPerfil: user.fotoPerfil,
        },
      });
    } catch (error) {
      console.error("Erro no upload de foto de perfil:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao fazer upload da foto de perfil",
        error: error.message,
      });
    }
  }

  /**
   * Deletar foto de perfil de um usuário específico
   * DELETE /api/upload/profile/:userId
   */
  async deleteProfilePhoto(req, res) {
    try {
      const userId = req.params.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "UserId não fornecido",
        });
      }

      // Buscar usuário
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Usuário não encontrado",
        });
      }

      // Se não tiver foto, retornar sucesso (não há nada para deletar)
      if (!user.fotoPerfil?.publicId) {
        return res.status(200).json({
          success: true,
          message: "Usuário não possui foto de perfil",
        });
      }

      // Deletar foto do Cloudinary
      try {
        await uploadService.deleteImage(user.fotoPerfil.publicId);
        console.log(`✅ Foto do Cloudinary deletada: ${user.fotoPerfil.publicId}`);
      } catch (error) {
        console.error("⚠️ Erro ao deletar foto do Cloudinary:", error.message);
        // Continua mesmo se não conseguir deletar do Cloudinary
      }

      // Remover foto do banco de dados
      user.fotoPerfil = undefined;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Foto de perfil deletada com sucesso",
      });
    } catch (error) {
      console.error("Erro ao deletar foto de perfil:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao deletar foto de perfil",
        error: error.message,
      });
    }
  }

  /**
   * Deletar imagem
   * DELETE /api/upload/:publicId
   */
  async deleteImage(req, res) {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        return res.status(400).json({
          success: false,
          message: "Public ID não fornecido",
        });
      }

      const result = await uploadService.deleteImage(publicId);

      return res.status(200).json({
        success: true,
        message: "Imagem deletada com sucesso",
        data: result,
      });
    } catch (error) {
      console.error("Erro ao deletar imagem:", error);
      return res.status(500).json({
        success: false,
        message: "Erro ao deletar imagem",
        error: error.message,
      });
    }
  }
}

module.exports = new UploadController();
