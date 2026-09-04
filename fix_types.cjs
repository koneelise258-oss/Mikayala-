const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');

content = content.replace(
  /export type MessageType = \n/,
  `export type MessageType = \n  | 'game'\n`
);

fs.writeFileSync('src/types.ts', content);
console.log('Fixed types.ts');
