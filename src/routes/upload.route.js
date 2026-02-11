const router = require("express").Router();
const uploadController = require("../controllers/upload.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const uploadMiddleware = require("../middlewares/upload.middleware");

// Upload de foto de perfil (requer autenticação)
router.post(
  "/profile",
  authMiddleware,
  uploadMiddleware.single("image"),
  uploadController.uploadProfile
);

// Upload de imagem genérica (requer autenticação)
router.post(
  "/image",
  authMiddleware,
  uploadMiddleware.single("image"),
  uploadController.uploadImage
);

// Upload de foto de perfil para um usuário específico (apenas admin)
router.post(
  "/profile/:userId",
  authMiddleware,
  uploadMiddleware.single("image"),
  uploadController.uploadProfileForUser
);

// Deletar foto de perfil de um usuário específico (apenas admin)
router.delete(
  "/profile/:userId",
  authMiddleware,
  uploadController.deleteProfilePhoto
);

// Deletar imagem (requer autenticação)
router.delete(
  "/:publicId",
  authMiddleware,
  uploadController.deleteImage
);

module.exports = router;
