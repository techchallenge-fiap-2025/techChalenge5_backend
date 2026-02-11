const router = require("express").Router();
const NotaAtividadeController = require("../controllers/notaAtividade.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMultipleMiddleware = require("../middlewares/roleMultiple.middleware.js");

// Listar notas de atividades (professor vê suas notas, aluno vê suas notas, admin vê todas)
router.get("/", authMiddleware, NotaAtividadeController.list);

// Visualizar nota específica
router.get("/:id", authMiddleware, NotaAtividadeController.getById);

// Adicionar/atualizar nota (professor ou admin)
router.post(
  "/:id/nota",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  NotaAtividadeController.adicionarNota
);

// Marcar presença/falta (para tipo "prova") (professor ou admin)
router.post(
  "/:id/presenca",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  NotaAtividadeController.marcarPresencaFalta
);

// Marcar entrega (para tipo "trabalho") (professor ou admin)
router.post(
  "/:id/entrega",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  NotaAtividadeController.marcarEntrega
);

// Atualizar nota de atividade (professor ou admin)
router.put(
  "/:id",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  NotaAtividadeController.update
);

// Deletar nota de atividade (professor ou admin)
router.delete(
  "/:id",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  NotaAtividadeController.delete
);

module.exports = router;
