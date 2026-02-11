const jwt = require("jsonwebtoken");
const env = require("../config/env.js");

module.exports = function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "Token não funcionando" });
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: "Token invalido" });
  }
};
