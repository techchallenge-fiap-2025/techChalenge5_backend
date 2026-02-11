const router = require("express").Router();
const AttendanceController = require("../controllers/attendance.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");
const roleMultipleMiddleware = require("../middlewares/roleMultiple.middleware.js");

// Professor ou Admin marca presença de alunos em uma aula
router.post(
  "/",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  AttendanceController.marcarPresenca
);

// Listar presenças (professor vê suas aulas, aluno vê suas presenças, admin vê todas)
router.get("/", authMiddleware, AttendanceController.list);

// Aluno vê suas faltas
router.get(
  "/minhas-faltas",
  authMiddleware,
  roleMiddleware("aluno"),
  AttendanceController.minhasFaltas
);

// Visualizar registro específico
router.get("/:id", authMiddleware, AttendanceController.getById);

// Atualizar presença (professor ou admin)
router.put(
  "/:id",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  AttendanceController.update
);

// Deletar registro (apenas admin)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  AttendanceController.delete
);

module.exports = router;
