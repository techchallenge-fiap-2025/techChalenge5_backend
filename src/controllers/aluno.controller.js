const User = require("../models/user.model.js");
const Student = require("../models/student.model.js");
const Responsaveis = require("../models/responsavel.model.js");
const bcrypt = require("bcryptjs");
const uploadService = require("../services/upload.service");

class AlunoController {
  async create(req, res) {
    try {
      const {
        name,
        email,
        password,
        idade,
        cpf,
        cepEndereco,
        endereco,
        responsaveisIds,
      } = req.body;

      // Validar campos obrigatórios
      if (!name || !email || !password) {
        return res
          .status(400)
          .json({ error: "Nome, email e senha são obrigatórios" });
      }

      // Validar CEP Endereço
      if (!cepEndereco || cepEndereco.replace(/\D/g, "").length !== 8) {
        return res.status(400).json({
          error: "CEP Endereço é obrigatório e deve conter 8 dígitos",
        });
      }

      // Verificar se email já existe
      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }

      // Verificar se CPF já existe
      if (cpf) {
        const cpfExists = await User.findOne({ cpf });
        if (cpfExists) {
          return res.status(400).json({ error: "CPF já cadastrado" });
        }
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Preparar endereço com CEP formatado
      const enderecoCompleto = {
        ...endereco,
        cep: cepEndereco.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2"),
      };

      // Criar usuário
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "aluno",
        idade,
        cpf,
        endereco: enderecoCompleto,
        active: true,
      });

      // Validar responsáveis
      if (
        !responsaveisIds ||
        !Array.isArray(responsaveisIds) ||
        responsaveisIds.length === 0
      ) {
        await User.findByIdAndDelete(user._id);
        return res
          .status(400)
          .json({ error: "Pelo menos um responsável é obrigatório" });
      }

      if (responsaveisIds.length > 2) {
        await User.findByIdAndDelete(user._id);
        return res
          .status(400)
          .json({ error: "Máximo de 2 responsáveis permitidos" });
      }

      // Verificar se todos os responsáveis existem
      const responsaveisExistentes = await Responsaveis.find({
        _id: { $in: responsaveisIds },
      });

      if (responsaveisExistentes.length !== responsaveisIds.length) {
        await User.findByIdAndDelete(user._id);
        return res
          .status(400)
          .json({ error: "Um ou mais responsáveis não encontrados" });
      }

      // Criar aluno (sem turma obrigatória)
      const alunoData = {
        userId: user._id,
        status: "ativo", // Status padrão conforme modelo
        responsaveis: responsaveisIds,
      };

      const aluno = await Student.create(alunoData);

      // Adicionar aluno aos responsáveis após criar o Student
      for (const responsavelId of responsaveisIds) {
        const responsavel = await Responsaveis.findById(responsavelId);
        if (responsavel) {
          responsavel.alunos.push(aluno._id);
          await responsavel.save();
        }
      }

      return res.status(201).json({
        message: "Aluno criado com sucesso",
        userId: user._id,
        alunoId: aluno._id,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao criar aluno", details: error.message });
    }
  }

  async getMe(req, res) {
    try {
      const userId = req.user.id; // ID do User do token JWT
      const Turma = require("../models/turma.model.js");

      const aluno = await Student.findOne({ userId })
        .populate({
          path: "userId",
          select: "-password", // Excluir senha
        })
        .populate({
          path: "turmaId",
          select: "nome anoLetivo periodo nivelEducacional status",
        })
        .populate({
          path: "responsaveis",
          select: "nome email telefone",
        });

      if (!aluno) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      // Buscar turma atual do aluno (turma ativa do ano letivo atual)
      const anoLetivoAtual = new Date().getFullYear();
      const turmaAtual = await Turma.findOne({
        alunos: aluno._id,
        anoLetivo: anoLetivoAtual,
        status: "ativa",
      }).select("nome anoLetivo periodo nivelEducacional status");

      // Se encontrou uma turma atual, usar ela; caso contrário, usar turmaId populado
      const turmaParaExibir = turmaAtual || aluno.turmaId;

      // Criar objeto de resposta com turma atualizada
      const alunoResponse = aluno.toObject();
      alunoResponse.turmaId = turmaParaExibir;

      return res.json(alunoResponse);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar perfil do aluno", details: error.message });
    }
  }

  async getById(req, res) {
    try {
      const alunoId = req.params.id;
      const Turma = require("../models/turma.model.js");

      const aluno = await Student.findById(alunoId)
        .populate({
          path: "userId",
          select: "-password", // Excluir senha
        })
        .populate({
          path: "turmaId",
          select: "nome anoLetivo periodo nivelEducacional status",
        })
        .populate({
          path: "responsaveis",
          select: "nome email telefone",
        });

      if (!aluno) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      // Buscar turma atual do aluno (turma ativa do ano letivo atual)
      const anoLetivoAtual = new Date().getFullYear();
      const turmaAtual = await Turma.findOne({
        alunos: aluno._id,
        anoLetivo: anoLetivoAtual,
        status: "ativa",
      }).select("nome anoLetivo periodo nivelEducacional status");

      // Se encontrou uma turma atual, usar ela; caso contrário, usar turmaId populado
      const turmaParaExibir = turmaAtual || aluno.turmaId;

      // Criar objeto de resposta com turma atualizada
      const alunoResponse = aluno.toObject();
      alunoResponse.turmaId = turmaParaExibir;

      return res.json(alunoResponse);
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao buscar aluno", details: error.message });
    }
  }

  async toggleActive(req, res) {
    try {
      const alunoId = req.params.id;
      const aluno = await Student.findById(alunoId);

      if (!aluno) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      const user = await User.findById(aluno.userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Alternar o status active
      user.active = !user.active;
      await user.save();

      // Se estiver bloqueando (active = false), mudar status do aluno para "trancado"
      // Se estiver desbloqueando (active = true), mudar status do aluno para "ativo"
      if (!user.active) {
        aluno.status = "trancado";
      } else {
        aluno.status = "ativo";
      }
      await aluno.save();

      // Buscar aluno atualizado com populate
      const alunoAtualizado = await Student.findById(alunoId)
        .populate({
          path: "userId",
          select: "-password",
        })
        .populate({
          path: "turmaId",
          select: "nome",
        })
        .populate({
          path: "responsaveis",
          select: "nome email telefone",
        });

      return res.json({
        message: user.active
          ? "Usuário ativado com sucesso"
          : "Usuário bloqueado com sucesso",
        aluno: alunoAtualizado,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Erro ao atualizar status do usuário",
        details: error.message,
      });
    }
  }

  async update(req, res) {
    try {
      const alunoId = req.params.id;
      const {
        name,
        email,
        password,
        idade,
        cpf,
        cepEndereco,
        endereco,
        responsaveisIds,
      } = req.body;

      // Buscar aluno
      const aluno = await Student.findById(alunoId);
      if (!aluno) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      // Buscar usuário associado
      const user = await User.findById(aluno.userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Validar campos obrigatórios
      if (!name || !email) {
        return res.status(400).json({ error: "Nome e email são obrigatórios" });
      }

      // Verificar se email já existe (exceto o próprio usuário)
      if (email !== user.email) {
        const emailExists = await User.findOne({
          email,
          _id: { $ne: user._id },
        });
        if (emailExists) {
          return res.status(400).json({ error: "Email já cadastrado" });
        }
      }

      // Verificar se CPF já existe (exceto o próprio usuário)
      if (cpf && cpf !== user.cpf) {
        const cpfExists = await User.findOne({ cpf, _id: { $ne: user._id } });
        if (cpfExists) {
          return res.status(400).json({ error: "CPF já cadastrado" });
        }
      }

      // Validar CEP Endereço
      if (!cepEndereco || cepEndereco.replace(/\D/g, "").length !== 8) {
        return res.status(400).json({
          error: "CEP Endereço é obrigatório e deve conter 8 dígitos",
        });
      }

      // Validar responsáveis
      if (
        !responsaveisIds ||
        !Array.isArray(responsaveisIds) ||
        responsaveisIds.length === 0
      ) {
        return res
          .status(400)
          .json({ error: "Pelo menos um responsável é obrigatório" });
      }

      if (responsaveisIds.length > 2) {
        return res
          .status(400)
          .json({ error: "Máximo de 2 responsáveis permitidos" });
      }

      // Verificar se todos os responsáveis existem
      const responsaveisExistentes = await Responsaveis.find({
        _id: { $in: responsaveisIds },
      });

      if (responsaveisExistentes.length !== responsaveisIds.length) {
        return res
          .status(400)
          .json({ error: "Um ou mais responsáveis não encontrados" });
      }

      // Preparar endereço com CEP formatado
      const enderecoCompleto = {
        ...endereco,
        cep: cepEndereco.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2"),
      };

      // Atualizar dados do usuário
      user.name = name;
      user.email = email;
      if (idade !== undefined) user.idade = idade;
      if (cpf) user.cpf = cpf;
      user.endereco = enderecoCompleto;

      // Atualizar senha apenas se fornecida
      if (password && password.length > 0) {
        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
      }

      await user.save();

      // Remover aluno dos responsáveis antigos
      const responsaveisAntigos = aluno.responsaveis || [];
      for (const responsavelId of responsaveisAntigos) {
        await Responsaveis.findByIdAndUpdate(responsavelId, {
          $pull: { alunos: alunoId },
        });
      }

      // Atualizar responsáveis do aluno
      aluno.responsaveis = responsaveisIds;
      await aluno.save();

      // Adicionar aluno aos novos responsáveis
      for (const responsavelId of responsaveisIds) {
        await Responsaveis.findByIdAndUpdate(responsavelId, {
          $addToSet: { alunos: alunoId },
        });
      }

      // Buscar aluno atualizado com populate
      const alunoAtualizado = await Student.findById(alunoId)
        .populate({
          path: "userId",
          select: "-password",
        })
        .populate({
          path: "turmaId",
          select: "nome",
        })
        .populate({
          path: "responsaveis",
          select: "nome email telefone",
        });

      return res.json({
        message: "Aluno atualizado com sucesso",
        userId: user._id,
        aluno: alunoAtualizado,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao atualizar aluno", details: error.message });
    }
  }

  async delete(req, res) {
    try {
      const alunoId = req.params.id;
      const aluno = await Student.findById(alunoId);

      if (!aluno) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      const userId = aluno.userId;

      // Buscar usuário para deletar foto do Cloudinary se existir
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Deletar foto do Cloudinary se existir
      if (user.fotoPerfil?.publicId) {
        try {
          await uploadService.deleteImage(user.fotoPerfil.publicId);
          console.log(
            `✅ Foto do Cloudinary deletada: ${user.fotoPerfil.publicId}`,
          );
        } catch (error) {
          console.error(
            "⚠️ Erro ao deletar foto do Cloudinary:",
            error.message,
          );
          // Continua mesmo se não conseguir deletar a foto (não deve bloquear a deleção do usuário)
        }
      }

      // Remover aluno dos responsáveis (responsáveis têm referência ao Student._id)
      await Responsaveis.updateMany(
        { alunos: alunoId },
        { $pull: { alunos: alunoId } },
      );

      // Deletar aluno (Student)
      await Student.findByIdAndDelete(alunoId);

      // Deletar usuário (User)
      await User.findByIdAndDelete(userId);

      return res.status(204).send();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Erro ao deletar aluno", details: error.message });
    }
  }

  // Listar turmas históricas do aluno logado
  async getMinhasTurmas(req, res) {
    try {
      const { id: userId } = req.user;
      const Student = require("../models/student.model.js");
      const Turma = require("../models/turma.model.js");

      // Buscar aluno logado
      const student = await Student.findOne({ userId });
      if (!student) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      // Buscar todas as turmas do aluno (ativas e encerradas, de todos os anos)
      const turmas = await Turma.find({
        alunos: student._id,
      })
        .select("nome anoLetivo periodo nivelEducacional status")
        .sort({ anoLetivo: -1, nome: 1 });

      return res.json(turmas);
    } catch (error) {
      console.error("Erro ao buscar turmas do aluno:", error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar turmas", details: error.message });
    }
  }

  // Buscar boletim do aluno logado
  async getBoletim(req, res) {
    try {
      const { id: userId } = req.user;
      const { anoLetivo, turmaId } = req.query;
      const Student = require("../models/student.model.js");
      const Turma = require("../models/turma.model.js");
      const Atividade = require("../models/atividade.model.js");
      const NotaAtividade = require("../models/notaAtividade.model.js");
      const Attendance = require("../models/attendance.model.js");
      const AulaSemanal = require("../models/aulaSemanal.model.js");

      // Buscar aluno logado
      const student = await Student.findOne({ userId });
      if (!student) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      // Determinar ano letivo e turma
      let anoLetivoBusca;
      let turma;

      if (turmaId) {
        // Se turmaId foi fornecido, buscar essa turma específica
        turma = await Turma.findOne({
          _id: turmaId,
          alunos: student._id,
        }).populate("materias", "nome");

        if (!turma) {
          return res.status(404).json({
            error: "Turma não encontrada ou você não está matriculado nela",
          });
        }

        anoLetivoBusca = turma.anoLetivo;
      } else if (anoLetivo) {
        // Se anoLetivo foi fornecido, buscar turma ativa desse ano
        anoLetivoBusca = parseInt(anoLetivo);
        turma = await Turma.findOne({
          alunos: student._id,
          anoLetivo: anoLetivoBusca,
          status: "ativa",
        }).populate("materias", "nome");
      } else {
        // Padrão: ano letivo atual e turma ativa
        anoLetivoBusca = new Date().getFullYear();
        turma = await Turma.findOne({
          alunos: student._id,
          anoLetivo: anoLetivoBusca,
          status: "ativa",
        }).populate("materias", "nome");
      }

      if (!turma) {
        return res.json({
          turma: null,
          materias: [],
          boletim: [],
        });
      }

      if (!turma.materias || turma.materias.length === 0) {
        return res.json({
          turma: {
            _id: turma._id,
            nome: turma.nome,
            anoLetivo: turma.anoLetivo,
            periodo: turma.periodo,
            nivelEducacional: turma.nivelEducacional,
            status: turma.status,
          },
          materias: [],
          boletim: [],
        });
      }

      const turmaIdParaBusca = turma._id;

      // Buscar todas as atividades da turma
      const atividades = await Atividade.find({
        turmaId: turmaIdParaBusca,
        status: { $ne: "cancelada" },
      }).populate("materiaId", "nome");

      // Buscar todas as notas do aluno
      const notasAtividades = await NotaAtividade.find({
        alunoId: student._id,
        turmaId: turmaIdParaBusca,
      }).populate("atividadeId");

      // Buscar todas as faltas do aluno
      const faltas = await Attendance.find({
        alunoId: student._id,
        turmaId: turmaIdParaBusca,
        presente: false,
      }).populate("materiaId", "nome");

      // Buscar aulas semanais ativas para calcular total de aulas esperadas por matéria e semestre
      // AulaSemanal já foi declarado no topo do método meuBoletim
      const aulasSemanais = await AulaSemanal.find({
        turmaId: turmaIdParaBusca,
        status: "ativa",
      });

      // Calcular total de aulas esperadas por matéria e semestre baseado nas aulas semanais
      const totalAulasPorMateriaSemestre = {};
      
      // Definir períodos dos semestres (baseado no ano letivo)
      const anoLetivoParaCalculo = turma.anoLetivo || anoLetivoBusca || new Date().getFullYear();
      // Semestre 1: Fevereiro a Junho, Semestre 2: Agosto a Novembro
      const semestre1Inicio = new Date(anoLetivoParaCalculo, 1, 1); // 1 de fevereiro
      const semestre1Fim = new Date(anoLetivoParaCalculo, 5, 30); // 30 de junho
      const semestre2Inicio = new Date(anoLetivoParaCalculo, 7, 1); // 1 de agosto
      const semestre2Fim = new Date(anoLetivoParaCalculo, 10, 30); // 30 de novembro

      aulasSemanais.forEach((aulaSemanal) => {
        const materiaId = aulaSemanal.materiaId.toString();
        const semestre = aulaSemanal.semestre;
        const diaSemana = aulaSemanal.diaSemana; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
        
        // Determinar período do semestre
        let inicioSemestre, fimSemestre;
        if (semestre === "1") {
          inicioSemestre = semestre1Inicio;
          fimSemestre = semestre1Fim;
        } else {
          inicioSemestre = semestre2Inicio;
          fimSemestre = semestre2Fim;
        }
        
        // Calcular quantas vezes esse dia da semana ocorre no período do semestre
        const totalAulas = this.calcularTotalAulasNoPeriodo(
          diaSemana,
          inicioSemestre,
          fimSemestre
        );
        
        const key = `${materiaId}_${semestre}`;
        if (!totalAulasPorMateriaSemestre[key]) {
          totalAulasPorMateriaSemestre[key] = 0;
        }
        totalAulasPorMateriaSemestre[key] += totalAulas;
      });

      // Guardar referência de this para usar dentro do map
      const self = this;

      // Processar matérias e construir boletim
      const boletim = turma.materias.map((materia) => {
        const materiaId = materia._id.toString();

        // Buscar atividades desta matéria
        const atividadesMateria = atividades.filter(
          (atividade) => atividade.materiaId._id.toString() === materiaId,
        );

        // Processar semestre 1
        const semestre1 = self.processarSemestre(
          atividadesMateria,
          notasAtividades,
          faltas,
          materiaId,
          "1",
          totalAulasPorMateriaSemestre[`${materiaId}_1`] || 0,
        );

        // Processar semestre 2
        const semestre2 = self.processarSemestre(
          atividadesMateria,
          notasAtividades,
          faltas,
          materiaId,
          "2",
          totalAulasPorMateriaSemestre[`${materiaId}_2`] || 0,
        );

        // Calcular média final
        const mediaFinal =
          semestre1.media && semestre2.media
            ? Math.round(((semestre1.media + semestre2.media) / 2) * 10) / 10
            : null;

        // Determinar situação
        let situacao = "Em andamento";
        if (mediaFinal !== null) {
          situacao = mediaFinal >= 7 ? "Aprovado" : "Reprovado";
        }

        return {
          materiaId: materiaId,
          materiaNome: materia.nome,
          semestre1,
          semestre2,
          mediaFinal,
          situacao,
        };
      });

      return res.json({
        turma: {
          _id: turma._id,
          nome: turma.nome,
          anoLetivo: turma.anoLetivo,
          periodo: turma.periodo,
          nivelEducacional: turma.nivelEducacional,
          status: turma.status,
        },
        materias: turma.materias.map((m) => ({
          _id: m._id,
          nome: m.nome,
        })),
        boletim,
      });
    } catch (error) {
      console.error("Erro ao buscar boletim:", error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar boletim", details: error.message });
    }
  }

  // Método auxiliar para processar um semestre
  processarSemestre(
    atividadesMateria,
    notasAtividades,
    faltas,
    materiaId,
    semestre,
    totalAulas,
  ) {
    // Filtrar atividades do semestre
    const atividadesSemestre = atividadesMateria.filter(
      (atividade) => atividade.semestre === semestre,
    );

    // Buscar notas das atividades deste semestre
    const notasSemestre = notasAtividades.filter((nota) => {
      const atividadeId = nota.atividadeId._id.toString();
      return atividadesSemestre.some(
        (atividade) => atividade._id.toString() === atividadeId,
      );
    });

    // Separar por tipo de atividade
    const pv1 = this.buscarNotaPorTipo(
      atividadesSemestre,
      notasSemestre,
      "PV1",
    );
    const pv2 = this.buscarNotaPorTipo(
      atividadesSemestre,
      notasSemestre,
      "PV2",
    );
    const pv3 = this.buscarNotaPorTipo(
      atividadesSemestre,
      notasSemestre,
      "PV3",
    );
    const tb1 = this.buscarNotaPorTipo(
      atividadesSemestre,
      notasSemestre,
      "TB1",
    );
    const tb2 = this.buscarNotaPorTipo(
      atividadesSemestre,
      notasSemestre,
      "TB2",
    );

    // Calcular média do semestre (peso 3 para provas, peso 2 para trabalhos)
    let media = null;
    const notasProvas = [pv1, pv2, pv3].filter(
      (n) => n !== null && n !== undefined,
    );
    const notasTrabalhos = [tb1, tb2].filter(
      (n) => n !== null && n !== undefined,
    );

    if (notasProvas.length > 0 && notasTrabalhos.length > 0) {
      const mediaProvas =
        notasProvas.reduce((acc, n) => acc + n, 0) / notasProvas.length;
      const mediaTrabalhos =
        notasTrabalhos.reduce((acc, n) => acc + n, 0) / notasTrabalhos.length;
      media =
        Math.round(((mediaProvas * 3 + mediaTrabalhos * 2) / 5) * 10) / 10;
    }

    // Calcular frequência
    const faltasSemestre = faltas.filter((falta) => {
      const faltaMateriaId = falta.materiaId._id.toString();
      const faltaData = new Date(falta.data);
      const ano = faltaData.getFullYear();
      const mes = faltaData.getMonth() + 1;

      // Semestre 1: Janeiro a Junho, Semestre 2: Julho a Dezembro
      const semestreFalta = mes <= 6 ? "1" : "2";

      return faltaMateriaId === materiaId && semestreFalta === semestre;
    });

    let frequencia = 100;
    if (totalAulas > 0) {
      const percentualPorFalta = 100 / totalAulas;
      frequencia = Math.max(
        0,
        100 - faltasSemestre.length * percentualPorFalta,
      );
      frequencia = Math.round(frequencia * 10) / 10;
    }

    return {
      pv1,
      pv2,
      pv3,
      tb1,
      tb2,
      f: frequencia,
      media,
    };
  }

  // Método auxiliar para calcular total de aulas em um período baseado no dia da semana
  calcularTotalAulasNoPeriodo(diaSemana, dataInicio, dataFim) {
    // Converter diaSemana do sistema (1=segunda, 7=domingo) para JS (0=domingo, 6=sábado)
    // O modelo AulaSemanal usa: 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const diaSemanaJS = diaSemana; // Já está no formato correto
    
    let total = 0;
    const dataAtual = new Date(dataInicio);
    
    // Encontrar o primeiro dia da semana correspondente no período
    while (dataAtual.getDay() !== diaSemanaJS && dataAtual <= dataFim) {
      dataAtual.setDate(dataAtual.getDate() + 1);
    }
    
    // Contar quantas vezes esse dia da semana ocorre no período
    while (dataAtual <= dataFim) {
      total++;
      dataAtual.setDate(dataAtual.getDate() + 7); // Próxima semana
    }
    
    return total;
  }

  // Método auxiliar para buscar nota por tipo de atividade
  buscarNotaPorTipo(atividadesSemestre, notasSemestre, tipoAtividade) {
    // Encontrar atividade do tipo
    const atividade = atividadesSemestre.find(
      (atividade) => atividade.tipoAtividade === tipoAtividade,
    );

    if (!atividade) {
      return "*"; // Não marcada
    }

    // Buscar nota da atividade
    const nota = notasSemestre.find(
      (nota) => nota.atividadeId._id.toString() === atividade._id.toString(),
    );

    if (!nota) {
      return "-"; // Marcada mas sem nota
    }

    // Se tem nota, retornar valor
    if (nota.valor !== null && nota.valor !== undefined) {
      return nota.valor;
    }

    // Se não tem nota mas está marcada
    return "-";
  }

  // Listar turmas de um aluno específico (para admin/professor)
  async getTurmasAluno(req, res) {
    try {
      const alunoId = req.params.id;
      const Student = require("../models/student.model.js");
      const Turma = require("../models/turma.model.js");

      // Buscar aluno
      const student = await Student.findById(alunoId);
      if (!student) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      // Buscar todas as turmas do aluno (ativas e encerradas, de todos os anos)
      const turmas = await Turma.find({
        alunos: student._id,
      })
        .select("nome anoLetivo periodo nivelEducacional status")
        .sort({ anoLetivo: -1, nome: 1 });

      return res.json(turmas);
    } catch (error) {
      console.error("Erro ao buscar turmas do aluno:", error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar turmas", details: error.message });
    }
  }

  // Buscar boletim de um aluno específico (para admin/professor visualizar)
  async getBoletimAluno(req, res) {
    try {
      const { role, id: userId } = req.user;
      const alunoId = req.params.id;
      const { turmaId } = req.query;
      const Student = require("../models/student.model.js");
      const Turma = require("../models/turma.model.js");
      const Atividade = require("../models/atividade.model.js");
      const NotaAtividade = require("../models/notaAtividade.model.js");
      const Attendance = require("../models/attendance.model.js");

      // Buscar aluno
      const student = await Student.findById(alunoId);
      if (!student) {
        return res.status(404).json({ error: "Aluno não encontrado" });
      }

      // Determinar qual turma buscar
      let turma;
      const anoLetivoAtual = new Date().getFullYear();

      if (turmaId) {
        // Se turmaId foi fornecido, buscar essa turma específica
        turma = await Turma.findOne({
          _id: turmaId,
          alunos: student._id,
        }).populate("materias", "nome");

        if (!turma) {
          return res.status(404).json({
            error: "Turma não encontrada ou aluno não está matriculado nela",
          });
        }
      } else {
        // Padrão: turma ativa do ano letivo atual
        turma = await Turma.findOne({
          alunos: student._id,
          anoLetivo: anoLetivoAtual,
          status: "ativa",
        }).populate("materias", "nome");
      }

      if (!turma) {
        return res.json({
          turma: null,
          materias: [],
          boletim: [],
        });
      }

      // Verificar permissões
      if (role === "professor") {
        const Teacher = require("../models/teacher.model.js");
        const teacher = await Teacher.findOne({ userId });
        if (!teacher) {
          return res.status(403).json({ error: "Professor não encontrado" });
        }
        // Verificar se o professor leciona na turma do aluno
        const AulaSemanal = require("../models/aulaSemanal.model.js");
        const aulaSemanal = await AulaSemanal.findOne({
          turmaId: turma._id,
          professorId: teacher._id,
          status: "ativa",
        });
        if (!aulaSemanal && role !== "admin") {
          return res.status(403).json({
            error:
              "Você não tem permissão para visualizar o boletim deste aluno",
          });
        }
      } else if (role !== "admin") {
        return res.status(403).json({ error: "Acesso negado" });
      }

      if (!turma.materias || turma.materias.length === 0) {
        return res.json({
          turma: {
            _id: turma._id,
            nome: turma.nome,
            anoLetivo: turma.anoLetivo,
            periodo: turma.periodo,
            nivelEducacional: turma.nivelEducacional,
            status: turma.status,
          },
          materias: [],
          boletim: [],
        });
      }

      const turmaIdParaBusca = turma._id;

      // Buscar todas as atividades da turma
      const atividades = await Atividade.find({
        turmaId: turmaIdParaBusca,
        status: { $ne: "cancelada" },
      }).populate("materiaId", "nome");

      // Buscar todas as notas do aluno
      const notasAtividades = await NotaAtividade.find({
        alunoId: student._id,
        turmaId: turmaIdParaBusca,
      }).populate("atividadeId");

      // Buscar todas as faltas do aluno
      const faltas = await Attendance.find({
        alunoId: student._id,
        turmaId: turmaIdParaBusca,
        presente: false,
      }).populate("materiaId", "nome");

      // Buscar aulas semanais ativas para calcular total de aulas esperadas por matéria e semestre
      // AulaSemanal já foi declarado acima no bloco if (role === "professor")
      let aulasSemanais;
      if (role === "professor") {
        // Reutilizar AulaSemanal já declarado acima
        aulasSemanais = await AulaSemanal.find({
          turmaId: turmaIdParaBusca,
          status: "ativa",
        });
      } else {
        // Para admin, declarar aqui
        const AulaSemanalModel = require("../models/aulaSemanal.model.js");
        aulasSemanais = await AulaSemanalModel.find({
          turmaId: turmaIdParaBusca,
          status: "ativa",
        });
      }

      // Calcular total de aulas esperadas por matéria e semestre baseado nas aulas semanais
      const totalAulasPorMateriaSemestre = {};
      
      // Definir períodos dos semestres (baseado no ano letivo)
      const anoLetivo = turma.anoLetivo || new Date().getFullYear();
      // Semestre 1: Fevereiro a Junho, Semestre 2: Agosto a Novembro
      const semestre1Inicio = new Date(anoLetivo, 1, 1); // 1 de fevereiro
      const semestre1Fim = new Date(anoLetivo, 5, 30); // 30 de junho
      const semestre2Inicio = new Date(anoLetivo, 7, 1); // 1 de agosto
      const semestre2Fim = new Date(anoLetivo, 10, 30); // 30 de novembro

      aulasSemanais.forEach((aulaSemanal) => {
        const materiaId = aulaSemanal.materiaId.toString();
        const semestre = aulaSemanal.semestre;
        const diaSemana = aulaSemanal.diaSemana; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
        
        // Determinar período do semestre
        let inicioSemestre, fimSemestre;
        if (semestre === "1") {
          inicioSemestre = semestre1Inicio;
          fimSemestre = semestre1Fim;
        } else {
          inicioSemestre = semestre2Inicio;
          fimSemestre = semestre2Fim;
        }
        
        // Calcular quantas vezes esse dia da semana ocorre no período do semestre
        const totalAulas = this.calcularTotalAulasNoPeriodo(
          diaSemana,
          inicioSemestre,
          fimSemestre
        );
        
        const key = `${materiaId}_${semestre}`;
        if (!totalAulasPorMateriaSemestre[key]) {
          totalAulasPorMateriaSemestre[key] = 0;
        }
        totalAulasPorMateriaSemestre[key] += totalAulas;
      });

      // Guardar referência de this para usar dentro do map
      const self = this;

      // Processar matérias e construir boletim
      const boletim = turma.materias.map((materia) => {
        const materiaId = materia._id.toString();

        // Buscar atividades desta matéria
        const atividadesMateria = atividades.filter(
          (atividade) => atividade.materiaId._id.toString() === materiaId,
        );

        // Processar semestre 1
        const semestre1 = self.processarSemestre(
          atividadesMateria,
          notasAtividades,
          faltas,
          materiaId,
          "1",
          totalAulasPorMateriaSemestre[`${materiaId}_1`] || 0,
        );

        // Processar semestre 2
        const semestre2 = self.processarSemestre(
          atividadesMateria,
          notasAtividades,
          faltas,
          materiaId,
          "2",
          totalAulasPorMateriaSemestre[`${materiaId}_2`] || 0,
        );

        // Calcular média final
        const mediaFinal =
          semestre1.media && semestre2.media
            ? Math.round(((semestre1.media + semestre2.media) / 2) * 10) / 10
            : null;

        // Determinar situação
        let situacao = "Em andamento";
        if (mediaFinal !== null) {
          situacao = mediaFinal >= 7 ? "Aprovado" : "Reprovado";
        }

        return {
          materiaId: materiaId,
          materiaNome: materia.nome,
          semestre1,
          semestre2,
          mediaFinal,
          situacao,
        };
      });

      return res.json({
        turma: {
          _id: turma._id,
          nome: turma.nome,
          anoLetivo: turma.anoLetivo,
          periodo: turma.periodo,
          nivelEducacional: turma.nivelEducacional,
          status: turma.status,
        },
        materias: turma.materias.map((m) => ({
          _id: m._id,
          nome: m.nome,
        })),
        boletim,
      });
    } catch (error) {
      console.error("Erro ao buscar boletim:", error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar boletim", details: error.message });
    }
  }
}

module.exports = new AlunoController();
