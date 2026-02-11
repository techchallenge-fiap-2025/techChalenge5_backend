const Curso = require("../models/curso.model.js");
const Teacher = require("../models/teacher.model.js");
const Student = require("../models/student.model.js");
const ProgressoCurso = require("../models/progressoCurso.model.js");
const User = require("../models/user.model.js");
const uploadService = require("../services/upload.service.js");

// Função auxiliar para limpar cursos órfãos (cursos sem professor válido)
async function limparCursosOrfaos() {
  try {
    const todosCursos = await Curso.find().select("professorId");
    const professoresExistentes = await Teacher.find().select("_id");
    const idsProfessoresExistentes = new Set(
      professoresExistentes.map((p) => p._id.toString()),
    );

    const cursosOrfaos = todosCursos.filter(
      (curso) => !idsProfessoresExistentes.has(curso.professorId.toString()),
    );

    for (const curso of cursosOrfaos) {
      try {
        // Remover curso dos alunos
        await Student.updateMany(
          { cursos: curso._id },
          { $pull: { cursos: curso._id } },
        );

        // Deletar progressos relacionados
        await ProgressoCurso.deleteMany({ cursoId: curso._id });

        // Deletar o curso
        await Curso.findByIdAndDelete(curso._id);
        console.log(`✅ Curso órfão deletado: ${curso._id}`);
      } catch (error) {
        console.error(
          `⚠️ Erro ao deletar curso órfão ${curso._id}:`,
          error.message,
        );
      }
    }
  } catch (error) {
    console.error("⚠️ Erro ao limpar cursos órfãos:", error.message);
  }
}

class CursoController {
  // Professor cria curso
  async create(req, res) {
    try {
      console.log("=== Iniciando criação de curso ===");
      console.log("req.body keys:", Object.keys(req.body));
      console.log(
        "req.files:",
        req.files
          ? Array.isArray(req.files)
            ? req.files.length
            : Object.keys(req.files)
          : "null",
      );

      // Parse JSON se vier como string (quando enviado via FormData)
      let { titulo, descricao, materiaId, turmasPermitidas, capitulos } =
        req.body;

      // Validar campos obrigatórios
      if (!titulo || !titulo.trim()) {
        return res.status(400).json({ error: "Título é obrigatório" });
      }
      if (!materiaId) {
        return res.status(400).json({ error: "Matéria é obrigatória" });
      }
      if (
        !capitulos ||
        (typeof capitulos === "string" && capitulos.trim() === "")
      ) {
        return res.status(400).json({ error: "Capítulos são obrigatórios" });
      }

      // Processar turmasPermitidas (pode vir como array ou string JSON)
      if (!Array.isArray(turmasPermitidas)) {
        if (typeof turmasPermitidas === "string") {
          try {
            turmasPermitidas = JSON.parse(turmasPermitidas);
          } catch (e) {
            console.log("Erro ao parsear turmasPermitidas:", e.message);
            // Se não for JSON válido, pode ser um único valor ou array vazio
            turmasPermitidas = turmasPermitidas ? [turmasPermitidas] : [];
          }
        } else {
          turmasPermitidas = [];
        }
      }

      // Se capitulos vier como string JSON, fazer parse
      if (typeof capitulos === "string") {
        try {
          capitulos = JSON.parse(capitulos);
        } catch (e) {
          console.error("Erro ao parsear capítulos:", e.message);
          return res.status(400).json({
            error: "Formato de capítulos inválido",
            details: e.message,
          });
        }
      }

      // Validar se capitulos é um array
      if (!Array.isArray(capitulos) || capitulos.length === 0) {
        return res
          .status(400)
          .json({ error: "É necessário pelo menos um capítulo" });
      }
      const professorId = req.user.id; // ID do professor logado

      // Verificar se o usuário é professor
      const teacher = await Teacher.findOne({ userId: professorId }).populate(
        "userId",
        "name",
      );
      if (!teacher) {
        return res
          .status(403)
          .json({ error: "Apenas professores podem criar cursos" });
      }

      // Obter nome do professor e criar estrutura de pastas
      const professorName = teacher.userId?.name || "professor";
      const professorIdStr = teacher._id.toString();
      const professorId5 = professorIdStr.substring(0, 5);
      const nomePastaProfessor = `${professorName}_${professorId5}`
        .toLowerCase()
        .replace(/\s+/g, "_");
      const nomePastaCurso = titulo
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
      const pastaCurso = `cursos/${nomePastaProfessor}/${nomePastaCurso}`;

      // Processar capa (se houver)
      let capaData = null;
      if (req.files && Array.isArray(req.files)) {
        const capaFile = req.files.find((file) => file.fieldname === "capa");
        if (capaFile) {
          try {
            const capaUpload = await uploadService.uploadImage(
              capaFile.buffer,
              `${pastaCurso}/capa`,
              {
                width: 1200,
                height: 675,
                crop: "limit",
                quality: "auto",
              },
            );
            capaData = {
              url: capaUpload.url,
              publicId: capaUpload.publicId,
            };
          } catch (uploadError) {
            console.error("Erro ao fazer upload da capa:", uploadError);
            return res.status(500).json({
              error: "Erro ao fazer upload da capa",
              details: uploadError.message,
            });
          }
        }
      }

      // Processar capítulos e fazer upload de vídeos
      const capitulosProcessados = [];
      for (let i = 0; i < capitulos.length; i++) {
        const capitulo = capitulos[i];

        if (
          !capitulo ||
          !capitulo.titulo ||
          !capitulo.aulas ||
          !Array.isArray(capitulo.aulas)
        ) {
          console.error(`Capítulo ${i} inválido:`, capitulo);
          return res
            .status(400)
            .json({ error: `Capítulo ${i + 1} está inválido` });
        }

        const aulasProcessadas = [];

        for (let j = 0; j < capitulo.aulas.length; j++) {
          const aula = capitulo.aulas[j];

          if (!aula || !aula.tipo || !aula.titulo) {
            console.error(`Aula ${j} do capítulo ${i} inválida:`, aula);
            return res.status(400).json({
              error: `Aula ${j + 1} do capítulo ${i + 1} está inválida`,
            });
          }

          // Se for vídeo, fazer upload
          if (aula.tipo === "video") {
            // Buscar arquivo de vídeo correspondente
            const videoKey = `video_${i}_${j}`;
            let videoFile = null;
            if (req.files && Array.isArray(req.files)) {
              videoFile = req.files.find((file) => file.fieldname === videoKey);
            }

            if (videoFile) {
              try {
                const videoUpload = await uploadService.uploadVideo(
                  videoFile.buffer,
                  `${pastaCurso}/videos`,
                  `capitulo_${i + 1}_aula_${j + 1}`,
                );

                aulasProcessadas.push({
                  tipo: aula.tipo,
                  titulo: aula.titulo,
                  conteudo: videoUpload.url, // URL do vídeo
                  duracaoMinutos: Math.ceil(videoUpload.duration / 60) || 1,
                  ordem: aula.ordem,
                });
              } catch (uploadError) {
                console.error(
                  `Erro ao fazer upload do vídeo ${videoKey}:`,
                  uploadError,
                );
                return res.status(500).json({
                  error: `Erro ao fazer upload do vídeo da aula ${j + 1} do capítulo ${i + 1}`,
                  details: uploadError.message,
                });
              }
            } else {
              // Se não encontrou arquivo, verificar se tem URL no conteúdo
              // Se o conteúdo estiver vazio, significa que deveria ter um arquivo
              if (!aula.conteudo || aula.conteudo.trim() === "") {
                console.warn(
                  `Vídeo não encontrado para aula ${j + 1} do capítulo ${i + 1}, mas conteúdo está vazio`,
                );
                // Continuar mesmo assim, pode ser que o vídeo já esteja no Cloudinary
                aulasProcessadas.push({
                  tipo: aula.tipo,
                  titulo: aula.titulo,
                  conteudo: aula.conteudo || "",
                  duracaoMinutos: aula.duracaoMinutos || 1,
                  ordem: aula.ordem,
                });
              } else {
                // Tem URL no conteúdo, usar ela
                aulasProcessadas.push({
                  tipo: aula.tipo,
                  titulo: aula.titulo,
                  conteudo: aula.conteudo,
                  duracaoMinutos: aula.duracaoMinutos || 1,
                  ordem: aula.ordem,
                });
              }
            }
          } else {
            // Aula de texto
            if (!aula.conteudo || aula.conteudo.trim() === "") {
              return res.status(400).json({
                error: `Conteúdo da aula ${j + 1} do capítulo ${i + 1} é obrigatório`,
              });
            }
            aulasProcessadas.push({
              tipo: aula.tipo,
              titulo: aula.titulo,
              conteudo: aula.conteudo,
              duracaoMinutos: 1,
              ordem: aula.ordem,
            });
          }
        }

        capitulosProcessados.push({
          titulo: capitulo.titulo,
          ordem: capitulo.ordem,
          bloqueado: false,
          bloqueadoPorAdmin: false,
          aulas: aulasProcessadas,
        });
      }

      console.log("Dados do curso antes de criar:", {
        titulo,
        materiaId,
        turmasPermitidas: turmasPermitidas.length,
        capitulos: capitulosProcessados.length,
        temCapa: !!capaData,
      });

      const curso = await Curso.create({
        titulo,
        descricao,
        materiaId,
        professorId: teacher._id,
        turmasPermitidas,
        capitulos: capitulosProcessados,
        capa: capaData,
        status: "ativo",
        bloqueadoPorAdmin: false,
      });

      console.log("Curso criado com sucesso:", curso._id);

      // Adicionar curso ao array de cursos do professor
      await Teacher.findByIdAndUpdate(teacher._id, {
        $push: { cursos: curso._id },
      });

      return res.status(201).json(curso);
    } catch (error) {
      console.error("Erro ao criar curso:", error);
      console.error("Stack:", error.stack);
      return res
        .status(500)
        .json({ error: "Erro ao criar curso", details: error.message });
    }
  }

  // Listar cursos (professor vê seus cursos, aluno vê cursos disponíveis, admin vê todos)
  async list(req, res) {
    try {
      // Limpar cursos órfãos antes de listar (apenas para admin, para não impactar performance)
      if (req.user.role === "admin") {
        await limparCursosOrfaos();
      }

      const { role, id } = req.user;
      const { ordem, materiaId } = req.query; // Filtros: ordem (a-z, z-a, recente, antigo) e materiaId
      let cursos;

      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (!teacher) {
          return res.status(403).json({ error: "Professor não encontrado" });
        }

        cursos = await Curso.find({ professorId: teacher._id })
          .populate("materiaId", "nome")
          .populate({
            path: "professorId",
            populate: {
              path: "userId",
              select: "name",
            },
          })
          .populate("turmasPermitidas", "nome")
          .populate("alunosInscritos", "userId")
          .sort({ createdAt: -1 });

        // Filtrar cursos onde o professor foi deletado
        cursos = cursos.filter((curso) => {
          return (
            curso.professorId !== null &&
            curso.professorId !== undefined &&
            curso.professorId.userId !== null &&
            curso.professorId.userId !== undefined
          );
        });
      } else if (role === "aluno") {
        // Buscar o aluno para obter sua turma
        const student = await Student.findOne({ userId: id });
        if (!student) {
          return res.status(403).json({ error: "Aluno não encontrado" });
        }

        // Buscar turma atual do aluno (turma ativa do ano letivo atual)
        const Turma = require("../models/turma.model.js");
        const anoLetivoAtual = new Date().getFullYear();
        const turmaAtual = await Turma.findOne({
          alunos: student._id,
          anoLetivo: anoLetivoAtual,
          status: "ativa",
        });

        // Se não encontrar turma ativa do ano atual, usar turmaId do modelo Student como fallback
        const turmaIdParaFiltro = turmaAtual ? turmaAtual._id : student.turmaId;

        // Se o aluno não tem turma, retornar array vazio
        if (!turmaIdParaFiltro) {
          return res.json([]);
        }

        // Filtrar cursos: apenas ativos E que sejam especificamente da turma do aluno
        const query = {
          status: "ativo", // Apenas cursos não bloqueados
          turmasPermitidas: { $in: [turmaIdParaFiltro] }, // Curso deve permitir especificamente a turma do aluno
        };

        cursos = await Curso.find(query)
          .populate("materiaId", "nome")
          .populate({
            path: "professorId",
            populate: {
              path: "userId",
              select: "name",
            },
          })
          .populate("turmasPermitidas", "nome")
          .sort({ createdAt: -1 });

        // Filtrar cursos onde o professor foi deletado
        cursos = cursos.filter((curso) => {
          return (
            curso.professorId !== null &&
            curso.professorId !== undefined &&
            curso.professorId.userId !== null &&
            curso.professorId.userId !== undefined
          );
        });
      } else {
        // Admin vê todos
        cursos = await Curso.find()
          .populate("materiaId", "nome")
          .populate({
            path: "professorId",
            populate: {
              path: "userId",
              select: "name",
            },
          })
          .populate("turmasPermitidas", "nome")
          .sort({ createdAt: -1 });
      }

      // Filtrar cursos onde o professor foi deletado (professorId é null após populate)
      // Também filtrar cursos onde professorId.userId é null (professor existe mas usuário foi deletado)
      cursos = cursos.filter((curso) => {
        return (
          curso.professorId !== null &&
          curso.professorId !== undefined &&
          curso.professorId.userId !== null &&
          curso.professorId.userId !== undefined
        );
      });

      // Aplicar filtro por matéria
      if (materiaId) {
        cursos = cursos.filter((curso) => {
          const cursoMateriaId = curso.materiaId?._id?.toString() || curso.materiaId?.toString();
          return cursoMateriaId === materiaId;
        });
      }

      // Aplicar filtro de ordem
      if (ordem) {
        if (ordem === "a-z") {
          cursos.sort((a, b) => {
            const tituloA = (a.titulo || a.nome || "").toLowerCase();
            const tituloB = (b.titulo || b.nome || "").toLowerCase();
            return tituloA.localeCompare(tituloB, "pt-BR");
          });
        } else if (ordem === "z-a") {
          cursos.sort((a, b) => {
            const tituloA = (a.titulo || a.nome || "").toLowerCase();
            const tituloB = (b.titulo || b.nome || "").toLowerCase();
            return tituloB.localeCompare(tituloA, "pt-BR");
          });
        } else if (ordem === "recente") {
          // Recém adicionado = mais recente primeiro (já está ordenado por createdAt: -1)
          cursos.sort((a, b) => {
            const dataA = new Date(a.createdAt || 0);
            const dataB = new Date(b.createdAt || 0);
            return dataB - dataA;
          });
        } else if (ordem === "antigo") {
          // Último adicionado = mais antigo primeiro
          cursos.sort((a, b) => {
            const dataA = new Date(a.createdAt || 0);
            const dataB = new Date(b.createdAt || 0);
            return dataA - dataB;
          });
        }
      }

      return res.json(cursos);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar cursos", details: error.message });
    }
  }

  // Visualizar curso específico
  async getById(req, res) {
    try {
      const { role, id } = req.user;
      const curso = await Curso.findById(req.params.id)
        .populate("materiaId", "nome")
        .populate({
          path: "professorId",
          select: "userId",
          populate: {
            path: "userId",
            select: "name fotoPerfil",
          },
        })
        .populate("turmasPermitidas", "nome")
        .populate("alunosInscritos", "userId");

      if (!curso) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }

      // Se for aluno, verificar se está inscrito
      if (role === "aluno") {
        const Student = require("../models/student.model.js");
        const student = await Student.findOne({ userId: id });
        if (student) {
          // Verificar se o aluno está inscrito
          // Como alunosInscritos está populado com "userId", precisamos comparar com student._id diretamente
          // Mas primeiro, vamos buscar o curso sem popular alunosInscritos para ter os IDs corretos
          const cursoSemPopulate = await Curso.findById(req.params.id);
          const estaInscrito = cursoSemPopulate.alunosInscritos.some(
            (alunoId) => alunoId.toString() === student._id.toString(),
          );

          // Retornar o curso populado com a informação de inscrição
          return res.json({ ...curso.toObject(), estaInscrito });
        }
      }

      return res.json(curso);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar curso", details: error.message });
    }
  }

  // Professor edita curso
  async update(req, res) {
    try {
      const { role, id } = req.user;
      const curso = await Curso.findById(req.params.id);

      if (!curso) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }

      // Verificar se é o dono do curso (professor) ou admin
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          curso.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({ error: "Você não tem permissão para editar este curso" });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Se o status do curso está sendo alterado para "inativo", bloquear todos os capítulos
      if (req.body.status === "inativo") {
        curso.bloqueadoPorAdmin = role === "admin";
        curso.capitulos.forEach((capitulo) => {
          capitulo.bloqueado = true;
          if (role === "admin") {
            capitulo.bloqueadoPorAdmin = true;
          }
        });
        await curso.save();
      } else if (req.body.status === "ativo") {
        // Verificar se professor pode desbloquear (não pode se foi bloqueado por admin)
        if (role === "professor" && curso.bloqueadoPorAdmin) {
          return res.status(403).json({
            error:
              "Este curso foi bloqueado por um administrador e não pode ser desbloqueado por um professor",
          });
        }

        // Se o status do curso está sendo alterado para "ativo", desbloquear todos os capítulos
        // Mas só se não foi bloqueado por admin (ou se quem está desbloqueando é admin)
        if (role === "admin" || !curso.bloqueadoPorAdmin) {
          curso.bloqueadoPorAdmin = false;
          curso.capitulos.forEach((capitulo) => {
            // Só desbloquear capítulo se não foi bloqueado por admin (ou se quem está desbloqueando é admin)
            if (role === "admin" || !capitulo.bloqueadoPorAdmin) {
              capitulo.bloqueado = false;
              capitulo.bloqueadoPorAdmin = false;
            }
          });
          await curso.save();
        }
      }

      // Processar capítulos removidos primeiro (antes de processar novos capítulos)
      if (req.body.capitulosRemovidos) {
        let capitulosRemovidos = req.body.capitulosRemovidos;
        if (typeof capitulosRemovidos === "string") {
          try {
            capitulosRemovidos = JSON.parse(capitulosRemovidos);
          } catch (e) {
            console.warn("Erro ao parsear capitulosRemovidos:", e);
          }
        }

        // Deletar todos os vídeos dos capítulos removidos
        if (Array.isArray(capitulosRemovidos)) {
          for (const capituloRemovido of capitulosRemovidos) {
            const aulas = capituloRemovido.aulas || [];
            for (const aula of aulas) {
              if (aula.tipo === "video" && aula.conteudo) {
                try {
                  const publicId = uploadService.extractPublicIdFromUrl(
                    aula.conteudo,
                  );
                  if (publicId) {
                    await uploadService.deleteVideo(publicId);
                    console.log(
                      `✅ Vídeo deletado do Cloudinary (capítulo removido): ${publicId}`,
                    );
                  } else {
                    console.warn(
                      `⚠️ Não foi possível extrair publicId da URL: ${aula.conteudo}`,
                    );
                  }
                } catch (deleteError) {
                  console.error(
                    `⚠️ Erro ao deletar vídeo do Cloudinary (capítulo removido):`,
                    deleteError.message,
                  );
                  // Continua mesmo se não conseguir deletar o vídeo
                }
              }
            }
          }
        }
      }

      // Se está atualizando capítulos, aplicar as mudanças com verificação de permissões
      if (req.body.capitulos) {
        // Parse JSON se vier como string (quando enviado via FormData)
        let capitulos = req.body.capitulos;
        if (typeof capitulos === "string") {
          try {
            capitulos = JSON.parse(capitulos);
          } catch (e) {
            return res
              .status(400)
              .json({ error: "Formato de capítulos inválido" });
          }
        }

        // Obter nome do professor e criar estrutura de pastas (se houver vídeos novos)
        let pastaCurso = null;
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
          const teacher = await Teacher.findById(curso.professorId).populate(
            "userId",
            "name",
          );
          if (teacher && teacher.userId) {
            const professorName = teacher.userId.name || "professor";
            const professorIdStr = teacher._id.toString();
            const professorId5 = professorIdStr.substring(0, 5);
            const nomePastaProfessor = `${professorName}_${professorId5}`
              .toLowerCase()
              .replace(/\s+/g, "_");
            const nomePastaCurso = curso.titulo
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^a-z0-9_]/g, "");
            pastaCurso = `cursos/${nomePastaProfessor}/${nomePastaCurso}`;
          }
        }

        // Processar capítulos e fazer upload de vídeos novos se houver
        const capitulosProcessados = [];
        for (let i = 0; i < capitulos.length; i++) {
          const novoCapitulo = capitulos[i];
          const capituloExistente = curso.capitulos[i];

          // Se professor está tentando desbloquear um capítulo bloqueado por admin
          if (
            role === "professor" &&
            capituloExistente &&
            capituloExistente.bloqueadoPorAdmin &&
            !novoCapitulo.bloqueado
          ) {
            throw new Error(
              "Este capítulo foi bloqueado por um administrador e não pode ser desbloqueado por um professor",
            );
          }

          // Atualizar flag de bloqueio por admin
          if (novoCapitulo.bloqueado) {
            novoCapitulo.bloqueadoPorAdmin = role === "admin";
          } else {
            // Se está desbloqueando, só pode se não foi bloqueado por admin (ou se quem está desbloqueando é admin)
            if (role === "admin" || !capituloExistente?.bloqueadoPorAdmin) {
              novoCapitulo.bloqueadoPorAdmin = false;
            } else {
              // Manter bloqueado se foi bloqueado por admin e professor está tentando desbloquear
              novoCapitulo.bloqueado = true;
              novoCapitulo.bloqueadoPorAdmin = true;
            }
          }

          // Identificar aulas removidas comparando com capítulo existente
          const capituloOriginal = curso.capitulos[i];
          const aulasOriginais = capituloOriginal?.aulas || [];
          const aulasNovas = novoCapitulo.aulas || [];

          // Encontrar aulas que foram removidas
          const aulasRemovidas = [];
          if (
            novoCapitulo.aulasRemovidas &&
            Array.isArray(novoCapitulo.aulasRemovidas)
          ) {
            // Usar a lista de aulas removidas enviada pelo frontend
            // Buscar as aulas completas originais para obter o conteúdo completo
            novoCapitulo.aulasRemovidas.forEach((aulaRemovidaInfo) => {
              const aulaOriginalCompleta = aulasOriginais.find(
                (aulaOriginal) => {
                  return (
                    aulaOriginal.titulo === aulaRemovidaInfo.titulo &&
                    aulaOriginal.tipo === aulaRemovidaInfo.tipo &&
                    aulaOriginal.conteudo === aulaRemovidaInfo.conteudo
                  );
                },
              );
              if (aulaOriginalCompleta) {
                aulasRemovidas.push(aulaOriginalCompleta);
              }
            });
          } else {
            // Fallback: comparar por título, tipo e conteúdo
            aulasOriginais.forEach((aulaOriginal) => {
              const aulaAindaExiste = aulasNovas.some((novaAula) => {
                return (
                  aulaOriginal.titulo === novaAula.titulo &&
                  aulaOriginal.conteudo === novaAula.conteudo &&
                  aulaOriginal.tipo === novaAula.tipo
                );
              });

              if (!aulaAindaExiste) {
                aulasRemovidas.push(aulaOriginal);
              }
            });
          }

          // Deletar vídeos do Cloudinary para aulas de vídeo removidas
          for (const aulaRemovida of aulasRemovidas) {
            if (aulaRemovida.tipo === "video" && aulaRemovida.conteudo) {
              try {
                const publicId = uploadService.extractPublicIdFromUrl(
                  aulaRemovida.conteudo,
                );
                if (publicId) {
                  await uploadService.deleteVideo(publicId);
                  console.log(`✅ Vídeo deletado do Cloudinary: ${publicId}`);
                } else {
                  console.warn(
                    `⚠️ Não foi possível extrair publicId da URL: ${aulaRemovida.conteudo}`,
                  );
                }
              } catch (deleteError) {
                console.error(
                  `⚠️ Erro ao deletar vídeo do Cloudinary:`,
                  deleteError.message,
                );
                // Continua mesmo se não conseguir deletar o vídeo
              }
            }
          }

          // Processar aulas e fazer upload de vídeos novos
          const aulasProcessadas = [];
          if (novoCapitulo.aulas && Array.isArray(novoCapitulo.aulas)) {
            for (let j = 0; j < novoCapitulo.aulas.length; j++) {
              const novaAula = novoCapitulo.aulas[j];

              // Se for vídeo e houver arquivo novo, fazer upload
              if (novaAula.tipo === "video" && pastaCurso) {
                const videoKey = `video_${i}_${j}`;
                let videoFile = null;
                if (req.files && Array.isArray(req.files)) {
                  videoFile = req.files.find(
                    (file) => file.fieldname === videoKey,
                  );
                }

                if (videoFile) {
                  try {
                    const videoUpload = await uploadService.uploadVideo(
                      videoFile.buffer,
                      `${pastaCurso}/videos`,
                      `capitulo_${i + 1}_aula_${j + 1}`,
                    );

                    aulasProcessadas.push({
                      ...novaAula,
                      conteudo: videoUpload.url,
                      duracaoMinutos:
                        Math.ceil(videoUpload.duration / 60) ||
                        novaAula.duracaoMinutos ||
                        1,
                    });
                  } catch (uploadError) {
                    console.error(
                      `Erro ao fazer upload do vídeo ${videoKey}:`,
                      uploadError,
                    );
                    // Se falhar o upload, manter o conteúdo original se existir
                    aulasProcessadas.push(novaAula);
                  }
                } else {
                  // Não há vídeo novo, manter a aula como está
                  aulasProcessadas.push(novaAula);
                }
              } else {
                // Não é vídeo ou não há pasta definida, manter como está
                aulasProcessadas.push(novaAula);
              }
            }
          }

          // Remover campo aulasRemovidas antes de salvar (se existir)
          const capituloParaSalvar = { ...novoCapitulo };
          delete capituloParaSalvar.aulasRemovidas;

          capitulosProcessados.push({
            ...capituloParaSalvar,
            aulas: aulasProcessadas,
          });
        }

        curso.capitulos = capitulosProcessados;
      }

      // Atualizar outros campos do curso (se houver)
      if (req.body.titulo) curso.titulo = req.body.titulo;
      if (req.body.descricao !== undefined)
        curso.descricao = req.body.descricao;
      if (req.body.materiaId) curso.materiaId = req.body.materiaId;
      if (req.body.turmasPermitidas)
        curso.turmasPermitidas = req.body.turmasPermitidas;
      if (req.body.status) curso.status = req.body.status;

      await curso.save();

      const cursoAtualizado = await Curso.findById(curso._id)
        .populate("materiaId", "nome")
        .populate("professorId", "userId")
        .populate("turmasPermitidas", "nome");

      return res.json(cursoAtualizado);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar curso", details: error.message });
    }
  }

  // Professor adiciona capítulo ao curso
  async addCapitulo(req, res) {
    try {
      const { role, id } = req.user;
      const { titulo, ordem, aulas } = req.body;

      const curso = await Curso.findById(req.params.id);

      if (!curso) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }

      // Verificar se é o dono do curso
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          curso.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({ error: "Você não tem permissão para editar este curso" });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      curso.capitulos.push({ titulo, ordem, aulas });
      await curso.save();

      return res.json(curso);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao adicionar capítulo", details: error.message });
    }
  }

  // Verificar se aluno está inscrito no curso
  async verificarInscricao(req, res) {
    try {
      const { id } = req.user;
      const Student = require("../models/student.model.js");
      const student = await Student.findOne({ userId: id });

      if (!student) {
        return res.status(403).json({ error: "Aluno não encontrado" });
      }

      const curso = await Curso.findById(req.params.id);

      if (!curso) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }

      const estaInscrito = curso.alunosInscritos.includes(student._id);

      return res.json({ estaInscrito });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao verificar inscrição", details: error.message });
    }
  }

  // Aluno se inscreve no curso
  async inscrever(req, res) {
    try {
      const { id } = req.user;
      const Turma = require("../models/turma.model.js");
      const student = await Student.findOne({ userId: id });

      if (!student) {
        return res.status(403).json({ error: "Aluno não encontrado" });
      }

      const curso = await Curso.findById(req.params.id);

      if (!curso) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }

      if (curso.status !== "ativo") {
        return res.status(400).json({ error: "Curso não está ativo" });
      }

      // Verificar se o aluno já está inscrito
      if (curso.alunosInscritos.includes(student._id)) {
        return res
          .status(400)
          .json({ error: "Aluno já está inscrito neste curso" });
      }

      // Buscar turma atual do aluno (turma ativa do ano letivo atual)
      const anoLetivoAtual = new Date().getFullYear();
      const turmaAtual = await Turma.findOne({
        alunos: student._id,
        anoLetivo: anoLetivoAtual,
        status: "ativa",
      });

      // Se não encontrar turma ativa do ano atual, usar turmaId do modelo Student como fallback
      const turmaIdParaVerificacao = turmaAtual
        ? turmaAtual._id
        : student.turmaId;

      // Verificar se a turma do aluno está permitida
      if (
        curso.turmasPermitidas.length > 0 &&
        turmaIdParaVerificacao &&
        !curso.turmasPermitidas.some(
          (turmaId) => turmaId.toString() === turmaIdParaVerificacao.toString(),
        )
      ) {
        return res
          .status(403)
          .json({ error: "Sua turma não tem acesso a este curso" });
      }

      // Adicionar aluno ao curso
      curso.alunosInscritos.push(student._id);
      await curso.save();

      // Adicionar curso ao aluno
      student.cursos.push(curso._id);
      await student.save();

      // Criar registro de progresso
      await ProgressoCurso.create({
        alunoId: student._id,
        cursoId: curso._id,
        status: "em_andamento",
      });

      return res
        .status(201)
        .json({ message: "Inscrição realizada com sucesso" });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao inscrever no curso", details: error.message });
    }
  }

  // Professor ou admin deleta curso
  async delete(req, res) {
    try {
      const { role, id } = req.user;
      const curso = await Curso.findById(req.params.id);

      if (!curso) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          curso.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({ error: "Você não tem permissão para deletar este curso" });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      // Remover curso do professor
      await Teacher.findByIdAndUpdate(curso.professorId, {
        $pull: { cursos: curso._id },
      });

      // Remover curso dos alunos
      await Student.updateMany(
        { cursos: curso._id },
        { $pull: { cursos: curso._id } },
      );

      // Deletar progressos relacionados
      await ProgressoCurso.deleteMany({ cursoId: curso._id });

      await Curso.findByIdAndDelete(req.params.id);

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar curso", details: error.message });
    }
  }

  // Deletar capítulo específico
  async deleteCapitulo(req, res) {
    try {
      const { role, id } = req.user;
      const { capituloIndex } = req.params;
      const curso = await Curso.findById(req.params.id);

      if (!curso) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          curso.professorId.toString() !== teacher._id.toString()
        ) {
          return res.status(403).json({
            error: "Você não tem permissão para deletar este capítulo",
          });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const index = parseInt(capituloIndex);
      if (index < 0 || index >= curso.capitulos.length) {
        return res.status(400).json({ error: "Índice de capítulo inválido" });
      }

      // Remover capítulo
      curso.capitulos.splice(index, 1);
      await curso.save();

      return res.json(curso);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar capítulo", details: error.message });
    }
  }

  // Deletar aula específica de um capítulo
  async deleteAula(req, res) {
    try {
      const { role, id } = req.user;
      const { capituloIndex, aulaIndex } = req.params;
      const curso = await Curso.findById(req.params.id);

      if (!curso) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }

      // Verificar permissão
      if (role === "professor") {
        const teacher = await Teacher.findOne({ userId: id });
        if (
          !teacher ||
          curso.professorId.toString() !== teacher._id.toString()
        ) {
          return res
            .status(403)
            .json({ error: "Você não tem permissão para deletar esta aula" });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const capIndex = parseInt(capituloIndex);
      const aulaIdx = parseInt(aulaIndex);

      if (capIndex < 0 || capIndex >= curso.capitulos.length) {
        return res.status(400).json({ error: "Índice de capítulo inválido" });
      }

      const capitulo = curso.capitulos[capIndex];

      if (aulaIdx < 0 || aulaIdx >= capitulo.aulas.length) {
        return res.status(400).json({ error: "Índice de aula inválido" });
      }

      // Remover aula do capítulo
      capitulo.aulas.splice(aulaIdx, 1);
      await curso.save();

      return res.json(curso);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar aula", details: error.message });
    }
  }
}

module.exports = new CursoController();
