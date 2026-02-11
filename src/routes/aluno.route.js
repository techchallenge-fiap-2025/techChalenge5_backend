const router = require("express").Router();
const AlunoController = require("../controllers/aluno.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");
const roleMultipleMiddleware = require("../middlewares/roleMultiple.middleware.js");

// Criar aluno (apenas admin)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  AlunoController.create,
);

// Buscar perfil do aluno logado (apenas aluno) - DEVE VIR ANTES DE /:id
router.get(
  "/me",
  authMiddleware,
  roleMiddleware("aluno"),
  AlunoController.getMe.bind(AlunoController),
);

// Listar turmas históricas do aluno logado (apenas aluno) - DEVE VIR ANTES DE /:id
router.get(
  "/turmas/minhas",
  authMiddleware,
  roleMiddleware("aluno"),
  AlunoController.getMinhasTurmas.bind(AlunoController),
);

// Buscar boletim do aluno logado (apenas aluno) - DEVE VIR ANTES DE /:id
router.get(
  "/boletim/meu",
  authMiddleware,
  roleMiddleware("aluno"),
  AlunoController.getBoletim.bind(AlunoController),
);

// Listar turmas de um aluno específico (admin ou professor) - DEVE VIR ANTES DE /:id
router.get(
  "/:id/turmas",
  authMiddleware,
  roleMultipleMiddleware("admin", "professor"),
  AlunoController.getTurmasAluno.bind(AlunoController),
);

// Buscar boletim de um aluno específico (admin ou professor) - DEVE VIR ANTES DE /:id
router.get(
  "/:id/boletim",
  authMiddleware,
  roleMultipleMiddleware("admin", "professor"),
  AlunoController.getBoletimAluno.bind(AlunoController),
);

// Alternar status ativo/inativo do usuário (apenas admin) - DEVE VIR ANTES DE /:id
router.put(
  "/:id/toggle-active",
  authMiddleware,
  roleMiddleware("admin"),
  AlunoController.toggleActive,
);

// Buscar aluno por ID (apenas admin)
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  AlunoController.getById,
);

// Atualizar aluno (apenas admin)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  AlunoController.update,
);

// Deletar aluno (apenas admin)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  AlunoController.delete,
);

module.exports = router;
