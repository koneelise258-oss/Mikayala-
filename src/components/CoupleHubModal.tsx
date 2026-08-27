import React from 'react';
import { 
  Sparkles, 
  Dices, 
  HeartHandshake, 
  Ticket, 
  Eye, 
  Flame, 
  Heart, 
  Gift, 
  Calendar, 
  X, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface CoupleHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGames: () => void;
  onOpenWishlist: () => void;
  onOpenCoupons: () => void;
  onOpenBlindQuiz: () => void;
  onOpenDigitalTouch: () => void;
  onOpenHeartbeat: () => void;
  onOpenCycleCare: () => void;
  onOpenScratchCard: () => void;
}

export const CoupleHubModal: React.FC<CoupleHubModalProps> = ({
  isOpen,
  onClose,
  onOpenGames,
  onOpenWishlist,
  onOpenCoupons,
  onOpenBlindQuiz,
  onOpenDigitalTouch,
  onOpenHeartbeat,
  onOpenCycleCare,
  onOpenScratchCard
}) => {
  if (!isOpen) return null;

  const handleSelect = (action: () => void) => {
    triggerHaptic(30);
    soundEffects.playTap();
    onClose();
    setTimeout(() => {
      action();
    }, 150);
  };

  const modules = [
    {
      id: 'games',
      title: 'Action ou Vérité & Dés Intimes',
      subtitle: '3 niveaux de piment, roue romantique & générateur de défis',
      icon: Dices,
      color: 'from-[#e17055] to-[#d63031]',
      textColor: 'text-[#ff7675]',
      action: onOpenGames
    },
    {
      id: 'wishlist',
      title: 'Wishlist & Matchs Secrets',
      subtitle: 'Matchez vos désirs intimes sans pression (révélation mutuelle)',
      icon: Sparkles,
      color: 'from-[#fd79a8] to-[#e84393]',
      textColor: 'text-[#fd79a8]',
      action: onOpenWishlist
    },
    {
      id: 'coupons',
      title: 'Bons de Couple & Privilèges',
      subtitle: 'Massages, jokers disputes, sorties surprises à échanger',
      icon: Ticket,
      color: 'from-[#00b894] to-[#00cec9]',
      textColor: 'text-[#55efc4]',
      action: onOpenCoupons
    },
    {
      id: 'quiz',
      title: 'Quiz Double Aveugle',
      subtitle: 'Répondez séparément, les vérités ne s’ouvrent qu’à deux',
      icon: Eye,
      color: 'from-[#6c5ce7] to-[#a29bfe]',
      textColor: 'text-[#a29bfe]',
      action: onOpenBlindQuiz
    },
    {
      id: 'scratch',
      title: 'Photo & Carte à Gratter Secrète',
      subtitle: 'Créez une surprise recouverte d’une pellicule à effacer',
      icon: Gift,
      color: 'from-[#fdcb6e] to-[#e17055]',
      textColor: 'text-[#ffeaa7]',
      action: onOpenScratchCard
    },
    {
      id: 'touch',
      title: 'Digital Touch & Live Vibe',
      subtitle: 'Dessinez sur l’écran de l’autre en direct avec pulsations haptiques',
      icon: Flame,
      color: 'from-[#ff7675] to-[#fd79a8]',
      textColor: 'text-[#ff7675]',
      action: onOpenDigitalTouch
    },
    {
      id: 'heartbeat',
      title: 'Télégraphe Cardiaque (Pouls Live)',
      subtitle: 'Transmettez le rythme de vos battements de cœur en temps réel',
      icon: Heart,
      color: 'from-[#e84393] to-[#d63031]',
      textColor: 'text-[#fd79a8]',
      action: onOpenHeartbeat
    },
    {
      id: 'cycle',
      title: 'Cycle & Mood Care',
      subtitle: 'Suivi bienveillant du cycle féminin et conseils intimes',
      icon: Calendar,
      color: 'from-[#a29bfe] to-[#6c5ce7]',
      textColor: 'text-[#a29bfe]',
      action: onOpenCycleCare
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0b1c]/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-sm max-h-[85vh] bg-[#171230] border border-[#2d2254] rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-[#2d2254] pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#fd79a8] to-[#6c5ce7] flex items-center justify-center text-white shadow-md">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Jeux & Désirs Intimes</h3>
              <p className="text-[10px] text-[#a29bfe]">Sanctuaire ludique pour deux</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#a29bfe] hover:text-white rounded-lg hover:bg-[#281e4b] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modules List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 -mr-1">
          {modules.map(mod => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                onClick={() => handleSelect(mod.action)}
                className="p-3 rounded-2xl bg-[#130f26] border border-[#2d2254] hover:border-[#6c5ce7] flex items-center justify-between gap-3 cursor-pointer hover:bg-[#1c163a] transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-sm shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs group-hover:text-[#55efc4] transition-colors">
                      {mod.title}
                    </h4>
                    <p className="text-[10px] text-[#a29bfe]/70 line-clamp-1">
                      {mod.subtitle}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#a29bfe]/50 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
