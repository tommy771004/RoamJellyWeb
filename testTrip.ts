import { scrapeTripFlights } from './src/server/services/tripParser';

async function main() {
  const result = await scrapeTripFlights('TPE', 'KIX', '2026-06-15');
  console.log("RT results:", result.length);
  // console.log(JSON.stringify(result[0], null, 2));
}

main().catch(console.error);
