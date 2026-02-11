const ProgressoCurso = require("../models/progressoCurso.model.js");
const Curso = require("../models/curso.model.js");
const Student = require("../models/student.model.js");

class ProgressoCursoController {
  // Aluno marca aula como concluída (vídeo ou texto)
  async marcarAulaConcluida(req, res) {
    try {
      const { id } = req.user;
      const { cursoId, capituloOrdem, aulaOrdem, tipo, timestampVideo } =
        req.body;

      const student = await Student.findOne({ userId: id });
      if (!student) {
        return res.status(403).json({ error: "Aluno não encontrado" });
      }

      // Verificar se o curso existe
      const curso = await Curso.findById(cursoId);
      if (!curso) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }

      // Verificar se o aluno está inscrito
      if (!curso.alunosInscritos.includes(student._id)) {
        return res
          .status(403)
          .json({ error: "Aluno não está inscrito neste curso" });
      }

      // Validar tipo
      if (!tipo || !["video", "texto"].includes(tipo)) {
        return res.status(400).json({ error: "Tipo de aula inválido" });
      }

      // Buscar ou criar progresso
      let progresso = await ProgressoCurso.findOne({
        alunoId: student._id,
        cursoId,
      });

      if (!progresso) {
        progresso = await ProgressoCurso.create({
          alunoId: student._id,
          cursoId,
          aulasConcluidas: [],
          status: "em_andamento",
        });
      }

      // Atualizar última aula visualizada
      progresso.ultimaAulaVisualizada = {
        capituloOrdem,
        aulaOrdem,
      };

      // Verificar se a aula já foi concluída
      const aulaIndex = progresso.aulasConcluidas.findIndex(
        (aula) =>
          aula.capituloOrdem === capituloOrdem && aula.aulaOrdem === aulaOrdem,
      );

      if (aulaIndex === -1) {
        // Nova aula concluída
        progresso.aulasConcluidas.push({
          cursoId,
          capituloOrdem,
          aulaOrdem,
          tipo,
          dataConcluida: new Date(),
          timestampVideo: tipo === "video" ? timestampVideo || 0 : 0,
        });

        // Recalcular progresso
        await ProgressoCursoController.recalcularProgresso(progresso, curso);
      } else {
        // Atualizar timestamp do vídeo se for vídeo
        if (tipo === "video" && timestampVideo !== undefined) {
          progresso.aulasConcluidas[aulaIndex].timestampVideo = timestampVideo;
        }
      }

      await progresso.save();

      return res.json(progresso);
    } catch (error) {
      return res.status(500).json({
        error: "Erro ao marcar aula como concluída",
        details: error.message,
      });
    }
  }

  // Salvar timestamp do vídeo
  async salvarTimestampVideo(req, res) {
    try {
      const { id } = req.user;
      const { cursoId, capituloOrdem, aulaOrdem, timestampVideo } = req.body;

      const student = await Student.findOne({ userId: id });
      if (!student) {
        return res.status(403).json({ error: "Aluno não encontrado" });
      }

      const progresso = await ProgressoCurso.findOne({
        alunoId: student._id,
        cursoId,
      });

      if (!progresso) {
        return res.status(404).json({ error: "Progresso não encontrado" });
      }

      // Atualizar última aula visualizada
      progresso.ultimaAulaVisualizada = {
        capituloOrdem,
        aulaOrdem,
      };

      // IMPORTANTE: salvarTimestampVideo apenas salva o timestamp, NÃO marca como concluída
      // A aula só é marcada como concluída quando marcarAulaConcluida é chamado explicitamente
      // Atualizar timestamp apenas se a aula já estiver concluída
      const aulaIndex = progresso.aulasConcluidas.findIndex(
        (aula) =>
          aula.capituloOrdem === capituloOrdem && aula.aulaOrdem === aulaOrdem,
      );

      if (aulaIndex !== -1) {
        // Apenas atualizar timestamp se a aula já estiver concluída
        progresso.aulasConcluidas[aulaIndex].timestampVideo =
          timestampVideo || 0;
      }
      // Se a aula não estiver concluída, apenas salvar o timestamp em um campo separado
      // (não adicionar à lista de aulas concluídas)

      await progresso.save();

      return res.json({ success: true });
    } catch (error) {
      return res.status(500).json({
        error: "Erro ao salvar timestamp do vídeo",
        details: error.message,
      });
    }
  }

  // Aluno vê seus cursos e progresso
  async meusCursos(req, res) {
    try {
      const { id } = req.user;
      const student = await Student.findOne({ userId: id });

      if (!student) {
        return res.status(403).json({ error: "Aluno não encontrado" });
      }

      const progressos = await ProgressoCurso.find({ alunoId: student._id })
        .populate({
          path: "cursoId",
          select: "titulo descricao materiaId capitulos status capa",
          populate: [
            {
              path: "materiaId",
              select: "nome",
            },
            {
              path: "professorId",
              select: "userId",
              populate: {
                path: "userId",
                select: "name",
              },
            },
          ],
        })
        .sort({ updatedAt: -1 });

      // Buscar cursos completos
      const cursosCompletos = progressos.filter((p) => p.status === "completo");

      // Buscar cursos em andamento
      const cursosEmAndamento = progressos.filter(
        (p) => p.status === "em_andamento",
      );

      return res.json({
        totalCursos: progressos.length,
        cursosCompletos: cursosCompletos.length,
        cursosEmAndamento: cursosEmAndamento.length,
        progressos,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar cursos", details: error.message });
    }
  }

  // Admin busca cursos de um aluno específico
  async getCursosAluno(req, res) {
    try {
      const { alunoId } = req.params;

      const student = await Student.findById(alunoId);
      if (!student) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      const progressos = await ProgressoCurso.find({ alunoId: student._id })
        .populate({
          path: "cursoId",
          select: "titulo descricao materiaId capitulos status capa",
          populate: [
            {
              path: "materiaId",
              select: "nome",
            },
            {
              path: "professorId",
              select: "userId",
              populate: {
                path: "userId",
                select: "name",
              },
            },
          ],
        })
        .sort({ updatedAt: -1 });

      // Buscar cursos completos
      const cursosCompletos = progressos.filter((p) => p.status === "completo");

      // Buscar cursos em andamento
      const cursosEmAndamento = progressos.filter(
        (p) => p.status === "em_andamento",
      );

      return res.json({
        totalCursos: progressos.length,
        cursosCompletos: cursosCompletos.length,
        cursosEmAndamento: cursosEmAndamento.length,
        progressos,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          error: "Erro ao buscar cursos do aluno",
          details: error.message,
        });
    }
  }

  // Visualizar progresso específico de um curso
  async getProgresso(req, res) {
    try {
      const { id } = req.user;
      const { cursoId } = req.params;

      const student = await Student.findOne({ userId: id });
      if (!student) {
        return res.status(403).json({ error: "Aluno não encontrado" });
      }

      const progresso = await ProgressoCurso.findOne({
        alunoId: student._id,
        cursoId,
      }).populate("cursoId", "titulo descricao capitulos");

      if (!progresso) {
        return res.status(404).json({ error: "Progresso não encontrado" });
      }

      const curso = await Curso.findById(cursoId);

      // Detalhar progresso por capítulo
      const progressoPorCapitulo = curso.capitulos.map((capitulo) => {
        const aulasConcluidas = progresso.aulasConcluidas.filter(
          (aula) => aula.capituloOrdem === capitulo.ordem,
        );

        return {
          capitulo: capitulo.titulo,
          ordem: capitulo.ordem,
          totalAulas: capitulo.aulas.length,
          aulasConcluidas: aulasConcluidas.length,
          progresso:
            capitulo.aulas.length > 0
              ? (aulasConcluidas.length / capitulo.aulas.length) * 100
              : 0,
          aulas: capitulo.aulas.map((aula) => {
            const concluida = aulasConcluidas.some(
              (aulaConcluida) => aulaConcluida.aulaOrdem === aula.ordem,
            );
            return {
              ...aula,
              concluida,
            };
          }),
        };
      });

      return res.json({
        progressoPercentual: progresso.progressoPercentual || 0,
        status: progresso.status || "em_andamento",
        dataConclusao: progresso.dataConclusao,
        ultimaAulaVisualizada: progresso.ultimaAulaVisualizada,
        progressoPorCapitulo,
        aulasConcluidas: progresso.aulasConcluidas.map((aula) => ({
          capituloOrdem: aula.capituloOrdem,
          aulaOrdem: aula.aulaOrdem,
          tipo: aula.tipo,
          timestampVideo: aula.timestampVideo || 0,
        })),
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar progresso", details: error.message });
    }
  }

  // Recalcular progresso percentual e status
  static async recalcularProgresso(progresso, curso) {
    try {
      if (!curso || !curso.capitulos) return;

      // Contar total de aulas no curso (vídeo + texto)
      let totalAulas = 0;
      curso.capitulos.forEach((capitulo) => {
        totalAulas += capitulo.aulas.length;
      });

      // Contar aulas concluídas
      const aulasConcluidas = progresso.aulasConcluidas.length;

      // Calcular percentual
      progresso.progressoPercentual =
        totalAulas > 0 ? Math.round((aulasConcluidas / totalAulas) * 100) : 0;

      // Verificar se completou todas as aulas
      if (aulasConcluidas >= totalAulas && totalAulas > 0) {
        progresso.status = "completo";
        if (!progresso.dataConclusao) {
          progresso.dataConclusao = new Date();
        }
      } else {
        progresso.status = "em_andamento";
      }
    } catch (error) {
      console.error("Erro ao recalcular progresso:", error);
    }
  }

  // Listar todos os progressos (admin ou professor)
  async list(req, res) {
    try {
      const { cursoId, alunoId } = req.query;
      let query = {};

      if (cursoId) query.cursoId = cursoId;
      if (alunoId) query.alunoId = alunoId;

      const progressos = await ProgressoCurso.find(query)
        .populate("alunoId", "userId")
        .populate("cursoId", "titulo descricao")
        .sort({ updatedAt: -1 });

      return res.json(progressos);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao listar progressos", details: error.message });
    }
  }

  // Gerar certificado PDF
  async gerarCertificado(req, res) {
    try {
      const { id } = req.user;
      const { cursoId } = req.params;

      const student = await Student.findOne({ userId: id }).populate(
        "userId",
        "name",
      );
      if (!student) {
        return res.status(403).json({ error: "Aluno não encontrado" });
      }

      const progresso = await ProgressoCurso.findOne({
        alunoId: student._id,
        cursoId,
      }).populate("cursoId", "titulo");

      if (!progresso) {
        return res.status(404).json({ error: "Progresso não encontrado" });
      }

      if (progresso.status !== "completo") {
        return res.status(400).json({ error: "Curso não foi completado" });
      }

      const curso = await Curso.findById(cursoId);
      if (!curso) {
        return res.status(404).json({ error: "Curso não encontrado" });
      }

      // Require pdfkit apenas quando necessário (lazy loading)
      let PDFDocument;
      try {
        PDFDocument = require("pdfkit");
      } catch (error) {
        console.error("Erro ao carregar PDFKit:", error);
        // Se a resposta já foi iniciada, não podemos enviar JSON
        if (res.headersSent) {
          return res.end();
        }
        return res.status(500).json({
          error: "Biblioteca PDF não instalada",
          message:
            "O módulo pdfkit não foi encontrado. Por favor, execute 'npm install pdfkit' no diretório do backend e reinicie o servidor.",
          details: error.message,
        });
      }

      // Configurar headers para download ANTES de criar o PDF
      const safeFileName = curso.titulo
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .substring(0, 50); // Limitar tamanho do nome

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=certificado-${safeFileName}.pdf`,
      );

      // Criar PDF em modo paisagem (horizontal)
      const doc = new PDFDocument({
        size: "A4",
        layout: "landscape",
        margin: 0,
      });

      // Pipe PDF para response
      doc.pipe(res);

      console.log("PDF criado e conectado à response");

      // Dados dinâmicos
      const nomeAluno = student.userId?.name || "Aluno";
      const nomeCurso = curso.titulo || "Curso";

      // Formatar data no formato DD/MM/YYYY
      let dataFormatada = "";
      if (progresso.dataConclusao) {
        const data = new Date(progresso.dataConclusao);
        const dia = String(data.getDate()).padStart(2, "0");
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const ano = String(data.getFullYear()).slice(-2); // Últimos 2 dígitos
        dataFormatada = `${dia}/${mes}/${ano}`;
      } else {
        const hoje = new Date();
        const dia = String(hoje.getDate()).padStart(2, "0");
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const ano = String(hoje.getFullYear()).slice(-2);
        dataFormatada = `${dia}/${mes}/${ano}`;
      }

      // Cores
      const corLaranja = "#ff7a00"; // orange-500
      const corBranco = "#ffffff";
      const corPreto = "#000000";
      const corCinza = "#666666";
      const corAzulClaro = "#6b7280"; // Para o texto descritivo

      // Dimensões da página
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const borderWidth = 8;
      const innerMargin = 30;

      // Desenhar borda laranja externa
      doc
        .rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2)
        .lineWidth(borderWidth)
        .strokeColor(corLaranja)
        .stroke();

      // Desenhar borda pontilhada interna
      const innerRectX = margin + borderWidth + innerMargin;
      const innerRectY = margin + borderWidth + innerMargin;
      const innerRectWidth =
        pageWidth - (margin + borderWidth + innerMargin) * 2;
      const innerRectHeight =
        pageHeight - (margin + borderWidth + innerMargin) * 2;

      // Desenhar linha pontilhada (simulando com pequenos traços)
      const dashLength = 3;
      const gapLength = 2;
      const totalLength = dashLength + gapLength;

      // Linha superior pontilhada
      for (
        let x = innerRectX;
        x < innerRectX + innerRectWidth;
        x += totalLength
      ) {
        doc
          .moveTo(Math.min(x, innerRectX + innerRectWidth), innerRectY)
          .lineTo(
            Math.min(x + dashLength, innerRectX + innerRectWidth),
            innerRectY,
          )
          .lineWidth(1)
          .strokeColor(corLaranja)
          .stroke();
      }

      // Linha inferior pontilhada
      for (
        let x = innerRectX;
        x < innerRectX + innerRectWidth;
        x += totalLength
      ) {
        doc
          .moveTo(
            Math.min(x, innerRectX + innerRectWidth),
            innerRectY + innerRectHeight,
          )
          .lineTo(
            Math.min(x + dashLength, innerRectX + innerRectWidth),
            innerRectY + innerRectHeight,
          )
          .lineWidth(1)
          .strokeColor(corLaranja)
          .stroke();
      }

      // Linha esquerda pontilhada
      for (
        let y = innerRectY;
        y < innerRectY + innerRectHeight;
        y += totalLength
      ) {
        doc
          .moveTo(innerRectX, Math.min(y, innerRectY + innerRectHeight))
          .lineTo(
            innerRectX,
            Math.min(y + dashLength, innerRectY + innerRectHeight),
          )
          .lineWidth(1)
          .strokeColor(corLaranja)
          .stroke();
      }

      // Linha direita pontilhada
      for (
        let y = innerRectY;
        y < innerRectY + innerRectHeight;
        y += totalLength
      ) {
        doc
          .moveTo(
            innerRectX + innerRectWidth,
            Math.min(y, innerRectY + innerRectHeight),
          )
          .lineTo(
            innerRectX + innerRectWidth,
            Math.min(y + dashLength, innerRectY + innerRectHeight),
          )
          .lineWidth(1)
          .strokeColor(corLaranja)
          .stroke();
      }

      // Área de conteúdo (dentro das bordas)
      const contentX = innerRectX + 20;
      const contentY = innerRectY + 40;
      const contentWidth = innerRectWidth - 40;

      // Título do certificado
      doc.fontSize(28).fillColor(corPreto).font("Helvetica-Bold");

      const titleText = "Certificado de Conclusão de Curso";
      const titleWidth = doc.widthOfString(titleText);
      const titleX = contentX + (contentWidth - titleWidth) / 2;
      doc.text(titleText, titleX, contentY);

      // Linha laranja abaixo do título
      const lineY = contentY + 45;
      doc
        .moveTo(contentX + 100, lineY)
        .lineTo(contentX + contentWidth - 100, lineY)
        .lineWidth(2)
        .strokeColor(corLaranja)
        .stroke();

      // Texto principal do certificado
      let textY = lineY + 50;
      const fontSize = 14;
      const lineHeight = 22;
      const textWidth = contentWidth - 60;

      // Função auxiliar para desenhar texto com partes em negrito e centralizado
      const drawFormattedText = (x, y, maxWidth, fontSize) => {
        const parts = [
          { text: "A ", bold: false },
          { text: "PlataformaEDC", bold: true },
          { text: " certifica que ", bold: false },
          { text: nomeAluno, bold: true },
          { text: ", concluiu com êxito o curso interno de ", bold: false },
          { text: nomeCurso, bold: true },
          { text: ", realizado ", bold: false },
          { text: dataFormatada, bold: true },
          { text: ".", bold: false },
        ];

        // Primeiro, calcular largura total de cada linha
        let lines = [];
        let currentLine = [];
        let currentLineWidth = 0;

        doc.fontSize(fontSize);

        for (const part of parts) {
          if (part.bold) {
            doc.font("Helvetica-Bold");
          } else {
            doc.font("Helvetica");
          }

          const partWidth = doc.widthOfString(part.text);

          if (
            currentLineWidth + partWidth > maxWidth &&
            currentLine.length > 0
          ) {
            lines.push([...currentLine]);
            currentLine = [part];
            currentLineWidth = partWidth;
          } else {
            currentLine.push(part);
            currentLineWidth += partWidth;
          }
        }
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }

        // Desenhar cada linha centralizada
        let currentY = y;
        for (const line of lines) {
          // Calcular largura total da linha
          let lineWidth = 0;
          doc.fontSize(fontSize);
          for (const part of line) {
            if (part.bold) {
              doc.font("Helvetica-Bold");
            } else {
              doc.font("Helvetica");
            }
            lineWidth += doc.widthOfString(part.text);
          }

          // Calcular posição X para centralizar a linha
          const lineX = x + (maxWidth - lineWidth) / 2;
          let currentX = lineX;

          // Desenhar cada parte da linha
          for (const part of line) {
            doc.fontSize(fontSize);
            if (part.bold) {
              doc.font("Helvetica-Bold").fillColor(corPreto);
            } else {
              doc.font("Helvetica").fillColor(corPreto);
            }
            doc.text(part.text, currentX, currentY);
            currentX += doc.widthOfString(part.text);
          }

          currentY += lineHeight;
        }

        return currentY;
      };

      // Desenhar texto formatado
      const finalY = drawFormattedText(
        contentX + 30,
        textY,
        textWidth,
        fontSize,
      );

      // Parágrafo descritivo (texto fixo)
      const descY = finalY + 30;
      doc
        .fontSize(11)
        .font("Helvetica-Oblique")
        .fillColor(corAzulClaro)
        .text(
          "Durante o programa, aluno(a) demonstrou empenho, participação ativa e capacidade de aplicar conhecimentos adquiridos no seu dia a dia profissional, contribuindo assim para o aprimoramento individual.",
          contentX + 30,
          descY,
          {
            width: contentWidth - 60,
            align: "justify",
          },
        );

      // Área de assinatura (parte inferior centralizada) - ajustado para modo paisagem
      const signatureY = pageHeight - margin - borderWidth - innerMargin - 80;

      // Nome do diretor (fixo)
      const nomeDiretor = "Lucas Piran";
      const cargoDiretor = "Diretora de Ensino";

      // Assinatura com fonte script (nome do diretor em fonte cursiva/script)
      // Usando Helvetica-Oblique para simular fonte script (Eyesome Script)
      doc.fontSize(20).font("Helvetica-Oblique").fillColor(corPreto);

      // Calcular largura do texto da assinatura
      const signatureTextWidth = doc.widthOfString(nomeDiretor);
      const signatureAreaWidth = Math.max(signatureTextWidth + 100, 200); // Largura mínima da área de assinatura
      const signatureX = contentX + (contentWidth - signatureAreaWidth) / 2;

      // Desenhar assinatura (nome do diretor em fonte script) - centralizada
      const signatureTextX =
        signatureX + (signatureAreaWidth - signatureTextWidth) / 2;
      doc.text(nomeDiretor, signatureTextX, signatureY);

      // Linha abaixo da assinatura (centralizada)
      const lineWidth = signatureTextWidth + 40;
      const lineX = signatureX + (signatureAreaWidth - lineWidth) / 2;
      doc
        .moveTo(lineX, signatureY + 20)
        .lineTo(lineX + lineWidth, signatureY + 20)
        .lineWidth(1)
        .strokeColor(corPreto)
        .stroke();

      // Nome do diretor abaixo da linha (centralizado)
      doc.fontSize(12).font("Helvetica").fillColor(corPreto);
      const nomeWidth = doc.widthOfString(nomeDiretor);
      const nomeX = signatureX + (signatureAreaWidth - nomeWidth) / 2;
      doc.text(nomeDiretor, nomeX, signatureY + 25);

      // Cargo abaixo do nome (centralizado)
      doc.fontSize(11).font("Helvetica").fillColor(corPreto);
      const cargoWidth = doc.widthOfString(cargoDiretor);
      const cargoX = signatureX + (signatureAreaWidth - cargoWidth) / 2;
      doc.text(cargoDiretor, cargoX, signatureY + 40);

      // Finalizar PDF
      console.log("Finalizando PDF...");
      doc.end();
      console.log("PDF finalizado com sucesso");
    } catch (error) {
      console.error("Erro ao gerar certificado:", error);
      console.error("Stack:", error.stack);

      // Se a resposta já foi iniciada (headers enviados), não podemos enviar JSON
      if (res.headersSent) {
        return res.end();
      }

      return res.status(500).json({
        error: "Erro ao gerar certificado",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
}

module.exports = new ProgressoCursoController();
