import { fetchOpenRouterWithFallback } from './openrouterHelper';

const apiKey = process.env.OPENROUTER_API_KEY;

export async function generateItinerary(body: any) {
  const { destination, planner } = body;
  const days = planner?.days || 3;
  
  if (!apiKey) {
    // Artificial delay for fallback
    await new Promise(r => setTimeout(r, 2000));
    return [
      { day: 1, time: '10:00', title: `Arrival at ${destination}`, category: 'flight', emoji: '✈️' },
      { day: 1, time: '12:00', title: 'Hotel Check-in', category: 'hotel', emoji: '🏨' },
      { day: 1, time: '13:30', title: 'Local Lunch', category: 'food', emoji: '🍜' },
      { day: 1, time: '15:00', title: 'City Center Walk', category: 'landmark', emoji: '🏯' },
      { day: 2, time: '09:00', title: 'Morning Market', category: 'food', emoji: '🍱' },
      { day: 2, time: '11:00', title: 'Main Attraction', category: 'landmark', emoji: '📸' },
    ];
  }

  const prompt = `You are a travel planner. Plan an itinerary for ${destination} for ${days} days.
Other requirements:
- departure: ${planner?.departureFrom || 'unknown'}
- spots: ${planner?.mustVisitSpots?.join(', ') || 'user choices'}
Generate ONLY a raw JSON array of objects. Each object should have:
- day (number 1 to ${days})
- time (string HH:MM)
- title (string)
- category (string: flight, transport, landmark, food, shopping, nature, hotel, activity, nightlife, other)
- emoji (string representing the place)

Example:
[{"day":1,"time":"10:00","title":"Airport","category":"flight","emoji":"✈️"}]`;

  try {
    let text = await fetchOpenRouterWithFallback(apiKey, prompt);

    // Clean up markdown markers if present
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to generate AI itinerary', err);
  }

  return [
    { day: 1, time: '10:00', title: `Fallback: Arrival at ${destination}`, category: 'flight', emoji: '✈️' },
  ];
}
