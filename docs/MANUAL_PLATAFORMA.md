# Manual da Plataforma CRM-Fity
### Guia Completo de Uso — Admin e Seller

---

## Índice

1. [Visão Geral da Plataforma](#1-visão-geral-da-plataforma)
2. [Perfis de Acesso](#2-perfis-de-acesso)
3. [Pipeline e Kanban](#3-pipeline-e-kanban)
4. [Leads](#4-leads)
5. [Inbox Omnichannel](#5-inbox-omnichannel)
6. [Agentes de IA](#6-agentes-de-ia)
7. [Automações n8n — O que cada Workflow faz](#7-automações-n8n--o-que-cada-workflow-faz)
8. [Cadência Inteligente por Estágio](#8-cadência-inteligente-por-estágio)
9. [Playbooks (Seller)](#9-playbooks-seller)
10. [Follow-up Automático](#10-follow-up-automático)
11. [Tarefas](#11-tarefas)
12. [Dashboard e Relatórios](#12-dashboard-e-relatórios)
13. [Configurações — Admin](#13-configurações--admin)
14. [Configurações — Seller](#14-configurações--seller)
15. [Notificações](#15-notificações)
16. [Grupos](#16-grupos)
17. [Comunidade](#17-comunidade)
18. [Suporte](#18-suporte)
19. [Fluxo Completo: do Lead ao Fechamento](#19-fluxo-completo-do-lead-ao-fechamento)
20. [Glossário](#20-glossário)

---

## 1. Visão Geral da Plataforma

O CRM-Fity é uma plataforma comercial com inteligência artificial integrada. Ela centraliza:

- **Gestão de leads** em Kanban visual (pipeline)
- **Atendimento omnichannel** (WhatsApp, Instagram, Email)
- **Agentes de IA** que qualificam, transferem e fecham negócios automaticamente
- **Automações** de follow-up, cadência e movimentação de cards
- **Relatórios e dashboards** de performance

**Stack técnico:** React + Supabase + n8n + Evolution API (WhatsApp) + OpenAI

---

## 2. Perfis de Acesso

Existem dois perfis na plataforma. O que cada um vê e pode fazer:

### Admin

| Área | Pode fazer |
|------|-----------|
| Equipe | Criar, convidar, bloquear, arquivar, deletar usuários |
| Agentes de IA | Criar, editar, ativar/desativar, arquivar agentes |
| Credenciais de IA | Adicionar chaves OpenAI, Gemini, Anthropic |
| Integrações | Configurar webhooks e canais |
| Painel 360 | Ver performance global de todos os sellers |
| Pipeline (admin) | Só configura — não opera o Kanban |
| Todas as configurações | Acesso total |

### Seller (Vendedor)

| Área | Pode fazer |
|------|-----------|
| Pipeline/Kanban | Mover leads, criar, editar, qualificar |
| Leads | Criar, editar, deletar os próprios leads |
| Inbox | Atender conversas, enviar mensagens |
| Playbooks | Criar e gerenciar playbooks pessoais |
| Follow-up | Configurar regras de follow-up pessoais |
| Tarefas | Criar e gerenciar tarefas |
| Relatórios | Ver relatórios dos próprios dados |
| Dashboard | Ver KPIs pessoais |
| Configurações | Somente: Pipelines, Estágios, Integrações, Follow Up |

> **Regra geral:** Admin configura a máquina. Seller opera a máquina.

---

## 3. Pipeline e Kanban

### O que é
O Pipeline é o quadro Kanban onde os leads são gerenciados visualmente. Cada coluna representa um **estágio** do processo comercial. Os leads são **cards** que se movem entre estágios conforme o avanço da negociação.

### Como acessar
Menu lateral → **Pipeline**

### Funcionalidades do Kanban

**Mover leads:** Arraste o card de uma coluna para outra (drag-and-drop). Isso atualiza o `column_id` do lead no banco.

**Buscar leads:** Campo de busca no topo — filtra por nome, email, telefone ou empresa em tempo real.

**Múltiplos Pipelines:** Você pode ter vários boards (ex: "Pré-venda", "Venda Direta", "Parceiros"). Troque pelo seletor no topo.

**Minimizar cards:** Clique no ícone de minimizar para ver os cards mais compactos.

**Colapsar coluna:** Clique no header da coluna para recolhê-la.

### O que aparece em cada card (configurável)

| Campo | Ativado por padrão |
|-------|--------------------|
| Valor do deal | Sim |
| Tags | Sim |
| Probabilidade | Não |
| Responsável (assigned to) | Sim |
| Email | Não |
| Telefone | Sim |
| Data de criação | Não |

Para personalizar: ícone de configuração (⚙️) no canto superior do Kanban.

### Status automático do card

O status é calculado automaticamente e exibe um badge colorido:

| Status | Cor | Critério |
|--------|-----|---------|
| Qualificado | Verde | `qualificationStatus = 'qualified'` |
| Pendente | Cinza | Padrão (sem qualificação) |
| Desqualificado | Vermelho | `qualificationStatus = 'disqualified'` |
| Ganho | Dourado | Movido para coluna tipo "Ganho" |
| Perdido | Preto | Movido para coluna tipo "Perdido" |

### Ações no card (menu ...)

- **Editar** — abre modal de edição completa
- **Qualificar / Desqualificar** — abre modal de qualificação
- **Marcar como Ganho** — registra `wonAt` e move para coluna de Ganho
- **Marcar como Perdido** — solicita razão, move para coluna de Perda
- **Mover para outro Pipeline** — move o card para outro board
- **Abrir WhatsApp** — abre conversa direta com o lead
- **Deletar** — remove permanentemente

---

## 4. Leads

### Campos de um Lead

| Campo | Obrigatório | Descrição |
|-------|-------------|-----------|
| Nome | Sim | Nome do lead |
| Email | Não | Email de contato |
| Telefone | Não | Com máscara |
| Empresa | Não | Nome da empresa |
| Segmento | Não | Segmento de mercado |
| Valor | Não | Valor estimado do deal (R$) |
| Probabilidade | Não | % de conversão estimada |
| Descrição | Não | Notas livres |
| Status | Não | Ativo / Inativo |
| Fonte | Não | Como chegou (Indicação, WhatsApp, Formulário...) |
| Tags | Não | Labels coloridas (multiselect) |
| Grupo | Não | Grupo comercial ao qual pertence |
| Estágio | Sim | Coluna atual no Kanban |

### Fontes de Lead disponíveis

Ligação, Prospecção B2B, Prospecção B2C, Indicação, WhatsApp, Email, Formulário, Evento, Redes Sociais.

### Qualificação

Ao clicar em "Qualificar": define `qualificationStatus = 'qualified'` e exibe badge verde.
Ao clicar em "Desqualificar": define `qualificationStatus = 'disqualified'` e exibe badge vermelho + registra razão.

### Lead Ganho vs Perdido

**Ganho:** Registra `wonAt` (timestamp), atualiza `owner_id` para o responsável, o card vai para coluna de tipo "Ganho".

**Perdido:** Solicita razão da perda (`lostReason`), o card vai para coluna de tipo "Perda".

### Recuperação de Leads

Menu lateral → **Leads** → aba "Recuperação". Mostra leads inativos com opção de reativar e reinserir no pipeline.

---

## 5. Inbox Omnichannel

### O que é
Central de atendimento de conversas recebidas pelo WhatsApp (e outros canais). Cada mensagem recebida cria ou reabre uma **conversa** vinculada a um lead.

### Como acessar
Menu lateral → ícone de caixa de entrada (primeiro item) ou `/omnichannel`

### Status das Conversas

| Status | Significado |
|--------|------------|
| `waiting` | Aguardando atendimento (estado inicial de toda mensagem recebida) |
| `in_progress` | Em atendimento humano ativo |
| `resolved` | Encerrada/resolvida |
| `blocked` | Contato bloqueado |

> **Importante:** O agente de IA só responde conversas com status `waiting`. Quando um humano assume (`in_progress`), a IA para de responder.

### Filtros disponíveis

- Todos
- Em espera (waiting)
- Em atendimento (in_progress)
- Encerrados (resolved)

### Ações na conversa

- **Enviar mensagem** — campo de texto na parte inferior
- **Mudar status** — botões para alterar o status da conversa
- **Reabrir** — reabre conversa resolvida (volta para `waiting`)
- **Bloquear contato** — marca como bloqueado
- **Limpar histórico** — apaga as mensagens visíveis
- **Deletar conversa** — remove permanentemente
- **Atribuir agente de IA** (admin) — define qual agente SDR/Closer atende essa conversa

### Rádio de Escalações (Admin)

Badge vermelho no ícone do Inbox mostra quantas conversas foram escaladas pelo agente de IA e precisam de atendimento humano urgente.

---

## 6. Agentes de IA

### O que são
Robôs comerciais que atendem leads via WhatsApp automaticamente. Cada agente tem uma função, personalidade e regras específicas. Eles são configurados pelo admin e operam de forma independente 24/7.

### Como acessar
Menu lateral → **Agentes** (admin)

### Tipos de Agente

| Tipo | Função |
|------|--------|
| **SDR** | Qualifica leads, faz perguntas BANT, agenda reunião com Closer |
| **Closer** | Recebe leads qualificados do SDR, foca em fechar o negócio |
| **Hunter** | Prospecção ativa (envio de abordagem inicial) |
| **Follow-up** | Recuperação de leads que pararam de responder |
| **Curator** | Higienização e enriquecimento de dados de leads |
| **Supervisor** | Monitora a equipe e gera alertas (não envia mensagens) |

> **Para o MVP atual:** Apenas SDR e Closer estão em operação completa.

---

### Wizard de Criação de Agente (6 Passos)

#### Passo 1 — Tipo
Escolha o tipo de agente (ver tabela acima).

#### Passo 2 — Identidade

| Campo | Descrição |
|-------|-----------|
| Nome | Nome do agente (ex: "Carlos SDR") |
| Avatar icon | Emoji representativo |
| Cor | Cor do avatar (hex) |
| Tom | Formal / Consultivo / Descontraído / Técnico / Agressivo |
| Nicho | Segmento de atuação (ex: "SaaS B2B") |

#### Passo 3 — Canais
Selecione em quais canais o agente opera: WhatsApp, Email, SMS, Instagram, LinkedIn.

#### Passo 4 — Meta

| Campo | Descrição |
|-------|-----------|
| Métrica | O que conta como sucesso: leads, reuniões, vendas, receita, qualificados |
| Valor mensal | Meta numérica mensal (opcional) |

#### Passo 5 — Regras (Escalation Rules)

| Campo | Descrição |
|-------|-----------|
| Max follow-ups | Quantas tentativas sem resposta antes de parar |
| Min ticket para escalar | Valor mínimo do deal para escalar para humano |
| Keywords de escalação | Palavras que forçam transferência para humano |
| Escalar se interesse alto | Se `interest_level = very_high`, escala automaticamente |
| Horário de operação | Início e fim (ex: 08:00 às 22:00) |
| Timezone | Fuso horário do agente |

#### Passo 6 — Prompt

O **prompt** é o cérebro do agente. Define como ele se comporta, o que faz e o que não faz.

**Variáveis disponíveis no prompt:**

| Variável | O que injeta |
|----------|-------------|
| `{{tone}}` | Tom do agente |
| `{{niche}}` | Nicho configurado |
| `{{client_type}}` | Perfil de cliente (low/medium/high) |
| `{{qualification_questions}}` | Perguntas do playbook de agente vinculado |
| `{{objection_map}}` | Mapa de objeções do playbook de agente |
| `{{max_followups}}` | Número máximo de follow-ups das regras |
| `{{min_ticket}}` | Ticket mínimo das regras |

**Exemplo de prompt funcional:**

```
Você é um agente SDR da NextSales. Tom: {{tone}}. Nicho: {{niche}}.

Sua missão é qualificar leads usando o framework BANT.
Faça no máximo 2 perguntas por mensagem.

Perguntas de qualificação:
{{qualification_questions}}

Como lidar com objeções:
{{objection_map}}

Regras:
- Max follow-ups sem resposta: {{max_followups}}
- Escale para humano se: lead pedir proposta formal, contrato ou reunião com responsável
- Transfira para Closer quando o lead estiver COMPLETAMENTE qualificado
```

---

### Como o Agente Decide o Que Fazer

O agente SDR/Closer tem 4 **tools** (ferramentas) que pode usar durante a conversa:

| Tool | Quando usa | O que faz |
|------|-----------|-----------|
| `atualizar_memoria` | Quando o lead revela info importante | Salva interesse, objeções, budget, notas |
| `agendar_followup` | Lead pede para falar depois | Agenda próximo contato |
| `escalar_para_humano` | Detecção de keywords ou interesse muito alto | Remove IA da conversa, notifica vendedor humano |
| `transferir_para_closer` | Lead qualificado completo | Move card no pipeline + atribui Closer |

> **Na maioria das mensagens, o agente não usa nenhuma tool — apenas responde naturalmente.**

---

### Playbook de Agente (agent_playbooks)

> **Atenção: NÃO é o mesmo Playbook do menu do Seller.**

É um conjunto de configurações específicas para o comportamento do agente, configurado pelo **admin no Supabase**.

| Campo | Descrição |
|-------|-----------|
| Nome | Ex: "Playbook SDR BANT" |
| Tipo de agente | Para qual função foi criado |
| Opening scripts | Scripts de abertura (para A/B testing futuro) |
| Objection map | JSON: `{"É caro": "Entendo, mas..."}` |
| Qualification framework | BANT, SPIN, MEDDIC, Custom |
| Qualification questions | Lista de perguntas estruturadas |
| Escalation triggers | Palavras que forçam escalada |

**Como vincular:** No admin, editar o agente e definir o `playbook_id`. O prompt do agente precisa ter `{{qualification_questions}}` para as perguntas aparecerem.

---

### Memória do Agente (agent_lead_memory)

A cada interação, o agente salva informações sobre o lead:

| Campo | Descrição |
|-------|-----------|
| `stage` | Fase comercial: new → approached → qualifying → qualified → transferred |
| `interest_level` | low / medium / high / very_high |
| `detected_objections` | Lista de objeções mencionadas |
| `budget_detected` | Valor de orçamento detectado |
| `decision_maker` | Se o lead é quem decide |
| `notes` | Notas livres do agente |
| `approach_count` | Quantas abordagens foram feitas |
| `followup_count` | Quantos follow-ups foram enviados |
| `next_action_at` | Quando deve acontecer a próxima ação |

Essa memória persiste entre conversas — o agente "lembra" de tudo.

---

### Fluxo SDR → Closer

```
Lead recebe mensagem → WF-01 identifica conversa
         ↓
Tem ai_agent_id? → SIM → WF-07 (SDR/Closer responde)
                 → NÃO → WF-05 (IA por estágio responde)
         ↓
SDR qualifica lead completamente
         ↓
SDR chama tool "transferir_para_closer"
         ↓
RPC transfer_lead_to_closer executa:
  1. Busca Closer ativo da empresa
  2. Move card para próximo estágio no Kanban
  3. Atualiza ai_agent_id da conversa → Closer
  4. Copia memória do SDR para o Closer
  5. Marca SDR como "transferred"
         ↓
Próxima mensagem do lead → Closer responde automaticamente
```

---

### Páginas dos Agentes

| Aba | Descrição |
|-----|-----------|
| Central de Comando | Monitoramento em tempo real dos agentes ativos |
| Meus Agentes | Lista todos os agentes, ativa/desativa/arquiva |
| Portfólio | Playbooks disponíveis por agente |
| Analytics | Performance: abordagens, respostas, qualificados, escaladas |

---

## 7. Automações n8n — O que cada Workflow faz

O n8n é o motor de automação. Ele roda em `https://n8n.julianosalles.com.br`. Cada workflow (WF) é ativado por um trigger e executa ações em sequência.

---

### WF-01 — Inbound WhatsApp (V13)
**Trigger:** Toda mensagem recebida pelo WhatsApp (webhook da Evolution API)

**O que faz (em ordem):**
1. Valida o payload recebido
2. Identifica a conexão de canal (qual instância WhatsApp)
3. Normaliza o evento (texto, áudio, imagem, etc.)
4. Transcreve áudio se necessário
5. Registra o evento no Supabase (webhook_events)
6. Verifica se é mensagem duplicada (idempotência)
7. Resolve ou cria o Lead (RPC `resolve_or_create_lead`)
8. Resolve ou cria a Conversa (RPC `resolve_or_create_conversation`)
9. Insere a mensagem no histórico
10. Reseta o contador de follow-up do lead
11. Verifica se a conversa tem `ai_agent_id`:
    - **SIM →** Dispara WF-07 (agente SDR/Closer)
    - **NÃO →** Dispara WF-05 (IA por estágio/board)
12. Cria notificação se for conversa nova

> **Este é o coração do sistema. Toda mensagem começa aqui.**

---

### WF-02 — Envio de Mensagem WhatsApp (Outbound)
**Trigger:** Chamada interna de outros workflows

**O que faz:** Envia uma mensagem de texto via Evolution API para um número de WhatsApp.

---

### WF-03 — Follow-up por Inatividade
**Trigger:** Cron job (timer) — verifica periodicamente leads inativos

**O que faz:**
1. Busca leads com inatividade acima do limite configurado
2. Verifica regras de follow-up do vendedor responsável
3. Envia mensagem de follow-up via WhatsApp
4. Atualiza contador de follow-up do lead

---

### WF-04 — Auto-Close
**Trigger:** Cron job — verifica conversas abertas há muito tempo

**O que faz:** Fecha automaticamente conversas que ultrapassaram o tempo máximo sem resposta.

---

### WF-05 — Agente IA por Estágio (V7)
**Trigger:** Chamado pelo WF-01 quando a conversa NÃO tem `ai_agent_id`

**O que faz:**
1. Verifica se a conversa está com status `waiting` (se não, para)
2. Verifica se é mensagem de texto
3. Carrega dados do lead, estágio e board
4. Verifica se a IA está habilitada nesse board
5. Busca histórico de mensagens
6. Usa o `ai_prompt` do **estágio atual** (ou do board) como prompt
7. Chama OpenAI para gerar resposta
8. Envia resposta via WhatsApp
9. Salva mensagem no histórico
10. **Verifica keywords do estágio** (`auto_triggers`):
    - Keyword detectada → move card para próximo estágio
    - Nenhuma keyword → chama IA para analisar se deve avançar
11. Respeita `requires_approval`: se true, cria notificação; se false, move automaticamente

**Onde configurar o prompt:** Menu **Agente de IA** (admin) → aba **Estágios** → selecione o estágio → edite o prompt.

---

### WF-07 — Executor de Agente (V17) ← Principal do novo sistema
**Trigger:** Chamado pelo WF-01 quando a conversa TEM `ai_agent_id`

**O que faz:**
1. Carrega dados do agente, lead, conexão, memória, playbook e histórico
2. Constrói o prompt completo (com memória + histórico + contexto)
3. Executa o AI Agent (LangChain + GPT-4o-mini)
4. O agente pode chamar tools:
   - `atualizar_memoria` → salva info no banco
   - `agendar_followup` → agenda próximo contato
   - `escalar_para_humano` → RPC que remove IA e notifica humano
   - `transferir_para_closer` → RPC que move card e atribui Closer
5. Envia a resposta via WhatsApp
6. Salva a mensagem no histórico
7. **[NOVO V17]** Após salvar: verifica se o lead deve avançar de estágio:
   - Carrega `auto_triggers` do estágio atual
   - Se keyword detectada → move card automaticamente
   - Se não → IA analisa conversa → decide se avança
   - Respeita `requires_approval`
8. Registra a execução em `agent_runs`
9. Envia trace para LangSmith (debug)
10. Atualiza métricas de performance do agente

---

### WF-06 — Agent Router
**Trigger:** Chamado para rotear qual agente deve atender

**O que faz:** Identifica o agente correto para a conversa e direciona para o WF-07.

---

### WF-08 — Agent Follow-up
**Trigger:** Cron job para agentes com leads agendados

**O que faz:** Verifica `agent_lead_memory.next_action_at` e dispara o agente para executar o follow-up agendado.

---

## 8. Cadência Inteligente por Estágio

### O que é
Sistema que move os cards automaticamente no Kanban baseado nas mensagens da conversa. Configurado **por estágio** no board.

### Como configurar (Admin)

Menu → **Agente de IA** (ou **Configurações** → **Agente de IA**) → Selecionar pipeline → Aba **Cadência** ou botão de configuração por estágio.

### Campos por Estágio

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| `auto_triggers` | Lista de keywords que disparam avanço | `["quero saber mais", "me conta mais"]` |
| `requires_approval` | Se true: cria notificação em vez de mover | `false` = move automático |
| `auto_playbook_id` | Playbook que é ativado ao mover (futuro) | UUID do playbook |
| `ai_prompt` | Prompt customizado para IA neste estágio | Texto livre |

### Mecanismos de Movimento (executados em sequência)

**Mecanismo 1 — Keywords (instantâneo):**
A mensagem do lead é comparada com os `auto_triggers` do estágio. Se qualquer keyword estiver no texto → **move imediatamente**, sem chamar IA.

**Mecanismo 2 — Análise de IA (fallback):**
Se nenhuma keyword for detectada, o sistema chama o `gpt-4o-mini` com o histórico e pergunta: *"O lead deve avançar de estágio?"*. A resposta é SIM ou NAO.

**Mecanismo 3 — Transferência para Closer:**
Quando o SDR chama `transferir_para_closer`, o RPC move o card automaticamente para o próximo estágio e atribui o Closer.

### Exemplo de Configuração de Pipeline Pré-venda

| Estágio | Keywords | requires_approval | Comportamento |
|---------|----------|-------------------|---------------|
| Nova | "quero saber mais", "me conta" | false | Auto-move → Tentando Contato |
| Tentando Contato | "oi", "olá", "bom dia", "sim", "ok" | false | Auto-move → Conectado |
| Conectado | "quanto custa", "quero contratar" | true | Notifica seller para aprovar |
| Qualificado (MQL) | — | — | Closer assume |
| Desqualificado | — | — | — |

---

## 9. Playbooks (Seller)

### O que são
Sequências de tarefas automáticas que guiam o **vendedor humano** durante o atendimento de um lead. Cada playbook tem etapas e passos.

> **Não confundir com Playbook de Agente.** Este aqui é para o seller, não para a IA.

### Como acessar
Menu lateral → **Playbooks**

### Campos de um Playbook

| Campo | Descrição |
|-------|-----------|
| Nome | Ex: "Qualificação BANT" |
| Estágios de aplicação | Em quais colunas do pipeline esse playbook pode ser ativado |
| Steps (passos) | Lista de tarefas com dia e tipo |

### Tipos de Passo (Steps)

| Tipo | Ícone | Descrição |
|------|-------|-----------|
| task | Tarefa | Ação genérica |
| email | Email | Enviar email |
| call | Ligação | Fazer ligação |
| meeting | Reunião | Realizar reunião |
| note | Nota | Registrar anotação |

### Exemplo de Playbook

```
Playbook: "Qualificação Inicial"
Estágios: Tentando Contato, Conectado

Steps:
  D+0 | call  | Ligar para apresentar a empresa e entender a situação
  D+1 | email | Enviar email com material de apresentação
  D+3 | task  | Verificar se abriu o email e fazer follow-up
  D+7 | meeting | Agendar call de qualificação completa
```

### Como ativar um Playbook em um Lead

No card do lead → menu (...) → Ativar Playbook → Selecionar playbook.
O lead passa a mostrar o badge do playbook ativo no card.

---

## 10. Follow-up Automático

### O que é
Sistema que envia mensagens automáticas para leads que pararam de responder, com base em regras definidas pelo seller.

### Como acessar
**Configurações** → **Follow Up**

### Campos de uma Regra de Follow-up

| Campo | Descrição | Exemplo |
|-------|-----------|---------|
| Sequência | Ordem da regra (1ª, 2ª, 3ª tentativa) | 1 |
| Delay | Tempo de espera | 2 dias |
| Horário permitido | Janela de envio | 08:00 às 20:00 |
| Dias da semana | Quais dias enviar | Seg-Sex |
| Prompt | O que a IA deve dizer | "Olá, você teve a chance de ver...?" |

### Isolamento por Seller

Cada seller tem suas próprias regras. As regras de um seller não afetam os leads de outro.
O motor de follow-up (`get_pending_followups`) usa as regras do seller responsável pela conversa. Se o seller não tiver regra para aquela sequência, cai para a regra global do admin.

### WF-03 (Follow-up por Inatividade)

O WF-03 roda periodicamente e:
1. Busca leads com inatividade superior ao delay configurado
2. Verifica qual step de follow-up está pendente
3. Envia a mensagem
4. Atualiza o contador `followup_count` do lead

---

## 11. Tarefas

### O que são
Ações agendadas vinculadas a leads. Servem para lembrar o seller de fazer ligações, reuniões, emails, etc.

### Como acessar
Menu lateral → **Tarefas**

### Tipos de Tarefa

| Tipo | Uso |
|------|-----|
| task | Ação genérica |
| email | Enviar email |
| call | Ligar |
| meeting | Realizar reunião |
| note | Registrar anotação |

### Campos

| Campo | Obrigatório |
|-------|-------------|
| Tipo | Sim |
| Título | Sim |
| Descrição | Não |
| Data de vencimento | Sim |
| Lead relacionado | Sim |
| Status (pending/completed) | Automático |

### Alertas de Tarefa

- **Amarelo:** Tarefa próxima do vencimento
- **Vermelho:** Tarefa vencida (atrasada)

O número de tarefas atrasadas aparece como badge vermelho no card do lead no Kanban.

---

## 12. Dashboard e Relatórios

### Dashboard Seller (`/dashboard`)

**Visão Geral — KPIs:**

| Métrica | Descrição |
|---------|-----------|
| Total de leads | No período selecionado |
| Leads ativos | Não ganhos, não perdidos |
| Taxa de conversão | % de leads convertidos |
| Valor do pipeline | Soma de todos os deals ativos |
| Receita gerada | Soma dos deals ganhos |

**Filtros:** Pipeline específico + Período (Hoje, 7 dias, 30 dias, Mês, Trimestre, Ano)

**Gráficos:** Tendência de leads por período, distribuição por estágio.

---

### Painel 360 (Admin) (`/painel360`)

Visão global da empresa:
- Performance consolidada de todos os sellers
- Ranking de vendedores
- Comparativo de períodos
- Drill-down: clique em um seller para ver o detalhe completo

**SellerDetail360:** Ao clicar em um seller, abre painel com:
- Leads ganhos no período
- Receita gerada
- Leads em cada estágio
- Histórico de atividades

---

### Relatórios (`/relatorios`)

**Filtros:** Pipeline, Período, Seller específico

**KPIs:** Total de leads, leads ganhos, taxa de conversão, valor médio, receita total

**Exportação:** Botão de download em PDF com relatório completo.

---

## 13. Configurações — Admin

URL base: `/configuracoes/`

### Equipe

Gerenciamento completo de usuários:

| Ação | Descrição |
|------|-----------|
| Convidar | Gera link de convite (7 dias, 30 dias ou permanente) |
| Ativar/Desativar | Acesso ao sistema |
| Bloquear | Usuário fica suspenso |
| Arquivar | Remove do sistema (soft delete) |
| Deletar | Remove permanentemente |

O link de convite é enviado para o novo usuário. Ao clicar, ele cria a conta dentro da empresa.

---

### Inteligência Artificial

Hub de configuração da IA por pipeline:

**Aba: Auto (recomendado)**
Configura a IA com base em um formulário guiado (nicho, tom, metodologia).

**Aba: Templates**
Escolha um template pré-configurado:
- BANT — Budget, Authority, Need, Timeline
- SPIN Selling — Situação, Problema, Implicação, Necessidade
- MEDDIC — para vendas complexas B2B
- GPCT — Goals, Plans, Challenges, Timeline

**Aba: Estágios**
Configure um `ai_prompt` diferente para cada estágio do pipeline.
O WF-05 usa esse prompt para responder ao lead com contexto do estágio atual.

**Aba: Cadência**
Configure keywords e `requires_approval` por estágio (veja seção 8).

**Aba: Avançado**
Edite o prompt manualmente (texto livre).

---

### Credenciais de IA

Adicione suas chaves de API:

| Provedor | Modelos |
|----------|---------|
| OpenAI | GPT-4o, GPT-4o-mini, GPT-3.5 |
| Google Gemini | Gemini Pro, Gemini Flash |
| Anthropic | Claude 3, Claude 3.5 |

---

### Integrações

Configurar conexões com canais:
- WhatsApp (via Evolution API)
- Outras integrações via webhook

---

## 14. Configurações — Seller

### Pipelines

Lista os boards disponíveis. O seller pode:
- Ver todos os pipelines
- Ativar/desativar
- Criar novo pipeline
- Deletar (se houver mais de 1)

### Estágios

Configura as colunas de **um pipeline específico**:

| Campo | Descrição |
|-------|-----------|
| Título | Nome do estágio |
| Cor | Cor do badge |
| Tipo | abertura / qualificação / follow-up / agendamento / ganho / perda |
| Ordem | Drag-and-drop para reordenar |

O tipo define o comportamento especial:
- `ganho` → leads movidos aqui são marcados como Ganhos
- `perda` → leads movidos aqui são marcados como Perdidos

### Follow Up

Configure regras de follow-up pessoais (veja seção 10).

### Integrações

Ver conexões de canais disponíveis (somente visualização para seller).

---

## 15. Notificações

### Tipos de Notificação

| Tipo | Disparado quando |
|------|-----------------|
| `lead_created` | Novo lead criado |
| `lead_won` | Lead marcado como Ganho |
| `lead_lost` | Lead marcado como Perdido |
| `lead_reactivation` | Lead reativado |
| `task_due_soon` | Tarefa vence em breve |
| `task_overdue` | Tarefa vencida |
| `mention` | Mencionado em comentário |
| `stage_approval` | IA detectou que lead deve avançar e precisa de aprovação humana |
| `human_escalation` | Agente de IA escalou para atendimento humano |
| `system_update` | Atualização do sistema |
| `info` | Card movido automaticamente pela IA |

### Como visualizar

Clique no sino (🔔) no header. As notificações são agrupadas por:
- Hoje
- Ontem
- Anteriormente

### Notificação de stage_approval

Quando um estágio tem `requires_approval = true` e a IA detecta que o lead deve avançar, o seller recebe uma notificação com:
- Nome do lead
- Trigger ou análise de IA que motivou
- Novo estágio sugerido

O seller aprova manualmente movendo o card.

---

## 16. Grupos

### O que são
Segmentação de leads em grupos comerciais (ex: turmas, campanhas, listas específicas).

### Como acessar
Menu lateral → **Grupos** (admin)

### Campos de Grupo

| Campo | Descrição |
|-------|-----------|
| Nome | Ex: "Turma Março 2026" |
| Descrição | Detalhe |
| Status | Ativo, Lotado, Arquivado |
| Meta de membros | Número máximo |
| Link de acesso | URL do grupo |

### Análise de Grupo

Dentro de um grupo, o admin pode criar análises customizadas:
- Texto rico com observações
- Status: rascunho ou salvo
- Filtrar leads do grupo
- Marcar leads como qualificados
- Exportar análise em PDF

---

## 17. Comunidade

### O que é
Feed social interno da plataforma onde usuários compartilham conteúdo, dúvidas e aprendizados.

### Como acessar
Menu lateral → **Comunidade**

### Funcionalidades

| Ação | Descrição |
|------|-----------|
| Criar post | Título, conteúdo, categoria |
| Votar | Upvote/downvote em posts |
| Comentar | Thread de comentários aninhados |
| Filtrar | Por categoria e ordenação (recente/popular) |

---

## 18. Suporte

### O que é
Sistema interno de help center com artigos e fila de chamados.

### Como acessar
Menu lateral → **Suporte**

### Central de Ajuda
Admin cria artigos categorizados. Sellers pesquisam e leem.

### Fila de Chamados

| Status | Significado |
|--------|------------|
| open | Aberto, aguardando resposta |
| in_progress | Em atendimento |
| resolved | Resolvido |
| closed | Encerrado definitivamente |

Admin vê todos os chamados. Seller vê apenas os próprios.

---

## 19. Fluxo Completo: do Lead ao Fechamento

### Cenário: Lead inbound via WhatsApp com Agente SDR

```
1. Lead envia mensagem no WhatsApp
          ↓
2. WF-01 recebe o webhook da Evolution API
   → Cria o lead no banco (se não existe)
   → Cria a conversa com status 'waiting'
   → Insere a mensagem no histórico
          ↓
3. Conversa tem ai_agent_id (SDR)?
   → SIM: WF-07 é disparado
          ↓
4. WF-07 carrega contexto completo:
   - Prompt do agente SDR
   - Memória do lead (interesse, objeções, etc.)
   - Histórico de mensagens
   - Playbook do agente (se configurado)
          ↓
5. OpenAI gera resposta do SDR
          ↓
6. SDR verifica se deve usar uma tool:
   - Lead deu info importante → atualizar_memoria
   - Lead pediu para falar depois → agendar_followup
   - Lead usou keyword de escalação → escalar_para_humano
   - Lead qualificado completo → transferir_para_closer
          ↓
7. Mensagem do SDR é enviada via WhatsApp
          ↓
8. [PARALELO] Motor de pipeline verifica:
   - Keyword detectada? → move card automaticamente
   - Não: IA analisa conversa → SIM → move card
   - requires_approval? → cria notificação para seller
          ↓
9. Lead continua qualificando ao longo das mensagens...
          ↓
10. SDR decide transferir para Closer:
    → RPC transfer_lead_to_closer executa:
      - Busca Closer ativo
      - Move card para próximo estágio
      - Atualiza ai_agent_id → Closer
      - Copia memória do SDR para Closer
          ↓
11. Próxima mensagem do lead → Closer responde
    → Closer tem acesso à memória completa do SDR
    → Closer foca em fechar o negócio
          ↓
12. Lead fecha:
    - Card é movido para coluna "Ganho"
    - wonAt é registrado
    - Receita aparece no Dashboard
```

---

### Cenário: Lead inbound sem Agente (WF-05)

```
1. Lead envia mensagem
          ↓
2. WF-01 processa (igual ao acima)
          ↓
3. Conversa NÃO tem ai_agent_id
   → WF-05 é disparado
          ↓
4. WF-05 verifica:
   - Conversa está 'waiting'? (se não, para)
   - IA está habilitada nesse board?
          ↓
5. Prompt usado = ai_prompt do ESTÁGIO atual
   (configurado em Configurações → Agente de IA → Estágios)
          ↓
6. OpenAI gera resposta
          ↓
7. Resposta enviada via WhatsApp
          ↓
8. Motor de cadência verifica keywords e analisa IA
   → Move card se necessário
```

---

## 20. Glossário

| Termo | Definição |
|-------|-----------|
| **Board** | Pipeline completo (conjunto de estágios) |
| **Column/Estágio** | Uma coluna do Kanban (ex: "Conectado") |
| **Lead** | Contato/prospecto sendo trabalhado |
| **Conversa** | Histórico de mensagens com um lead em um canal |
| **ai_agent_id** | ID do agente de IA atribuído a uma conversa |
| **WF-01** | Workflow de entrada de mensagens WhatsApp |
| **WF-05** | Workflow de resposta por estágio (sem agente) |
| **WF-07** | Workflow executor de agentes SDR/Closer |
| **SDR** | Sales Development Representative — qualifica leads |
| **Closer** | Agente que fecha negócios com leads qualificados |
| **auto_triggers** | Keywords configuradas por estágio para mover cards |
| **requires_approval** | Flag que exige aprovação humana antes de mover card |
| **agent_lead_memory** | Memória do agente sobre um lead específico |
| **transfer_lead_to_closer** | RPC que executa o handoff SDR→Closer atomicamente |
| **escalate_to_human** | RPC que remove IA e notifica vendedor humano |
| **Playbook (seller)** | Sequência de tarefas para guiar vendedor humano |
| **Playbook (agente)** | Configuração de comportamento do agente de IA |
| **Follow-up** | Mensagem automática para lead inativo |
| **stage_approval** | Notificação de que lead deve avançar (requer aprovação) |
| **human_escalation** | Notificação de que IA escalou para humano |
| **interest_level** | Nível de interesse do lead: low/medium/high/very_high |
| **BANT** | Budget, Authority, Need, Timeline — framework de qualificação |
| **Evolution API** | Serviço que conecta ao WhatsApp Business |
| **n8n** | Plataforma de automação que roda os workflows |
| **Supabase** | Banco de dados e autenticação da plataforma |

---

*Documento gerado em 22/03/2026 — CRM-Fity v1.0*
*Para atualizar este manual, edite o arquivo `docs/MANUAL_PLATAFORMA.md`*
