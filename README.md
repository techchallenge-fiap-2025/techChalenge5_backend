# Backend de Sistema de Auxílio Escolar (Hackaton)

Este repositório contém a API e a lógica de negócio do projeto desenvolvido para o Hackaton da pós-graduação em Full Stack Development, da FIAP, turma 2025, focada em auxiliar professores do ensino público. O projeto foi criado para permitir gestão e suporte pedagógico para mitigar a sobrecarga administrativa e a falta de centralização de materiais didáticos.


### Objetivo

Facilitar a gestão e otimizar a comunicação entre professores e alunos da rede pública por meio de uma plataforma educacional que permita a organização de turmas, controle de frequência e a criação simplificada de atividades avaliativas.

### Público-alvo

Com base na estrutura de dados e nos scripts de automação do projeto, a plataforma atende a quatro perfis principais:

**Administradores**: Responsáveis pela gestão macro do sistema, configuração de cursos e controle de acesso.

**Professores**: O público-alvo central do Hackaton. Utilizam a ferramenta para criar provas (PDF), gerenciar atividades, registrar frequências e lançar notas.

**Alunos**: Acessam a plataforma para consultar materiais didáticos, realizar atividades e acompanhar seu progresso acadêmico.

**Responsáveis**: Possuem visão do desempenho e frequência dos alunos, estreitando o vínculo entre escola e família.

---

### Equipe

| Nome | E-mail |
| --- | --- |
| Lucas Piran | [lucas13piran@gmail.com](mailto:lucas13piran@gmail.com) |
| Felipe Ragne Silveira | [frsilveira01@outlook.com](mailto:frsilveira01@outlook.com) |
| Lais Taine de Oliveira | [lais.taine@gmail.com](mailto:lais.taine@gmail.com) |
| Pedro Juliano Quimelo | [pedrojulianoquimelo@outlook.com](mailto:pedrojulianoquimelo@outlook.com) |

---

## Tecnologias utilizadas

* **Runtime:** Node.js (v18-alpine no Docker)
* **Framework:** Express
* **Banco de Dados:** MongoDB (via Mongoose)
* **Armazenamento de Imagens:** Cloudinary
* **Segurança:** BCryptJS e JSON Web Token (JWT)



## Como Rodar o Projeto

### Pré-requisitos
* Docker Desktop instalado e rodando.
* Arquivo `.env` configurado com as chaves necessárias.

### Passo 1: Configuração das variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes chaves:

```bash
PORT=3000
MONGO_URL=mongodb+srv://lucas13piran_db_user:Ri24+le11+lu27+ma13@cluster0.fbxkdmn.mongodb.net/plataformaEDC?appName=Cluster0
JWT_SECRET= jAHLb8oyNQCy+KMaMNNjgjyMoWcWa7GjQyl2inQIdd4xzgH1YN023zrkEuAlPJ+QIphTWH/dxU61zXqYT4PG1w?+-
CLOUDINARY_CLOUD_NAME=drthohiz6
CLOUDINARY_API_KEY=896165847829446
CLOUDINARY_API_SECRET=RTY2krEBG3FnPLIk-SP8OaldSMM
```

### Passo 2: Build e execução com Docker
No terminal, execute:

```bash
docker build -t backend-app .
docker run -p 3000:3000 --env-file .env backend-app
```

### Passo 3: Populando o banco (Seeds)
Este projeto inclui scripts para criar dados iniciais (professores, alunos, turmas). Para rodar todos:
```bash
npm run seed:all
```

## Estrutura de seeds disponíveis

O projeto possui diversos scripts de alimentação de dados para facilitar o teste do MVP:
* `seed:admin`: Cria usuário administrador.
* `seed:professores` / `seed:alunos`: Cria perfis de usuários.
* `seed:atividades`: Cria provas e materiais didáticos.



## Endpoints da API (Rotas Principais)
Abaixo estão as principais rotas estruturadas para a gestão do sistema. Todas as rotas de escrita (POST/PUT) exigem autenticação via JWT.

| Categoria | Método | Endpoint | Descrição |
| :--- | :--- | :--- | :--- |
| **Autenticação** | `POST` | `/api/auth/login` | Autentica o usuário e retorna o token de acesso. |
| **Autenticação** | `POST` | `/api/auth/register` | Cadastra novos Agentes (Professores/Adm) no sistema. |
| **Professores** | `GET` | `/api/professores` | Lista todos os professores da rede pública cadastrados. |
| **Alunos** | `GET` | `/api/alunos` | Consulta a listagem de alunos e perfis de estudantes. |
| **Turmas** | `GET` | `/api/turmas` | Exibe as turmas, disciplinas e horários vinculados. |
| **Atividades** | `GET` | `/api/atividades` | Lista os materiais didáticos e provas disponíveis no banco. |
| **Atividades** | `POST` | `/api/atividades` | Cria novas atividades (upload via Cloudinary). |
| **Frequência** | `POST` | `/api/attendances` | Registra a presença diária dos alunos em sala. |
| **Notas** | `GET` | `/api/grades` | Consulta o boletim e o progresso acadêmico. |




## Relato de experiência e desafios


### Experiência
O desenvolvimento do backend foi focado em criar uma base sólida e escalável para suportar o dia a dia da educação pública. A escolha de tecnologias como Node.js e MongoDB permitiu uma iteração rápida, essencial para o formato do MVP para o Hackaton.


### Desafios

**Integração de Serviços**: Configurar a comunicação entre o banco de dados e o armazenamento de arquivos externos (Cloudinary) sob pressão de tempo.

**Ambiente de Desenvolvimento**: Superar instabilidades técnicas de configuração (como o uso de Docker e WSL2) para garantir que o código fosse executável por qualquer membro da equipe.

**Modelagem de Dados**: Estruturar um banco de dados que refletisse fielmente as complexas relações escolares (administração vs. professores vs. alunos).


### Melhorias Futuras (Roadmap)

Para fases futuras do projeto, planejamos as seguintes evoluções:

**IA Pedagógica (em andamento)**: Integrar inteligência artificial para auxiliar professores na correção automática de provas e no planejamento de aulas para perfis personalizados, viabilizando a diversidade no âmbito escolar.

**Gamificação**: Implementar um sistema de recompensas para aumentar o engajamento dos alunos nas atividades digitais.

**Modo Offline**: Otimizar a plataforma para funcionar em regiões com baixa conectividade, garantindo a inclusão digital.




---

# Contatos

[lucas13piran@gmail.com](mailto:lucas13piran@gmail.com)

[frsilveira01@outlook.com](mailto:frsilveira01@outlook.com)

[lais.taine@gmail.com](mailto:lais.taine@gmail.com)

[pedrojulianoquimelo@outlook.com](mailto:pedrojulianoquimelo@outlook.com)
