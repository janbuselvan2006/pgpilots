const fs = require('fs');
const file = 'src/pages/Login.js';
const lines = fs.readFileSync(file, 'utf8').split('\n');
// Keep lines 0-306 (index) and 702 onwards (old CSS was lines 308-702, 0-indexed: 307-701)
const fixed = [...lines.slice(0, 307), ...lines.slice(702)];
fs.writeFileSync(file, fixed.join('\n'), 'utf8');
console.log('Done. Lines kept:', fixed.length);
