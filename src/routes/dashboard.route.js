const router = require("express").Router();
const DashboardController = require("../controllers/dashboard.controller.js");
const authMiddleware = require("../middlewares/auth.middleware.js");

// Estatísticas do dashboard
router.get(
  "/stats",
  authMiddleware,
  DashboardController.getStats
);

module.exports = router;
