const router = require("express").Router();
const ListController = require("../controllers/list.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");
const roleMiddleware = require("../middlewares/role.middleware.js");

router.get(
  "/students",
  authMiddleware,
  roleMiddleware("admin"),
  ListController.students
);

router.get(
  "/teachers",
  authMiddleware,
  roleMiddleware("admin"),
  ListController.teacher
);

module.exports = router;
