const fs = require('fs');
const path = 'src/services/messageService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /'system': 'system'/,
  `'system': 'system',\n    'game': 'game'`
);

fs.writeFileSync(path, code);
console.log('Fixed typeMap');
