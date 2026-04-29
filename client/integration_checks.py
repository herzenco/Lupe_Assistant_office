"""Integration status checker for Lupe's environment."""

import os
import subprocess
from datetime import datetime, timezone


def _now():
    return datetime.now(timezone.utc).isoformat()


def _run(cmd, timeout=5):
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout
        )
        return result.returncode == 0
    except Exception:
        return False


def check_clickup():
    token = os.environ.get("CLICKUP_TOKEN_HERZEN")
    if not token:
        return {"status": "down", "last_checked": _now()}
    try:
        import requests
        r = requests.get(
            "https://api.clickup.com/api/v2/user",
            headers={"Authorization": token},
            timeout=5,
        )
        return {"status": "up" if r.status_code == 200 else "down", "last_checked": _now()}
    except Exception:
        return {"status": "down", "last_checked": _now()}


def check_github():
    up = _run(["gh", "auth", "status"])
    return {"status": "up" if up else "down", "last_checked": _now()}


def check_google_calendar():
    up = _run(["gcalcli", "list", "--nocolor"], timeout=10)
    return {"status": "up" if up else "down", "last_checked": _now()}


def check_google_drive():
    drive_path = os.path.expanduser(
        "~/Library/CloudStorage/GoogleDrive-lupe@herzenco.co/My Drive/"
    )
    up = os.path.isdir(drive_path) and os.access(drive_path, os.R_OK)
    return {"status": "up" if up else "down", "last_checked": _now()}


def check_telegram():
    up = _run(["openclaw", "gateway", "status"])
    return {"status": "up" if up else "down", "last_checked": _now()}


def get_all():
    return {
        "clickup": check_clickup(),
        "github": check_github(),
        "google_calendar": check_google_calendar(),
        "google_drive": check_google_drive(),
        "telegram": check_telegram(),
    }


if __name__ == "__main__":
    import json
    print(json.dumps(get_all(), indent=2))
