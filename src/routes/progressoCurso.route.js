const router = require("express").Router();
const ProgressoCursoController = require("../controllers/progressoCurso.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");

// Aluno marca aula como concluída (vídeo ou texto)
router.post(
  "/marcar-aula",
  authMiddleware,
  roleMiddleware("aluno"),
  ProgressoCursoController.marcarAulaConcluida,
);

// Salvar timestamp do vídeo
router.post(
  "/salvar-timestamp",
  authMiddleware,
  roleMiddleware("aluno"),
  ProgressoCursoController.salvarTimestampVideo,
);

// Listar todos os progressos (admin) - deve vir antes das rotas específicas
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  ProgressoCursoController.list,
);

// Aluno vê seus cursos e progresso
router.get(
  "/meus-cursos",
  authMiddleware,
  roleMiddleware("aluno"),
  ProgressoCursoController.meusCursos,
);

// Admin busca cursos de um aluno específico
router.get(
  "/aluno/:alunoId",
  authMiddleware,
  roleMiddleware("admin"),
  ProgressoCursoController.getCursosAluno,
);

// Visualizar progresso específico de um curso
router.get(
  "/curso/:cursoId",
  authMiddleware,
  roleMiddleware("aluno"),
  ProgressoCursoController.getProgresso,
);

// Gerar certificado PDF
router.get(
  "/certificado/:cursoId",
  authMiddleware,
  roleMiddleware("aluno"),
  ProgressoCursoController.gerarCertificado,
);

module.exports = router;
