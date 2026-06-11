# Spectra

Spectra is a document search console for teams that need to turn messy files into searchable knowledge.

It gives users one place to ingest documents, track indexing progress, inspect stored metadata, and search across indexed content with fast vector lookup. The goal is simple: make private document collections easier to explore without hiding what the system is doing.

## Value

- Upload documents and make them searchable.
- See ingestion progress in real time.
- Keep document metadata in PostgreSQL while vectors live in the local vector store.
- Search semantically, not only by exact keyword match.
- Inspect documents, chunks, latency, vector counts, and socket events from one dashboard.
- Work locally with a small stack that is easy to understand and extend.

## Features

- React dashboard with Overview, Ingest, Documents, Explorer, Search, and Console tabs
- Authenticated document ingestion
- Text, Markdown, JSON, CSV, and PDF file reading in the browser
- Batch ingestion for multiple files
- Real-time ingestion status with Socket.IO
- Duplicate document detection by content hash
- Chunking, embedding, and vector indexing pipeline
- PostgreSQL document and chunk metadata storage
- Local Python vector worker for upsert and search
- Semantic search with optional metadata filters
- Highlighted matching words in search results
- Document list with delete actions
- Cluster stats for documents, vectors, compression, and latency
- Console view for socket and ingestion events

## Layout

- `frontend`: Vite, React, Material UI dashboard
- `backend`: Express, Socket.io, PostgreSQL pool, Node-to-vector worker bridge
- `backend/workers`: local Python worker placeholder for vector ingestion and search

## Quick Setup

1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Create database and tables with `npm run db:setup`
4. Run app with `npm run dev`
