import https from 'https';

const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
  }
};

https.get('https://tw.trip.com/flights/tpe-to-oka/tickets-tpe-oka/?flighttype=ow&dcity=tpe&acity=oka&ddate=2026-05-30', options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log("Length:", data.length);
    console.log("Has initial state:", data.includes('IBUMiddleware'));
    console.log("Has flights:", data.includes('flightList'));
  });
}).on('error', (err) => {
  console.error(err);
});
