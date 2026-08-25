# PRD — Agentic Commerce Concierge
**Razorpay /buildathon — Track 01: AI Growth & Agentic Commerce**

---

## 1. One-liner
An AI sales agent that sits on a merchant's storefront, grows revenue by having a real (conversational) sales conversation with human shoppers, and simultaneously exposes an agent-readable interface so AI shopping agents can discover, evaluate, and buy from the same merchant — all on Razorpay test-mode APIs, with every money action explainable, bounded, and gated.

## 2. Problem
Merchants today can only "sell" to humans clicking through a UI. Two things are breaking that:
- Conversion loss: static product pages don't upsell, don't answer questions, don't negotiate.
- The next wave of buyers won't be human at all — AI shopping agents (via ACP/AP2/x402-style protocols) will browse and transact on a user's behalf, and most merchants have no machine-readable way to be "bought from."

## 3. Goal
Build one agent, two front doors:
1. **Human-facing**: conversational checkout widget that recommends, upsells, and completes payment.
2. **Agent-facing**: a structured API/catalog endpoint an external AI buyer agent can query and transact against, using the same backend, same guardrails, same audit trail.

## 4. Users
- **Merchant** (Razorpay's customer): wants more revenue, zero fraud/discount abuse risk, full visibility.
- **Human shopper**: wants fast, helpful, low-friction buying.
- **AI buyer agent** (simulated for demo): wants a structured, predictable way to query products and transact.

## 5. Core Features

### 5.1 Conversational Checkout (human-facing)
- Chat widget (React) embedded on a demo storefront.
- LLM-driven agent understands intent, recommends products, answers questions, initiates checkout.
- Hands off to Razorpay Checkout (test-mode) to collect payment.

### 5.2 Agent-Readable Catalog (machine-facing)
- REST endpoint (`/api/catalog`) returning structured product data: price, stock, attributes, upsell/bundle rules — designed for an AI buyer agent to parse without scraping HTML.
- A minimal `/api/agent-order` endpoint simulating an AI buyer completing a purchase against this catalog — demoing "merchant is transactable by an AI buyer end to end."

### 5.3 Upsell & Cross-sell Engine
- Agent tool `suggest_upsell(cart)` — LLM proposes a bundle/upgrade based on cart contents and merchant-defined rules.
- Every accepted upsell logged with reasoning.

### 5.4 Guardrail & Approval Layer ("The Bar")
- Hard-coded bounds: max discount %, max transaction value, max upsell attempts per session.
- Any action outside bounds → routed to a "pending approval" state instead of auto-executing.
- This is the most heavily judged part of the brief — build it visibly, not just functionally.

### 5.5 Audit Trail
- Every agent decision (recommend, discount, order, payment, refusal) logged to Postgres/NeonDB: timestamp, action, input, reasoning snippet, outcome.
- Simple timeline UI to review a session end-to-end — reuse the pattern you already built for TrackeTask.

### 5.6 Graceful Failure Handling
- One deliberately simulated failure path (declined payment or out-of-stock item) where the agent recovers — retries, offers an alternative, or cleanly hands off to a human — instead of erroring out.

## 6. Tech Architecture
- **Frontend**: React chat widget + minimal storefront demo page
- **Backend**: Node.js/Express — agent orchestrator, tool-calling layer
- **LLM**: GPT-4 (or available model) for reasoning; tool-calls only, no free-form money actions
- **Payments**: Razorpay test-mode APIs — Orders, Payments, Checkout
- **DB**: PostgreSQL/NeonDB — catalog, sessions, audit log
- **Deploy**: Docker, as usual for your builds

### Agent tools (function-calling)
| Tool | Purpose | Guardrail |
|---|---|---|
| `search_catalog` | Find/recommend products | Read-only |
| `suggest_upsell` | Propose bundle/upgrade | Max N per session |
| `apply_discount` | Apply % off | Hard cap, else → approval queue |
| `create_order` | Create Razorpay order | Max transaction value |
| `capture_payment` | Confirm payment | Logged always |

## 7. Success Metrics (for demo, not production)
- End-to-end human checkout completed via chat in < 2 min
- End-to-end AI-agent order completed against `/api/agent-order`
- At least 1 guardrail-triggered approval shown live
- At least 1 handled failure shown live
- Full audit trail visible for the session

## 8. Demo Script (3–4 min)
1. Human shopper chats → agent recommends → upsell offered → accepted → checkout via Razorpay test-mode.
2. Same catalog queried by a simulated AI buyer agent → completes a purchase via `/api/agent-order`.
3. Trigger a discount request beyond the cap → show it routed to approval instead of auto-approved.
4. Trigger a simulated payment failure → show graceful recovery.
5. Open the audit trail → walk through the session's decisions.

## 9. Out of Scope (for buildathon timeframe)
- Real ACP/AP2/x402 protocol implementation (simulate the AI-buyer interface instead)
- Multi-merchant support
- Production auth/security hardening
- Real payment capture (test-mode only)

## 10. Build Order (suggested)
1. Razorpay test-mode order/payment routes (Express)
2. Catalog schema + seed data (Postgres)
3. Agent orchestrator + tool-calling (LLM wired to the 5 tools)
4. Guardrail logic + approval queue
5. Audit log table + timeline UI
6. React chat widget on top
7. Agent-facing `/api/catalog` + `/api/agent-order` for the AI-buyer half
8. Failure-path simulation
9. Demo polish