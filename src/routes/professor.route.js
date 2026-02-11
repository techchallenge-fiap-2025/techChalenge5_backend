const router = require("express").Router();
const ProfessorController = require("../controllers/professor.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");

// Criar professor (apenas admin)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  ProfessorController.create
);

// Buscar perfil do professor logado (apenas professor) - DEVE VIR ANTES DE /:id
router.get(
  "/me",
  authMiddleware,
  roleMiddleware("professor"),
  ProfessorController.getMe.bind(ProfessorController)
);

// Buscar professor por ID (apenas admin)
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  ProfessorController.getById
);

// Atualizar professor (apenas admin)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  ProfessorController.update
);

// Alternar status ativo/inativo do professor (apenas admin)
router.put(
  "/:id/toggle-active",
  authMiddleware,
  roleMiddleware("admin"),
  ProfessorController.toggleActive
);

// Deletar professor (apenas admin)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  ProfessorController.delete
);

module.exports = router;
