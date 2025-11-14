# Backend (FastAPI)

## Run (default port 8001)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```
Data is saved under `backend/data/`.
