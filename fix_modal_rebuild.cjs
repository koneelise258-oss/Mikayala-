const fs = require('fs');
const path = 'src/components/CoupleGameModal.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /<button\s*onClick=\{\(\) => \{[\s\S]*?console\.log\('\[Game\] Message dés créé dans le chat'\);[\s\S]*?Partager ce gage dans le chat<\/span>\s*<\/button>\s*\)\}\s*<\/div>\s*\)\}/;

const replacement = `<button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center bg-[#2d2254] hover:bg-[#ff7675]/20 text-[#a29bfe] hover:text-[#ff7675] rounded-xl transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-[#171230] border-b border-[#2d2254] overflow-x-auto shrink-0 custom-scrollbar">
          <button
            onClick={() => setActiveTab('truth_or_dare')}
            className={\`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all \${
              activeTab === 'truth_or_dare' ? 'bg-[#ff7675] text-[#130f26]' : 'text-[#a29bfe] hover:bg-[#2d2254]'
            }\`}
          >
            Action ou Vérité
          </button>
          <button
            onClick={() => setActiveTab('wheel')}
            className={\`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all \${
              activeTab === 'wheel' ? 'bg-[#e056fd] text-white' : 'text-[#a29bfe] hover:bg-[#2d2254]'
            }\`}
          >
            Roue Romantique
          </button>
          <button
            onClick={() => setActiveTab('dice')}
            className={\`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all \${
              activeTab === 'dice' ? 'bg-[#00b894] text-[#130f26]' : 'text-[#a29bfe] hover:bg-[#2d2254]'
            }\`}
          >
            Dés Intimes
          </button>
          <button
            onClick={() => setActiveTab('customizer')}
            className={\`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ml-auto flex items-center gap-1 \${
              activeTab === 'customizer' ? 'bg-[#1b1435] text-white border border-[#2d2254]' : 'text-[#a29bfe] hover:bg-[#2d2254]'
            }\`}
          >
            <Settings size={14} />
            Studio
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          
          {/* TAB 1: TRUTH OR DARE */}
          {activeTab === 'truth_or_dare' && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
              <h3 className="text-xl font-bold text-white mb-2">Action ou Vérité</h3>
              {currentTodChallenge ? (
                <div className="bg-[#1b1435] border border-[#2d2254] p-6 rounded-3xl w-full text-center">
                  <h4 className="text-[#ff7675] font-bold text-lg mb-2">{currentTodChallenge.title}</h4>
                  <p className="text-white">{currentTodChallenge.description}</p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const tods = challenges.filter(c => c.type !== 'wheel');
                    if (tods.length) setCurrentTodChallenge(tods[Math.floor(Math.random() * tods.length)]);
                  }}
                  className="px-6 py-3 bg-[#ff7675] text-[#130f26] rounded-2xl font-bold hover:bg-[#d63031]"
                >
                  Tirer une carte
                </button>
              )}
            </div>
          )}

          {/* TAB 2: WHEEL */}
          {activeTab === 'wheel' && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
              <h3 className="text-xl font-bold text-white mb-2">Roue Romantique</h3>
              {selectedWheelChallenge ? (
                <div className="bg-[#1b1435] border border-[#2d2254] p-6 rounded-3xl w-full text-center">
                  <h4 className="text-[#e056fd] font-bold text-lg mb-2">{selectedWheelChallenge.title}</h4>
                  <p className="text-white">{selectedWheelChallenge.description}</p>
                </div>
              ) : (
                <button
                  onClick={() => {
                    const wheelChallenges = challenges.filter(c => c.type === 'wheel');
                    if (wheelChallenges.length) setSelectedWheelChallenge(wheelChallenges[Math.floor(Math.random() * wheelChallenges.length)]);
                  }}
                  className="px-6 py-3 bg-[#e056fd] text-white rounded-2xl font-bold hover:bg-[#be2edd]"
                >
                  Tourner la roue
                </button>
              )}
            </div>
          )}

          {/* TAB 3: DICE */}
          {activeTab === 'dice' && (
            <div className="flex flex-col items-center justify-center min-h-[300px] gap-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
                <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 text-center shadow-md">
                  <span className="text-[10px] uppercase font-bold text-[#a29bfe] tracking-wider block mb-1">
                    🎯 Action
                  </span>
                  <div className="text-sm font-bold text-[#55efc4] min-h-[44px] flex items-center justify-center">
                    {diceResult ? diceResult.action : 'Action ?'}
                  </div>
                </div>
                <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 text-center shadow-md">
                  <span className="text-[10px] uppercase font-bold text-[#a29bfe] tracking-wider block mb-1">
                    💋 Zone / Contact
                  </span>
                  <div className="text-sm font-bold text-[#fd79a8] min-h-[44px] flex items-center justify-center">
                    {diceResult ? diceResult.zone : 'Zone ?'}
                  </div>
                </div>
                <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4 text-center shadow-md">
                  <span className="text-[10px] uppercase font-bold text-[#a29bfe] tracking-wider block mb-1">
                    ⏳ Durée / Condition
                  </span>
                  <div className="text-sm font-bold text-[#ffeaa7] min-h-[44px] flex items-center justify-center">
                    {diceResult ? diceResult.duration : 'Durée ?'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleRollDice}
                disabled={isRollingDice}
                className="w-full max-w-xs py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#6c5ce7] to-[#00b894] hover:from-[#5b4bc4] hover:to-[#00a884] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Dices size={20} className={isRollingDice ? 'animate-spin' : ''} />
                <span>{isRollingDice ? 'Lancement des dés...' : 'Lancer les 3 Dés Intimes'}</span>
              </button>
              
              {diceResult && (
                <button
                  onClick={() => {
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
                  }}
                  className="mt-4 text-xs font-bold text-[#55efc4] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Send size={14} />
                  <span>Partager ce gage dans le chat</span>
                </button>
              )}
            </div>
          )}`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
console.log('Rebuilt missing modal sections safely!');
