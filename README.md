# Painel do Estudante 📚

Aplicação web moderna para organização de estudos universitários, inspirada na estética e estrutura do Notion, com foco em alta produtividade, gerenciamento de disciplinas, fluxo Kanban de tarefas, sistema de recuperação ativa com repetição espaçada e temporizador Pomodoro.

---

## 🚀 Funcionalidades

- **🎓 Disciplinas do Semestre:**
  - Gerenciamento de matérias (código, professor, horários, sala/link e status).
  - Filtro por disciplinas em andamento ou histórico completo.
- **📋 Quadro Kanban de Tarefas & Entregas:**
  - Colunas interativas: *A Fazer*, *Em Andamento* e *Concluído*.
  - Badges por tipo: *Trabalho, Prova, Exercício, Leitura*.
  - Filtros instantâneos por matéria e destaque para prazos vencidos.
- **🧠 Recuperação Ativa & Repetição Espaçada:**
  - Sistema de flashcards com pergunta visível e resposta oculta.
  - Algoritmo de intervalos progressivos: **1, 3, 7, 14 e 30 dias**.
  - Modo Adaptativo: respostas corretas avançam a etapa; respostas erradas reiniciam para 1 dia.
  - Filtro de revisões pendentes para o dia.
- **⏱️ Foco & Temporizador Pomodoro:**
  - Modos: Foco (25m), Pausa Curta (5m) e Pausa Longa (15m).
  - Registro automático de sessões completas no histórico acumulado.
- **📝 Caderno & Anotações:**
  - Registro de notas rápidas, resumos e links por tags com busca instantânea.
- **💾 Persistência & Backup:**
  - Salva automaticamente no navegador (`LocalStorage`).
  - Botões para exportar e restaurar backup completo em JSON.
- **🌓 Modo Claro / Escuro:**
  - Tema adaptado no padrão Notion.

---

## 🛠️ Tecnologias

- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Lucide React**

---

## 📦 Como Rodar Localmente

```bash
# Clone o repositório
git clone <URL_DO_REPOSITORIO>
cd painel-do-estudante

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

---

## 🚢 Deploy na Vercel

1. Suba o projeto para o seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e conecte sua conta do GitHub.
3. Importe o repositório `painel-do-estudante`.
4. Mantenha as configurações padrão (Framework: **Vite**, Build Command: `npm run build`, Output Directory: `dist`).
5. Clique em **Deploy**!
