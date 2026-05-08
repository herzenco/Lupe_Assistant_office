"""Replay failed dashboard payloads from the retry queue."""

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE_URL = os.environ.get("LUPE_DASHBOARD_URL", "http://localhost:3000")
API_KEY = os.environ.get("LUPE_DASHBOARD_KEY", "")
QUEUE_FILE = Path.home() / ".openclaw" / "workspace" / "dashboard-queue.jsonl"
TIMEOUT = 10


def _headers():
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }


def _send(method, endpoint, payload):
    request = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=json.dumps(payload).encode("utf-8"),
        headers=_headers(),
        method=method,
    )
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        response.read()
        return response.status


def flush():
    if not QUEUE_FILE.exists():
        print("Queue is empty — nothing to flush.")
        return 0

    with open(QUEUE_FILE, "r") as f:
        lines = f.readlines()

    if not lines:
        print("Queue is empty — nothing to flush.")
        QUEUE_FILE.unlink(missing_ok=True)
        return 0

    print(f"Flushing {len(lines)} queued entries...")
    failed = []
    delivered = 0

    for line in lines:
        line = line.strip()
        if not line:
            continue

        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        endpoint = entry.get("endpoint", "")
        payload = entry.get("payload", {})
        method = "PATCH" if "/api/tasks/" in endpoint and endpoint != "/api/tasks" else "POST"

        try:
            status = _send(method, endpoint, payload)

            if status < 400:
                delivered += 1
                print(f"  ✓ {endpoint}")
            else:
                failed.append(line)
                print(f"  ✗ {endpoint} — {status}")
        except urllib.error.HTTPError as e:
            failed.append(line)
            print(f"  ✗ {endpoint} — {e.code}")
        except Exception as e:
            failed.append(line)
            print(f"  ✗ {endpoint} — {e}")

    # Rewrite queue with only failed entries
    if failed:
        with open(QUEUE_FILE, "w") as f:
            for line in failed:
                f.write(line + "\n")
        print(f"\nDelivered {delivered}, {len(failed)} still queued.")
    else:
        QUEUE_FILE.unlink(missing_ok=True)
        print(f"\nAll {delivered} entries delivered. Queue cleared.")

    return len(failed)


if __name__ == "__main__":
    remaining = flush()
    sys.exit(1 if remaining > 0 else 0)
