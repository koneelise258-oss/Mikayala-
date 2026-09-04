const fs = require('fs');
let content = fs.readFileSync('src/components/CoupleGameModal.tsx', 'utf8');

content = content.replace(
  /onShareChallengeToChat: \(text: string\) => void;/,
  `onShareChallengeToChat: (text: string) => void;\n  onShareGameResultToChat?: (payload: any) => void;`
);

content = content.replace(
  /export const CoupleGameModal: React\.FC<CoupleGameModalProps> = \(\{/,
  `export const CoupleGameModal: React.FC<CoupleGameModalProps> = ({`
);

content = content.replace(
  /onShareChallengeToChat\n\}\) => \{/,
  `onShareChallengeToChat,\n  onShareGameResultToChat\n}) => {`
);

// We need to replace the click handler for the dice share button
const regexDiceShare = /onClick=\{.*?onShareChallengeToChat\(\`🎲 \*Dés Intimes Mikayla :.*?\\n👉 \*Action :.*?\\n👉 \*Zone :.*?\\n👉 \*Condition :.*? 🔥\`\);.*?onClose\(\);.*?\}/s;
const newDiceShare = `onClick={() => {
                    console.log('[Game] Message dés créé dans le chat');
                    if (onShareGameResultToChat) {
                      onShareGameResultToChat({
                        gameType: "intimate_dice",
                        result: diceResult
                      });
                    } else {
                      onShareChallengeToChat(\`🎲 *Dés Intimes Mikayla :* \\n👉 *Action :* \${diceResult.action}\\n👉 *Zone :* \${diceResult.zone}\\n👉 *Condition :* \${diceResult.duration} 🔥\`);
                    }
                    onClose();
                  }}`;

content = content.replace(regexDiceShare, newDiceShare);
fs.writeFileSync('src/components/CoupleGameModal.tsx', content);
console.log('Fixed CoupleGameModal.tsx');
