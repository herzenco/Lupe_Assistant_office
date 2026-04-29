"""Lupe Command Center — Dashboard API client.

Fire-and-forget HTTP client. Never blocks, never raises.
Failed payloads are queued to ~/.openclaw/workspace/dashboard-queue.jsonl
for later retry via flush_queue.py.
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import psutil
import requests

BASE_URL = os.environ.get("LUPE_DASHBOARD_URL", "http://localhost:3001")
API_KEY = os.environ.get("LUPE_DASHBOARD_KEY", "")
QUEUE_FILE = Path.home() / ".openclaw" / "workspace" / "dashboard-queue.jsonl"
TIMEOUT = 5


def _headers():
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }


def _now():
    return datetime.now(timezone.utc).isoformat()


def _enqueue(endpoint, payload):
    """Append a failed payload to the retry queue."""
    try:
        QUEUE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(QUEUE_FILE, "a") as f:
            f.write(json.dumps({
                "endpoint": endpoint,
                "payload": payload,
                "failed_at": _now(),
            }) + "\n")
    except Exception:
        pass  # Last resort — nothing we can do


def _post(endpoint, payload):
    """Fire-and-forget POST. Queue on failure."""
    try:
        r = requests.post(
            f"{BASE_URL}{endpoint}",
            json=payload,
            headers=_headers(),
            timeout=TIMEOUT,
        )
        if r.status_code >= 400:
            _enqueue(endpoint, payload)
            return r.json() if r.headers.get("content-type", "").startswith("application/json") else None
        return r.json()
    except Exception:
        _enqueue(endpoint, payload)
        return None


def _get(endpoint, params=None):
    """GET request. Returns parsed JSON or None."""
    try:
        r = requests.get(
            f"{BASE_URL}{endpoint}",
            params=params,
            headers=_headers(),
            timeout=TIMEOUT,
        )
        if r.status_code >= 400:
            return None
        return r.json()
    except Exception:
        return None


def _system_metrics():
    """Collect CPU, RAM, disk usage via psutil."""
    try:
        return {
            "cpu_pct": psutil.cpu_percent(interval=0.1),
            "ram_pct": psutil.virtual_memory().percent,
            "disk_pct": psutil.disk_usage("/").percent,
        }
    except Exception:
        return {}


def heartbeat(
    status="active",
    task=None,
    action_type=None,
    detail=None,
    tokens_in=None,
    tokens_out=None,
    cost_usd=None,
    model="claude-sonnet-4-6",
    session_type="main",
    integrations=None,
):
    """Push a heartbeat to the dashboard. Collects system metrics automatically."""
    from integration_checks import get_all

    payload = {
        "status": status,
        "session_type": session_type,
        "model": model,
    }

    if task is not None:
        payload["task"] = task
    if action_type is not None:
        payload["action_type"] = action_type
    if detail is not None:
        payload["detail"] = detail
    if tokens_in is not None:
        payload["tokens_in"] = tokens_in
    if tokens_out is not None:
        payload["tokens_out"] = tokens_out
    if cost_usd is not None:
        payload["cost_usd"] = cost_usd

    # System metrics
    payload.update(_system_metrics())

    # Integration checks
    if integrations is not None:
        payload["integrations"] = integrations
    else:
        try:
            payload["integrations"] = get_all()
        except Exception:
            pass

    return _post("/api/heartbeat", payload)


def log_action(action_type, summary, project_tag=None, session_id=None, timestamp=None):
    """Log a discrete business action."""
    payload = {
        "action_type": action_type,
        "summary": summary[:120],
    }
    if project_tag is not None:
        payload["project_tag"] = project_tag
    if session_id is not None:
        payload["session_id"] = session_id
    payload["timestamp"] = timestamp or _now()

    return _post("/api/actions", payload)


def log_cost(session_id, model, tokens_in, tokens_out, cost_usd):
    """Log cost data for a session."""
    return _post("/api/cost", {
        "session_id": session_id,
        "model": model,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost_usd": cost_usd,
    })


def log_session(
    session_id,
    channel,
    model,
    summary,
    transcript=None,
    token_count=None,
    cost_usd=None,
    started_at=None,
    ended_at=None,
):
    """Log a session transcript and summary."""
    payload = {
        "session_id": session_id,
        "channel": channel,
        "model": model,
        "summary": summary,
        "started_at": started_at or _now(),
    }
    if transcript is not None:
        payload["transcript"] = transcript
    if token_count is not None:
        payload["token_count"] = token_count
    if cost_usd is not None:
        payload["cost_usd"] = cost_usd
    if ended_at is not None:
        payload["ended_at"] = ended_at

    return _post("/api/session", payload)


def get_tasks(status=None, project_tag=None, priority=None):
    """Poll for tasks from the dashboard."""
    params = {}
    if status:
        params["status"] = status
    if project_tag:
        params["project_tag"] = project_tag
    if priority:
        params["priority"] = priority

    return _get("/api/tasks", params)


def update_task(task_id, status=None, add_note=None):
    """Update a task's status or add a note."""
    payload = {}
    if status is not None:
        payload["status"] = status
    if add_note is not None:
        payload["add_note"] = add_note
        payload["author"] = "lupe"

    if not payload:
        return None

    try:
        r = requests.patch(
            f"{BASE_URL}/api/tasks/{task_id}",
            json=payload,
            headers=_headers(),
            timeout=TIMEOUT,
        )
        if r.status_code >= 400:
            _enqueue(f"/api/tasks/{task_id}", payload)
            return None
        return r.json()
    except Exception:
        _enqueue(f"/api/tasks/{task_id}", payload)
        return None
