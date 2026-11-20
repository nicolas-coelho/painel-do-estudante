# 🤖 Guia do Servidor MCP para o Google Gemini no Vercel

Este projeto possui um **Servidor MCP (Model Context Protocol)** oficial de alta capacidade hospedado em Serverless Functions na Vercel ([api/mcp.ts](file:///C:/Users/nicol/Documents/painel-do-estudante/api/mcp.ts)), permitindo que o **Google Gemini** (no Gemini App, Gemini CLI, Claude ou qualquer cliente MCP compatível) consulte, cadastre, renomeie e atualize diretamente os dados do seu **Painel do Estudante** no Cloud Firestore.

---

## 🛠️ Ferramentas Disponíveis no MCP (19 Ferramentas)

### 📚 Disciplinas & Matérias
| Ferramenta | Descrição | O que faz no Painel |
| :--- | :--- | :--- |
| `list_courses` | Lista disciplinas matriculadas | Traz códigos, nomes oficiais, professores, horários, salas e provas agendadas |
| `create_course` | **Cadastra nova disciplina** | Adiciona nova matéria no banco de dados com código, nome, horários e professor |
| `update_course` | **Atualiza ou renomeia disciplina** | Altera diretamente no Firestore o nome oficial (ex: renomear ES680), código, professor ou horários |
| `delete_course` | Exclui disciplina | Remove a matéria e seus vínculos no banco de dados |
| `add_course_grade` | Agenda / lança notas de provas | Adiciona avaliações (P1, P2, Projeto) com data, peso e nota |

### 📋 Tarefas & Rotina Acadêmica
| Ferramenta | Descrição | O que faz no Painel |
| :--- | :--- | :--- |
| `get_study_routine` | Retorna a rotina completa | Entregas do dia, tarefas pendentes, atrasos, próximas provas e compromissos |
| `create_card` | Cria card de entrega ou tarefa | Insere card no Kanban e na Página Inicial associado à disciplina correta |
| `update_card_status` | Altera status da tarefa | Move entre `todo` (A Fazer), `in_progress` (Em Andamento) e `done` (Concluído) |
| `delete_card` | Exclui card de tarefa | Apaga definitivamente a tarefa do quadro e do banco de dados |

### 🧠 Recuperação Ativa & Revisões Espaçadas
| Ferramenta | Descrição | O que faz no Painel |
| :--- | :--- | :--- |
| `list_study_topics` | Lista tópicos de estudo | Mostra assuntos, fase da repetição semanal, última pontuação e revisões para hoje |
| `create_study_topic` | Cadastra assunto para revisão | Define tópico, flashcard opcional, meta de excelência (padrão 80%) e disciplina |
| `register_exercise_attempt` | Registra lista de exercícios | Avalia acertos vs total (meta de 80%), calcula avanço semanal de fase ou reforço |

### 📓 Caderno de Anotações & Dicas
| Ferramenta | Descrição | O que faz no Painel |
| :--- | :--- | :--- |
| `create_note` | Cria anotação de aula | Salva anotações com formatação Markdown e tags organizadoras |
| `list_notes` | Consulta anotações | Busca anotações por palavra-chave ou tags |

### 💳 Vida Pessoal, Finanças & Bullet Journal
| Ferramenta | Descrição | O que faz no Painel |
| :--- | :--- | :--- |
| `create_personal_bill` | Adiciona conta a pagar | Cadastra boleto, PIX, mensalidade, valor e vencimento |
| `list_personal_bills` | Lista contas e despesas | Traz balanço total pendente vs pago e alerta de contas atrasadas |
| `pay_bill` | Quita conta | Marca despesa como paga no Bullet Journal |
| `create_personal_appointment` | Adiciona compromisso pessoal | Agenda consulta médica, dentista, recados ou eventos pessoais |
| `list_personal_appointments` | Lista compromissos | Exibe agenda pessoal do dia ou geral |

---

## 🚀 Como Funciona a Hospedagem na Vercel

A Vercel hospeda o front-end Vite e automaticamente publica a pasta [`api/`](file:///C:/Users/nicol/Documents/painel-do-estudante/api/mcp.ts) como Serverless Functions.

- **Endpoint Streamable HTTP do MCP:** `https://painel-de-estudo-sage.vercel.app/api/mcp`
- Configurado via [`vercel.json`](file:///C:/Users/nicol/Documents/painel-do-estudante/vercel.json) com suporte a CORS completo (`Mcp-Session-Id`, `MCP-Protocol-Version`, `Authorization`) e rewrites.

### Variáveis de Ambiente na Vercel:

No painel da Vercel (**Settings** -> **Environment Variables**):

1. `FIREBASE_SERVICE_ACCOUNT` *(**Obrigatória** para leitura do UID real e gravações no Firestore)*:
   - Conteúdo JSON (ou Base64) da chave privada de conta de serviço gerada no Firebase Console (**Project Settings** -> **Service Accounts** -> **Generate new private key**).
   - Alternativa: `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.
2. `FIREBASE_PROJECT_ID`: `painel-estudante-8b2c` *(padrão automático)*
3. `DEFAULT_USER_EMAIL` *(opcional, padrão `nicolasplcoelho@gmail.com`)* ou `DEFAULT_DASHBOARD_ID` *(opcional, UID explícito)*:
   - Quando `FIREBASE_SERVICE_ACCOUNT` está configurada, o MCP resolve automaticamente o UID real do usuário no Firebase Auth para sincronizar exatamente com o painel logado.
4. `MCP_API_KEY` *(recomendada para segurança)*:
   - Chave secreta para proteger o endpoint contra acessos externos. Clientes devem enviar `Authorization: Bearer <MCP_API_KEY>` ou header `x-api-key`.

---

## 📱 Como Conectar no Google Gemini

### Opção 1: Configuração MCP Padrão (`mcpServers`)

No arquivo de configuração do seu cliente Gemini (ou Claude Desktop / Cursor / Continue):

```json
{
  "mcpServers": {
    "painel-do-estudante": {
      "url": "https://painel-de-estudo-sage.vercel.app/api/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer SUA_MCP_API_KEY"
      }
    }
  }
}
```

### Opção 2: Gemini CLI / Extensions
Você pode apontar a extensão HTTP para:
```bash
https://painel-de-estudo-sage.vercel.app/api/mcp
```

---

## 💬 Exemplos Práticos de Uso com o Gemini

### 1. Cadastrar e Renomear Disciplinas:
> *"Gemini, renomeie a disciplina ES680 para Engenharia de Software no banco de dados e ajuste o professor para Profa. Cecília Baranauskas."*  
> *(O Gemini executa `update_course` com `courseQuery: "ES680"` e altera os dados no Firestore).*

> *"Cadastre a matéria MC322 - Programação Orientada a Objetos com aulas Terça e Quinta às 10h."*  
> *(O Gemini executa `create_course`).*

### 2. Rotina e Prazos:
> *"Gemini, o que eu tenho para entregar hoje e como está minha rotina de estudos?"*  
> *(O Gemini chama `get_study_routine` e explica seus prazos do dia, próximas provas e matérias).*

### 3. Criar e Excluir Cards:
> *"Crie um card de entrega do Trabalho de Engenharia de Software para sexta-feira sobre Diagramas C4."*  
> *(O Gemini chama `create_card` e insere o card diretamente no seu quadro de tarefas).*

> *"Exclua a tarefa 'Estudo dirigido de Requisitos'."*  
> *(O Gemini chama `delete_card` e apaga do banco de dados).*

### 4. Recuperação Ativa e Resolução de Listas:
> *"Acabei de fazer a Lista 1 de Polimorfismo: acertei 9 de 10 exercícios. Registre meu desempenho."*  
> *(O Gemini chama `register_exercise_attempt`, calcula 90%, aprova na meta de 80% e agenda a próxima fase de revisão).*
