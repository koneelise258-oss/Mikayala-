const fs = require('fs');
const path = 'src/components/CoupleGameModal.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /onClose\(\);\n\s*\}\}\}/,
  `onClose();\n                  }}`
);

fs.writeFileSync(path, code);
console.log('Fixed brace');
