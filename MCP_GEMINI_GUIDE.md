# 🤖 Guia do Servidor MCP para o Google Gemini no Vercel

Este projeto agora possui um **Servidor MCP (Model Context Protocol)** oficial hospedado em Serverless Functions na Vercel (`/api/mcp`), permitindo que o **Google Gemini** (no Gemini App, Gemini CLI ou qualquer cliente MCP compatível) converse diretamente com o seu **Painel do Estudante**.

---

## 🛠️ Ferramentas Disponíveis no MCP

| Ferramenta | Descrição | O que faz no Painel |
| :--- | :--- | :--- |
| `get_study_routine` | Retorna a rotina completa do estudante | Lista entregas do dia, tarefas atrasadas, tarefas em andamento, próximas provas e horários de aula |
| `create_card` | Cria um novo card de atividade ou entrega | Adiciona a atividade no Firebase/Firestore e ela aparece instantaneamente na Página Inicial e no Quadro Kanban |
| `update_card_status` | Altera o status de uma atividade | Move a tarefa entre `todo` (A Fazer), `in_progress` (Em Andamento) e `done` (Concluído) |
| `list_courses` | Lista disciplinas matriculadas | Traz professores, horários, salas e notas/avaliações |

---

## 🚀 Como Funciona a Hospedagem na Vercel

A Vercel hospeda o front-end Vite e automaticamente publica a pasta [`api/`](file:///C:/Users/nicol/Documents/painel-do-estudante/api/mcp.ts) como Serverless Functions.

- **Endpoint HTTP / SSE do MCP:** `https://seu-painel.vercel.app/api/mcp`
- Configurado via [`vercel.json`](file:///C:/Users/nicol/Documents/painel-do-estudante/vercel.json) com suporte a CORS total e rewrites.

### Variáveis de Ambiente Recomendadas na Vercel:

No painel da Vercel (**Settings** -> **Environment Variables**):

1. `FIREBASE_PROJECT_ID`: `painel-estudante-8b2c` *(já configurado)*
2. *(Opcional / Recomendado para acesso administrativo total)*:
   - `FIREBASE_SERVICE_ACCOUNT`: Conteúdo JSON da chave privada de conta de serviço gerada no Firebase Console (**Project Settings** -> **Service Accounts** -> **Generate new private key**).
3. *(Opcional para segurança)*:
   - `MCP_API_KEY`: Chave secreta personalizada caso queira proteger seu endpoint contra acessos externos.

---

## 📱 Como Conectar no Google Gemini

### Opção 1: Configuração MCP Padrão (`mcpServers`)

No arquivo de configuração do seu cliente Gemini (ou Claude Desktop / Cursor / Continue):

```json
{
  "mcpServers": {
    "painel-do-estudante": {
      "url": "https://seu-painel.vercel.app/api/mcp",
      "transport": "http"
    }
  }
}
```

### Opção 2: Gemini CLI / Extensions
Você pode apontar a extensão HTTP para:
```bash
https://seu-painel.vercel.app/api/mcp
```

---

## 💬 Exemplos de Comandos para Falar com o Gemini

Quando o Gemini estiver conectado ao seu MCP, você pode conversar em linguagem natural:

### 1. Pedir para explicar sua rotina:
> *"Gemini, o que eu tenho para entregar hoje e como está minha rotina de estudos?"*  
> *(O Gemini chama `get_study_routine` e explica seus prazos do dia, próximas provas e matérias).*

### 2. Pedir para criar novos cards:
> *"Crie um card de entrega do Trabalho de Engenharia de Software para sexta-feira sobre Diagramas C4."*  
> *(O Gemini chama `create_card` e insere o card diretamente no seu quadro de tarefas).*

### 3. Pedir para marcar como feito:
> *"Marque a tarefa 'Lista de Cálculo' como concluída."*  
> *(O Gemini chama `update_card_status` com status 'done').*

### 4. Pedir um plano de estudos:
> *"Analise minhas disciplinas e crie um plano de foco para as provas das próximas duas semanas."*
