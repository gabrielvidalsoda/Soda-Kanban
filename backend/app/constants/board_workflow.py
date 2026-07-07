from app.db.models import TaskStatus

DEFAULT_BOARD_LISTS: list[tuple[str, TaskStatus]] = [
    ("Backlog", TaskStatus.BACKLOG),
    ("Blocked", TaskStatus.BLOCKED),
    ("In Progress", TaskStatus.IN_PROGRESS),
    ("In Review", TaskStatus.IN_REVIEW),
    ("QA", TaskStatus.QA),
    ("Done", TaskStatus.DONE),
]

LIST_NAME_TO_STATUS: dict[str, TaskStatus] = {name: status for name, status in DEFAULT_BOARD_LISTS}

STATUS_TO_LIST_NAME: dict[TaskStatus, str] = {status: name for name, status in DEFAULT_BOARD_LISTS}


def status_for_list_name(name: str) -> TaskStatus | None:
    return LIST_NAME_TO_STATUS.get(name)


def list_name_for_status(status: TaskStatus) -> str | None:
    return STATUS_TO_LIST_NAME.get(status)
