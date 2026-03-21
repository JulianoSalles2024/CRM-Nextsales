# NEXTSALES — EXÉRCITO COMERCIAL DE IA
## Plano Mestre do Ecossistema de Agentes Comerciais

> **Documento vivo** · criado em 2026-03-15 · status: PLANEJAMENTO
> Próxima feature após conclusão do módulo Omnichannel.

---

## 0. A TESE CENTRAL

> "NextSales não é um CRM com IA.
> É uma operação comercial autônoma onde humanos e agentes trabalham juntos para gerar receita."

O NextSales passa a ser um **Sistema Operacional de Vendas**.

A empresa que assina o NextSales não compra uma ferramenta.
Ela ganha uma **força de vendas digital** — operando 24h, com meta, com memória, com hierarquia.

---

## 1. OS 4 PILARES DO ECOSSISTEMA

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEXTSALES ECOSYSTEM                         │
├────────────────┬───────────────────┬───────────┬───────────────┤
│  INFRAESTRUTURA│  FORÇA COMERCIAL  │  MOTOR DE │  INTELIGÊNCIA │
│  COMERCIAL     │  DE IA            │  DISTRIBUIÇÃO│ COMERCIAL  │
│                │                   │           │               │
│  Leads         │  Agentes Hunter   │  Portfólio│  Padrões de   │
│  Pipeline      │  Agentes SDR      │  Produtos │  conversão    │
│  Inbox         │  Agentes Closer   │  Afiliados│  Nichos que   │
│  Automações    │  Agentes Follow-up│  Parceiros│  respondem    │
│  Relatórios    │  Agentes Supervisor│  Marketplace│ Scripts que│
│  Time          │                   │  (futuro) │  convertem    │
└────────────────┴───────────────────┴───────────┴───────────────┘
```

**Pilar 1 — Infraestrutura Comercial** (já existe, em evolução)
Sistema nervoso da operação. Pipeline, Inbox Omnichannel, Automações, Relatórios.

**Pilar 2 — Força Comercial de IA** ← *objeto deste documento*
Agentes comerciais especializados por função. Operam 24h, alimentam o CRM, executam
as tarefas repetitivas que humanos fazem mal ou abandonam.

**Pilar 3 — Motor de Distribuição de Produtos**
Empresas cadastram seus produtos, serviços, afiliados. Agentes escolhem qual oferecer
com base em regras e IA. Embrião do marketplace futuro.

**Pilar 4 — Inteligência Comercial**
O sistema aprende: padrões de resposta, scripts que convertem, horários, objeções,
nichos. Gera recomendações automáticas para humanos e agentes.

---

## 2. TIPOS DE AGENTES — O EXÉRCITO

Cada agente tem **função, meta, memória e território**. Não são genéricos. São operadores especializados.

### 2.1 Agente HUNTER
**Função:** caça oportunidades.
- Monitora sinais públicos de intenção (menções, buscas, formulários)
- Monta listas de leads a partir de fontes permitidas (webhooks, forms, CSV)
- Enriquece contexto do lead antes do contato
- **Não fecha. Não vende. Caça e alimenta o CRM.**

### 2.2 Agente SDR
**Função:** abertura e qualificação.
- Abordagem inicial em qualquer canal (WhatsApp, Instagram, email)
- Desperta interesse, quebra objeção inicial
- Qualifica lead com perguntas estruturadas (BANT, SPIN, framework configurável)
- Agenda reunião ou encaminha para Closer
- **Métrica principal: leads qualificados / dia**

### 2.3 Agente CLOSER
**Função:** negociação e fechamento.
- Recebe leads qualificados pelo SDR
- Apresenta proposta, argumenta, compara opções
- Conduz até decisão
- Sabe quando pedir fechamento e quando recuar
- **Métrica principal: taxa de conversão**

### 2.4 Agente FOLLOW-UP
**Função:** recuperação e reativação.
- Retoma leads mornos com inteligência e timing
- Lembra proposta enviada sem virar spam
- Recupera leads parados no pipeline há X dias
- **Sozinho pode ser o maior gerador de receita oculta**
- **Métrica principal: leads reativados / receita recuperada**

### 2.5 Agente CURADOR DE OFERTA
**Função:** inteligência de portfólio.
- Analisa quais produtos convertem mais por nicho
- Identifica padrões: tipo de cliente × produto × canal
- Sugere qual oferta empurrar para cada perfil de lead
- Reorganiza prioridade do portfólio automaticamente
- **Não vende. Decide o que vale vender.**

### 2.6 Agente SUPERVISOR
**Função:** monitoramento da tropa.
- Mede performance dos outros agentes em tempo real
- Detecta queda de conversão, script ruim, canal fraco
- Sugere troca de estratégia e playbook
- Gera alertas para o gestor humano
- **Cria a hierarquia: operador → supervisor → gestor → admin**

---

## 3. ESTRUTURA DO MÓDULO NO FRONTEND

### 3.1 Menu Principal
```
Dashboard
Leads
Pipeline
Inbox Omnichannel
Automações
Relatórios
──────────────────
⚡ Agentes Comerciais   ← NOVO
```

### 3.2 Abas do Módulo
```
[ Central de Comando ] [ Meus Agentes ] [ Portfólio ] [ Playbooks ] [ Analytics ]
```

---

## 4. TELAS — DESIGN DE PRODUTO

### 4.1 Central de Comando (tela inicial)
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ Força Comercial — Hoje                    + Criar Agente     │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Agentes      │ Leads        │ Conversas    │ Vendas             │
│ ativos: 6    │ gerados: 124 │ iniciadas:67 │ fechadas: 4        │
│ pausados: 2  │              │              │ R$ 12.400          │
├──────────────┴──────────────┴──────────────┴────────────────────┤
│  RANKING DO DIA                                                  │
│  🥇 Agente Atlas    — 12 conversas · 3 vendas · R$ 4.200       │
│  🥈 Agente Vega     — 8 conversas  · 2 vendas · R$ 2.800       │
│  🥉 Agente Orion    — 5 conversas  · 1 venda  · R$ 1.400       │
│  ──────────────────────────────────────────────────────         │
│  ⚠️  Agente Sirius  — taxa resposta 12% (abaixo do esperado)   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Criar / Configurar Agente — Wizard em 5 etapas

**Etapa 1 — Identidade**
```
Nome do agente:     [ Atlas                    ]
Avatar:             [ escolher ícone / cor ]
Função:             ○ Hunter  ● SDR  ○ Closer  ○ Follow-up
                    ○ Curador de Oferta  ○ Supervisor
Tom de comunicação: ○ Formal  ● Consultivo  ○ Descontraído
```

**Etapa 2 — Missão**
```
Produto / Portfólio:  [ NextSales CRM — Plano Growth    ▼ ]
Nicho de mercado:     [ Empresas B2B de vendas           ]
Tipo de cliente:      ○ Ticket alto  ● Médio  ○ Baixo
Meta mensal:          [ 30  ] reuniões agendadas
```

**Etapa 3 — Território**
```
Canais ativos:  ☑ WhatsApp  ☐ Instagram  ☐ Email  ☐ LinkedIn
Fonte de leads: ☑ Inbound (inbox)  ☑ Leads do CRM  ☐ Prospecção ativa
Horário de operação: [ 08:00 ] até [ 22:00 ]
Fuso horário:   [ America/Sao_Paulo            ▼ ]
```

**Etapa 4 — Playbook**
```
Playbook base:  [ SDR B2B — Abordagem consultiva   ▼ ]
Script de abertura:
  [ Olá {nome}, vi que sua empresa trabalha com vendas...   ]

Objeções configuradas:
  "Não tenho tempo"    → [ resposta customizada ]
  "Já tenho ferramenta"→ [ resposta customizada ]

Escalar para humano quando:
  ☑ Lead demonstra interesse alto
  ☑ Negociação acima de R$ [ 5.000 ]
  ☑ Lead pede falar com humano
```

**Etapa 5 — Revisão**
```
[preview do agente configurado + botão Ativar Agente]
```

### 4.3 Painel do Agente (visão individual)
```
┌─ Agente Atlas — SDR ────────────────────── ● Ativo ──┐
│  Missão: NextSales CRM | Nicho: B2B | Meta: 30/mês   │
├───────────────────────────────────────────────────────┤
│  FILA DE LEADS           │  PERFORMANCE DO MÊS        │
│  ─────────────────       │  ──────────────────────    │
│  📞 João Silva           │  Leads abordados:    88    │
│     status: qualificando │  Respostas:          41    │
│                          │  Qualificados:       22    │
│  ⏳ Maria Costa          │  Reuniões:           14    │
│     status: aguardando   │  Vendas:              4    │
│     resposta há 2h       │  Receita gerada: R$5.600   │
│                          │                            │
│  🔄 Carlos Lima          │  Meta: 30 reuniões         │
│     status: follow-up 2  │  Progresso: ▓▓▓▓▓░  47%   │
└──────────────────────────┴────────────────────────────┘
```

### 4.4 Memória Comercial do Lead (por agente)
```
Lead: João Silva — TechVendas LTDA

Histórico com Agente Atlas:
  2026-03-10  Abordagem via WhatsApp
  2026-03-10  Resposta: "interessante, me manda mais info"
  2026-03-11  Proposta enviada: Plano Growth R$2.400/ano
  2026-03-12  Sem resposta — follow-up agendado
  2026-03-14  Follow-up enviado
  2026-03-16  ← próxima ação

Objeção detectada: preço
Interesse: alto
Produto apresentado: Plano Growth
Status: quente — aguardando follow-up
```

### 4.5 Analytics Geral
```
[ Filtro: Semana / Mês / Personalizado ]

Por agente:
  Agente     | Abordagens | Respostas | Qualific. | Reuniões | Vendas | Receita
  ─────────────────────────────────────────────────────────────────────────────
  Atlas SDR  |    88      |    41     |    22     |   14     |   4    | R$5.600
  Vega SDR   |    72      |    30     |    18     |   10     |   3    | R$4.200
  Orion FU   |    45      |    28     |     -     |    -     |   6    | R$8.400

Taxa de conversão por funil:
  Abordagem → Resposta:       46%
  Resposta  → Qualificação:   54%
  Qualific. → Reunião:        64%
  Reunião   → Venda:          29%
```

### 4.6 Simulador de Receita
```
Configure seu exército:
  SDR ativos:      [ 5  ]
  Closer ativos:   [ 2  ]
  Follow-up ativo: [ 1  ]
  Ticket médio:    [ R$ 2.400 ]
  Leads/dia:       [ 40  ]

Projeção mensal:
  Leads abordados:  ~1.200
  Qualificados:     ~276 (23%)
  Reuniões:         ~176 (64%)
  Vendas estimadas: ~51  (29%)
  Receita estimada: R$ 122.400 / mês

  ⚡ Com 3 agentes a mais → R$ 183.600 / mês
```

---

## 5. ARQUITETURA DE DADOS

### 5.1 Tabelas Implementadas (Migration 074 ✅)

```sql
-- Agentes comerciais
CREATE TABLE ai_agents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  name            text NOT NULL,
  avatar_icon     text,
  avatar_color    text,
  function_type   text NOT NULL CHECK (function_type IN
                    ('hunter','sdr','closer','followup','curator','supervisor')),
  tone            text DEFAULT 'consultivo',
  is_active       boolean DEFAULT true,
  -- Missão
  product_ids     uuid[],          -- referência ao portfólio
  niche           text,
  client_type     text,            -- 'low','medium','high' ticket
  -- Meta
  monthly_goal    integer,
  goal_metric     text DEFAULT 'meetings', -- leads|meetings|sales
  -- Território
  channels        text[],          -- ['whatsapp','instagram','email']
  lead_sources    text[],          -- ['inbound','crm','prospection']
  work_hours_start time DEFAULT '08:00',
  work_hours_end  time DEFAULT '22:00',
  timezone        text DEFAULT 'America/Sao_Paulo',
  -- Playbook
  playbook_id     uuid REFERENCES agent_playbooks(id),
  opening_script  text,
  escalate_rules  jsonb,           -- regras de escalada para humano
  -- Timestamps
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Portfólio de produtos/ofertas
CREATE TABLE agent_products (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  name            text NOT NULL,
  description     text,
  offer_type      text CHECK (offer_type IN
                    ('saas','service','infoproduct','affiliate',
                     'physical','subscription','consulting')),
  journey_type    text CHECK (journey_type IN
                    ('immediate','consultative','scheduling',
                     'checkout','reactivation')),
  price           numeric(10,2),
  commission_pct  numeric(5,2),
  link            text,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- Playbooks dos agentes
CREATE TABLE agent_playbooks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id),
  name            text NOT NULL,
  function_type   text,            -- qual função usa este playbook
  opening_scripts text[],          -- variações de abertura
  objection_map   jsonb,           -- { "sem tempo": "resposta...", ... }
  qualification_framework text DEFAULT 'bant', -- bant|spin|custom
  qualification_questions jsonb,   -- perguntas de qualificação
  escalation_triggers text[],      -- palavras/sinais para escalar
  created_at      timestamptz DEFAULT now()
);

-- Memória comercial por agente × lead
CREATE TABLE agent_lead_memory (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid NOT NULL REFERENCES ai_agents(id),
  lead_id         uuid NOT NULL REFERENCES leads(id),
  company_id      uuid NOT NULL REFERENCES companies(id),
  -- Estado comercial
  stage           text DEFAULT 'new', -- new|approached|responded|qualified|meeting|closed|lost
  interest_level  text,               -- low|medium|high
  detected_objections text[],
  presented_product_id uuid,
  last_action     text,
  next_action     text,
  next_action_at  timestamptz,
  -- Contadores
  approach_count  integer DEFAULT 0,
  followup_count  integer DEFAULT 0,
  -- Metadados
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(agent_id, lead_id)
);

-- Runs / execuções dos agentes
CREATE TABLE agent_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid NOT NULL REFERENCES ai_agents(id),
  lead_id         uuid NOT NULL REFERENCES leads(id),
  company_id      uuid NOT NULL REFERENCES companies(id),
  run_type        text,     -- approach|followup|qualification|escalation
  channel         text,
  input_text      text,     -- mensagem recebida
  output_text     text,     -- resposta gerada
  escalated_to    uuid,     -- profile_id do humano se escalou
  outcome         text,     -- responded|no_response|qualified|meeting|sale|escalated
  tokens_used     integer,
  created_at      timestamptz DEFAULT now()
);

-- Metas e performance (agregado por agente × período)
CREATE TABLE agent_performance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        uuid NOT NULL REFERENCES ai_agents(id),
  company_id      uuid NOT NULL REFERENCES companies(id),
  period_date     date NOT NULL,  -- dia da agregação
  leads_found     integer DEFAULT 0,
  approaches      integer DEFAULT 0,
  responses       integer DEFAULT 0,
  qualified       integer DEFAULT 0,
  meetings        integer DEFAULT 0,
  sales           integer DEFAULT 0,
  revenue         numeric(12,2) DEFAULT 0,
  PRIMARY KEY (agent_id, period_date)  -- upsert por dia
);
```

### 5.2 RPCs Implementadas (Migration 075 ✅)

```sql
-- Busca fila de leads pendentes para um agente
-- Atualizado para respeitar max_followups do agente
get_agent_lead_queue(p_agent_id uuid, p_limit int DEFAULT 20)

-- Upsert de memória comercial
upsert_agent_lead_memory(p_agent_id, p_lead_id, p_updates jsonb)

-- Agrega performance diária de todos os agentes da empresa
aggregate_agent_performance(p_company_id uuid, p_date date)

-- Retorna ranking dos agentes por período
get_agent_ranking(p_company_id uuid, p_start date, p_end date)

-- Simulação de receita
simulate_revenue(p_company_id uuid, p_config jsonb)
```

---

## 6. ARQUITETURA DE INTEGRAÇÃO (n8n)

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE UM AGENTE SDR                       │
│                                                                  │
│  Lead novo no CRM                                               │
│       ↓                                                          │
│  WF-06-AGENT-ROUTER                                             │
│  (scheduler a cada 5min)                                        │
│       ↓                                                          │
│  get_agent_lead_queue()  →  lista leads pendentes               │
│       ↓                                                          │
│  Para cada lead:                                                 │
│    WF-07-AGENT-EXECUTOR                                         │
│       ↓                                                          │
│    Busca memória (agent_lead_memory)                            │
│    Busca histórico de mensagens (últimas 8)                     │
│    Busca playbook do agente                                     │
│       ↓                                                          │
│    Monta contexto → OpenAI gpt-4o-mini                         │
│       ↓                                                          │
│    Detecta intenção da resposta:                                │
│      • continuar (SDR)                                          │
│      • escalar (Closer humano)                                  │
│      • registrar venda                                          │
│      • agendar follow-up                                        │
│       ↓                                                          │
│    Envia resposta via Evolution API (WhatsApp)                  │
│    Salva run em agent_runs                                      │
│    Atualiza agent_lead_memory                                   │
│    Upserta agent_performance (dia atual)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Workflows n8n previstos

| ID | Nome | Trigger | Função | Status |
|---|---|---|---|---|
| WF-01 | Recepção WhatsApp | Webhook | Roteamento inteligente (WF-05 ou WF-07) | ✅ Testado |
| WF-04 | Auto-close | Cron 5min | Encerra conversas inativas (thresholds usuário) | ✅ Ajustado |
| WF-05 | Agente IA Pipeline | Webhook | Fallback para leads sem agente atribuído | ✅ Ativo |
| WF-06 | Agent Router | Cron 5min | Distribui leads pendentes para agentes ativos | ✅ Testado |
| WF-07 | Agent Executor | Webhook | IA, resposta WhatsApp e avanço de pipeline | ✅ Testado |
| WF-08 | Agent Followup | Cron 1h | Envia follow-up quando `next_action_at` vence | ✅ Testado |

---

## 7. SISTEMA DE CONTEXTO DO AGENTE (Prompt Engineering)

Cada chamada ao OpenAI monta um contexto estruturado:

```
SYSTEM:
  Você é {agent.name}, um agente comercial especializado em {agent.function_type}.
  Tom: {agent.tone}.
  Produto que você representa: {product.name} — {product.description}
  Preço: R$ {product.price}
  Nicho: {agent.niche}

  Playbook:
  - Script de abertura: {playbook.opening_script}
  - Framework de qualificação: {playbook.qualification_framework}
  - Regras de escalada: {escalate_rules}

  Memória deste lead:
  - Estágio: {memory.stage}
  - Nível de interesse: {memory.interest_level}
  - Objeções detectadas: {memory.detected_objections}
  - Número de abordagens: {memory.approach_count}
  - Última ação: {memory.last_action}

USER: [últimas N mensagens do histórico da conversa]

ÚLTIMA MENSAGEM RECEBIDA: {current_message}

Responda de forma natural e humana.
Ao final da resposta, inclua em JSON:
{
  "next_stage": "...",
  "interest_level": "...",
  "action": "continue|escalate|schedule_followup|register_meeting",
  "followup_hours": 24
}
```

---

## 8. ESCALADA INTELIGENTE PARA HUMANO

A operação perfeita é **IA até o ponto certo + humano no momento certo**.

### Gatilhos de Escalada (configuráveis por agente)
- Lead demonstra interesse alto (detectado por IA)
- Ticket acima de valor configurado
- Lead pede explicitamente falar com humano
- Negociação complexa (desconto, contrato customizado)
- Número de follow-ups atingiu limite

### Fluxo de Escalada e Human Takeover ✅
```
Agente detecta gatilho ou humano assume conversa
    ↓
Status da conversa muda para 'waiting' ou 'in_progress'
    ↓
WF-07 verifica status (HTTP - Get Conv Status)
    ↓
Se status = 'in_progress', IA interrompe execução imediatamente
    ↓
Pausa automática do agente para este lead
    ↓
Notificação push + Badge âmbar na Sidebar (Realtime)
    ↓
Destaque "IA escalou → você" no ConversationItem
    ↓
Humano assume (histórico completo visível)
    ↓
Pode "Voltar para Agente" para retomar automação
```

---

## 9. PLANO DE IMPLEMENTAÇÃO — MVP PROGRESSIVO

> Princípio: **uma função que gera dinheiro primeiro, ecossistema depois.**

### FASE 1 — O Primeiro Agente (MVP)
**1 tipo de agente. Bem feito. Valor imediato.**

Agente SDR + Follow-up unificado:
- ✅ Aborda lead novo no CRM (inbound)
- ✅ Qualifica com perguntas
- ✅ Faz follow-up em leads parados há X dias
- ✅ Escala para humano com regras simples
- ✅ Tem meta, histórico e painel de performance

Entregáveis técnicos:
- [x] Migrations: `ai_agents`, `agent_playbooks`, `agent_lead_memory`, `agent_runs`, `agent_performance` (Migration 074 ✅)
- [x] RPCs: `get_agent_lead_queue`, `upsert_agent_lead_memory`, `aggregate_agent_performance`, `get_agent_ranking` (Migration 075 ✅)
- [x] Fixes Database: Correção de Leads órfãos e Links (Migrations 076 e 077 ✅)
- [x] n8n: WF-06 Agent Router (cron */5 min ✅)
- [x] n8n: WF-07 Agent Executor (testado V13 ✅)
- [x] n8n: WF-08 Agent Followup (testado end-to-end ✅)
- [x] n8n: WF-04 Auto-close (ajustado para 5 min ✅)
- [x] n8n: WF-01 V13 Agent Fork/Recepção (integrado ✅)

### FASE 2 — Múltiplos Tipos de Agente
- Agente Follow-up dedicado (reativação de leads frios)
- Agente Closer (recebe leads qualificados pelo SDR)
- Ranking entre agentes
- Transferência de lead entre agentes

### FASE 3 — Portfólio e Território
- Tabela `agent_products`
- Cada agente recebe produto específico
- Nicho + região + canal definidos
- Curador de Oferta (análise de conversão por produto)

### FASE 4 — Inteligência e Supervisão
- Agente Supervisor (monitora os outros)
- Sistema de recomendação de playbook
- Motor de sugestão de oferta por perfil de lead
- WF-09 Performance agregado + insights automáticos

### FASE 5 — Simulador e Ecossistema
- Simulador de receita
- Marketplace de ofertas (empresas publicam produtos)
- Rede de distribuição comercial
- Efeito rede

---

## 10. MODELO DE MONETIZAÇÃO

### Opção A — Por Agentes Ativos
```
Plano Starter:   3 agentes   — R$ 197/mês
Plano Growth:   10 agentes   — R$ 497/mês
Plano Scale:    25 agentes   — R$ 997/mês
Plano Enterprise: ilimitado  — sob consulta
```

### Opção B — Por Resultado (comissão)
Cobrança percentual sobre receita gerada por agentes.
Mais arriscado, mas muito mais alinhado com o cliente.

### Opção C — Híbrido (recomendado)
Base fixa por agente ativo + micro-comissão por venda fechada.

---

## 11. DIFERENCIAIS COMPETITIVOS

| O que o mercado vende | O que o NextSales entrega |
|---|---|
| CRM com IA | Força de vendas digital |
| Chatbot | Agente com meta e memória |
| Automação | Operação comercial autônoma |
| Dashboard | Central de Comando |
| Licença de software | Capacidade de gerar receita |

**A frase que muda de prateleira:**
> "Não preciso contratar 5 SDRs. Não preciso depender de vendedor humano para follow-up.
> Não preciso perder lead por falta de resposta."

---

## 12. RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Tentar construir tudo na Fase 1 | Alta | MVP rigoroso: 1 agente, 3 funções, 1 canal |
| Agente vira "papagaio sem contexto" | Média | Memória comercial obrigatória desde o início |
| Spam / agente agressivo | Média | Rate limiting por lead + regras de cooldown |
| Custo OpenAI descontrolado | Média | gpt-4o-mini + limite de tokens por run + cache |
| Escalada ignorada pelo humano | Baixa | Notificação push + badge no Inbox |
| LGPD / compliance | Média | Consentimento explícito no opt-in + data retention policy |

---

## 13. INTEGRAÇÃO COM MÓDULOS EXISTENTES

```
Pipeline ──────────── Agente recebe lead quando entra em coluna específica
                      Agente atualiza stage do lead automaticamente

Inbox Omnichannel ─── Conversas dos agentes aparecem no Inbox
                      Humano pode assumir qualquer conversa de agente
                      Badge visual diferencia mensagem de agente vs humano

Inbox Notification ── Alerta quando agente escala lead para humano

Automações ─────────── Trigger "agente qualificou lead" dispara automação
                       Trigger "agente fechou venda" dispara automação

Relatórios ──────────── Aba "Agentes" no Painel 360 (admin only)
                        Performance por agente, por função, por canal

Settings ────────────── Config de agente (quota, escalada, cooldown)
                        Chave OpenAI já existe (reutilizar)
```

---

## 14. HOOKS FRONTEND PREVISTOS

```typescript
// Lista e CRUD de agentes da empresa
useAgents()
  → agents, loading, createAgent, updateAgent, deleteAgent, toggleActive

// Fila de leads de um agente
useAgentQueue(agentId)
  → leads, loading, refetch

// Memória comercial de um lead por agente
useAgentLeadMemory(agentId, leadId)
  → memory, loading, updateMemory

// Performance agregada
useAgentPerformance(agentId, period)
  → performance, loading

// Ranking geral da empresa
useAgentRanking(period)
  → ranking, loading

// Portfólio de produtos
useAgentProducts()
  → products, createProduct, updateProduct, deleteProduct

// Playbooks
useAgentPlaybooks()
  → playbooks, createPlaybook, updatePlaybook
```

---

## 15. CHECKLIST DE PRÉ-REQUISITOS (antes de iniciar)

- [x] Módulo Omnichannel concluído e estável ✅
- [x] WF-05 AI Agent testado end-to-end (base da engine) ✅
- [x] Chave OpenAI configurada e funcionando ✅
- [x] Evolution API estável ✅
- [x] Decisão: canal inicial do Fase 1 será WhatsApp (via Evolution API) ✅

---

## 16. VISÃO DO PRODUTO EM 12 MESES

```
HOJE:          CRM + Pipeline + Inbox + Automações
+3 meses:      Primeiro agente SDR operando
+6 meses:      Múltiplos agentes, portfólio, ranking
+9 meses:      Inteligência comercial, supervisor, simulador
+12 meses:     Ecossistema com marketplace — rede de distribuição comercial

Posicionamento final:
"NextSales é o sistema operacional de vendas da sua empresa.
 Humans and AI, selling together."
```

---

## 17. MÓDULO PORTFÓLIO DE PRODUTOS

> Pilar 3 do ecossistema. O cliente cadastra o que vende. Os agentes escolhem o que oferecer.
> É aqui que o NextSales começa a se parecer com uma rede de distribuição comercial.

---

### 17.1 CONCEITO — TRÊS TIPOS DE OFERTA

```
┌────────────────────────────────────────────────────────────────┐
│               PORTFÓLIO DA EMPRESA                             │
├──────────────────┬───────────────────┬─────────────────────────┤
│  PRODUTO PRÓPRIO │  AFILIADO         │  PARCEIRO               │
│                  │                   │                         │
│  A empresa vende │  A empresa vende  │  Outra empresa usa      │
│  seu próprio     │  produto de        │  seus agentes para      │
│  produto         │  terceiro com      │  vender o produto       │
│                  │  link rastreado    │  dela (B2B2C)           │
│  Comissão: n/a   │  Comissão: % fixo │  Comissão: % negociado  │
│  Receita: total  │  Receita: comissão│  Receita: comissão      │
└──────────────────┴───────────────────┴─────────────────────────┘
```

- **Produto Próprio** — SaaS, serviço, consultoria, produto físico, infoproduto, assinatura
- **Afiliado** — o cliente cadastra um link de afiliado externo (Hotmart, Eduzz, próprio)
- **Parceiro** — outra empresa entra em acordo e os agentes do NextSales distribuem para ela

---

### 17.2 TELAS — ABA PORTFÓLIO

#### Tela Principal — Catálogo de Produtos
```
┌─────────────────────────────────────────────────────────────────┐
│  📦 Portfólio de Produtos                   + Adicionar Produto  │
├─────────────────────────────────────────────────────────────────┤
│  [ Todos ▼ ]  [ Tipo: Todos ▼ ]  [ Status: Ativo ▼ ]  🔍       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │ 🟦 NextSales CRM         │  │ 🟧 Curso Vendas B2B       │   │
│  │ Tipo: SaaS · Próprio     │  │ Tipo: Infoproduto         │   │
│  │ Preço: R$ 197/mês        │  │ Tipo: Afiliado            │   │
│  │ Comissão: —              │  │ Comissão: 40%             │   │
│  │                          │  │ Plataforma: Hotmart       │   │
│  │ Agentes usando: 4        │  │ Agentes usando: 2         │   │
│  │ Vendas este mês: 12      │  │ Vendas este mês: 5        │   │
│  │ Receita: R$ 2.364        │  │ Receita: R$ 1.120         │   │
│  │                          │  │                           │   │
│  │  [Editar]  [Agentes ▼]   │  │  [Editar]  [Agentes ▼]   │   │
│  └──────────────────────────┘  └──────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────┐  ┌──────────────────────────┐    │
│  │ 🟩 Consultoria Comercial  │  │ + Adicionar produto       │   │
│  │ Tipo: Serviço · Próprio  │  │                           │   │
│  │ Ticket: R$ 5.000+        │  │                           │   │
│  │ Jornada: Consultiva      │  │                           │   │
│  │ Agentes usando: 1        │  │                           │   │
│  │ Vendas este mês: 2       │  │                           │   │
│  └──────────────────────────┘  └──────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

#### Modal — Cadastrar Produto (wizard 4 etapas)

**Etapa 1 — Tipo de Oferta**
```
Que tipo de oferta você quer cadastrar?

  ○ Produto Próprio
    Você vende diretamente. Receita 100% sua.

  ○ Afiliado
    Você promove produto de terceiro via link rastreado.
    Recebe comissão por venda confirmada.

  ○ Parceiro Comercial
    Outra empresa te contrata para distribuir o produto dela.
    Comissão negociada separadamente.
```

**Etapa 2 — Identidade do Produto**
```
Nome do produto:      [ NextSales CRM — Plano Growth         ]
Descrição curta:      [ CRM com IA para equipes de vendas     ]
Categoria:            [ SaaS          ▼ ]

  Opções: SaaS · Serviço · Infoproduto · Produto Físico
          Assinatura · Consultoria · Afiliado · Outro

Tipo de jornada:      ○ Venda imediata
                      ● Consultiva (precisa de reunião)
                      ○ Agendamento antes da venda
                      ○ Recuperação de lead

Ticket médio:         R$ [ 2.400   ] / [ ano ▼ ]
```

**Etapa 3 — Configuração por Tipo**

*Se Produto Próprio:*
```
Link de checkout / landing page:
  [ https://nextsales.com.br/planos              ]

Argumentos de venda (o agente usa isso):
  [ ROI médio de 3x em 90 dias. Setup em 1 dia.  ]

Principais objeções e respostas:
  + Adicionar objeção
  "Já tenho CRM" → [ Entendo, mas o NextSales...  ]
  "É caro"       → [ O plano Growth custa menos...  ]
```

*Se Afiliado:*
```
Plataforma:    ○ Hotmart  ○ Eduzz  ○ Monetizze  ○ Kiwify  ● Outro

Link de afiliado:
  [ https://go.hotmart.com/X12345678Y             ]

Comissão (%):  [ 40  ] %
Prazo de cookie (dias): [ 30  ]

Como confirmar venda:
  ○ Webhook da plataforma  (recomendado)
  ○ Registro manual
  ○ Integração via API
```

*Se Parceiro:*
```
Empresa parceira:  [ TechCorp Soluções LTDA                  ]
Contato:           [ joao@techcorp.com.br                    ]

Comissão acordada: [ 25  ] %  por  ○ venda  ○ lead qualificado  ○ reunião

Contrato / acordo: [ anexar arquivo opcional ]

SLA de resposta:   [ 48  ] horas para confirmar venda
```

**Etapa 4 — Atribuição de Agentes**
```
Quais agentes podem vender este produto?

  ☑ Agente Atlas (SDR)
  ☑ Agente Vega (SDR)
  ☐ Agente Orion (Closer)   ← closers recebem depois da qualificação
  ☑ Agente Lyra (Follow-up)

Prioridade deste produto:
  ○ Alta — oferecer sempre que possível
  ● Média — oferecer se o perfil bater
  ○ Baixa — oferecer só se outros não se encaixarem

[ Salvar e Ativar Produto ]
```

---

### 17.3 LÓGICA DE SELEÇÃO DE PRODUTO PELO AGENTE

O agente não escolhe produto aleatoriamente. Existe uma hierarquia de decisão:

```
┌─────────────────────────────────────────────────────────────────┐
│               LÓGICA DE SELEÇÃO DE OFERTA                       │
│                                                                  │
│  1. Produto fixo no agente?                                     │
│     → SIM: usar sempre esse produto                             │
│     → NÃO: ir para regra 2                                     │
│                                                                  │
│  2. Perfil do lead bate com algum produto?                      │
│     (nicho × ticket × jornada × canal)                         │
│     → SIM: usar produto de maior match                          │
│     → NÃO: ir para regra 3                                     │
│                                                                  │
│  3. Produto com maior taxa de conversão no período              │
│     para o mesmo nicho/canal                                    │
│     → Usar o que o histórico mostra que funciona melhor         │
│                                                                  │
│  4. Fallback: produto com prioridade "Alta" da empresa          │
└─────────────────────────────────────────────────────────────────┘
```

Esse score é calculado por RPC e alimenta o contexto do agente antes de cada mensagem.

---

### 17.4 SCHEMA EXPANDIDO — PORTFÓLIO

```sql
-- Tabela principal de produtos (substitui/expande agent_products)
CREATE TABLE offer_catalog (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES companies(id),
  name                text NOT NULL,
  description         text,
  offer_type          text NOT NULL CHECK (offer_type IN
                        ('own','affiliate','partner')),
  category            text CHECK (category IN
                        ('saas','service','infoproduct','physical',
                         'subscription','consulting','other')),
  journey_type        text CHECK (journey_type IN
                        ('immediate','consultative','scheduling',
                         'checkout','reactivation')),
  -- Preço
  price               numeric(10,2),
  price_recurrence    text,          -- 'month','year','one_time','variable'
  -- Links e argumentos
  checkout_url        text,
  selling_arguments   text,          -- argumentos que o agente usa
  -- Afiliado
  affiliate_platform  text,          -- 'hotmart','eduzz','kiwify','other'
  affiliate_link      text,
  commission_pct      numeric(5,2),
  cookie_days         integer DEFAULT 30,
  sale_confirmation   text DEFAULT 'manual', -- 'webhook','manual','api'
  -- Parceiro
  partner_name        text,
  partner_contact     text,
  partner_commission_type text,      -- 'sale','qualified_lead','meeting'
  partner_sla_hours   integer DEFAULT 48,
  -- Controle
  priority            text DEFAULT 'medium' CHECK
                        (priority IN ('high','medium','low')),
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

-- Objeções mapeadas por produto
CREATE TABLE offer_objections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        uuid NOT NULL REFERENCES offer_catalog(id) ON DELETE CASCADE,
  company_id      uuid NOT NULL REFERENCES companies(id),
  objection_text  text NOT NULL,   -- "É caro"
  suggested_reply text NOT NULL,   -- resposta que o agente usa
  created_at      timestamptz DEFAULT now()
);

-- Vínculo agente × produto (quais agentes podem vender o quê)
CREATE TABLE agent_offer_assignment (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    uuid NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  offer_id    uuid NOT NULL REFERENCES offer_catalog(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES companies(id),
  is_primary  boolean DEFAULT false,  -- produto principal deste agente
  created_at  timestamptz DEFAULT now(),
  UNIQUE(agent_id, offer_id)
);

-- Rastreamento de conversão por produto/agente
CREATE TABLE offer_conversions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id        uuid NOT NULL REFERENCES offer_catalog(id),
  agent_id        uuid REFERENCES ai_agents(id),
  lead_id         uuid NOT NULL REFERENCES leads(id),
  company_id      uuid NOT NULL REFERENCES companies(id),
  conversion_type text NOT NULL CHECK (conversion_type IN
                    ('meeting','qualified_lead','sale')),
  revenue         numeric(10,2),
  commission      numeric(10,2),
  confirmed_at    timestamptz,
  confirmation_source text,        -- 'webhook','manual','api'
  external_ref    text,            -- ID da venda na plataforma afiliada
  created_at      timestamptz DEFAULT now()
);

-- Score de produto por nicho/canal (alimentado pelo WF-09)
CREATE TABLE offer_performance_index (
  offer_id        uuid NOT NULL REFERENCES offer_catalog(id),
  niche           text,
  channel         text,
  period_month    date NOT NULL,   -- primeiro dia do mês
  approaches      integer DEFAULT 0,
  conversions     integer DEFAULT 0,
  conversion_rate numeric(5,4),    -- calculado: conversions/approaches
  avg_revenue     numeric(10,2),
  updated_at      timestamptz DEFAULT now(),
  PRIMARY KEY (offer_id, period_month, niche, channel)
);
```

---

### 17.5 RASTREAMENTO DE CONVERSÃO DE AFILIADO

Vendas de afiliado precisam ser confirmadas externamente. Três fluxos:

**Fluxo A — Webhook da Plataforma (recomendado)**
```
Hotmart / Eduzz / Kiwify
       ↓
POST /api/affiliates/webhook
       ↓
Valida assinatura da plataforma
       ↓
Busca lead pelo email/telefone
       ↓
Insere em offer_conversions (confirmed_at = now())
       ↓
Atualiza agent_performance (revenue += commission)
       ↓
Notifica admin no Inbox ← "Venda confirmada via Hotmart — R$ 480"
```

**Fluxo B — Registro Manual**
```
Admin entra na tela de conversões
Clica em "+ Registrar venda"
Informa: lead, produto, valor, data
Sistema registra e atribui ao agente que trabalhava o lead
```

**Fluxo C — API Própria do Parceiro**
```
WF-09 (cron diário) consulta API do parceiro
Busca vendas confirmadas no período
Faz match por email/telefone com leads do CRM
Registra automaticamente
```

---

### 17.6 ENDPOINT BACKEND

```typescript
// api/offers/webhook.ts
// Recebe confirmação de venda de plataformas afiliadas

POST /api/offers/webhook
Headers: x-platform-signature, x-platform-name

Body (normalizado internamente):
{
  external_ref: "HP-123456",
  buyer_email: "joao@empresa.com",
  buyer_phone: "5511999999999",
  product_id: "abc123",          // ID externo na plataforma
  sale_value: 1200.00,
  commission_value: 480.00,
  confirmed_at: "2026-03-15T14:30:00Z"
}

Lógica:
1. requireAuth ou validar HMAC da plataforma
2. Buscar offer_catalog pelo external_id mapeado
3. Buscar lead pelo email ou telefone (dentro da company)
4. Buscar agente que estava trabalhando esse lead (agent_lead_memory)
5. Inserir offer_conversions
6. Upsert agent_performance do dia
7. Criar notificação para admin
```

---

### 17.7 TELA DE CONVERSÕES

```
┌──────────────────────────────────────────────────────────────────┐
│  💰 Conversões                          + Registrar Manualmente  │
├──────────────────────────────────────────────────────────────────┤
│  [ Este mês ▼ ]  [ Produto: Todos ▼ ]  [ Agente: Todos ▼ ]      │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  RESUMO DO MÊS                                                   │
│  Vendas confirmadas: 23   Receita total: R$ 47.200               │
│  Comissões pagas:    8    Comissão total: R$ 9.440               │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  Data       Lead           Produto          Agente   Receita     │
│  ─────────────────────────────────────────────────────────────   │
│  15/03  João Silva     NextSales Growth   Atlas   R$ 2.400 ✅   │
│  14/03  Maria Costa    Curso Vendas B2B   Vega    R$   480 ✅   │
│  14/03  Carlos Lima    Consultoria        Atlas   R$ 5.000 ✅   │
│  13/03  Ana Rocha      NextSales Starter  Lyra    R$ 1.200 🔄   │
│                                          (aguardando confirmação) │
└──────────────────────────────────────────────────────────────────┘
```

---

### 17.8 INTELIGÊNCIA DO CURADOR DE OFERTA

Com o `offer_performance_index` populado, o Agente Curador começa a trabalhar:

```
ANÁLISE SEMANAL — Curador de Oferta

Por nicho:
  Clínicas médicas     → Produto que mais converte: Consultoria (18%)
  Startups B2B         → Produto que mais converte: NextSales Growth (24%)
  E-commerce           → Produto que mais converte: Curso Vendas B2B (31%)

Por canal:
  WhatsApp             → ticket baixo converte mais (venda imediata)
  Email                → consultoria converte mais (jornada longa)

Recomendações automáticas:
  ⬆️  Agente Atlas: priorizar NextSales Growth para leads de Startups
  ⬇️  Agente Vega: reduzir push de Consultoria via WhatsApp (0% conversão)
  🔄  Considerar novo produto para nicho E-commerce (gap identificado)
```

Essas recomendações aparecem como cards na Central de Comando e podem ser aceitas com 1 clique.

---

### 17.9 HOOKS ADICIONAIS

```typescript
// Catálogo completo de ofertas
useOfferCatalog()
  → offers, loading, createOffer, updateOffer, deleteOffer, toggleActive

// Objeções de um produto
useOfferObjections(offerId)
  → objections, addObjection, removeObjection

// Vínculo agente × produto
useAgentOfferAssignment(agentId)
  → assignments, assign, unassign, setPrimary

// Conversões e receita
useOfferConversions(filters)
  → conversions, loading, registerManual, totalRevenue, totalCommission

// Performance por produto
useOfferPerformanceIndex(offerId, period)
  → index, loading, bestNiche, bestChannel, conversionRate
```

---

### 17.10 ROADMAP DO MÓDULO PORTFÓLIO

```
FASE 3A — Base (junto com Múltiplos Agentes)
  ✦ Cadastro de produto próprio
  ✦ Atribuição de produto ao agente
  ✦ Rastreamento manual de conversão
  ✦ Tela de conversões básica

FASE 3B — Afiliados
  ✦ Cadastro de afiliado com link rastreado
  ✦ Webhook de confirmação (Hotmart, Kiwify)
  ✦ Cálculo automático de comissão
  ✦ Notificação de venda confirmada

FASE 3C — Parceiros
  ✦ Cadastro de empresa parceira
  ✦ Termos e SLA
  ✦ Dashboard de performance por parceiro

FASE 4 — Inteligência
  ✦ offer_performance_index populado pelo WF-09
  ✦ Curador de Oferta ativo
  ✦ Recomendações automáticas para o gestor

FASE 5 — Marketplace
  ✦ Empresa publica oferta para toda a rede NextSales
  ✦ Qualquer empresa com agentes pode distribuir
  ✦ Efeito rede começa
```

---

*Skills utilizados na criação deste documento:*
`senior-architect` · `brainstorming` · `frontend-design` · `senior-backend` · `api-integration-specialist`
