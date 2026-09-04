const fs = require('fs');
const path = 'src/components/ChatView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /onClick=\{.*?onOpenGames\(\).*?\}/s,
  `onClick={() => { console.log('[Game] Bouton dés intimes cliqué'); onOpenGames(); }}`
);

fs.writeFileSync(path, code);
console.log('Fixed button 2');
