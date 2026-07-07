import uuid

from app.db.models import Card
from app.schemas import AcceptanceCriterionItem, CardRead


def generate_task_code() -> str:
    return uuid.uuid4().hex[:8].upper()


def build_card_read(card: Card, dependency_ids: list[uuid.UUID] | None = None) -> CardRead:
    ids = dependency_ids
    if ids is None and hasattr(card, "depends_on_links"):
        ids = [link.depends_on_card_id for link in card.depends_on_links]
    ids = ids or []

    criteria_raw = card.acceptance_criteria or []
    criteria = [
        item if isinstance(item, AcceptanceCriterionItem) else AcceptanceCriterionItem.model_validate(item)
        for item in criteria_raw
    ]
    labels = list(card.labels or [])

    base = CardRead.model_validate(card)
    return base.model_copy(
        update={
            "dependency_ids": ids,
            "acceptance_criteria": criteria,
            "labels": labels,
        }
    )
