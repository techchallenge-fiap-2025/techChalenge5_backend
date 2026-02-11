const router = require("express").Router();
const AtividadeController = require("../controllers/atividade.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");
const roleMultipleMiddleware = require("../middlewares/roleMultiple.middleware.js");

// Criar atividade para toda a turma (professor)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("professor"),
  AtividadeController.create
);

// Listar atividades (professor vê suas atividades, admin vê todas)
router.get("/", authMiddleware, AtividadeController.list);

// Visualizar atividade específica
router.get("/:id", authMiddleware, AtividadeController.getById);

// Atualizar atividade (professor ou admin)
router.put(
  "/:id",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  AtividadeController.update
);

// Deletar atividade (professor ou admin)
router.delete(
  "/:id",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  AtividadeController.delete
);

module.exports = router;
