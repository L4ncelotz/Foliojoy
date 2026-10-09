# Project Context - AI Portfolio Intelligence Platform

**Last updated:** 2026-10-09  
**Phase:** Product planning; no implementation confirmed.  
**Language preference:** Discuss with the product owner in Thai; technical docs may be written in English.

## Vision

Build a **public, multi-user AI-assisted investment portfolio website**. Users can import broker screenshots, images, PDF statements, CSV or Excel files, or enter positions/trades manually. The platform makes holdings and investment risk easy to visualize, and provides an AI assistant that can discuss allocation, hypothetical rebalancing, and an individual user's investment theses with traceable evidence.

The application must remain useful without AI: reliable imports, reconciled holdings, understandable dashboards, and deterministic analytics are the foundation. This is NOT a general chatbot, coding assistant, or game.

## How the idea emerged

The discussion began with a local NVIDIA RTX 2060 SUPER and which small open-weight LLMs could run on it. It evolved into RAG, knowledge memory, public AI products, and finally a specific user-facing investment portfolio product. Generic chatbot/game ideas were rejected as the main direction. Technology suggestions were later compared from first principles; existing familiarity with a specific web stack must not dictate the decision.

## Confirmed product direction

1. Public web application, not solely a personal/local prototype.
2. Import portfolios via image/screenshot, PDF, CSV/Excel and manual entry.
3. Detect missing or uncertain extracted fields, communicate them clearly, and allow editing/review.
4. Provide CSV templates and a website entry method when extraction fails or data is unavailable.
5. Create readable, interactive holdings/portfolio visualizations and portfolio analysis.
6. Include a chatbot able to answer portfolio questions and explore rebalance scenarios.
7. Allow users to submit and revise their own investment theses; bring those records into later AI responses.
8. Compare architectural alternatives on fit, not the developer's previous tools.

## Requirements vs recommendations

**Requirements:** above product behaviors, no fabricated financial fields, correct arithmetic, human review for imports, ownership of user data.

**Recommended (NOT FINAL):** React + TypeScript + Vite; Tailwind + shadcn/ui; Apache ECharts; FastAPI/Python; SQLAlchemy/Alembic; PostgreSQL; Python finance/doc processing; Ollama and a private GPU worker; pgvector when retrieval is needed; queue for long-running work.

**Not settled:** coverage of stock markets and assets, price-data source and commercial license, cost-basis approach, real-time vs delayed quotes, cloud budget, target users, hosting and subscription model, boundaries for personalized investment advice, exact model and OCR benchmark results.

## Two import types must be kept distinct

### Holdings snapshot

A dated observation of how much of each asset is held or what its current value is. For allocation, the system needs a sufficiently complete set of positions, a consistent valuation timestamp (or an explicit stale-data warning), and common-currency values. Purchase date/cost basis may be absent. A snapshot alone cannot reconstruct trades or trustworthy investment performance.

### Transaction history

Dated purchases, sales, contributions/withdrawals, fees, dividends and corporate actions (as supported). Supports reconstructing positions and calculating cost basis/P&L with a defined accounting policy. A broker screenshot may not contain the needed transaction details.

Missing fields must be surfaced. Never invent trade dates, prices, fees, quantities or portfolio values.

## Local hardware and inference constraints

- GPU: NVIDIA GeForce RTX 2060 SUPER, 8GB VRAM.
- System RAM: 20GB DDR4-2666.
- Candidate chat LLM: Qwen3 8B, Q4 quantization.
- Candidate image-capable model: Qwen3.5 4B Q4; alternate path is OCR/structured parsing first.
- Candidate embeddings: Qwen3 Embedding 0.6B.
- Runtime: Ollama.

These are candidates, not validated production choices. A text-only Qwen3 8B model does not directly process images. Loading multiple models concurrently may exceed VRAM. Queue inference, use short bounded contexts, benchmark real latency/accuracy, and keep the web app responsive when the GPU is offline.

## Product differentiation

The idea goes beyond importing screenshots into charts: each investor can track WHY they hold an asset (investment thesis), compare future evidence against that thesis, and review risk relative to a self-defined strategy. Retrieval/memory improves personalization from stored data; it does not automatically retrain model weights or prove that the model becomes inherently more intelligent.

## Desired next steps

Refine a testable PRD; decide initial asset coverage and market-data policy; create a normalized domain model; benchmark import OCR and Qwen inference on representative documents; implement import+review+dashboard before thesis-aware AI.
