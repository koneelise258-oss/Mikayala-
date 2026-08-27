import React, { useState } from 'react';
import { 
  X, Ticket, Sparkles, Heart, Flame, Coffee, Lock, CheckCircle2, 
  Send, Plus, Clock, Gift, Award, ArrowRight, Check
} from 'lucide-react';
import { User, CoupleCoupon } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface CouponsModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupons: CoupleCoupon[];
  currentUser: User;
  partnerUser: User;
  onAddCoupon: (coupon: Omit<CoupleCoupon, 'id' | 'createdAt' | 'status'>) => void;
  onClaimCoupon: (couponId: string) => void;
  onRedeemCoupon: (couponId: string) => void;
  onShareCouponToChat: (coupon: CoupleCoupon) => void;
}

export const CouponsModal: React.FC<CouponsModalProps> = ({
  isOpen,
  onClose,
  coupons,
  currentUser,
  partnerUser,
  onAddCoupon,
  onClaimCoupon,
  onRedeemCoupon,
  onShareCouponToChat
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'available' | 'claimed' | 'redeemed'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<CoupleCoupon['category']>('massage');
  const [newRecipient, setNewRecipient] = useState<string>(partnerUser.id);
  const [newColorTheme, setNewColorTheme] = useState<string>('violet');

  if (!isOpen) return null;

  const filteredCoupons = coupons.filter(c => {
    if (activeFilter === 'available') return c.status === 'available';
    if (activeFilter === 'claimed') return c.status === 'claimed';
    if (activeFilter === 'redeemed') return c.status === 'redeemed';
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddCoupon({
      title: newTitle.trim(),
      description: newDescription.trim() || 'Bon d\'amour exclusif valable sans condition.',
      category: newCategory,
      icon: newCategory === 'massage' ? 'Sparkles' : newCategory === 'coquin' ? 'Flame' : newCategory === 'romantique' ? 'Heart' : 'Ticket',
      giverId: currentUser.id,
      recipientId: newRecipient,
      colorTheme: newColorTheme
    });

    soundEffects.playSent();
    triggerHaptic(40);
    setNewTitle('');
    setNewDescription('');
    setShowCreateForm(false);
  };

  const getThemeStyles = (theme: string) => {
    switch (theme) {
      case 'rose':
        return {
          border: 'border-[#fd79a8]/40',
          gradient: 'from-[#fd79a8]/20 to-[#e84393]/10',
          accent: 'text-[#fd79a8]',
          badge: 'bg-[#fd79a8]/20 text-[#fd79a8]',
          btn: 'bg-[#fd79a8] text-[#130f26]'
        };
      case 'emerald':
        return {
          border: 'border-[#00b894]/40',
          gradient: 'from-[#00b894]/20 to-[#00cec9]/10',
          accent: 'text-[#55efc4]',
          badge: 'bg-[#00b894]/20 text-[#55efc4]',
          btn: 'bg-[#00b894] text-[#130f26]'
        };
      case 'ruby':
        return {
          border: 'border-[#ff7675]/40',
          gradient: 'from-[#ff7675]/20 to-[#d63031]/10',
          accent: 'text-[#ff7675]',
          badge: 'bg-[#ff7675]/20 text-[#ff7675]',
          btn: 'bg-[#ff7675] text-white'
        };
      case 'amber':
        return {
          border: 'border-[#ffeaa7]/40',
          gradient: 'from-[#ffeaa7]/20 to-[#fdcb6e]/10',
          accent: 'text-[#ffeaa7]',
          badge: 'bg-[#ffeaa7]/20 text-[#ffeaa7]',
          btn: 'bg-[#ffeaa7] text-[#130f26]'
        };
      case 'violet':
      default:
        return {
          border: 'border-[#6c5ce7]/40',
          gradient: 'from-[#6c5ce7]/20 to-[#a29bfe]/10',
          accent: 'text-[#a29bfe]',
          badge: 'bg-[#6c5ce7]/20 text-[#a29bfe]',
          btn: 'bg-[#6c5ce7] text-white'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b1c]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#171230] text-[#f1f2f6] rounded-3xl w-full max-w-lg border border-[#2d2254] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#2d2254] flex items-center justify-between shrink-0 bg-[#1b1435]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#fd79a8] to-[#6c5ce7] flex items-center justify-center text-white shadow-lg">
              <Ticket size={22} className="rotate-[-15deg]" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-1.5">
                Bons de Couple & Privilèges
              </h3>
              <p className="text-xs text-[#a29bfe]">Vouchers exclusifs échangeables et honorables à deux</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#a29bfe] hover:text-white rounded-full hover:bg-[#281e4b] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Tabs & Add Button */}
        <div className="p-3 bg-[#130f26] border-b border-[#2d2254] flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1 bg-[#1b1435] p-1 rounded-xl border border-[#2d2254]">
            {(['all', 'available', 'claimed', 'redeemed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeFilter === tab
                    ? 'bg-[#00b894] text-[#130f26] shadow-sm'
                    : 'text-[#a29bfe] hover:text-white'
                }`}
              >
                {tab === 'all' && `Tous (${coupons.length})`}
                {tab === 'available' && `Dispos (${coupons.filter(c => c.status === 'available').length})`}
                {tab === 'claimed' && `Réclamés (${coupons.filter(c => c.status === 'claimed').length})`}
                {tab === 'redeemed' && `Validés (${coupons.filter(c => c.status === 'redeemed').length})`}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-3 py-1.5 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition-transform active:scale-95 shadow-md cursor-pointer"
          >
            <Plus size={15} />
            <span>Créer un Bon</span>
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          
          {/* Create Form Drawer */}
          {showCreateForm && (
            <form onSubmit={handleCreate} className="bg-[#1b1435] border border-[#6c5ce7]/50 rounded-2xl p-4 mb-4 space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 border-b border-[#2d2254]">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#55efc4] flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>Nouveau Bon d'Amour Privilège</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs text-[#a29bfe] hover:text-white"
                >
                  Annuler
                </button>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Titre du Bon</label>
                <input
                  type="text"
                  placeholder="ex: Massage du dos aux huiles chaudes..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white placeholder-[#a29bfe]/50 focus:outline-none focus:border-[#00b894]"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Détails & Conditions douces</label>
                <textarea
                  placeholder="Précisez la durée, l'ambiance ou les petites attentions incluses..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white placeholder-[#a29bfe]/50 focus:outline-none focus:border-[#00b894] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Catégorie</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="massage">Massage & Bien-être</option>
                    <option value="romantique">Romantique & Sortie</option>
                    <option value="coquin">Sensuel & Coquin</option>
                    <option value="quotidien">Câlin & Quotidien</option>
                    <option value="joker">Joker / Passe-droit</option>
                    <option value="secret">Désir Secret</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Couleur</label>
                  <select
                    value={newColorTheme}
                    onChange={(e) => setNewColorTheme(e.target.value)}
                    className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="violet">Violet Mystique</option>
                    <option value="rose">Rose Passion</option>
                    <option value="emerald">Émeraude Magique</option>
                    <option value="ruby">Rubis Chaud</option>
                    <option value="amber">Or & Ambre</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Gift size={15} />
                  <span>Offrir et Enregistrer ce Bon</span>
                </button>
              </div>
            </form>
          )}

          {/* Coupons List */}
          {filteredCoupons.length > 0 ? (
            filteredCoupons.map((coupon) => {
              const styles = getThemeStyles(coupon.colorTheme);
              const isGiver = coupon.giverId === currentUser.id;
              const isRecipient = coupon.recipientId === currentUser.id || coupon.recipientId === 'both';

              return (
                <div
                  key={coupon.id}
                  className={`relative bg-gradient-to-br ${styles.gradient} bg-[#1b1435] border ${styles.border} rounded-2xl p-4 shadow-lg overflow-hidden transition-all hover:scale-[1.01]`}
                >
                  {/* Decorative Ticket Cutout dots on sides */}
                  <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#130f26] border-r border-[#2d2254]" />
                  <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#130f26] border-l border-[#2d2254]" />

                  {/* Top Status & Category Badges */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles.badge}`}>
                      {coupon.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {coupon.status === 'available' && (
                        <span className="text-[10px] font-bold bg-[#00b894]/20 text-[#55efc4] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles size={10} />
                          <span>Disponible</span>
                        </span>
                      )}
                      {coupon.status === 'claimed' && (
                        <span className="text-[10px] font-bold bg-[#ffeaa7]/20 text-[#ffeaa7] px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <Clock size={10} />
                          <span>Réclamé • En attente</span>
                        </span>
                      )}
                      {coupon.status === 'redeemed' && (
                        <span className="text-[10px] font-bold bg-white/10 text-white/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 size={10} className="text-[#55efc4]" />
                          <span>Honoré & Validé</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="font-bold text-sm sm:text-base text-white mb-1 pr-4">
                    {coupon.title}
                  </h4>
                  <p className="text-xs text-[#a29bfe] leading-relaxed mb-3">
                    {coupon.description}
                  </p>

                  {/* Metadata */}
                  <div className="text-[10px] text-[#a29bfe]/80 flex items-center justify-between pb-3 border-b border-[#2d2254]/50 mb-3">
                    <span>
                      Offert par : <strong className="text-white">{isGiver ? 'Vous' : partnerUser.name}</strong>
                    </span>
                    <span>
                      Bénéficiaire : <strong className="text-white">{isRecipient ? 'Vous' : partnerUser.name}</strong>
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    {/* Share to chat */}
                    <button
                      onClick={() => onShareCouponToChat(coupon)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#130f26]/80 hover:bg-[#130f26] text-xs text-[#a29bfe] hover:text-white flex items-center gap-1 border border-[#2d2254] transition-colors cursor-pointer"
                      title="Partager dans la discussion"
                    >
                      <Send size={13} />
                      <span className="hidden sm:inline">Envoyer au chat</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {/* Recipient Claim button */}
                      {coupon.status === 'available' && (
                        <button
                          onClick={() => {
                            onClaimCoupon(coupon.id);
                            triggerHaptic(50);
                            soundEffects.playReaction();
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1 ${styles.btn}`}
                        >
                          <Gift size={13} />
                          <span>Réclamer ce Bon</span>
                        </button>
                      )}

                      {/* Giver Redeem / Validate button */}
                      {coupon.status === 'claimed' && (
                        <button
                          onClick={() => {
                            onRedeemCoupon(coupon.id);
                            triggerHaptic([60, 40, 100]);
                            soundEffects.playSent();
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00b894] hover:bg-[#00a884] text-[#130f26] shadow-md transition-transform active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <Check size={13} className="stroke-[3]" />
                          <span>Valider & Honorer</span>
                        </button>
                      )}

                      {coupon.status === 'redeemed' && (
                        <span className="text-xs text-[#55efc4] font-semibold flex items-center gap-1">
                          <Award size={14} />
                          <span>Souvenir Précieux</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 px-4">
              <Ticket size={36} className="mx-auto text-[#a29bfe]/40 mb-2" />
              <p className="text-sm font-semibold text-white mb-1">Aucun bon dans cette catégorie</p>
              <p className="text-xs text-[#a29bfe] mb-4">Créez votre premier privilège pour surprendre votre partenaire !</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Plus size={14} />
                <span>Créer un Bon d'Amour</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#130f26] border-t border-[#2d2254] text-center text-[11px] text-[#a29bfe]">
          <span>Chaque bon est un pacte d'amour et de complicité absolue entre vous deux 💜</span>
        </div>

      </div>
    </div>
  );
};
