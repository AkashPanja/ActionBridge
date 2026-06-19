STATUS_FLOW = {
    "received": ["pending_review"],
    "pending_review": ["approved", "rejected"],
    "approved": [],
    "rejected": [],
}


def validate_transition(current: str, next_status: str) -> bool:
    return next_status in STATUS_FLOW.get(current, [])


def get_next_states(current: str) -> list[str]:
    return STATUS_FLOW.get(current, [])


def can_edit(status: str) -> bool:
    return status in ("received", "pending_review")
