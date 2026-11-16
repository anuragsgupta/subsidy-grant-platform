# Government Subsidy & Grant Disbursement Tracking System (GSDTS)

A full-stack application for managing government subsidy and grant disbursements.

## Project Structure

```
subsidy-grant-platform/
├── backend/        # Spring Boot 4.x REST API (Java 21)
│   ├── pom.xml
│   ├── mvnw
│   ├── src/
│   └── docs/       # requirements.md and design documents
│
├── frontend/       # React 19 + Vite + TypeScript SPA
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│
├── .gitignore
└── README.md
```

## Getting Started

### Backend

```bash
cd backend
cp .env.example .env        # fill in secrets
./mvnw spring-boot:run
```

The API will be available at `http://localhost:8080/api/v1`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI will be available at `http://localhost:5173`. API calls are proxied to the backend via Vite's dev server proxy.

## Requirements

See [`backend/docs/requirements.md`](backend/docs/requirements.md) for the full system specification.
