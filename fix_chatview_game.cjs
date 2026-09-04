const fs = require('fs');
const path = 'src/components/ChatView.tsx';
let code = fs.readFileSync(path, 'utf8');

const gameBlock = `
                  {/* ====== JEUX (DES INTIMES ETC) ====== */}
                  {msg.type === 'game' && (() => {
                    let gameData = null;
                    try {
                      gameData = JSON.parse(msg.content);
                    } catch(e) {}
                    
                    if (gameData?.gameType === 'intimate_dice') {
                      return (
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-1">
                            <Dices size={18} className="text-[#55efc4]" />
                            <span className="font-bold text-sm tracking-wide text-white">Dés Intimes</span>
                          </div>
                          <div className="space-y-2 text-[13px]">
                            <div><span className="text-[#a29bfe] uppercase text-[10px] font-bold tracking-wider block">Action</span><span className="font-semibold text-[#55efc4]">{gameData.result.action}</span></div>
                            <div><span className="text-[#a29bfe] uppercase text-[10px] font-bold tracking-wider block">Zone</span><span className="font-semibold text-[#fd79a8]">{gameData.result.zone}</span></div>
                            <div><span className="text-[#a29bfe] uppercase text-[10px] font-bold tracking-wider block">Condition</span><span className="font-semibold text-[#ffeaa7]">{gameData.result.duration}</span></div>
                          </div>
                        </div>
                      );
                    }
                    return <span>{msg.content}</span>;
                  })()}
`;

code = code.replace(
  /\{\/\* Footer info: Time, Transport Badge, Ticks, Pin, Star \*\/\}/,
  gameBlock + '\n              {/* Footer info: Time, Transport Badge, Ticks, Pin, Star */}'
);

fs.writeFileSync(path, code);
console.log('Fixed chatview game bubble');
