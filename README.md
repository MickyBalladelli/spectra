# Spectra

Spectra is a document search console for teams that need to turn messy files into searchable knowledge.

It gives users one place to ingest documents, track indexing progress, inspect stored metadata, and search across indexed content with fast vector lookup. The goal is simple: make private document collections easier to explore without hiding what the system is doing.

## Value

- Upload documents and make them searchable.
- See ingestion progress in real time.
- Keep document metadata and vector embeddings together in PostgreSQL with pgvector.
- Search semantically, not only by exact keyword match.
- Inspect documents, chunks, latency, vector counts, and socket events from one dashboard.
- Work locally with a small stack that is easy to understand and extend.

## Features

- React dashboard with Overview, Ingest, Documents, Explorer, Search, and Console tabs
- Authenticated document ingestion
- Durable ingestion jobs with status history
- Real background ingestion worker backed by PostgreSQL job claiming
- Server-side upload parsing for text, Markdown, JSON, CSV, and PDF files
- Batch ingestion for multiple files
- Real-time ingestion status with Socket.IO
- Duplicate document detection by content hash
- Chunking, embedding, and pgvector indexing pipeline
- PostgreSQL document, chunk, and embedding storage
- Semantic search with optional metadata filters
- Highlighted matching words in search results
- Document list with delete actions
- Cluster stats for documents, vectors, compression, and latency
- Console view for socket and ingestion events
- pgvector health check and rebuild command

## Layout

- `frontend`: Vite, React, Material UI dashboard
- `backend`: Express, Socket.io, PostgreSQL pool, pgvector search, ingestion worker

## Quick Setup

1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Create database and tables with `npm run db:setup`
4. Run app with `npm run dev`

## Environment

- `DATABASE_URL`: main app database for users, documents, chunks, vectors, jobs, collections, and search audit.
- `LOG_DATABASE_URL`: optional observability database for request, job, worker, and error logs. Defaults to `DATABASE_URL` when empty.
- `UPLOAD_CLEANUP_MAX_AGE_HOURS`: uploaded temp folder age before cleanup.
- `UPLOAD_CLEANUP_INTERVAL_MS`: background cleanup interval.

## Maintenance

- Rebuild vectors from PostgreSQL chunks with `npm run vectors:rebuild -w backend`
- Run only the ingestion worker with `npm run worker -w backend`

## Turbovec

Spectra can use Turbovec as an optional compressed vector index while PostgreSQL stays the source of truth.

1. Install sidecar deps with `pip install -r backend/services/requirements-turbovec.txt`
2. Run the sidecar with `npm run turbovec:sidecar -w backend`
3. Set `VECTOR_SEARCH_BACKEND=turbovec`
4. Keep `TURBOVEC_DIM` equal to the embedding size. The current local embedding is `128`.

When Turbovec is unavailable, search falls back to pgvector.
