module.exports = (requiredRole) => {
  return (req, res, next) => {
    const { role } = req.user;

    if (role !== requiredRole) {
      return res.status(403).json({ error: "Acesso negado" });
    }
    next();
  };
};
