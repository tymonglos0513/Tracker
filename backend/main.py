from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from pathlib import Path
import uuid
import json
import os
from datetime import datetime, timezone, timedelta
from dateutil import parser
import pytz
from dotenv import load_dotenv

load_dotenv()

AUTH_KEY = os.getenv("AUTH_KEY", "dev-secret-key")
ALLOWED_FRONTEND = os.getenv("ALLOWED_FRONTEND_URL", "http://93.127.142.20:3001/schedules/Ammar").rstrip("/")

DEFAULT_PORT = int(os.getenv("PORT", "8001"))
DATA_ROOT = Path(__file__).parent / "data"
SCHEDULES_ROOT = DATA_ROOT / "schedules"
DATA_ROOT.mkdir(parents=True, exist_ok=True)
SCHEDULES_ROOT.mkdir(parents=True, exist_ok=True)
RESUMES_ROOT = DATA_ROOT / "resumes"
RESUMES_ROOT.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Job Tracker API")


@app.middleware("http")
async def verify_api_key(request: Request, call_next):  
    try:
        key = request.headers.get("X-Auth-Key")
        referer = (request.headers.get("X-Frontend-Source") or "").rstrip("/")

        # --- 1️⃣ If auth key is correct → allow everything
        if key and key == AUTH_KEY:
            return await call_next(request)

        # --- 2️⃣ Otherwise, allow only from specific frontend URL
        if referer == ALLOWED_FRONTEND:
            return await call_next(request)

        # --- 3️⃣ Otherwise block
        return JSONResponse(
            status_code=403,
            content={"detail": f"Forbidden: Invalid auth key or referer ({referer})"},
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(e)}"},
        )

# CORS (frontend runs on :3001 by default)
origins = [
    "http://93.127.142.20:3000",
    "http://93.127.142.20:3000/",
    "http://93.127.142.20:3001",
    "http://93.127.142.20:3001/",
]
origins = [o for o in origins if o]  # remove blanks

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ApplicationIn(BaseModel):
    profile_name: str = Field(..., min_length=1)
    company_name: str = Field(..., min_length=1)
    job_link: str = Field(..., min_length=1)
    role_name: str = Field(..., min_length=1)
    resume: Dict[str, Any]

class ScheduleUpdateIn(BaseModel):
    profile_name: str
    company_name: str
    role_name: str
    job_link: str
    resumeid: str
    interview_stage: Optional[str] = None
    next_steps: Optional[str] = None
    passed: Optional[bool] = False
    status: Optional[str] = "waiting"
    interview_link: Optional[str] = None
    interview_datetime: Optional[str] = None
    assignee: Optional[str] = None
    duration: Optional[str] = None

def _ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)

CET = pytz.timezone("Europe/Warsaw")

def current_cet_time_str():
    return datetime.now(CET).strftime("%Y-%m-%d %H:%M:%S %Z")

def _date_str() -> str:
    return datetime.now(CET).strftime("%Y-%m-%d")

def parse_dt_safe(dt_str):
    """Safely parse datetime strings, assuming CET if not otherwise specified."""
    if not dt_str:
        return None
    try:
        # Normalize CET manually (Python’s strptime doesn’t recognize 'CET')
        if "CET" in dt_str:
            dt_str = dt_str.replace("CET", "").strip()
            dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M:%S")
            return CET.localize(dt)
        else:
            # Try ISO format or general parsing
            dt = parser.parse(dt_str)
            if not dt.tzinfo:
                dt = CET.localize(dt)
            return dt.astimezone(CET)
    except Exception as e:
        print("parse_dt_safe() failed:", e, "for", dt_str)
        return None

def save_resume_json(resume_obj: dict) -> str:
    """Save resume JSON and return UUID string."""
    resume_id = str(uuid.uuid4())
    path = RESUMES_ROOT / f"{resume_id}.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(resume_obj, f, ensure_ascii=False, indent=2)
    return resume_id

def load_resume_json(resume_id: str) -> dict:
    path = RESUMES_ROOT / f"{resume_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"Resume not found: {resume_id}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def save_applied_form(payload: ApplicationIn) -> dict:
    today = _date_str()
    profile_dir = DATA_ROOT / payload.profile_name
    _ensure_dir(profile_dir)
    day_path = profile_dir / f"{today}.json"

    # Structure:
    # {
    #   "Company A": {
    #       "Role 1": {"link": "...", "resume": {...}},
    #       "Role 2": {"link": "...", "resume": {...}}
    #   },
    #   "Company B": { ... }
    # }
    if day_path.exists():
        with day_path.open("r", encoding="utf-8") as f:
            day_obj = json.load(f)
    else:
        day_obj = {}

    company = payload.company_name
    role = payload.role_name
    if company not in day_obj:
        day_obj[company] = {}
    
    resume_id = save_resume_json(payload.resume)
    day_obj[company][role] = {
        "link": payload.job_link,
        "resumeid": resume_id
    }

    with day_path.open("w", encoding="utf-8") as f:
        json.dump(day_obj, f, ensure_ascii=False, indent=2)

    return {"saved_to": str(day_path), "date": today, "data": day_obj}

def schedules_path_for(profile_name: str) -> Path:
    return SCHEDULES_ROOT / f"{profile_name}.json"

def read_schedules(profile_name: str) -> List[dict]:
    p = schedules_path_for(profile_name)
    if not p.exists():
        return []
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)

def write_schedules(profile_name: str, items: List[dict]) -> None:
    p = schedules_path_for(profile_name)
    with p.open("w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

def upsert_schedule(
    profile_name: str,
    company_name: str,
    role_name: str,
    job_link: str,
    resumeid: str,
    interview_stage: Optional[str],
    next_steps: Optional[str],
    passed: Optional[bool] = False,
    status: Optional[str] = "waiting",
    interview_link: Optional[str] = None,
    interview_datetime: Optional[str] = None,
    assignee: Optional[str] = None,
    duration: Optional[str] = None
) -> dict:
    if interview_datetime:
        try:
            dt = datetime.fromisoformat(interview_datetime)
            if dt.tzinfo is None:
                cet_dt = CET.localize(dt)
            else:
                cet_dt = dt.astimezone(CET)
            interview_datetime = cet_dt.strftime("%Y-%m-%d %H:%M:%S %Z")
        except Exception:
            pass

    items = read_schedules(profile_name)
    # identify by company_name + role_name
    found = None
    for it in items:
        if it.get("company_name") == company_name and it.get("role_name") == role_name:
            found = it
            break

    if found is None:
        found = {
            "company_name": company_name,
            "role_name": role_name,
            "link": job_link,
            "resumeid": resumeid,
            "interview_stage": interview_stage,
            "next_steps": next_steps,
            "previous_steps": [],
            "status": status,
            "interview_link": interview_link,
            "interview_datetime": interview_datetime,
            "assignee": assignee,
            "duration": duration,
        }
        items.append(found)
    else:
        previous_steps = found.get("previous_steps", [])
        previous_interview_stage = found.get("interview_stage", "")

        if previous_interview_stage != "" and (len(previous_steps) == 0 or previous_interview_stage != previous_steps[-1]):
            previous_steps.append(previous_interview_stage)
        
        found.update({
            "link": job_link,
            "resumeid": resumeid,
            "interview_stage": interview_stage,
            "next_steps": next_steps,
            "previous_steps": previous_steps,
            "status": status,
            "assignee": assignee or found.get("assignee"),
            "duration": duration or found.get("duration"),
            "interview_link": interview_link or found.get("interview_link"),
            "interview_datetime": interview_datetime or found.get("interview_datetime")
        })

    write_schedules(profile_name, items)
    return {"schedules": items}

@app.post("/api/applications")
def create_application(payload: ApplicationIn):
    try:
        result = save_applied_form(payload)
        return {"ok": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/schedules")
def add_or_update_schedule(payload: ScheduleUpdateIn):
    try:
        result = upsert_schedule(
            profile_name=payload.profile_name,
            company_name=payload.company_name,
            role_name=payload.role_name,
            job_link=payload.job_link,
            resumeid=payload.resumeid,
            interview_stage=payload.interview_stage,
            next_steps=payload.next_steps,
            passed=payload.passed,
            status=payload.status,
            interview_link=payload.interview_link,
            interview_datetime=payload.interview_datetime,
            assignee=payload.assignee,
            duration=payload.duration
        )
        return {"ok": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/applied")
def get_applied(profile_name: str, date: Optional[str] = None):
    """Return all applied records for a profile, or by date if provided."""
    profile_dir = DATA_ROOT / profile_name

    if not profile_dir.exists():
        return {"ok": True, "data": {}, "profile_name": profile_name}

    # Single date mode
    if date:
        path = profile_dir / f"{date}.json"
        if not path.exists():
            return {"ok": True, "data": {}, "profile_name": profile_name, "date": date}
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return {"ok": True, "data": data, "profile_name": profile_name, "date": date}

    # All dates mode
    combined = {}
    for file in sorted(profile_dir.glob("*.json")):
        try:
            date_str = file.stem
            with file.open("r", encoding="utf-8") as f:
                obj = json.load(f)
                # Merge by company and role
                for company, roles in obj.items():
                    if company not in combined:
                        combined[company] = {}
                    combined[company].update(roles)
        except Exception:
            continue

    return {
        "ok": True,
        "data": combined,
        "profile_name": profile_name,
        "date": "all"
    }

@app.get("/api/schedules")
def get_schedules(
    profile_name: Optional[str] = None,
    date: Optional[str] = None,
    assignee: Optional[str] = None
):
    """Return all schedules, optionally filtered by profile_name, date, and assignee."""
    all_items = []

    def collect_profile_items(pname: str):
        path = SCHEDULES_ROOT / f"{pname}.json"
        if not path.exists():
            return []
        with path.open("r", encoding="utf-8") as f:
            try:
                items = json.load(f)
                for it in items:
                    it["profile_name"] = pname
                return items
            except Exception:
                return []

    # Collect data
    if profile_name:
        all_items = collect_profile_items(profile_name)
    else:
        for path in SCHEDULES_ROOT.glob("*.json"):
            pname = path.stem
            all_items.extend(collect_profile_items(pname))

    # Optional date filtering
    if date:
        filtered = []
        for it in all_items:
            dt = parse_dt_safe(it.get("interview_datetime"))
            if dt and dt.strftime("%Y-%m-%d") == date:
                filtered.append(it)
        all_items = filtered
    
    if assignee:
        assignee_lower = assignee.strip().lower()
        all_items = [
            it for it in all_items
            if it.get("assignee", "").strip().lower() == assignee_lower
        ]

    SAFE_MAX = datetime(9998, 12, 31, 23, 59, 59)
    all_items.sort(key=lambda x: parse_dt_safe(x.get("interview_datetime")) or CET.localize(SAFE_MAX))

    return {
        "ok": True,
        "data": all_items,
        "profile_name": profile_name or "all",
        "date": date,
        "assignee": assignee,
    }

@app.get("/api/resumes/{resume_id}")
def get_resume(resume_id: str):
    """Return saved resume JSON content."""
    try:
        path = RESUMES_ROOT / f"{resume_id}.json"
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"Resume not found: {resume_id}")
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return {"ok": True, "resume_id": resume_id, "resume": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/schedules")
def delete_schedule(
    profile_name: str = Query(...),
    company_name: str = Query(...),
    role_name: str = Query(...)
):
    """Delete a schedule item for given profile/company/role."""
    p = schedules_path_for(profile_name)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Profile schedule not found")
    with p.open("r", encoding="utf-8") as f:
        items = json.load(f)

    new_items = [
        it for it in items
        if not (it["company_name"] == company_name and it["role_name"] == role_name)
    ]
    if len(new_items) == len(items):
        raise HTTPException(status_code=404, detail="Schedule not found")

    with p.open("w", encoding="utf-8") as f:
        json.dump(new_items, f, ensure_ascii=False, indent=2)

    return {
        "ok": True,
        "deleted": {"company_name": company_name, "role_name": role_name},
        "remaining": len(new_items)
    }

# Convenience root
@app.get("/")
def root():
    return {"status": "running", "port": DEFAULT_PORT}
