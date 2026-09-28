# MessKhata – Smart Mess Management Platform

A full-stack web application for managing shared student mess operations: meal tracking, expense splitting, billing, payments, notices, complaints, and duty rosters.

## Tech Stack

- **Backend:** Node.js + Express.js + Mongoose (MongoDB)
- **Frontend:** React (Vite) + React Router + Tailwind CSS
- **Auth:** JWT (jsonwebtoken + bcryptjs)

## Local Run Instructions

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas cluster (or local MongoDB instance)

### Server
```bash
cd server
cp .env.example .env
# Edit .env with your MONGO_URI and JWT_SECRET
npm install
npm run dev
```

### Client
```bash
cd client
npm install
npm run dev
```

## Branch Strategy

- `main` — stable production-ready code
- `dev` — integration branch for merging features
- `feature/<name>` — per-task feature branches
