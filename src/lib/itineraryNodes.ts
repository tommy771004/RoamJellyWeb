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

/** Maps a focus coordinate to an x/y percentage within the node bounding box (for map pins). */
export function getDynamicMapPercent(nodes: any[], lat: number, lng: number) {
  if (!lat || !lng || nodes.length === 0) return { x: 50, y: 50 };

  let minLat = 90,
    maxLat = -90,
    minLng = 180,
    maxLng = -180;
  let hasValidCoords = false;
  nodes.forEach((n) => {
    if (n.lat && n.lng) {
      hasValidCoords = true;
      if (n.lat < minLat) minLat = n.lat;
      if (n.lat > maxLat) maxLat = n.lat;
      if (n.lng < minLng) minLng = n.lng;
      if (n.lng > maxLng) maxLng = n.lng;
    }
  });

  if (!hasValidCoords) return { x: 50, y: 50 };

  // Adding padding
  const latDiff = maxLat - minLat || 0.01;
  const lngDiff = maxLng - minLng || 0.01;

  const paddedMinLat = minLat - latDiff * 0.2;
  const paddedMaxLat = maxLat + latDiff * 0.2;
  const paddedMinLng = minLng - lngDiff * 0.2;
  const paddedMaxLng = maxLng + lngDiff * 0.2;

  const x = ((lng - paddedMinLng) / (paddedMaxLng - paddedMinLng)) * 100;
  // y is inverted because maps usually have origin at bottom (lower lat), but visually top is y=0
  const y = ((paddedMaxLat - lat) / (paddedMaxLat - paddedMinLat)) * 100;

  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}
