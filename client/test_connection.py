"""Quick health check — sends a test heartbeat to the dashboard."""

import os
import sys

# Set defaults if not in env
if "LUPE_DASHBOARD_URL" not in os.environ:
    os.environ["LUPE_DASHBOARD_URL"] = "http://localhost:3000"
if not os.environ.get("LUPE_DASHBOARD_KEY"):
    print("Set LUPE_DASHBOARD_KEY before running this check.")
    sys.exit(1)

from client import heartbeat, _system_metrics

print(f"Dashboard URL: {os.environ['LUPE_DASHBOARD_URL']}")
print(f"API Key: ...{os.environ['LUPE_DASHBOARD_KEY'][-8:]}")
print()

# System metrics
metrics = _system_metrics()
if metrics:
    print(f"CPU: {metrics.get('cpu_pct', '?')}%")
    print(f"RAM: {metrics.get('ram_pct', '?')}%")
    print(f"Disk: {metrics.get('disk_pct', '?')}%")
    print()

# Send test heartbeat (skip integration checks on test)
print("Sending test heartbeat...")
result = heartbeat(
    status="active",
    task="Testing dashboard connection",
    action_type="session_start",
    detail="test_connection.py health check",
)

if result and result.get("ok"):
    print("✓ Connection successful!")
    sys.exit(0)
else:
    print("✗ Connection failed. Check URL and API key.")
    print(f"  Response: {result}")
    sys.exit(1)
