const fs = require('fs');
const path = 'src/components/ChatView.tsx';
let code = fs.readFileSync(path, 'utf8');

const paperclipStr = `<Paperclip size={22} />
            </button>`;

const replacement = `<Paperclip size={22} />
            </button>
            
            {/* Game/Dice toggle */}
            {onOpenGames && pairingState?.isPaired && (
              <button
                type="button"
                onClick={() => onOpenGames()}
                aria-label="Jeux / Dés intimes"
                className="p-2 rounded-xl transition-colors cursor-pointer shrink-0 text-[#a29bfe] hover:text-white"
                title="Dés intimes"
              >
                <Dices size={22} />
              </button>
            )}`;

code = code.replace(paperclipStr, replacement);
fs.writeFileSync(path, code);
console.log('Fixed button');
