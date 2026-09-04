const fs = require('fs');
const path = 'src/components/ChatView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /onClick=\{\(\) => \{ console\.log\('\[Game\] Bouton dés intimes cliqué'\); onOpenGames\(\); \}\}\}/g,
  `onClick={() => { console.log('[Game] Bouton dés intimes cliqué'); onOpenGames(); }}`
);

fs.writeFileSync(path, code);
console.log('Fixed button 2 undo');
