import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Eye, 
  Clock, 
  Sparkles, 
  Dices, 
  Calendar as CalendarIcon, 
  Zap, 
  Heart, 
  HeartHandshake, 
  Gift, 
  Flame, 
  ChevronRight, 
  Lock, 
  ShieldCheck, 
  Activity 
} from 'lucide-react';
import { User, CoupleCoupon, BlindQuizQuestion, WishlistItem } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface CoupleHubViewProps {
  currentUser: User;
  partnerUser: User;
  onOpenCoupons: () => void;
  onOpenBlindQuiz: () => void;
  onOpenLoveTimer: () => void;
  onOpenWishlist: () => void;
  onOpenGames: () => void;
  onOpenCalendar: () => void;
  onOpenDigitalTouch: () => void;
  onOpenHeartbeat: () => void;
  onOpenCycleCare: () => void;
  onOpenScratchCard: () => void;
  coupons?: CoupleCoupon[];
  quizzes?: BlindQuizQuestion[];
  wishlistItems?: WishlistItem[];
}

export const CoupleHubView: React.FC<CoupleHubViewProps> = ({
  currentUser,
  partnerUser,
  onOpenCoupons,
  onOpenBlindQuiz,
  onOpenLoveTimer,
  onOpenWishlist,
  onOpenGames,
  onOpenCalendar,
  onOpenDigitalTouch,
  onOpenHeartbeat,
  onOpenCycleCare,
  onOpenScratchCard,
  coupons = [],
  quizzes = [],
  wishlistItems = []
}) => {
  // Quick dynamic calculations
  const [daysCount, setDaysCount] = useState<number>(() => {
    const startStr = localStorage.getItem('mikayala_relationship_start_date') || '2024-01-01';
    const diff = Math.max(0, Date.now() - new Date(startStr).getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  });

  const availableCouponsCount = coupons.filter(c => c.status !== 'redeemed').length;
  const pendingQuizzesCount = quizzes.filter(q => 
    !q.answers[currentUser.id] ||
    (!q.isRevealed && q.answers[currentUser.id] && q.answers[partnerUser.id])
  ).length;

  const handleCardClick = (action: () => void) => {
    triggerHaptic(25);
    soundEffects.playTap();
    action();
  };

  const coupleModules = [
    {
      id: 'coupons',
      title: 'Bons Privilèges',
      badge: `${availableCouponsCount} dispo`,
      description: 'Massages, jokers disputes, petits-déjeuners à échanger',
      icon: Ticket,
      gradient: 'from-[#00b894] to-[#00cec9]',
      borderColor: 'border-[#00b894]/40 hover:border-[#00b894]',
      badgeColor: 'bg-[#00b894]/20 text-[#55efc4]',
      action: onOpenCoupons
    },
    {
      id: 'quiz',
      title: 'Quiz Double Aveugle',
      badge: pendingQuizzesCount > 0 ? `${pendingQuizzesCount} en attente` : 'Complicité',
      description: 'Répondez séparément, les vérités ne s’ouvrent qu’à deux',
      icon: Eye,
      gradient: 'from-[#6c5ce7] to-[#a29bfe]',
      borderColor: 'border-[#6c5ce7]/40 hover:border-[#a29bfe]',
      badgeColor: 'bg-[#6c5ce7]/20 text-[#a29bfe]',
      action: onOpenBlindQuiz
    },
    {
      id: 'love_timer',
      title: 'Love Timer',
      badge: `${daysCount} jours`,
      description: 'Compteur d’amour en temps réel, jalons & anniversaires',
      icon: Clock,
      gradient: 'from-[#fd79a8] to-[#e84393]',
      borderColor: 'border-[#fd79a8]/40 hover:border-[#fd79a8]',
      badgeColor: 'bg-[#fd79a8]/20 text-[#fd79a8]',
      action: onOpenLoveTimer
    },
    {
      id: 'wishlist',
      title: 'Wishlist Intime',
      badge: 'Matchs secrets',
      description: 'Projets & envies partagés avec révélation simultanée',
      icon: Sparkles,
      gradient: 'from-[#e056fd] to-[#686de0]',
      borderColor: 'border-[#e056fd]/40 hover:border-[#e056fd]',
      badgeColor: 'bg-[#e056fd]/20 text-[#ffeaa7]',
      action: onOpenWishlist
    },
    {
      id: 'challenges',
      title: 'Roulette de Défis',
      badge: 'Action / Vérité',
      description: 'Générateur de gages, roue romantique & dés intimes',
      icon: Dices,
      gradient: 'from-[#ff7675] to-[#d63031]',
      borderColor: 'border-[#ff7675]/40 hover:border-[#ff7675]',
      badgeColor: 'bg-[#ff7675]/20 text-[#ff7675]',
      action: onOpenGames
    },
    {
      id: 'calendar',
      title: 'Calendrier d’Événements',
      badge: 'Dates & Rendez-vous',
      description: 'Planifiez vos dîners, escapades & moments précieux',
      icon: CalendarIcon,
      gradient: 'from-[#0984e3] to-[#74b9ff]',
      borderColor: 'border-[#0984e3]/40 hover:border-[#74b9ff]',
      badgeColor: 'bg-[#0984e3]/20 text-[#74b9ff]',
      action: onOpenCalendar
    },
    {
      id: 'touch',
      title: 'Digital Touch & Dessin',
      badge: 'Vibrations tactiles',
      description: 'Dessinez et ressentez les tapotements en direct',
      icon: Zap,
      gradient: 'from-[#fdcb6e] to-[#e17055]',
      borderColor: 'border-[#fdcb6e]/40 hover:border-[#fdcb6e]',
      badgeColor: 'bg-[#fdcb6e]/20 text-[#ffeaa7]',
      action: onOpenDigitalTouch
    },
    {
      id: 'heartbeat',
      title: 'Battement de Cœur',
      badge: 'Synchrone Live',
      description: 'Ressentez le pouls haptique de votre moitié',
      icon: Heart,
      gradient: 'from-[#e84393] to-[#d63031]',
      borderColor: 'border-[#e84393]/40 hover:border-[#e84393]',
      badgeColor: 'bg-[#e84393]/20 text-[#fd79a8]',
      action: onOpenHeartbeat
    },
    {
      id: 'cycle',
      title: 'Cycle & Mood Care',
      badge: 'Bien-être',
      description: 'Suivi attentif du cycle, humeurs & petites attentions',
      icon: HeartHandshake,
      gradient: 'from-[#00cec9] to-[#00b894]',
      borderColor: 'border-[#00cec9]/40 hover:border-[#00cec9]',
      badgeColor: 'bg-[#00cec9]/20 text-[#55efc4]',
      action: onOpenCycleCare
    },
    {
      id: 'scratch',
      title: 'Carte à Gratter Secrète',
      badge: 'Surprise',
      description: 'Créez une photo ou un mot recouvert d’une pellicule',
      icon: Gift,
      gradient: 'from-[#a29bfe] to-[#6c5ce7]',
      borderColor: 'border-[#a29bfe]/40 hover:border-[#a29bfe]',
      badgeColor: 'bg-[#a29bfe]/20 text-[#f1f2f6]',
      action: onOpenScratchCard
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#130f26] overflow-y-auto select-none p-3 sm:p-5">
      <div className="max-w-4xl mx-auto w-full space-y-4">
        {/* Top Couple Banner */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-[#241747] via-[#1b1238] to-[#160d2e] border border-[#372863] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Flame size={120} className="text-[#fd79a8]" />
        </div>

        <div className="flex items-center justify-between relative z-10">
          {/* Avatars */}
          <div className="flex items-center gap-3">
            <div className="relative flex -space-x-3">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#130f26] ring-2 ring-[#00b894]"
              />
              <img
                src={partnerUser.avatar}
                alt={partnerUser.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#130f26] ring-2 ring-[#fd79a8]"
              />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#f1f2f6] flex items-center gap-1.5">
                <span>{currentUser.name.split(' ')[0]}</span>
                <span className="text-[#fd79a8]">&</span>
                <span>{partnerUser.name.split(' ')[0]}</span>
              </h2>
              <p className="text-xs text-[#a29bfe]">Sanctuaire de Complicité & Désirs</p>
            </div>
          </div>

          {/* Quick Counter */}
          <button
            onClick={() => handleCardClick(onOpenLoveTimer)}
            className="flex flex-col items-end px-3 py-1.5 rounded-2xl bg-[#130f26]/80 border border-[#2d2254] hover:border-[#fd79a8]/50 transition-all cursor-pointer"
          >
            <span className="text-[10px] text-[#a29bfe] font-semibold flex items-center gap-1">
              <Clock size={11} className="text-[#ffeaa7]" /> Love Timer
            </span>
            <span className="text-sm font-extrabold text-[#55efc4]">
              {daysCount} j ensemble
            </span>
          </button>
        </div>
      </div>

      {/* Grid Header */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#a29bfe] flex items-center gap-1.5">
          <Sparkles size={14} className="text-[#ffeaa7]" />
          <span>Modules Interactifs de Couple</span>
        </h3>
        <span className="text-[10px] text-[#55efc4] font-semibold">
          100% Chiffré & Synchro
        </span>
      </div>

      {/* 2-Column Cards Grid */}
      <div className="grid grid-cols-2 gap-3 pb-6">
        {coupleModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.id}
              onClick={() => handleCardClick(mod.action)}
              className={`p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#1b1435] border ${mod.borderColor} shadow-lg hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between active:scale-[0.98] min-h-[140px]`}
            >
              <div>
                {/* Icon & Badge */}
                <div className="flex items-center justify-between mb-2.5">
                  <div className={`p-2 sm:p-2.5 rounded-2xl bg-gradient-to-br ${mod.gradient} text-[#130f26] shadow-md group-hover:scale-105 transition-transform`}>
                    <Icon size={18} className="sm:w-5 sm:h-5 stroke-[2.2]" />
                  </div>
                  {mod.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mod.badgeColor} truncate max-w-[85px]`}>
                      {mod.badge}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 className="font-bold text-xs sm:text-sm text-[#f1f2f6] group-hover:text-[#55efc4] transition-colors line-clamp-1">
                  {mod.title}
                </h4>

                {/* Description */}
                <p className="text-[10px] sm:text-[11px] text-[#a29bfe]/70 mt-1 line-clamp-2 leading-tight">
                  {mod.description}
                </p>
              </div>

              {/* Action indicator */}
              <div className="flex items-center justify-end text-[10px] text-[#a29bfe] group-hover:text-white mt-2 pt-2 border-t border-[#2d2254]/50">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity font-semibold mr-1">Ouvrir</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform text-[#55efc4]" />
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};
