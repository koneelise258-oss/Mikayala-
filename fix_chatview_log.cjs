const fs = require('fs');
const path = 'src/components/ChatView.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  /if \(gameData\?\.gameType === 'intimate_dice'\) \{/,
  `if (gameData?.gameType === 'intimate_dice') {
                      console.log('[Game] Résultat affiché dans la bulle');`
);

fs.writeFileSync(path, code);
console.log('Fixed log');
