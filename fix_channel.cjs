const fs = require('fs');
const path = 'src/services/messageService.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /const channelName = \`msgs-\$\{targetCoupleId\}\`;/,
  "const channelName = `msgs-${targetCoupleId}-${crypto.randomUUID()}`;"
);

fs.writeFileSync(path, code);
console.log('Done replacing channelName');
