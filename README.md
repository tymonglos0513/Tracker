# Job Tracker (FastAPI + React)

Ports:
- Backend (FastAPI): **8001**
- Frontend (Vite React): **3001**

## Quickstart

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm start
```

Open http://localhost:3001
# Tracker
