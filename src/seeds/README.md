# Seeds - Dados de Teste

Este diretório contém scripts para popular o banco de dados com dados de teste.

## Ordem de Execução

Execute os seeds na seguinte ordem (alguns dependem de outros):

1. **createAdmin.seed.js** - Cria usuário administrador

   ```bash
   node src/seeds/createAdmin.seed.js
   ```

2. **createMaterias.seed.js** - Cria matérias

   ```bash
   node src/seeds/createMaterias.seed.js
   ```

3. **createTurmas.seed.js** - Cria turmas

   ```bash
   node src/seeds/createTurmas.seed.js
   ```

4. **createProfessores.seed.js** - Cria professores (depende de matérias)

   ```bash
   node src/seeds/createProfessores.seed.js
   ```

5. **createAlunos.seed.js** - Cria alunos (depende de turmas e matérias)

   ```bash
   node src/seeds/createAlunos.seed.js
   ```

6. **createResponsaveis.seed.js** - Cria responsáveis (depende de alunos)

   ```bash
   node src/seeds/createResponsaveis.seed.js
   ```

7. **createAulasSemanais.seed.js** - Cria aulas semanais (depende de turmas, matérias e professores)

   ```bash
   node src/seeds/createAulasSemanais.seed.js
   ```

8. **createCursos.seed.js** - Cria cursos (depende de professores, matérias e turmas)

   ```bash
   node src/seeds/createCursos.seed.js
   ```

9. **createProvas.seed.js** - Cria atividades (provas e trabalhos) (depende de professores, turmas, matérias e alunos)

   ```bash
   node src/seeds/createProvas.seed.js
   ```

10. **createAttendances.seed.js** - Cria presenças (depende de professores, alunos, turmas e matérias)

    ```bash
    node src/seeds/createAttendances.seed.js
    ```

11. **createGrades.seed.js** - Cria boletins (depende de alunos, professores, turmas e matérias)

    ```bash
    node src/seeds/createGrades.seed.js
    ```

12. **createProgressoCursos.seed.js** - Cria progressos de cursos (depende de cursos e alunos)
    ```bash
    node src/seeds/createProgressoCursos.seed.js
    ```

## Executar Todos de Uma Vez

Você pode criar um script no `package.json` para executar todos:

```json
"scripts": {
  "seed:all": "node src/seeds/createAdmin.seed.js && node src/seeds/createMaterias.seed.js && node src/seeds/createTurmas.seed.js && node src/seeds/createProfessores.seed.js && node src/seeds/createAlunos.seed.js && node src/seeds/createResponsaveis.seed.js && node src/seeds/createAulasSemanais.seed.js && node src/seeds/createCursos.seed.js && node src/seeds/createProvas.seed.js && node src/seeds/createAttendances.seed.js && node src/seeds/createGrades.seed.js && node src/seeds/createProgressoCursos.seed.js"
}
```

## Credenciais de Teste

### Admin

- Email: `admin@escola.com`
- Senha: `PlataformaEDC@2026`

### Professores

- Email: `joao.silva@escola.com` / Senha: `professor123`
- Email: `maria.santos@escola.com` / Senha: `professor123`
- Email: `pedro.oliveira@escola.com` / Senha: `professor123`
- Email: `ana.costa@escola.com` / Senha: `professor123`
- Email: `carlos.mendes@escola.com` / Senha: `professor123`

### Alunos

- Email: `lucas.pereira@escola.com` / Senha: `aluno123`
- Email: `julia.ferreira@escola.com` / Senha: `aluno123`
- Email: `rafael.alves@escola.com` / Senha: `aluno123`
- Email: `isabela.souza@escola.com` / Senha: `aluno123`
- Email: `gabriel.lima@escola.com` / Senha: `aluno123`
- Email: `mariana.rocha@escola.com` / Senha: `aluno123`

## Observações

- Todos os seeds verificam se os dados já existem antes de criar
- Se os dados já existirem, o seed será pulado
- Certifique-se de ter a variável `MONGO_URL` configurada no arquivo `.env`
