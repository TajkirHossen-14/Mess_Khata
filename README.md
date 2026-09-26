<div align='center'>

# MessKhata 

**Smart Mess Management Platform**

</div>

A MERN-stack web application for managing shared student mess operations including meal tracking, expense splitting, billing, payments, notices, complaints, and duty roster management.

## Tech Stack

- **Backend:** Node.js + Express.js + Mongoose (MongoDB)
- **Frontend:** React (Vite) + React Router + Tailwind CSS
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **Language:** Plain JavaScript (ES modules)

## Local Run Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd MessKhata
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Configure environment variables**
   - Copy `.env.example` to `.env` in the `/server` directory
   - Set `MONGO_URI`, `JWT_SECRET`, and other required variables

5. **Run the backend**
   ```bash
   cd server
   npm run dev
   ```
   Server runs at `http://localhost:5000`

6. **Run the frontend**
   ```bash
   cd client
   npm run dev
   ```
   Client runs at `http://localhost:5173`

## Branch Strategy

- `main` — stable production-ready code
- `dev` — integration branch for merging features
- `feature/<name>` — per-task feature branches

## License

ISC
