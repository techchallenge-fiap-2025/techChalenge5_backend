const router = require("express").Router();
const CursoController = require("../controllers/curso.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");
const roleMultipleMiddleware = require("../middlewares/roleMultiple.middleware.js");
const uploadCurso = require("../middlewares/uploadCurso.middleware.js");

// Professor cria curso (com upload de arquivos)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("professor"),
  uploadCurso.any(), // Aceita qualquer arquivo (capa e vídeos)
  CursoController.create,
);

// Listar cursos (professor vê seus cursos, aluno vê disponíveis, admin vê todos)
router.get("/", authMiddleware, CursoController.list);

// Visualizar curso específico
router.get("/:id", authMiddleware, CursoController.getById);

// Professor ou admin edita curso (com upload de arquivos)
router.put(
  "/:id",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  uploadCurso.any(), // Aceita arquivos (vídeos) para atualização
  CursoController.update,
);

// Professor adiciona capítulo ao curso
router.post(
  "/:id/capitulos",
  authMiddleware,
  roleMiddleware("professor"),
  CursoController.addCapitulo,
);

// Verificar se aluno está inscrito no curso
router.get(
  "/:id/verificar-inscricao",
  authMiddleware,
  roleMiddleware("aluno"),
  CursoController.verificarInscricao,
);

// Aluno se inscreve no curso
router.post(
  "/:id/inscrever",
  authMiddleware,
  roleMiddleware("aluno"),
  CursoController.inscrever,
);

// Professor ou admin deleta curso
router.delete(
  "/:id",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  CursoController.delete,
);

// Professor ou admin deleta capítulo
router.delete(
  "/:id/capitulos/:capituloIndex",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  CursoController.deleteCapitulo,
);

// Professor ou admin deleta aula
router.delete(
  "/:id/capitulos/:capituloIndex/aulas/:aulaIndex",
  authMiddleware,
  roleMultipleMiddleware("professor", "admin"),
  CursoController.deleteAula,
);

module.exports = router;
