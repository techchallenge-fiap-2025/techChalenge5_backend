const express = require("express");
const router = express.Router();
const UserController = require("../controllers/user.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");

// CRUD completo de usuários (apenas admin)
router.post(
  "/",
  authMiddleware,
  roleMiddleware("admin"),
  UserController.create
);
router.get("/", authMiddleware, roleMiddleware("admin"), UserController.list);
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  UserController.getById
);
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  UserController.update
);
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("admin"),
  UserController.delete
);

module.exports = router;
