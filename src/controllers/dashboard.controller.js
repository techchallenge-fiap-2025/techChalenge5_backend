const mongoose = require("mongoose");
const Materia = require("../models/materia.model.js");
const Student = require("../models/student.model.js");
const Teacher = require("../models/teacher.model.js");
const Turma = require("../models/turma.model.js");
const Curso = require("../models/curso.model.js");
const AulaSemanal = require("../models/aulaSemanal.model.js");

class DashboardController {
  /**
   * Retorna estatísticas do dashboard baseado no role do usuário
   * GET /api/dashboard/stats
   */
  async getStats(req, res) {
    try {
      const userRole = req.user.role;
      const userId = req.user.id;

      if (userRole === "admin") {
        // Admin vê todas as estatísticas do sistema
        const [materiasCount, alunosCount, professoresCount, turmasCount] =
          await Promise.all([
            Materia.countDocuments(),
            Student.countDocuments(),
            Teacher.countDocuments(),
            Turma.countDocuments(),
          ]);

        return res.json({
          materias: materiasCount || 0,
          alunos: alunosCount || 0,
          professores: professoresCount || 0,
          turmas: turmasCount || 0,
        });
      } else if (userRole === "professor") {
        // Professor vê suas próprias estatísticas
        const teacher = await Teacher.findOne({ userId }).populate(
          "materias turmas cursos"
        );

        if (!teacher) {
          return res.json({
            materias: 0,
            alunos: 0,
            cursos: 0,
            turmas: 0,
          });
        }

        // Buscar turmas através das aulas semanais ativas do professor
        // Isso garante que contamos apenas turmas onde o professor realmente dá aula
        const aulasSemanais = await AulaSemanal.find({
          professorId: teacher._id,
          status: "ativa",
        }).select("turmaId").lean();

        // Extrair IDs únicos das turmas (pode ser ObjectId ou objeto populado)
        const turmasIdsSet = new Set();
        aulasSemanais.forEach((aula) => {
          const turmaId = aula.turmaId;
          if (turmaId) {
            // Se for objeto populado, pegar _id, senão usar diretamente
            const id = typeof turmaId === 'object' && turmaId._id 
              ? turmaId._id.toString() 
              : turmaId.toString();
            turmasIdsSet.add(id);
          }
        });

        const turmasIds = Array.from(turmasIdsSet);

        // Contar alunos de todas as turmas onde o professor dá aula
        // Contar diretamente do array turma.alunos que é a fonte de verdade
        // Isso faz a soma: se turma 1 tem 10 alunos e turma 2 tem 5, retorna 15
        let alunosCount = 0;
        if (turmasIds.length > 0) {
          // Converter strings de volta para ObjectId
          const turmasObjectIds = turmasIds.map((id) => new mongoose.Types.ObjectId(id));
          
          // Buscar as turmas e contar alunos do array alunos de cada uma
          const turmas = await Turma.find({
            _id: { $in: turmasObjectIds },
          }).select("alunos").lean();

          // Contar total de alunos únicos de todas as turmas
          const alunosIdsSet = new Set();
          turmas.forEach((turma) => {
            if (turma.alunos && Array.isArray(turma.alunos)) {
              turma.alunos.forEach((alunoId) => {
                const id = typeof alunoId === 'object' && alunoId._id 
                  ? alunoId._id.toString() 
                  : alunoId.toString();
                alunosIdsSet.add(id);
              });
            }
          });
          
          alunosCount = alunosIdsSet.size;
        }

        return res.json({
          materias: teacher.materias?.length || 0,
          alunos: alunosCount || 0,
          cursos: teacher.cursos?.length || 0,
          turmas: turmasIds.length || 0,
        });
      } else {
        // Aluno não vê widgets
        return res.json({
          materias: 0,
          alunos: 0,
          professores: 0,
          turmas: 0,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas do dashboard:", error);
      return res.status(500).json({
        error: "Erro ao buscar estatísticas",
        details: error.message,
      });
    }
  }
}

module.exports = new DashboardController();
