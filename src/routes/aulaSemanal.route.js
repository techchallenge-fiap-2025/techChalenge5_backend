const router = require("express").Router();
const AulaSemanalController = require("../controllers/aulaSemanal.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");

// Admin cria agendamento de aula semanal
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  AulaSemanalController.create
);

// Listar aulas semanais
router.get("/", authMiddleware, AulaSemanalController.list);

// Professor vê suas aulas semanais
router.get(
  "/minhas-aulas",
  authMiddleware,
  roleMiddleware("professor"),
  AulaSemanalController.minhasAulas
);

// Aluno vê próximas aulas (calendário)
router.get(
  "/proximas-aulas",
  authMiddleware,
  roleMiddleware("aluno"),
  AulaSemanalController.proximasAulas
);

// Visualizar aula específica
router.get("/:id", authMiddleware, AulaSemanalController.getById);

// Atualizar aula semanal (admin)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  AulaSemanalController.update
);

// Deletar aula semanal (admin)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  AulaSemanalController.delete
);

module.exports = router;
