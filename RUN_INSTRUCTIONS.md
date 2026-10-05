# Digital Bridges of Nepal - CLEC Dashboard

This document provides instructions on how to start, stop, and manage the complete tech stack for the Digital Bridges of Nepal dashboard.

## Tech Stack Overview
1. **Frontend:** SolidJS & Vite (Runs on port 5173 / Node)
2. **Backend:** Rust & Axum with SurrealDB (Runs on port 3000 / Cargo)
3. **AI Agent:** Python & FastAPI with LangChain (Runs on port 8001 / Python)
4. **Database:** SurrealDB (Runs on port 8000)

---

## 🐳 Option 1: Run with Docker (Recommended)

The easiest way to run the entire stack is using Docker. It builds and orchestrates all three microservices simultaneously.

### 1. Start the Application
Make sure you are in the root directory (`/Users/kamran/Downloads/ngo/t1`) and you have exported your Gemini API key:
```bash
export GEMINI_API_KEY=your_gemini_api_key_here
docker-compose up --build
```
*Note: This will spin up the Frontend (`localhost:5173`), Backend (`localhost:3000`), and AI Agent (`localhost:8001`).*

### 2. Stop the Application
To shut down the docker containers gracefully, press `Ctrl + C` in the terminal where it is running, or run:
```bash
docker-compose down
```

---

## 💻 Option 2: Run Locally (Manual Setup)

If you prefer to run the components directly on your host machine without Docker, follow these steps:

You need to run three separate processes in your terminal. Open three terminal tabs in the root directory and run the following commands:

### 1. Start SurrealDB
You need to run SurrealDB in a separate terminal:
```bash
surreal start --user root --pass root file:surreal_data.db
```

### 2. Start the Rust Backend (Core API)
```bash
cd backend
cargo run
```

### 2. Start the AI Python Agent (Reports & Upload Parsing)
```bash
cd ai_agent
source venv/bin/activate
export GEMINI_API_KEY=your_gemini_api_key_here
python agent.py
```

### 4. Start the Frontend (UI Dashboard)
```bash
cd frontend
npm run dev -- --host
```

### Stopping Local Processes
To shut down the application, simply go to each of the three terminal tabs and press `Ctrl + C`. 

If you lose track of the processes and the ports remain bound, you can kill them manually:
```bash
lsof -ti:5173 | xargs kill -9   # Kill Frontend
lsof -ti:3000 | xargs kill -9   # Kill Backend
lsof -ti:8001 | xargs kill -9   # Kill AI Agent
```

---

## 📁 Project Structure
- `/frontend/` - Contains all UI code, routing, and styling (`App.tsx`, `index.css`).
- `/backend/` - Contains the Rust Axum server (`main.rs`).
- `/ai_agent/` - Contains the Python AI server for generative reports and excel parsing (`agent.py`).
- `/reports_out/` - The directory where the generated AI PDF reports are saved.
- `docker-compose.yml` - Orchestration file to run all environments via Docker.
