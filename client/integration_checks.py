"""Integration status checker for Lupe's environment."""

import os
import shutil
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


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


def _status(status, **extra):
    return {"status": status, "last_checked": _now(), **extra}


def _missing_tool(name):
    return _status("unknown", reason=f"{name} is not installed on this machine")


def check_clickup():
    token = (
        os.environ.get("CLICKUP_TOKEN_HERZEN")
        or os.environ.get("CLICKUP_TOKEN")
        or os.environ.get("CLICKUP_API_TOKEN")
    )
    if not token:
        return _status("unknown", reason="ClickUp token is not configured")
    try:
        request = urllib.request.Request(
            "https://api.clickup.com/api/v2/user",
            headers={"Authorization": token},
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            return _status("up" if response.status == 200 else "down")
    except urllib.error.HTTPError as error:
        return _status("up" if error.code == 200 else "down")
    except Exception:
        return _status("down")


def check_github():
    if not shutil.which("gh"):
        return _missing_tool("GitHub CLI")
    up = _run(["gh", "auth", "status"])
    return _status("up" if up else "down")


def check_google_calendar():
    if not shutil.which("gcalcli"):
        return _missing_tool("gcalcli")
    up = _run(["gcalcli", "list", "--nocolor"], timeout=10)
    return _status("up" if up else "down")


def check_google_drive():
    configured_path = os.environ.get("LUPE_GOOGLE_DRIVE_PATH")
    candidates = []
    if configured_path:
        candidates.append(Path(configured_path).expanduser())

    cloud_storage = Path.home() / "Library" / "CloudStorage"
    candidates.extend(cloud_storage.glob("GoogleDrive-*"))
    candidates.extend(cloud_storage.glob("GoogleDrive-*/My Drive"))

    for path in candidates:
        if path.is_dir() and os.access(path, os.R_OK):
            return _status("up", path=str(path))

    return _status("unknown", reason="Google Drive folder was not found")


def check_telegram():
    if not shutil.which("openclaw"):
        return _missing_tool("openclaw")
    up = _run(["openclaw", "gateway", "status"])
    return _status("up" if up else "down")


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
