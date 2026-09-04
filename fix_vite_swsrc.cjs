const fs = require('fs');
let content = fs.readFileSync('vite.config.ts', 'utf8');
content = content.replace(/srcDir: 'public'/, "srcDir: 'src'");
fs.writeFileSync('vite.config.ts', content);
console.log('Fixed swSrc to src');
