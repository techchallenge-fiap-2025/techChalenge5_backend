const router = require("express").Router();
const ResponsavelController = require("../controllers/responsavel.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");

// Criar responsável (admin)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  ResponsavelController.create
);

// Listar responsáveis
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  ResponsavelController.list
);

// Visualizar responsável específico
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  ResponsavelController.getById
);

// Atualizar responsável (admin)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  ResponsavelController.update
);

// Alternar status ativo/inativo do responsável (admin)
router.put(
  "/:id/toggle-active",
  authMiddleware,
  roleMiddleware("admin"),
  ResponsavelController.toggleActive
);

// Associar responsável a aluno (admin)
router.post(
  "/associar",
  authMiddleware,
  roleMiddleware("admin"),
  ResponsavelController.associarAluno
);

// Remover associação responsável-aluno (admin)
router.post(
  "/remover-associacao",
  authMiddleware,
  roleMiddleware("admin"),
  ResponsavelController.removerAssociacao
);

// Deletar responsável (admin)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  ResponsavelController.delete
);

module.exports = router;
