#!/bin/bash
# ========================================
# Job Tracker Auto Start Script
# ========================================

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "========================================"
echo "🚀 Starting Job Tracker Project"
echo "========================================"
echo "Backend directory:  $BACKEND_DIR"
echo "Frontend directory: $FRONTEND_DIR"
echo ""

# --- Start backend ---
echo "▶️  Starting FastAPI backend on port 8001..."
cd "$BACKEND_DIR" || exit
if [ -d "venv" ]; then
  source venv/bin/activate
else
  echo "⚠️  Python virtual environment not found! (expected: backend/venv)"
  echo "    Please create one with: python3 -m venv venv"
  exit 1
fi
nohup uvicorn main:app --reload --host 0.0.0.0 --port 8001 > backend.log 2>&1 &
BACK_PID=$!
deactivate
cd "$ROOT_DIR" || exit
echo "✅ Backend started (PID: $BACK_PID)"
echo ""

# --- Start frontend ---
echo "▶️  Starting React frontend on port 3001..."
cd "$FRONTEND_DIR" || exit
nohup npm start > frontend.log 2>&1 &
FRONT_PID=$!
cd "$ROOT_DIR" || exit
echo "✅ Frontend started (PID: $FRONT_PID)"
echo ""

echo "========================================"
echo "🌐 Backend:  http://localhost:8001"
echo "🌐 Frontend: http://localhost:3001"
echo "========================================"
echo "Logs:"
echo "  Backend -> backend/backend.log"
echo "  Frontend -> frontend/frontend.log"
echo ""
echo "Use 'kill $BACK_PID $FRONT_PID' to stop them manually."
echo "========================================"
