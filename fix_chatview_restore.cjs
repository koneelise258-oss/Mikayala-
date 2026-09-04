const fs = require('fs');
const path = 'src/components/ChatView.tsx';
let code = fs.readFileSync(path, 'utf8');

// The chunk we need to replace is from `onChange={(e) => setChatSearchQuery(e.target.value)}` to `<span>Roue & Jeux de couple</span>`
const regex = /onChange=\{\(e\) => setChatSearchQuery\(e\.target\.value\)\}[\s\S]*?<span>Roue \& Jeux de couple<\/span>/;

const replacement = `onChange={(e) => setChatSearchQuery(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-xs text-white focus:outline-none"
            />
            <button
              onClick={() => {
                setSearchInChat(false);
                setChatSearchQuery('');
              }}
              className="p-1.5 text-[#a29bfe] hover:text-white hover:bg-white/10 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-3 flex-1 overflow-hidden">
              <button
                onClick={onBack}
                className="p-1 sm:hidden text-[#a29bfe] hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <ArrowLeft size={22} />
              </button>
              
              <div 
                className="relative cursor-pointer group"
                onClick={onOpenContactInfo}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden bg-gradient-to-br from-[#00b894] to-[#55efc4] p-[2px] shadow-lg relative">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#130f26]">
                    {partnerProfile?.avatarUrl ? (
                      <img src={partnerProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[#1b1435] flex items-center justify-center">
                        <UserIcon size={20} className="text-[#a29bfe]" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00b894] border-2 border-[#130f26] rounded-full shadow-sm"></div>
              </div>
              
              <div 
                className="flex flex-col min-w-0 cursor-pointer group flex-1"
                onClick={onOpenContactInfo}
              >
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-sm sm:text-base text-white truncate group-hover:text-[#55efc4] transition-colors">
                    {partnerNickname || partnerUser.name}
                  </h2>
                </div>
                <div className="flex items-center text-[11px] text-[#a29bfe]">
                  <span className="truncate">En ligne</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
              <button
                onClick={() => onStartCall('video')}
                disabled={!pairingState?.isPaired || !pairingState?.coupleId}
                className="p-2 sm:p-2.5 text-[#a29bfe] hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
              >
                <Video size={20} />
              </button>
              <button
                onClick={() => onStartCall('audio')}
                disabled={!pairingState?.isPaired || !pairingState?.coupleId}
                className="p-2 sm:p-2.5 text-[#a29bfe] hover:text-white hover:bg-white/10 rounded-xl transition-all disabled:opacity-50"
              >
                <Phone size={20} />
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowChatMenu(!showChatMenu)}
                  className="p-2 sm:p-2.5 text-[#a29bfe] hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                  <MoreVertical size={20} />
                </button>

                {showChatMenu && (
                  <div className="absolute right-0 top-12 w-56 bg-[#1b1435] border border-[#2d2254] rounded-2xl shadow-2xl overflow-hidden py-2 animate-in zoom-in-95 duration-100 origin-top-right">
                    
                    {onOpenGames && pairingState?.isPaired && (
                      <button
                        onClick={() => {
                          setShowChatMenu(false);
                          console.log('[Game] Bouton dés intimes cliqué');
                          onOpenGames();
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#281e4b] flex items-center space-x-3 text-white"
                      >
                        <Dices size={16} className="text-[#ffeaa7]" />
                        <span>Roue & Jeux de couple</span>`;

code = code.replace(regex, replacement);
fs.writeFileSync(path, code);
console.log('Restored chunk');
