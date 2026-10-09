# Market-price & FX data provider research (for O-001 / O-002)

**Date:** 2026-10-09
**Status:** Research only. No vendor selected, no code changed.
**Scope:** Licensed quote/FX sources for Foliojoy, a public multi-user portfolio web app.
Current product state: USD-only holdings snapshots with **user-supplied values, no quote/FX provider
integrated** (see `README.md`, `docs/IMPLEMENTATION_STATUS.md`). Open questions O-001 (initial
securities/exchanges) and O-002 (vendor, refresh, redistribution rights) are in `docs/DECISIONS.md`.
The draft `prices` / `fx_rates` entity sketch (source, timestamps, adjustments, license constraints)
is in `docs/ARCHITECTURE.md` (proposed, not implemented).
PRD journey A requires: quote/FX timestamps shown, no invented prices, stale-data limits instead of
fictional precision (`docs/PRD.md`).

**Method:** claims below are taken from official provider pages fetched 2026-10-09, one source URL
per claim. Where a page was unreachable or rendered JS-only content, that is stated explicitly and
the figure is taken from a secondary source marked for re-verification. No pricing is fabricated.

**Headline finding:** every consumer/free tier reviewed **prohibits public display/redistribution**.
Showing any vendor's quotes to Foliojoy end users requires a paid display/redistribution entitlement
(Tiingo, Twelve Data, Massive/EODHD/Alpha Vantage business or commercial tier), even for delayed data.
Free tiers are usable only for internal prototyping, never for the public dashboard.

---

## 1. Candidate providers (6)

### 1.1 Tiingo — recommended EOD-first candidate

- **What it is:** US & Chinese equities/ETF/mutual-fund EOD composite API, plus IEX real-time,
  forex, crypto, news, fundamentals add-on.
  Source: https://www.tiingo.com/products/end-of-day-stock-price-data
- **Coverage / history:** 80,000+ tickers (US equities, ETFs, mutual funds, Chinese A-shares);
  60+ years of history back to 1962; composite of ~3 sources per feed with audited corrections.
  Source: https://www.tiingo.com/products/end-of-day-stock-price-data
- **Fields:** open, high, low, close, volume, dividend, splits — both raw and adjusted prices.
  Source: https://www.tiingo.com/products/end-of-day-stock-price-data
- **Refresh:** equities/ETFs ~5:30pm EST, mutual-fund NAVs ~12:00am EST, exchange corrections
  incorporated through ~8:00pm EST.
  Source: https://www.tiingo.com/products/end-of-day-stock-price-data
- **Free (Starter) limits:** $0/month; 500 unique symbols/month; 50 requests/hour; 1,000/day;
  1 GB/month bandwidth; 30+ years history; 5 years fundamentals.
  Source: https://www.tiingo.com/about/pricing
- **Paid internal tiers:** Power $30/month ($300/year, individual); Commercial internal $50/month
  ($499/year, business). Limits rise to 10,000–20,000 req/hour, 100,000–150,000 req/day.
  Source: https://www.tiingo.com/about/pricing
- **License — the critical constraint:** Starter, Power, and Commercial-internal plans are all
  **"Internal Use Only"**, defined on the pricing page as *"you may only use the data for your own
  personal use and you may not display or share the data with another person or organization."*
  Source: https://www.tiingo.com/about/pricing
- **Display/redistribution path (required for Foliojoy):** EOD + IEX redistribution is a separate
  Business product: **$250/month for startups / $500/month for enterprise**, includes EOD + IEX
  with 80,000–1,200,000 display-redistribution units and up to 1 TB.
  Source: https://www.tiingo.com/products/end-of-day-stock-price-data
- **API redistribution is not included** in self-serve plans: *"All data via the API is for internal
  consumption only… Redistribution is only available upon special request and permission, and comes
  with additional fees"*; any permitted redistribution must carry *"Data sourced by Tiingo"* attribution.
  Source: https://www.tiingo.com/tos (Section 7.3)
- **Storage restriction on free/trial:** Starter/Trial plans **may not persist Tiingo Data at all**
  — transient volatile-memory processing only, must delete after the operation/session; Derived
  Products are equally restricted on free plans.
  Source: https://www.tiingo.com/tos (Section 1.6(a))
- **Paid-plan retention:** persisted data must be deleted on expiry/cancel/downgrade; only
  Start-up/Enterprise/Institutional accounts (from $250/month) can negotiate retention exceptions;
  Power-plan exceptions are explicitly not offered.
  Source: https://www.tiingo.com/tos (Section 1.6(b)–(c))
- **Prohibited derived-output examples that matter for Foliojoy:** rebased/indexed single-security
  price paths (recoverable from one public price), P/E-style ratios combinable with public SEC
  figures, and validation/reconciliation of another dataset against Tiingo data are all prohibited
  substitutes unless under a written exception.
  Source: https://www.tiingo.com/tos (Section 1.6(c))
- **FX:** dedicated Forex API, 140+ pairs, 1-minute bars from Jan 2020, real-time REST + WebSocket,
  same plan/limits/licensing ladder as equities (internal-only on self-serve).
  Source: https://www.tiingo.com/products/forex-api
- **Fit for Foliojoy:** best EOD-first option (deep history, split/dividend-adjusted fields,
  explicit display-redistribution price). But: nothing may be shown publicly or cached until the
  display-redistribution entitlement is signed; free tier is prototype-only and non-persistent.

### 1.2 Twelve Data — multi-asset runner-up (stocks + FX + crypto, one API)

- **What it is:** single REST/WebSocket API for stocks, ETFs, forex, crypto, fundamentals, 100+
  technical indicators.
  Source: https://twelvedata.com (homepage product description)
- **Individual pricing (fetched 2026-10-09):** Basic free; Grow $79/month ($66 annual);
  Pro $229/month ($191 annual); Ultra $999/month ($832 annual). Page-visible monthly figures
  reported here. Note: the page's embedded schema data lists lower figures ($29/$99/$329),
  so re-verify at checkout before budgeting.
  Source: https://twelvedata.com/pricing
- **Free Basic limits/rights:** 8 API credits/minute, 800/day; **internal non-display usage only**;
  covers real-time US equities/ETFs, real-time forex, real-time crypto, reference data, indicators.
  Source: https://twelvedata.com/pricing
- **Paid individual adds:** Grow adds internal *display* (own-use display), real-time US stocks,
  EOD global equities/ETFs, fundamentals, no daily limits. Higher tiers add EU real-time, AU
  delayed, fixed income, mutual-fund NAV, add-ons.
  Source: https://twelvedata.com/pricing
- **Business pricing (external display — required for Foliojoy):** Venture **$499/month**
  ($414 annual, external display, 70+ markets); Enterprise **$1,099/month** ($912 annual, external
  distribution); Enterprise+ custom (white-label, custom exchange licenses).
  Source: https://twelvedata.com/pricing-business
- **License:** platform + data licensed for **Internal Use**; display to third parties,
  redistribution, or external display only as expressly authorized by subscription tier,
  Redistribution Rights Add-On, or written agreement; **free-tier data may not be used for
  commercial purposes**; exchange/third-party provider rules, fees, and audit duties pass through
  to the customer.
  Source: https://twelvedata.com/terms (Sections 2.1–2.4, 3.1–3.3)
- **Customer-side compliance burden is explicit:** *"Customer is solely responsible for ensuring
  their use of any accessed Data complies with all applicable licensing, fees, and regulations,
  including independently verifying requirements"*; third-party providers are third-party
  beneficiaries with enforcement rights.
  Source: https://twelvedata.com/terms (Sections 3.2(f)–(g), 14.11)
- **Fit for Foliojoy:** strongest single integration for later multi-asset/FX scope, and the
  Venture tier gives a flat-rate external-display path. But free/individual tiers cannot feed the
  public dashboard, and exchange pass-through obligations need legal review before launch.

### 1.3 Massive (rebranded Polygon.io) — US-tape depth, business-plan display

- **Rebrand note:** Polygon.io rebranded to Massive; API/keys unchanged.
  Source: secondary trackers consistently (e.g. https://tradingdatacompare.com/providers/polygon-io);
  **re-verify plan names/prices on https://massive.com/pricing — the official pricing page rendered
  JS placeholders ("Loading…") at fetch time and published figures below are secondary.**
- **Product:** tick-level US equities (trades, NBBO quotes, aggregates, snapshots), 32,000+ active +
  delisted tickers, history to 2003, REST + WebSocket + flat files + MCP.
  Source: https://massive.com/stocks
- **Delay ladder (official FAQ text):** free tier is end-of-day; Starter and Developer are
  15-minute delayed; Advanced and Business plans are real-time.
  Source: https://massive.com/stocks (FAQ: "Is the data real-time?")
- **Indicative individual prices (secondary, re-verify):** Basic $0 (5 calls/min, ~2 yrs history);
  Starter ~$29/month (15-min delayed); Developer ~$79/month (15-min delayed); Advanced ~$199/month
  (real-time); paid plans advertise unlimited calls. Per-asset-class billing (stocks/options/FX
  separate).
  Source: secondary (e.g. https://tradingdatacompare.com/providers/polygon-io,
  https://qveris.ai/guides/polygon-pricing-optimized); official page https://massive.com/pricing
  was not machine-readable at fetch time.
- **Individuals license:** personal, non-commercial, non-business use only; business/commercial use
  must use Business products.
  Source: https://massive.com/legal/individuals-terms-of-service (Section 2)
- **Business license (the Foliojoy path):** internal business use **plus display to Authorized Users
  or Edge Users** inside customer products/sites/apps, and derivative works that do **not** contain
  Information; redistribution as a data feed / machine-readable substitute is prohibited; customer
  must hold/obtain required Third-Party (exchange) Agreements; must show required attribution and
  delay labels; **training/fine-tuning/distilling ML/AI models on the Information is prohibited
  unless an Order Form expressly permits it** — directly relevant to Foliojoy's AI-assistant plans.
  Source: https://massive.com/legal/businesses-terms-of-service (Sections 2.2, 2.5, 6.1(d),(f),(g),(j))
- **Fit for Foliojoy:** best US tick-history depth and a clean self-serve → business upgrade story,
  but individual tiers are unusable for a public app, AI-training use needs an explicit Order Form
  clause, and current list prices must be re-confirmed.

### 1.4 Alpha Vantage — affordable licensed US data, narrowest free tier

- **Free tier:** 25 API requests/day (majority of datasets); unlimited requests for verified
  open-source/educational projects; larger volumes via premium.
  Source: https://www.alphavantage.co/support
- **Premium (official):** $49.99 / $99.99 / $149.99 / $199.99 / $249.99 per month for
  75 / 150 / 300 / 600 / 1,200 requests/minute; no daily limits; annual billing saves two months.
  Source: https://www.alphavantage.co/premium
- **Exchange-license position:** *"Realtime and 15-minute delayed US market data is regulated by
  the stock exchanges, FINRA, and the SEC. A data provider must be licensed by the exchanges"*;
  Alpha Vantage states it is a **Nasdaq-licensed provider** and warns that "free" real-time
  sources from unlisted vendors risk fines/penalties.
  Source: https://www.alphavantage.co/realtime_data_policy/
- **Entitlement split — key gotcha:** a premium API key alone does not entitle real-time/delayed
  US data. **Personal** use requires completing the data-entitlement flow in the Alpha X Terminal
  display portal; **business/commercial** use requires contacting Alpha Vantage for a data
  onboarding process (quoted, not self-serve).
  Source: https://www.alphavantage.co/premium ("IMPORTANT NOTE #1");
  https://www.alphavantage.co/realtime_data_policy/
- **License:** grant is for **personal, non-commercial use** unless otherwise agreed in writing;
  commercial-use criteria are defined in the ToS. (ToS page at
  https://www.alphavantage.co/terms_of_service/ returned PDF content not machine-fetchable;
  wording confirmed via search-rendered excerpt — re-verify the full ToS in a browser before
  contracting.)
- **Adjustment method (useful for lineage):** OHLCV adjusted by both splits and cash dividends
  (industry-standard); raw unadjusted option available on many endpoints.
  Source: https://www.alphavantage.co/support
- **Fit for Foliojoy:** credible low-cost licensed path for personal-use prototyping and a defined
  commercial onboarding route, but the 25/day free cap forces server-side caching design, and
  commercial display pricing is quote-based (no public number to budget against).

### 1.5 EODHD (EOD Historical Data) — global EOD breadth, personal-only list prices

- **List pricing (official):** Sandbox free; Historian EOD All-World **$19.99/month** ($199/year);
  EOD+Intraday **$29.99/month** ($299.90/year); Fundamentals **$59.99/month**; ALL-IN-ONE
  **$99.99/month**. Coverage advertised: 60+ exchanges, 150k+ tickers, 30+ years history.
  Source: https://eodhd.com/pricing ; https://eodhd.com
- **Free limits:** 20 API calls/day, past year of data, personal use.
  Source: https://eodhd.com/pricing ; https://eodhd.com/financial-apis/api-limits
- **Paid throughput:** every subscription plan starts at 100,000 API calls/day (raiseable).
  Source: https://eodhd.com/financial-apis/api-limits
- **License — list prices are personal-only:** *"The packages on the pricing page are intended for
  personal use only"*; commercial use needs a quoted commercial license (onboarding stated as fast
  as ~3 business days); commercial exchange-data users are reported to the exchanges.
  Source: https://eodhd.com/financial-apis/commercial-vs-personal-license-use
- **Professional vs private test:** follows exchange definitions — regulated individuals,
  institutions, businesses = professional/commercial.
  Source: https://eodhd.com/financial-apis/commercial-vs-personal-license-use
- **Fit for Foliojoy:** cheapest global-EOD entry for internal research, but no public list price
  for commercial display — requires a sales quote before any public use.

### 1.6 Stooq — excluded for commercial use (research/backtest only)

- **What it is:** free CSV downloads of daily OHLCV for ~21,000+ global securities/ETFs, plus FX,
  indices, commodities; no official API (URL/CSV pattern only).
  Source: secondary technical writeups (e.g. https://www.quantstart.com/articles/an-introduction-to-stooq-pricing-data);
  **primary pages https://stooq.com/db/ and https://stooq.com/terms.html returned empty/404 to the
  fetcher — re-verify in a browser.**
- **License (as rendered in search results of the official page):** *"This data is intended solely
  for personal use. Any commercial use is prohibited."*
  Source: https://stooq.com/db (via search-rendered excerpt; primary page not fetchable — must be
  re-verified before any reliance).
- **Verdict:** **do not use for Foliojoy** beyond personal back-of-envelope research. A public
  multi-user app displaying Stooq data would breach the personal-use-only term. No SLA, no API,
  no redistribution right, no adjustment documentation suitable for audit.

### 1.7 Ruled out: IEX Cloud, Yahoo scraping

- **IEX Cloud is dead:** announced May 31, 2024, fully discontinued August 31, 2024 to refocus on
  the core exchange business; all endpoints off. Do not design around it. (Tiingo's "IEX feed" is
  exchange data distributed by Tiingo, a different product.)
  Source: https://www.alphavantage.co/iexcloud_shutdown_analysis_and_migration ;
  https://www.tiingo.com/blog/iex-cloud-alternatives
- **Yahoo Finance scraping / unofficial wrappers (e.g. yfinance):** no official API, breaks without
  notice, legally grey for commercial use. Not a licensing basis for a public app.
  Source: industry consensus (e.g. https://blog.stackademic.com/stock-price-api-best-free-vs-paid-options-2026-82370a377819);
  Yahoo's own terms prohibit scraping — verify directly if ever reconsidered. **Not recommended.**

---

## 2. FX lane (for post-USD-MVP multi-currency)

Foliojoy is USD-only today, so FX is deferred — but the FX choice is easier than equities because
authoritative **free, redistributable** official sources exist for reference rates:

- **ECB euro reference rates (primary, free):** daily concertation ~14:10 CET, published ~16:00 CET
  working days, all currencies quoted vs EUR; *"published for information purposes only. Using the
  rates for transaction purposes is strongly discouraged."* Suitable as the app's documented FX
  reference once non-USD holdings arrive; store the as-of date and the information-only caveat.
  Source: https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html
- **Frankfurter API (open-source ECB wrapper):** free public API at `api.frankfurter.dev`, no key,
  self-hostable, daily ECB-based rates (v2 now aggregates 84 central banks / 201 currencies back to
  1948 per its docs); FAQ states free for commercial use subject to each underlying provider's
  terms. Good operational choice: self-host or cache daily to avoid third-party dependency.
  Source: https://frankfurter.dev
- **US Federal Reserve FRED API (primary, free key):** free with API key; FX series (e.g. DEXUSEU)
  available, but **per-series copyright applies** — *"Data series… may be owned by third parties…
  Before using data series owned by third parties for anything other than your own personal use,
  you must contact the data owner"*; apps must show *"This product uses the FRED® API but is not
  endorsed or certified by the Federal Reserve Bank of St. Louis."*
  Source: https://fred.stlouisfed.org/docs/api/terms_of_use.html
- **Commercial intraday FX** (if the app later needs it): same vendor as equities (Twelve Data
  real-time FX even on free-internal tier; Tiingo Forex API; Massive currencies product) — inherits
  that vendor's display-license requirement.
  Sources: https://twelvedata.com/pricing ; https://www.tiingo.com/products/forex-api ;
  https://massive.com (currencies product page, verify)

---

## 3. Comparison matrix (public-display use case)

| Provider | Cheapest self-serve | Free-tier delay / cap | Public display allowed? | Display/redistribution path | US stock/ETF EOD fit | FX fit |
|---|---|---|---|---|---|---|
| Tiingo | $0 → $30 / $50 mo internal | EOD; 25→1,000/day equiv. (500 symb/mo, 50/hr) | **No** on self-serve | **$250 mo startup / $500 mo enterprise** (EOD+IEX display) | Best: 60+ yr, adj+raw, corrections to 8pm ET | Tiingo Forex, same ladder |
| Twelve Data | $0 → $79 mo individual | Real-time US on free but non-display; 8/min, 800/day | **No** on free/individual | **Venture $499 mo** external display; Enterprise $1,099 mo | Good: global, EOD+intraday, fundamentals | Real-time FX in same API |
| Massive (ex-Polygon) | $0 → ~$29 mo (re-verify) | Free EOD; paid delayed 15-min → real-time $199 tier (secondary) | **No** on individual | Business plan (display to Edge Users; price: verify) | Best US tick depth (2003+, delisted kept) | Separate currencies product |
| Alpha Vantage | $0 → $49.99 mo | 25/day free; delayed/real-time = entitlement-gated | **No** (personal non-commercial) | Commercial onboarding (quoted) | Good: Nasdaq-licensed, split/div-adjusted | FX endpoints, same ToS |
| EODHD | $0 → $19.99 mo | 20/day free, past-yr only | **No** (list = personal) | Commercial quote (~3-day onboarding) | Best global breadth/price for research | FX/commodities included |
| Stooq | Free CSV | EOD-ish, no API | **Prohibited commercially** | None | Excluded | Excluded |

---

## 4. Recommendation

### 4.1 First-market scope (answers O-001, proposed)

**US stocks + US-listed ETFs first, EOD only.** Rationale: every candidate covers this segment;
corporate-action handling (splits/dividends) is documented; exchange licensing is simplest
(single-country consolidated tape + Nasdaq-licensed vendors); PRD edge cases (duplicate tickers
across exchanges, delisted/renamed securities) are still tractable in one market. Defer non-US
exchanges, mutual funds, options, intraday/real-time, and non-USD FX conversion to later phases
with their own licensing review.

### 4.2 Provider path (answers O-002, proposed)

1. **Now (no new license, no new risk):** stay on user-supplied snapshot values. Do not display any
   vendor data, cached or otherwise, on any public page — all free tiers forbid it, and Tiingo's
   free tier additionally forbids *any* persistent storage.
2. **First integration (delayed EOD, display-licensed):** contract **one** of —
   (a) **Tiingo EOD + IEX display redistribution ($250/month startup)** for deepest US EOD history
   with documented adjustment semantics, or (b) **Twelve Data Venture ($499/month)** if single-API
   stocks+FX+global breadth outweighs history depth, or (c) **EODHD commercial quote** if global
   exchange breadth matters most. Get the display entitlement in writing before showing a single
   price to end users.
3. **Real-time/delayed-intraday later:** only on explicit demand with exchange pass-through budget
   (Massive Business, Twelve Enterprise, or Alpha Vantage commercial onboarding). Never imply live
   pricing from EOD/delayed feeds.
4. **FX now (free, no vendor negotiation):** when multi-currency lands, source reference FX from
   **ECB daily fixings via a self-hosted Frankfurter instance or direct ECB feed**, with FRED as
   the USD-centric cross-check — all with stored as-of timestamps and information-only labeling.

### 4.3 License-safe display rules (mandatory for any vendor data)

- Show **every** price with: vendor name, `as-of` timestamp + timezone, delay class badge
  (**EOD / 15-min delayed / reference — never "live"** unless on a real-time entitlement),
  and raw-vs-adjusted state.
- Attribution line where the contract requires it (e.g. *"Data sourced by Tiingo"* with link;
  FRED disclaimer verbatim).
- Never expose bulk download, CSV export of vendor series, API passthrough, or cached-series
  endpoints to end users — all reviewed contracts treat these as prohibited redistribution /
  substitute products.
- Never train, fine-tune, or distill AI models on vendor data unless the Order Form expressly
  permits it (Massive Business ToS prohibits it by default; assume the same posture for others).
- Never use vendor data to "validate" or backfill another dataset (prohibited substitute use under
  Tiingo ToS §1.6(c)).
- Stale-data behavior per PRD journey A: if the quote is older than the snapshot valuation date
  policy (to be defined, e.g. prior close), show an explicit **stale-data warning** and withhold
  derived metrics rather than computing on mismatched timestamps.
- Honour deletion-on-expiry clauses (Tiingo paid plans) in the data-retention design: vendor
  series must be deletable per-contract without destroying user-owned snapshots/derived
  aggregates that satisfy the contract's derived-product test — get written confirmation of what
  survives termination.

---

## 5. What the app must store per quote (lineage/audit minimum)

For each row in the future `prices` / `fx_rates` tables (`docs/ARCHITECTURE.md` sketch), persist:

| Field | Why |
|---|---|
| `source` (vendor + product, e.g. `tiingo/eod`) | license maps to product, not vendor |
| `vendor_symbol` + `exchange`/`mic` | PRD duplicate-ticker-across-exchanges edge case |
| `asof_ts` + `asof_tz` (exchange timestamp) | display + staleness logic |
| `received_ts` (ingest time, UTC) | lag/freshness audit |
| `price` (+ `currency`) as Decimal with precision | deterministic finance layer rule |
| `ohlcv_json` (o/h/l/c/v as supplied) | full bar, not just close |
| `adjustment` enum (`raw` \| `split_adj` \| `split_div_adj`) + `adjustment_factor` / event refs | split/dividend lineage; vendors differ |
| `delay_class` (`eod` \| `delayed_15m` \| `realtime` \| `reference_fx`) | badge + entitlement proof |
| `license_ref` (contract/order-form ID + entitlement) | redistribution audit |
| `fetch_job_id` + `vendor_request_id` | reproducibility |
| `is_stale` / `stale_reason` | PRD journey A acceptance evidence |
| `raw_payload_hash` | tamper-evidence without retaining prohibited bulk payloads |

FX rows additionally store `base_ccy`, `quote_ccy`, `rate_type` (`ecb_fixing` / `vendor_intraday`),
and the information-only caveat flag for ECB-sourced rates.

---

## 6. Open verification steps before contracting

- [ ] Re-open https://stooq.com/terms.html and https://stooq.com/db/ in a browser (fetcher got
      empty/404) to confirm the personal-use-only term verbatim.
- [ ] Re-confirm Massive list prices and Business display terms on https://massive.com/pricing
      (JS-rendered at fetch time; figures above are secondary).
- [ ] Resolve Twelve Data's page-visible ($79/$229/$999) vs schema ($29/$99/$329) individual-price
      discrepancy at checkout; confirm Venture external-display scope covers per-user portfolio
      valuation display.
- [ ] Read Alpha Vantage ToS full text in a browser (PDF at
      https://www.alphavantage.co/terms_of_service/) and get commercial-display pricing in writing.
- [ ] Get EODHD commercial quote and exchange-reporting duties for a public portfolio app.
- [ ] Confirm with counsel: exchange pass-through fees/audits (Nasdaq Data Link terms model:
      https://data.nasdaq.com/terms — internal-only default, order-form expansion) for the chosen
      vendor's US data.
- [ ] Record the selected vendor + entitlement as a CONFIRMED decision in `docs/DECISIONS.md`
      (closing O-002) with contract ID, delay class, and refresh SLA.
