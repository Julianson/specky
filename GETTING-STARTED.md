# Specky SDD Ecosystem — Getting Started

> **Spec-Driven Development** é a prática de escrever especificações formais (em EARS notation) *antes* de escrever código. O Specky automatiza esse pipeline de 10 fases, garantindo rastreabilidade completa do requisito até o PR.

---

## Instalação em 1 comando

```bash
bash install.sh
```

O installer configura automaticamente:
- MCP server `specky-sdd` (npm global)
- 7 agentes Copilot → `.github/agents/`
- 7 comandos Claude Code → `.claude/commands/`
- 5 skills compartilhadas → `.specky/skills/`
- 10 hook scripts → `.specky/hooks/`
- 10 GitHub Actions → `.github/workflows/`
- 3 hook configs (Claude Code + Copilot CLI + VS Code)
- 19 prompts prontos → `.claude/prompts/` e `.github/prompts/`

---

## Como invocar o Specky

### Claude Code (slash commands)
```
/specky:greenfield        → Projeto novo do zero
/specky:brownfield        → Nova feature em sistema existente
/specky:migration         → Migração de sistema legado
/specky:api               → Design de API
/specky:status            → Status atual do pipeline
```

### VS Code + GitHub Copilot (@ agents)
```
@requirements-engineer    → Extrair FRD + NFRD
@sdd-init                 → Inicializar pipeline
@research-analyst         → Pesquisa e descoberta
@sdd-clarify              → Resolver ambiguidades
@implementer              → Gerar plano de implementação
@test-verifier            → Verificar cobertura de testes
@release-engineer         → Checklist de release e PR
```

---

## O Pipeline SDD — 10 Fases

```
[Pré-pipeline]
  requirements-engineer → Produz FRD.md + NFRD.md em docs/requirements/

[Fase 0] Init
  @sdd-init → Cria .specs/NNN-feature/ com CONSTITUTION.md

[Fase 1] Research
  @research-analyst → Escaneia codebase, importa docs, roda discovery → RESEARCH.md

[Fase 2] Clarify (opcional, mas recomendado)
  @sdd-clarify → Resolve ambiguidades em EARS, detecta contradições → CLARIFICATION-LOG.md

[Fase 3] Specify
  @spec-engineer → Escreve SPECIFICATION.md completa em EARS notation

[Fase 4] Design
  @design-architect → Arquitetura técnica, diagramas Mermaid, ADRs → DESIGN.md

[Fase 5] Tasks
  @task-planner → Quebra design em tarefas sequenciadas → TASKS.md

[Fase 6] Implement ← Sonnet 4.6, SEM extended thinking
  @implementer → Executa tarefas com checkpoints git automáticos

[Fase 7] Verify
  @test-verifier → Valida cobertura contra acceptance criteria da spec

[Fase 8] Review
  Hooks automáticos: drift-monitor, cognitive-debt-alert, metrics-dashboard

[Fase 9] Release ← Haiku 4.5
  @release-engineer → Gates de segurança (BLOCKING) + criação do PR
```

---

## Casos de Uso e Prompts Prontos

Os prompts abaixo estão em `.claude/prompts/` (Claude Code) e `.github/prompts/` (Copilot).
Copie, preencha os campos entre `[colchetes]` e envie.

---

### Início de Projeto

#### Greenfield — Projeto novo do zero
**Quando usar:** Você tem uma ideia ou brief e quer construir do zero.
**Prompt:** `/specky:greenfield` → `.claude/prompts/specky-greenfield.md`

```
Quero iniciar um projeto greenfield com o Specky SDD.
Projeto: Sistema de gestão de contratos
Descrição: Permite criar, assinar e monitorar contratos digitais
Stack prevista: Node.js + PostgreSQL + React
Prazo: MVP em 8 semanas
Compliance: LGPD
```
**O que acontece:** `requirements-engineer` → `sdd-init` → pipeline pronto para research.

---

#### Brownfield — Feature em sistema existente
**Quando usar:** Você tem um sistema rodando e quer adicionar uma feature nova sem quebrar nada.
**Prompt:** `/specky:brownfield` → `.claude/prompts/specky-brownfield.md`

```
Feature: Exportação de relatórios em PDF
Sistema existente: ERP Django + PostgreSQL em produção
Por que agora: Clientes enterprise solicitando
Restrições: Não pode impactar a API v2 existente
```
**O que acontece:** `sdd_scan_codebase` detecta stack → `requirements-engineer` considera restrições legadas → `sdd-init` inicializa com `project_type: brownfield`.

---

#### Migração / Modernização
**Quando usar:** Você precisa migrar de tecnologia ou reescrever um sistema legado.
**Prompt:** `/specky:migration` → `.claude/prompts/specky-migration.md`

```
Origem: API PHP 7.2 + MySQL 5.7
Destino: FastAPI + PostgreSQL + containers
Tipo: Strangler fig (migrar endpoint por endpoint)
Zero-downtime: sim
```

---

#### API Design
**Quando usar:** Você vai construir ou redesenhar uma API pública ou interna.
**Prompt:** `/specky:api` → `.claude/prompts/specky-api.md`

```
Nome: Payments API v2
Consumidores: App mobile + parceiros externos
Protocolo: REST
Autenticação: OAuth2 (client credentials para parceiros, PKCE para mobile)
SLA: 99.99%
```

---

### Por Fase do Pipeline

#### Fase 1 — Research
**Prompt:** `/specky:research` → `.claude/prompts/specky-research.md`

Exemplo de uso com documentos externos:
```
Feature ID: 002-payment-gateway
Documentos para importar: docs/vendor/stripe-integration-guide.pdf, transcripts/discovery-call.vtt
Perguntas abertas: "Precisa suportar PIX além de cartão?"
```

---

#### Fase 2 — Clarify
**Prompt:** `/specky:clarify` → `.claude/prompts/specky-clarify.md`

Exemplo quando a spec tem ambiguidades conhecidas:
```
Feature ID: 002-payment-gateway
Itens que me preocupam: REQ-002-PAY-003 fala em "confirmação imediata" mas
pagamento assíncrono pode demorar minutos. Isso precisa ser clarificado.
```

---

#### Fase 3 — Specify
**Prompt:** `/specky:specify` → `.claude/prompts/specky-specify.md`

Exemplo:
```
Domínios que DEVEM ser cobertos: Checkout, Reembolso, Notificações, Auditoria
Fora de escopo: Gestão de assinaturas recorrentes (será na v2)
```

---

#### Fase 4 — Design
**Prompt:** `/specky:design` → `.claude/prompts/specky-design.md`

Exemplo:
```
Restrições: Deve usar o Redis existente para sessões, deploy em AWS ECS
Padrões preferidos: Hexagonal Architecture
```

---

#### Fase 5 — Tasks
**Prompt:** `/specky:tasks` → `.claude/prompts/specky-tasks.md`

Exemplo:
```
Time: 3 devs
Sprint: 2 semanas
Paralelização: máxima — marcar [P] onde seguro
P0 (MVP): checkout básico com cartão. PIX é P1.
```

---

#### Fase 6 — Implement
**Prompt:** `/specky:implement` → `.claude/prompts/specky-implement.md`

Exemplo:
```
Tarefa: TASK-006-3: Implementar endpoint POST /payments
Ambiente: devcontainer com PostgreSQL local e Stripe test mode
```

---

#### Fase 7 — Verify
**Prompt:** `/specky:verify` → `.claude/prompts/specky-verify.md`

Exemplo:
```
Cobertura atual: 71% unit
Critérios que me preocupam: cenário de timeout do gateway (REQ-002-PAY-009)
```

---

#### Fase 9 — Release
**Prompt:** `/specky:release` → `.claude/prompts/specky-release.md`

Exemplo:
```
Branch: feature/002-payment-gateway
Target: main
Deploy: canary (10% → 50% → 100% em 24h)
Observability: dashboards no Grafana já configurados
```

---

### Casos Especiais

#### Extrair requisitos de um design Figma
**Quando usar:** O designer entregou um Figma e você quer transformar os fluxos em EARS requirements.
**Prompt:** `/specky:from-figma` → `.claude/prompts/specky-from-figma.md`

```
URL: https://figma.com/file/ABC123/Checkout-Flow-v2
Contexto: 4 telas — carrinho, endereço, pagamento, confirmação
O que ainda precisa definir: regras de frete, timeout de sessão, estados de erro da API
```

**Dica importante:** O Figma cobre happy paths. O Specky vai identificar automaticamente os edge cases não mapeados no design (erros, timeouts, estados vazios) e gerar perguntas para preenchê-los.

---

#### Transformar transcript de reunião em requisitos
**Quando usar:** Você teve uma reunião de discovery e quer extrair os requisitos do que foi discutido.
**Prompt:** `/specky:from-meeting` → `.claude/prompts/specky-from-meeting.md`

```
Arquivo: transcripts/sprint-planning-2026-04-13.vtt
Tipo: Discovery com stakeholder
Participantes: Ana (PO — decisão final), Carlos (CTO), time dev
Decisões que eu lembro: "PIX é P1, não MVP" e "deve integrar com o Stripe existente"
```

**O que acontece:** O Specky importa o transcript, extrai decisões vs. dúvidas, valida suas memórias contra o que foi realmente dito, e produz RESEARCH.md com tudo documentado.

---

#### Verificar drift entre código e spec
**Quando usar:** Passaram algumas semanas, houve mudanças de escopo, e você quer saber se o código ainda está alinhado com a spec.
**Prompt:** `/specky:check-drift` → `.claude/prompts/specky-check-drift.md`

```
Feature ID: 001-user-authentication
Motivo: Adicionamos rate limiting no sprint passado sem atualizar a spec
Arquivos que mudaram: src/auth/middleware.ts, src/auth/session.ts
```

---

#### Resolver conflito entre dois requisitos
**Quando usar:** Dois requisitos se contradizem e você precisa de uma decisão documentada.
**Prompt:** `/specky:resolve-conflict` → `.claude/prompts/specky-resolve-conflict.md`

```
REQ A: REQ-001-AUTH-007 — "Sessões expiram em 30 minutos de inatividade"
REQ B: REQ-001-AUTH-012 — "Usuários permanecem logados por 7 dias"
Hipótese: Talvez sejam para diferentes roles (admin vs. usuário comum)?
```

---

### Troubleshooting

#### Hook bloqueando o workflow
**Prompt:** `/specky:debug-hook` → `.claude/prompts/specky-debug-hook.md`

Problemas mais comuns:
| Sintoma | Provável causa | Solução rápida |
|---------|---------------|----------------|
| `security-scan.sh` bloqueando | String "api_key" em spec de exemplo | Renomear para `API_KEY_EXAMPLE` ou mover para comentário |
| `release-gate.sh` bloqueando | DESIGN.md faltando | Completar a Fase 4 antes do release |
| Hook não dispara | JSON inválido em settings.json | `cat .claude/settings.json \| python3 -m json.tool` |
| Hook não dispara no VS Code | Settings não recarregados | Ctrl+Shift+P → "Reload Window" |

---

#### Ver status do pipeline
**Prompt:** `/specky:status` → `.claude/prompts/specky-pipeline-status.md`

Use quando: Voltou de férias e não sabe onde a feature estava. Ou quer ver todas as features ativas de um time.

---

#### Retornar a uma fase anterior
**Prompt:** `/specky:reset-phase` → `.claude/prompts/specky-reset-phase.md`

**Quando usar:** Requisitos mudaram no meio da implementação. O Specky cria um snapshot git antes de qualquer retorno para que você não perca trabalho.

---

## Roteamento de Modelos por Fase

| Fase | Agente | Modelo | Thinking | Por quê |
|------|--------|--------|----------|---------|
| Pré / 0 | requirements-engineer / sdd-init | Opus 4.6 / Haiku 4.5 | Opus: sim / Haiku: não | Requirements = maior leverage; init = scaffolding puro |
| 1 | research-analyst | Sonnet 4.6 | Não | Síntese de informação, não raciocínio profundo |
| 2 | sdd-clarify | Opus 4.6 | Sim | Ambiguidade requer raciocínio profundo |
| 3 | spec-engineer | Opus 4.6 | Sim | Especificação é a fase mais crítica |
| 4 | design-architect | Opus 4.6 | Sim | Decisões arquiteturais têm impacto longo |
| 5 | task-planner | Sonnet 4.6 | Não | Decomposição estruturada, não raciocínio |
| 6 | implementer | Sonnet 4.6 | **Não** ⚠️ | arXiv:2502.08235: thinking na implementação = -30% qualidade, +43% custo |
| 7 | test-verifier | Sonnet 4.6 | Não | Verificação iterativa com feedback executável |
| 8 | (hooks automáticos) | — | — | drift-monitor, metrics, cognitive-debt |
| 9 | release-engineer | Haiku 4.5 | Não | Checklist mecânico, 0.33x custo |

---

## Hooks: O Que Fazem Automaticamente

Você não precisa chamar esses hooks — eles disparam sozinhos nos eventos certos.

| Hook | Quando dispara | O que faz |
|------|---------------|-----------|
| `security-scan.sh` ★ BLOCKING | Antes de criar PR / fim de sessão | Busca segredos em `.specs/` |
| `release-gate.sh` ★ BLOCKING | Antes de criar PR | Valida todos os artefatos existem |
| `spec-sync.sh` | Após Write/Edit em specs | Detecta drift entre artefatos |
| `auto-checkpoint.sh` | Após Write/Edit em specs | Cria commit git automático |
| `spec-quality.sh` | Após escrever spec | Score de qualidade EARS |
| `ears-validator.sh` | Após escrever spec | Valida notação EARS |
| `task-tracer.sh` | Após escrever tasks | Valida rastreabilidade REQ ↔ Task |
| `drift-monitor.sh` | Após análise cruzada | Código vs. spec comparison |
| `cognitive-debt-alert.sh` | Após análise cruzada | Alerta se spec ficou complexa demais |
| `metrics-dashboard.sh` | Após análise cruzada | Consolida métricas em dashboard.json |

---

## FAQ

**Q: Preciso usar todas as 10 fases?**
A: Não. Para features pequenas, você pode ir de Init → Specify → Tasks → Implement → Release. As fases Clarify, Design e Review são altamente recomendadas mas não bloqueantes. A Fase Research é obrigatória para projetos brownfield.

**Q: O que é EARS notation?**
A: Easy Approach to Requirements Syntax — 5 padrões de escrita de requisitos que eliminam ambiguidade:
- *Ubiquitous:* "The system shall..."
- *Event-driven:* "When [trigger], the system shall..."
- *State-driven:* "While [state], the system shall..."
- *Optional:* "Where [feature] is included, the system shall..."
- *Unwanted behavior:* "If [condition], then the system shall..."

**Q: Por que o hook de implementação SEM extended thinking?**
A: arXiv:2502.08235 demonstrou que extended thinking em fases de implementação reduz qualidade em 30% e aumenta custo em 43%. O thinking é reservado para fases de raciocínio (Clarify, Specify, Design) onde o custo-benefício é positivo.

**Q: Posso usar o Specky sem GitHub?**
A: Sim. Os agentes `.github/agents/` e workflows `.github/workflows/` requerem GitHub Copilot e GitHub Actions. Mas você pode usar apenas o Claude Code com os comandos `.claude/commands/` e os hooks `.specky/hooks/` sem nenhuma dependência do GitHub.

**Q: O Specky escreve o código por mim?**
A: O `@implementer` (Fase 6) gera planos detalhados de implementação, stubs de teste, e scaffolding de IaC. O código de produção é escrito pela ferramenta de AI do seu IDE (Claude Code, Copilot) seguindo o plano gerado pelo Specky. O Specky garante que o que é implementado corresponde exatamente ao que foi especificado.

---

## Próximos Passos

1. Execute `bash install.sh` no root do seu projeto
2. Comece com `/specky:status` para ver se há features ativas, ou
3. Use `/specky:greenfield` (projeto novo) ou `/specky:brownfield` (feature existente) para iniciar
4. Consulte este guia sempre que não souber qual prompt usar

Documentação completa: `INSTALL.md` | Hooks reference: `HOOKS-README.md` | Blueprint: `Specky_Plugin_Ecosystem_Blueprint_v1_0_0_2026-04-13.md`
