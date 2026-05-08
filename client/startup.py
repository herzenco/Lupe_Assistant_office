"""Send Lupe's startup heartbeat to the dashboard."""

import sys

from client import heartbeat, log_action


def main():
    heartbeat_result = heartbeat(
        status="active",
        action_type="session_start",
        task="OpenClaw worker online",
        detail="Lupe started and is connected to the dashboard",
        session_type="main",
    )

    if not heartbeat_result or not heartbeat_result.get("ok"):
        print("Startup heartbeat was queued or rejected.")
        print(f"Response: {heartbeat_result}")
        return 1

    log_action(
        action_type="other",
        summary="Lupe OpenClaw worker came online",
        project_tag="Herzen Co.",
    )

    print("Startup heartbeat sent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
