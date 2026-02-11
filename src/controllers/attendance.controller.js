const Attendance = require("../models/attendance.model.js");
const Teacher = require("../models/teacher.model.js");
const Student = require("../models/student.model.js");
const Turma = require("../models/turma.model.js");
const AulaSemanal = require("../models/aulaSemanal.model.js");
const Atividade = require("../models/atividade.model.js");
const NotaAtividade = require("../models/notaAtividade.model.js");

class AttendanceController {
  // Professor ou Admin marca presença de alunos em uma aula
  async marcarPresenca(req, res) {
    try {
      const { role, id } = req.user;
      const { turmaId, materiaId, data, alunos } = req.body; // alunos: [{ alunoId, presente }]

      // Verificar se a turma existe
      const turma = await Turma.findById(turmaId);
      if (!turma) {
        return res.status(404).json({ error: "Turma não encontrada" });
      }

      let teacher = null;
      let professorId = null;

      if (role === "admin") {
        // Admin pode usar qualquer professorId, vamos buscar o primeiro professor da turma/matéria
        const aulaSemanal = await AulaSemanal.findOne({
          turmaId,
          materiaId,
          status: "ativa",
        });
        
        if (aulaSemanal && aulaSemanal.professorId) {
          professorId = aulaSemanal.professorId;
        } else {
          // Se não encontrar aula semanal, buscar qualquer professor que lecione a matéria
          const teacherWithMateria = await Teacher.findOne({
            materias: materiaId,
          });
          if (teacherWithMateria) {
            professorId = teacherWithMateria._id;
          } else {
            return res.status(400).json({ 
              error: "Não foi possível encontrar um professor para esta matéria" 
            });
          }
        }
      } else {
        // Para professores, verificar se ele leciona esta turma/matéria
        teacher = await Teacher.findOne({ userId: id });
        if (!teacher) {
          return res
            .status(403)
            .json({ error: "Professor não encontrado" });
        }

        professorId = teacher._id;

        // Verificar se o professor leciona nesta turma/matéria
        const aulaSemanal = await AulaSemanal.findOne({
          turmaId,
          materiaId,
          professorId: teacher._id,
          status: "ativa",
        });

        if (!aulaSemanal) {
          return res
            .status(403)
            .json({ error: "Você não leciona esta turma/matéria" });
        }
      }

      const registros = [];

      // Criar registros de presença para cada aluno
      for (const aluno of alunos) {
        const student = await Student.findById(aluno.alunoId);
        if (!student) {
          continue;
        }

        // Tratar data corretamente (garantir que seja apenas a data, sem hora)
        // Se a data vier como string "YYYY-MM-DD", criar Date no início do dia local
        let dataAula;
        if (typeof data === 'string' && data.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Formato YYYY-MM-DD
          const [ano, mes, dia] = data.split('-').map(Number);
          dataAula = new Date(ano, mes - 1, dia);
        } else {
          dataAula = new Date(data);
        }
        
        // Normalizar para início do dia para comparação
        dataAula.setHours(0, 0, 0, 0);

        // Verificar se já existe registro para este aluno nesta data
        const registroExistente = await Attendance.findOne({
          alunoId: aluno.alunoId,
          turmaId,
          materiaId,
          data: {
            $gte: new Date(dataAula.getFullYear(), dataAula.getMonth(), dataAula.getDate()),
            $lt: new Date(dataAula.getFullYear(), dataAula.getMonth(), dataAula.getDate() + 1),
          },
        });

        if (registroExistente) {
          // Atualizar registro existente
          registroExistente.presente = aluno.presente;
          await registroExistente.save();
          registros.push(registroExistente);
        } else {
          // Criar novo registro usando a data normalizada
          const registro = await Attendance.create({
            alunoId: aluno.alunoId,
            professorId: professorId,
            turmaId,
            materiaId,
            data: dataAula,
            presente: aluno.presente,
          });
          registros.push(registro);
        }

        // Se o aluno faltou, verificar se há atividade (prova/trabalho) no mesmo dia e horário
        // e atualizar a nota para 0
        if (aluno.presente === false) {
          // Buscar aula semanal para obter horário
          const aulaSemanal = await AulaSemanal.findOne({
            turmaId,
            materiaId,
            status: "ativa",
          });

          if (aulaSemanal) {
            // Buscar atividades que ocorrem na mesma data e têm horário sobreposto
            const atividades = await Atividade.find({
              turmaId,
              materiaId,
              data: {
                $gte: new Date(dataAula.getFullYear(), dataAula.getMonth(), dataAula.getDate()),
                $lt: new Date(dataAula.getFullYear(), dataAula.getMonth(), dataAula.getDate() + 1),
              },
              status: "ativa",
            });

            // Converter horários para minutos para comparação
            const converterParaMinutos = (horario) => {
              if (!horario) return 0;
              const [hora, minuto] = horario.split(':').map(Number);
              return hora * 60 + minuto;
            };

            const aulaInicioMinutos = converterParaMinutos(aulaSemanal.horarioInicio);
            const aulaFimMinutos = converterParaMinutos(aulaSemanal.horarioFim);

            for (const atividade of atividades) {
              const atividadeInicioMinutos = converterParaMinutos(atividade.horarioInicio);
              const atividadeFimMinutos = converterParaMinutos(atividade.horarioFim);

              // Verificar se há sobreposição de horários
              if (aulaInicioMinutos < atividadeFimMinutos && aulaFimMinutos > atividadeInicioMinutos) {
                // Atualizar NotaAtividade do aluno para esta atividade
                const notaAtividade = await NotaAtividade.findOne({
                  alunoId: aluno.alunoId,
                  atividadeId: atividade._id,
                });

                if (notaAtividade) {
                  notaAtividade.valor = 0;
                  if (atividade.tipo === "prova") {
                    notaAtividade.status = "faltou";
                  } else if (atividade.tipo === "trabalho") {
                    notaAtividade.status = "nao_entregue";
                  }
                  await notaAtividade.save();
                }
              }
            }
          }
        }
      }

      return res.status(201).json({
        message: "Presença marcada com sucesso",
        registros,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao marcar presença", details: error.message });
    }
  }

  // Listar presenças (professor vê suas aulas, aluno vê suas presenças, admin vê todas)
  async list(req, res) {
    try {
      const { role, id } = req.user;
      const { turmaId, materiaId, dataInicio, dataFim } = req.query;

      let query = {};

      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (!teacher) {
          return res.status(403).json({ error: "Professor não encontrado" });
        }
        query.professorId = teacher._id;
      } else if (role === "aluno") {
        const student = await Student.findOne({ userId: id });
        if (!student) {
          return res.status(403).json({ error: "Aluno não encontrado" });
        }
        query.alunoId = student._id;
      }

      if (turmaId) query.turmaId = turmaId;
      if (materiaId) query.materiaId = materiaId;

      if (dataInicio || dataFim) {
        query.data = {};
        if (dataInicio) query.data.$gte = new Date(dataInicio);
        if (dataFim) query.data.$lte = new Date(dataFim);
      }

      const attendances = await Attendance.find(query)
        .populate("alunoId", "userId")
        .populate("professorId", "userId")
        .populate("turmaId", "nome")
        .populate("materiaId", "nome")
        .sort({ data: -1 });

      return res.json(attendances);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar presenças", details: error.message });
    }
  }

  // Aluno vê suas faltas
  async minhasFaltas(req, res) {
    try {
      const { id } = req.user;
      const student = await Student.findOne({ userId: id });

      if (!student) {
        return res.status(403).json({ error: "Aluno não encontrado" });
      }

      const faltas = await Attendance.find({
        alunoId: student._id,
        presente: false,
      })
        .populate("turmaId", "nome")
        .populate("materiaId", "nome")
        .populate("professorId", "userId")
        .sort({ data: -1 });

      // Agrupar faltas por matéria
      const faltasPorMateria = {};
      faltas.forEach((falta) => {
        const materiaNome = falta.materiaId.nome;
        if (!faltasPorMateria[materiaNome]) {
          faltasPorMateria[materiaNome] = [];
        }
        faltasPorMateria[materiaNome].push(falta);
      });

      return res.json({
        totalFaltas: faltas.length,
        faltasPorMateria,
        faltas,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar faltas", details: error.message });
    }
  }

  // Visualizar registro específico
  async getById(req, res) {
    try {
      const attendance = await Attendance.findById(req.params.id)
        .populate("alunoId", "userId")
        .populate("professorId", "userId")
        .populate("turmaId", "nome")
        .populate("materiaId", "nome");

      if (!attendance) {
        return res
          .status(404)
          .json({ error: "Registro de presença não encontrado" });
      }

      return res.json(attendance);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar registro", details: error.message });
    }
  }

  // Atualizar presença
  async update(req, res) {
    try {
      const { role, id } = req.user;
      const { presente } = req.body;

      const attendance = await Attendance.findById(req.params.id);

      if (!attendance) {
        return res.status(404).json({ error: "Registro não encontrado" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          attendance.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({
              error: "Você não tem permissão para editar este registro",
            });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      attendance.presente = presente;
      await attendance.save();

      return res.json(attendance);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar presença", details: error.message });
    }
  }

  // Deletar registro (apenas admin)
  async delete(req, res) {
    try {
      const attendance = await Attendance.findByIdAndDelete(req.params.id);

      if (!attendance) {
        return res.status(404).json({ error: "Registro não encontrado" });
      }

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar registro", details: error.message });
    }
  }
}

module.exports = new AttendanceController();
