# Financial Data Warehouse

A bi-temporal data warehouse for financial market data. Pulls daily price history from six public market-data APIs, normalises their different response shapes into one record format, and stores it in MongoDB. You can ask not just "what was the price" but "what did we _know_ the price was, as of a given date." A Fastify REST API and an MCP server sit on top. A pair of Spark jobs roll the raw facts into yearly summaries and naive price predictions.

Built as a university data-warehousing project. The interesting parts are the warehouse mechanics — slowly-changing dimensions, idempotent fact ingestion, schema-on-read attribute discovery — rather than the trading.

## What's in the box

- **ETL pipeline** (`src/etl`) — extract from six providers, transform to a common shape, load into MongoDB. Extractors are pluggable behind a common `BaseExtractor`.
- **Six provider extractors** — Yahoo Finance, Alpha Vantage, Polygon, Twelve Data, CoinGecko (crypto), and Frankfurter (FX rates). Each speaks its own JSON dialect; each folds into the same `RawTimeSeriesPoint`.
- **Bi-temporal data model** (`src/dal`) — assets are versioned (SCD Type 2), exchange records are idempotent and year-partitioned.
- **REST API** (`src/api`) — Fastify with Swagger UI at `/docs`.
- **MCP server** (`src/mcp`) — exposes the warehouse to LLM agents over stdio.
- **Spark analytics** (`src/analytics`) — yearly aggregation and a price prediction job, run as containers.
- **A small dashboard** (`public/`) served straight off the API.

## How the data is modelled

Three collections do the real work:

| Collection        | Role              | The trick                                                                      |
| ----------------- | ----------------- | ------------------------------------------------------------------------------ |
| `assets`          | Dimension         | Points at its current version; soft-deleted, never dropped.                    |
| `assetversions`   | Dimension history | SCD Type 2 — each edit closes the old version (`validTo`) and opens a new one. |
| `exchangerecords` | Fact table        | Idempotent upsert keyed on `(assetId, providerId, timestamp, year)`.           |

Two key ideas:

**Asset versioning is bi-temporal.** When you update an asset, the repository doesn't overwrite it. It stamps `validTo` on the current version and writes a fresh one with `validTo` left open. `findAsOf(assetId, date)` answers what the asset looked like on any past date. The as-of listing in `findAll` reconstructs the whole dimension at a point in time. Deleting works the same way, with an `isDeleted` flag, so history is never destroyed.

**Fact ingestion is idempotent.** The ETL job re-fetches an overlapping window of dates every run. The same `(asset, provider, day)` shows up again and again. The exchange-record repository upserts on that key and bumps a `version` counter, so re-running ingestion updates rows in place instead of piling up duplicates. A unique compound index enforces it at the database level.

**The schema is discovered, not declared.** A stock gives you OHLCV, crypto gives you a single `price`, FX gives you a currency rate. Rather than force one schema, each provider accumulates the set of attribute keys it has been observed to emit (`discoveredAttributes`), unioned across every ingestion run. The Spark aggregation job filters to records that actually carry OHLC before averaging, so the mixed schemas don't poison the numbers.

## Getting started

### Prerequisites

- Node.js (ESM + native TypeScript via `tsx` — no build step needed to run)
- Docker (for MongoDB, Spark, and the test suite)

### Setup

```bash
npm install
cp .env.example .env   # fill in provider API keys you have; blank ones just skip auth
```

Bring up MongoDB (and the Spark cluster + mongo-express UI) with the infra compose file:

```bash
docker compose -f dwh-infra/docker-compose.yml up -d mongodb mongo-express
```

### Run it

```bash
npm run dev        # start the API at http://localhost:3000 (Swagger at /docs)
npm run ingest     # interactive ETL — pick a provider and symbol
npm run mcp        # start the MCP server on stdio
```

### Analytics

The Spark jobs run as containers against the same Mongo. See `dwh-infra/run-job.sh` and the compose file for the cluster. The jobs read from `exchangerecords` and write `analytics_results` / predictions back.

## Tests

The suite splits into two halves, both run by Vitest.

**Unit tests** (`tests/unit`) — pure, fast, no Docker. Mock `axios` and pin down the part of the extractors that's ours: how each provider's JSON gets shaped into a `RawTimeSeriesPoint`, how "no data" and rate-limit responses turn into errors, and how the error handler digs a readable message out of six different error envelopes.

**Integration tests** (`tests/integration`) — the repositories run against a real MongoDB spun up in Docker via [Testcontainers](https://testcontainers.com/). No mock for the database, because the behaviour under test _is_ database behaviour: the unique index, the upsert semantics, the `$or` validity-window queries. Each test starts from an empty warehouse; the container is shared across the run and torn down at the end.

```bash
npm test          # watch mode
npm run test:run  # single run (use this in CI)
```

> Integration tests need a working Docker daemon and will pull `mongo:6.0` on first run. The first invocation is slower than the rest.

## Project layout

```
src/
  api/          Fastify app, routes, Swagger
  analytics/    Spark jobs (aggregation, prediction) — Python
  config/       database connection
  dal/          models + repositories (the warehouse logic lives here)
  etl/          extract / transform / load
  mcp/          MCP server
  scripts/      ingestion CLI + seed data
  utils/        logger, axios error handler
tests/
  unit/         pure logic, axios mocked
  integration/  repositories against a real Mongo (Testcontainers)
  helpers/      Mongo container lifecycle
dwh-infra/      docker-compose, Spark image, job runner
public/         dashboard served by the API
```

## Conventions

- TypeScript runs directly through `tsx`; imports use explicit `.ts` extensions and the project is ESM (`"type": "module"`).
- Formatting is Prettier with `--print-width 120 --single-quote` (`npm run format`).
