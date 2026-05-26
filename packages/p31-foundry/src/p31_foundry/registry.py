from __future__ import annotations

from collections.abc import Callable
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from p31_foundry.record import PipelineRunSummary


def get_pipelines() -> dict[str, Callable[..., "PipelineRunSummary"]]:
    from p31_foundry.pipelines import bundle_inventory, grant_scaffold, text_concat

    return {
        "bundle-inventory": bundle_inventory.run,
        "text-concat": text_concat.run,
        "grant-scaffold": grant_scaffold.run,
    }
