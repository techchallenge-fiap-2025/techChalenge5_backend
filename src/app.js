const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/auth.route.js");
const userRoutes = require("./routes/user.route.js");
const listRoutes = require("./routes/list.route.js");
const materiaRoutes = require("./routes/materia.routes.js");
const turmaRoutes = require("./routes/turma.route.js");
const cursoRoutes = require("./routes/curso.route.js");
const attendanceRoutes = require("./routes/attendance.route.js");
const gradeRoutes = require("./routes/grade.route.js");
const atividadeRoutes = require("./routes/atividade.route.js");
const notaAtividadeRoutes = require("./routes/notaAtividade.route.js");
const aulaSemanalRoutes = require("./routes/aulaSemanal.route.js");
const progressoCursoRoutes = require("./routes/progressoCurso.route.js");
const responsavelRoutes = require("./routes/responsavel.route.js");
const uploadRoutes = require("./routes/upload.route.js");
const dashboardRoutes = require("./routes/dashboard.route.js");
const healthRoutes = require("./routes/health.route.js");
const alunoRoutes = require("./routes/aluno.route.js");
const professorRoutes = require("./routes/professor.route.js");

const app = express();

//?Moddlewares globais
app.use(cors());
app.use(express.json());

app.get("/api", (req, res) => res.redirect("/api/health"));

//Rotas
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/list", listRoutes);
app.use("/api/materia", materiaRoutes);
app.use("/api/turma", turmaRoutes);
app.use("/api/curso", cursoRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/grade", gradeRoutes);
app.use("/api/atividade", atividadeRoutes);
app.use("/api/nota-atividade", notaAtividadeRoutes);
app.use("/api/aula-semanal", aulaSemanalRoutes);
app.use("/api/progresso-curso", progressoCursoRoutes);
app.use("/api/responsavel", responsavelRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/aluno", alunoRoutes);
app.use("/api/professor", professorRoutes);

// make our app ready for deployment
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../frontend/dist", "index.html"));
  });
}

module.exports = app;
