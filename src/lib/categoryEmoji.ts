/** Maps an AI-assistant spot category to a representative emoji; defaults to 📍. */
export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    landmark: '🏯',
    food: '🍜',
    shopping: '🛍️',
    nature: '🌿',
    activity: '🎡',
    other: '📍'
  };
  return map[category] || '📍';
}
