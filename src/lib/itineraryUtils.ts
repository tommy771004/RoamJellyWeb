import type { ItineraryNode } from '../types/workflow';

export function assignDaysBasedOnTimeAndOrder(nodes: any[], startDateStr?: string): ItineraryNode[] {
  let currentDay = 1;
  let lastTimeMinutes = -1;

  const baseDate = startDateStr ? new Date(startDateStr) : new Date();
  if (isNaN(baseDate.getTime())) {
    baseDate.setTime(Date.now());
  }

  return nodes.map((n) => {
    const node: ItineraryNode = {
      node_id: n.node_id || n.id || `node_${Date.now()}_${Math.random()}`,
      day: 1,
      time: n.time || '10:00',
      title: n.title || n.location || '未命名行程',
      emoji: n.emoji || n.icon || '📍',
      category: n.category || 'other',
      source: n.source || 'remote',
      lat: n.lat,
      lng: n.lng,
    };

    if (n.day != null) {
      currentDay = n.day;
    } else {
      const timeParts = String(node.time).split(':');
      const hours = parseInt(timeParts[0] || '10', 10);
      const mins = parseInt(timeParts[1] || '0', 10);
      const timeMinutes = hours * 60 + mins;

      if (lastTimeMinutes !== -1 && timeMinutes < lastTimeMinutes) {
        currentDay++;
      }
      lastTimeMinutes = timeMinutes;
    }

    node.day = currentDay;

    const nodeDate = new Date(baseDate);
    nodeDate.setDate(nodeDate.getDate() + (node.day - 1));
    const timeParts2 = String(node.time).split(':');
    const hours = parseInt(timeParts2[0] || '10', 10);
    const mins = parseInt(timeParts2[1] || '0', 10);

    const yyyy = nodeDate.getFullYear();
    const mm = String(nodeDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nodeDate.getDate()).padStart(2, '0');
    const hh = String(hours).padStart(2, '0');
    const mn = String(mins).padStart(2, '0');

    node.timestamp = `${yyyy}-${mm}-${dd}T${hh}:${mn}:00Z`;

    return node;
  });
}
