import requests
import json
from datetime import date

BASE = "http://localhost:8001"

def pretty(r):
    try:
        print(json.dumps(r.json(), indent=2))
    except Exception:
        print(r.text)

# --- 1. Create application (sends full resume JSON, backend saves it and returns resume_id) ---
app_payload = {
    "profile_name": "nikola",
    "company_name": "OpenAI",
    "job_link": "https://careers.openai.com/backend-engineer",
    "role_name": "Backend Engineer",
    "resume": {
        "summary": "Experienced backend developer skilled in FastAPI and cloud-native design.",
        "skills": ["Python", "FastAPI", "AWS", "Docker"]
    }
}

print("\n--- POST /api/applications ---")
r = requests.post(f"{BASE}/api/applications", json=app_payload)
pretty(r)