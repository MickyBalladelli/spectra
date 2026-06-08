# Spectra

Real-time vector index management console for `turbovec`, PostgreSQL metadata, REST APIs, and Socket.io feedback loops.

## Layout

- `frontend`: Vite, React, Material UI dashboard
- `backend`: Express, Socket.io, PostgreSQL pool, Node-to-vector worker bridge
- `backend/workers`: local Python worker placeholder for vector ingestion and search

## Quick Setup

1. Copy `.env.example` to `.env`
2. Install dependencies with `npm install`
3. Create database and tables with `npm run db:setup`
4. Run app with `npm run dev`
