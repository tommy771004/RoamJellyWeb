const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(/id: node\.nodeId,[\s\S]*?coords: lat != null \? null : { top: `\$\{18 \+ index \* 20\}%`, left: `\$\{25 \+ \(index % 2\) \* 35\}%` },/, `id: node.nodeId, node_id: node.nodeId, day: node.day, time: node.time, location: node.title, title: node.title, icon: node.emoji, emoji: node.emoji, category: node.category ?? 'other', lat, lng, coords: lat != null ? null : { top: \`\${18 + index * 20}%\`, left: \`\${25 + (index % 2) * 35}%\` }, description: node.description, is_visited: node.isVisited, transport_to_next: node.transportToNext, image_url: node.imageUrl,`);
fs.writeFileSync('server.ts', content);
