const fs = require('fs');
const file = 'src/pages/Signup.js';
const lines = fs.readFileSync(file, 'utf8').split('\n');
// Remove lines 298-461 (1-indexed) = index 297-460
const fixed = [...lines.slice(0, 297), ...lines.slice(461)];
fs.writeFileSync(file, fixed.join('\n'), 'utf8');
console.log('Done. Lines kept:', fixed.length);
