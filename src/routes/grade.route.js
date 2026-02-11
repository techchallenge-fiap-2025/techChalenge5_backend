const router = require("express").Router();
const GradeController = require("../controllers/grade.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");
const roleMultipleMiddleware = require("../middlewares/roleMultiple.middleware.js");

// Criar Grade (professor ou admin)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("professor"),
  GradeController.create
);

// Listar Grades (professor vê seus alunos, aluno vê seu boletim, admin vê todos)
router.get("/", authMiddleware, GradeController.list);

// Aluno vê seu boletim completo
router.get(
  "/meu-boletim",
  authMiddleware,
  roleMiddleware("aluno"),
  GradeController.meuBoletim
);

// Visualizar Grade específico
router.get("/:id", authMiddleware, GradeController.getById);

// Atualizar Grade (professor ou admin)
router.put(
  "/:id",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  GradeController.update
);

// Deletar Grade (apenas admin)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  GradeController.delete
);

module.exports = router;
