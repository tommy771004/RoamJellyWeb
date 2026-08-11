import type { ItineraryNode, ItineraryNodePatchChanges } from "../types/workflow";

/** Distinct, ascending list of day numbers present in a node list. */
export function getLoadedDaysFromNodes(nodes: ItineraryNode[]): number[] {
  return Array.from(
    new Set(
      nodes
        .map((node) => Number(node.day ?? 1))
        .filter((day) => Number.isFinite(day) && day > 0),
    ),
  ).sort((a, b) => a - b);
}

/** Computes the minimal patch (only changed fields) between two node versions. */
export function buildNodePatchChanges(
  previousNode: ItineraryNode,
  nextNode: ItineraryNode,
): ItineraryNodePatchChanges {
  const changes: ItineraryNodePatchChanges = {};

  if (previousNode.day !== nextNode.day) changes.day = nextNode.day;
  if ((previousNode.date || "") !== (nextNode.date || ""))
    changes.date = nextNode.date || null;
  if ((previousNode.time || "") !== (nextNode.time || ""))
    changes.time = nextNode.time || "10:00";
  if ((previousNode.timestamp || "") !== (nextNode.timestamp || ""))
    changes.timestamp = nextNode.timestamp || null;
  if ((previousNode.sort_order ?? 0) !== (nextNode.sort_order ?? 0))
    changes.sort_order = nextNode.sort_order ?? 0;
  if ((previousNode.title || "") !== (nextNode.title || ""))
    changes.title = nextNode.title;
  if ((previousNode.emoji || "") !== (nextNode.emoji || ""))
    changes.emoji = nextNode.emoji;
  if ((previousNode.category || "other") !== (nextNode.category || "other"))
    changes.category = nextNode.category;
  if ((previousNode.description || "") !== (nextNode.description || ""))
    changes.description = nextNode.description || "";
  if ((previousNode.ai_note || "") !== (nextNode.ai_note || ""))
    changes.ai_note = nextNode.ai_note ?? null;
  if ((previousNode.intensity || "") !== (nextNode.intensity || ""))
    changes.intensity = nextNode.intensity ?? null;
  if (Boolean(previousNode.is_visited) !== Boolean(nextNode.is_visited))
    changes.is_visited = Boolean(nextNode.is_visited);
  if ((previousNode.lat ?? null) !== (nextNode.lat ?? null))
    changes.lat = nextNode.lat ?? null;
  if ((previousNode.lng ?? null) !== (nextNode.lng ?? null))
    changes.lng = nextNode.lng ?? null;
  if (
    (previousNode.transport_to_next || "") !==
    (nextNode.transport_to_next || "")
  )
    changes.transport_to_next = nextNode.transport_to_next || "";
  if ((previousNode.image_url || "") !== (nextNode.image_url || ""))
    changes.image_url = nextNode.image_url || "";
  if (
    JSON.stringify(previousNode.attachments || []) !==
    JSON.stringify(nextNode.attachments || [])
  ) {
    changes.attachments = nextNode.attachments || [];
  }
  if ((previousNode.linkedFactId || "") !== (nextNode.linkedFactId || "")) {
    changes.linkedFactId = nextNode.linkedFactId || "";
  }

  return changes;
}
