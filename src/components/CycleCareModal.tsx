import React, { useState } from 'react';
import { 
  Heart, 
  Sparkles, 
  Moon, 
  Sun, 
  Coffee, 
  Smile, 
  Zap, 
  X, 
  Calendar, 
  Gift, 
  Info,
  Send,
  HeartHandshake
} from 'lucide-react';
import { CycleData, User } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface CycleCareModalProps {
  isOpen: boolean;
  onClose: () => void;
  cycleData: CycleData;
  currentUser: User;
  partnerUser: User;
  onUpdateCycleData: (data: Partial<CycleData>) => void;
  onShareCareToChat: (text: string) => void;
}

const PHASE_DETAILS = {
  menstruelle: {
    label: 'Phase Menstruelle',
    color: '#ff7675',
    emoji: '🌸',
    desc: 'Besoins de repos, chaleur douce et réconfort.',
    adviceForPartner: 'Prépare-lui une tisane chaude, une bouillotte et propose un massage doux des pieds ou du dos sans rien demander en retour.'
  },
  folliculaire: {
    label: 'Phase Folliculaire',
    color: '#00b894',
    emoji: '🌱',
    desc: 'Montée d’énergie, créativité et envie de nouveaux projets.',
    adviceForPartner: 'Super moment pour organiser une sortie dynamique, tester un nouveau restaurant ou planifier vos prochaines vacances.'
  },
  ovulatoire: {
    label: 'Phase Ovulatoire',
    color: '#fd79a8',
    emoji: '✨',
    desc: 'Pic de sensualité, rayonnement et grande complicité intime.',
    adviceForPartner: 'Elle est au sommet de son magnétisme ! Idéal pour sortir le grand jeu : lingerie, dîner romantique, mots doux et passion.'
  },
  luteale: {
    label: 'Phase Lutéale',
    color: '#a29bfe',
    emoji: '🌙',
    desc: 'Sensibilité accrue, besoin d’écoute et d’espace sécurisant.',
    adviceForPartner: 'Sois à l’écoute avec patience. Une friandise préférée, un câlin prolongé et lui éviter les sources de stress feront des merveilles.'
  }
};

export const CycleCareModal: React.FC<CycleCareModalProps> = ({
  isOpen,
  onClose,
  cycleData,
  currentUser,
  partnerUser,
  onUpdateCycleData,
  onShareCareToChat
}) => {
  const [selectedMood, setSelectedMood] = useState(cycleData.mood);
  const [selectedEnergy, setSelectedEnergy] = useState(cycleData.energyLevel);
  const [day, setDay] = useState(cycleData.dayOfCycle);

  if (!isOpen) return null;

  const currentPhaseInfo = PHASE_DETAILS[cycleData.currentPhase];

  const handleSaveQuickStatus = (mood: any, energy: number) => {
    setSelectedMood(mood);
    setSelectedEnergy(energy);
    onUpdateCycleData({
      mood,
      energyLevel: energy
    });
    triggerHaptic(40);
    soundEffects.playReaction();
  };

  const handlePhaseChange = (phase: keyof typeof PHASE_DETAILS) => {
    onUpdateCycleData({
      currentPhase: phase,
      careTipsForPartner: {
        title: `${PHASE_DETAILS[phase].label} : ${PHASE_DETAILS[phase].desc}`,
        description: PHASE_DETAILS[phase].adviceForPartner,
        actionIdea: 'Petite attention personnalisée prête à envoyer',
        icon: 'Sparkles'
      }
    });
    triggerHaptic([40, 40]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0b1c]/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-[#171230] border border-[#2d2254] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="h-[64px] bg-[#1f1742] px-5 flex items-center justify-between border-b border-[#2d2254] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#fd79a8] to-[#00b894] flex items-center justify-center shadow-[0_0_15px_rgba(253,121,168,0.3)]">
              <HeartHandshake size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f1f2f6]">Suivi de Cycle & Soin Complice</h2>
              <p className="text-xs text-[#a29bfe]">Prendre soin de sa moitié au bon moment</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#a29bfe] hover:text-white rounded-full hover:bg-[#281e4b] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Phase Circle Card */}
          <div className="bg-gradient-to-br from-[#20183e] to-[#16122d] border border-[#372863] rounded-3xl p-5 text-center relative overflow-hidden shadow-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl">{currentPhaseInfo.emoji}</span>
              <span className="text-xs uppercase tracking-widest font-bold text-[#55efc4]">
                Jour {cycleData.dayOfCycle} du Cycle (Sur {cycleData.cycleLength}j)
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-1" style={{ color: currentPhaseInfo.color }}>
              {currentPhaseInfo.label}
            </h3>
            <p className="text-xs text-[#f1f2f6] max-w-sm mx-auto leading-relaxed">
              {currentPhaseInfo.desc}
            </p>

            {/* Phase Selector Pills */}
            <div className="grid grid-cols-4 gap-1.5 mt-4 text-[10px] font-semibold">
              {(Object.keys(PHASE_DETAILS) as Array<keyof typeof PHASE_DETAILS>).map(phaseKey => {
                const isCurrent = cycleData.currentPhase === phaseKey;
                return (
                  <button
                    key={phaseKey}
                    onClick={() => handlePhaseChange(phaseKey)}
                    className={`py-2 px-1 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-[#00b894] border-[#00b894] text-[#130f26] font-bold shadow-md'
                        : 'bg-[#130f26] border-[#2d2254] text-[#a29bfe] hover:text-white'
                    }`}
                  >
                    {PHASE_DETAILS[phaseKey].emoji} {PHASE_DETAILS[phaseKey].label.split(' ')[1]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guide Soin & Attentions pour le Partenaire */}
          <div className="bg-[#1e173e] border border-[#00b894]/50 rounded-2xl p-4 shadow-[0_0_20px_rgba(0,184,148,0.1)]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#55efc4] mb-2">
              <Sparkles size={15} className="text-[#00b894]" />
              <span>Conseil Bienveillance pour Kaysen / Mikaela</span>
            </div>
            <p className="text-xs text-[#f1f2f6] leading-relaxed bg-[#130f26] p-3 rounded-xl border border-[#2d2254]">
              {currentPhaseInfo.adviceForPartner}
            </p>

            <button
              onClick={() => {
                onShareCareToChat(`🌸 *Moment Soin & Douceur :* Je pense à toi aujourd'hui ! Dis-moi si tu as envie d'un massage, d'une tisane ou d'un moment calme à deux 💜`);
                onClose();
              }}
              className="w-full mt-3 py-2.5 px-4 rounded-xl bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
            >
              <Send size={14} />
              <span>Proposer une attention dans la discussion</span>
            </button>
          </div>

          {/* Mood & Energy Logger */}
          <div className="bg-[#1e173e] border border-[#2d2254] rounded-2xl p-4">
            <h4 className="text-xs font-bold text-[#a29bfe] uppercase tracking-wider mb-3">
              Humeur & Ressenti du moment
            </h4>

            {/* Mood selector */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-4">
              {[
                { id: 'câline', label: '🧸 Câline & Douce' },
                { id: 'passionnée', label: '🔥 Passionnée' },
                { id: 'joyeuse', label: '✨ Rayonnante' },
                { id: 'fatiguée', label: '😴 Fatiguée' },
                { id: 'sensible', label: '🥺 Sensible' },
                { id: 'calme', label: '🌿 Zen & Calme' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSaveQuickStatus(item.id, selectedEnergy)}
                  className={`py-2 px-2 rounded-xl text-center font-medium transition-all ${
                    selectedMood === item.id
                      ? 'bg-[#6c5ce7] text-white shadow-md'
                      : 'bg-[#130f26] text-[#a29bfe] hover:text-white border border-[#2d2254]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Energy Level */}
            <div className="flex items-center justify-between text-xs text-[#a29bfe]">
              <span>Niveau d'énergie :</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => handleSaveQuickStatus(selectedMood, lvl)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                      lvl <= selectedEnergy
                        ? 'bg-[#00b894] text-[#130f26]'
                        : 'bg-[#130f26] text-[#a29bfe] border border-[#2d2254]'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
