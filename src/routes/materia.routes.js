const router = require("express").Router();
const MateriaController = require("../controllers/materia.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");

router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  MateriaController.create
);
router.get(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  MateriaController.list
);
// Professor vê suas próprias matérias
router.get(
  "/minhas-materias",
  authMiddleware,
  roleMiddleware("professor"),
  MateriaController.minhasMaterias
);

router.get(
  "/:id",
  authMiddleware,
  MateriaController.getById
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  MateriaController.update
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  MateriaController.delete
);

module.exports = router;
