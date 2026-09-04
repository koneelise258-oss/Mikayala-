const fs = require('fs');
const path = 'src/App.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /onShareChallengeToChat=\{\(text\) => \{[\s\S]*?\}\}/;
const replacement = `onShareChallengeToChat={(text) => {
            handleSendMessage({
              type: 'text',
              content: text
            });
            setIsChatOpen(true);
          }}
          onShareGameResultToChat={(payload) => {
            handleSendMessage({
              type: 'game',
              content: JSON.stringify(payload)
            });
            setIsChatOpen(true);
          }}`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
console.log('Fixed App.tsx');
