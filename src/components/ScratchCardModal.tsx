import React, { useState } from 'react';
import { X, Sparkles, Image, Send, Lock, Eye, Palette } from 'lucide-react';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface ScratchCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendScratchCard: (data: {
    title: string;
    secretContent: string;
    secretMediaUrl?: string;
    scratchColor: 'gold' | 'silver' | 'ruby' | 'emerald';
  }) => void;
}

export const ScratchCardModal: React.FC<ScratchCardModalProps> = ({
  isOpen,
  onClose,
  onSendScratchCard
}) => {
  const [title, setTitle] = useState('Surprise Secrète ✨');
  const [secretContent, setSecretContent] = useState('');
  const [secretMediaUrl, setSecretMediaUrl] = useState('');
  const [scratchColor, setScratchColor] = useState<'gold' | 'silver' | 'ruby' | 'emerald'>('gold');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretContent.trim() && !secretMediaUrl.trim()) return;

    onSendScratchCard({
      title: title.trim() || 'Message à Gratter',
      secretContent: secretContent.trim() || 'Une douce pensée pour toi...',
      secretMediaUrl: secretMediaUrl.trim() || undefined,
      scratchColor
    });

    triggerHaptic(40);
    soundEffects.playSent();
    onClose();
  };

  const SAMPLE_IDEAS = [
    "Ce soir, c'est moi qui m'occupe de tout pour toi... 🍷🕯️",
    "Garde ce secret : tu es la plus belle chose de ma vie 💋",
    "Rendez-vous à 21h dans notre sanctuaire avec une coupe de champagne ✨",
    "Bon pour un massage ultra-sensuel sans limite de temps 💆‍♂️🔥"
  ];

  return (
    <div className="fixed inset-0 z-50 bg-[#0e0b1c]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-[#171230] text-[#f1f2f6] rounded-3xl w-full max-w-md border border-[#2d2254] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-[#2d2254] flex items-center justify-between shrink-0 bg-[#1b1435]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#ffeaa7] to-[#fdcb6e] flex items-center justify-center text-[#130f26] shadow-lg">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                Créer un Message à Gratter
              </h3>
              <p className="text-xs text-[#a29bfe]">Masqué sous une couche métallisée à gratter au doigt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#a29bfe] hover:text-white rounded-full hover:bg-[#281e4b] transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          
          <div>
            <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Titre de la carte</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Secret pour ce soir..."
              className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white placeholder-[#a29bfe]/50 focus:outline-none focus:border-[#00b894]"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Texte secret caché</label>
            <textarea
              value={secretContent}
              onChange={(e) => setSecretContent(e.target.value)}
              placeholder="Écrivez le mot doux, la surprise intime ou la déclaration secrète..."
              rows={3}
              className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white placeholder-[#a29bfe]/50 focus:outline-none focus:border-[#00b894] resize-none"
              required
            />
          </div>

          {/* Quick Ideas */}
          <div>
            <span className="text-[10px] font-semibold text-[#a29bfe] block mb-1">Idées inspirantes :</span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_IDEAS.map((idea, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSecretContent(idea)}
                  className="text-[10px] bg-[#1b1435] hover:bg-[#281e4b] border border-[#2d2254] text-[#a29bfe] hover:text-white px-2 py-1 rounded-lg transition-colors text-left"
                >
                  {idea.slice(0, 32)}...
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Photo secrète cachée (facultatif)</label>
            <input
              type="url"
              value={secretMediaUrl}
              onChange={(e) => setSecretMediaUrl(e.target.value)}
              placeholder="URL de l'image (https://...)"
              className="w-full bg-[#130f26] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white placeholder-[#a29bfe]/50 focus:outline-none focus:border-[#00b894]"
            />
          </div>

          {/* Foil Color Selection */}
          <div>
            <label className="text-[11px] font-semibold text-[#a29bfe] block mb-1">Vernis à gratter</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'gold', name: 'Or Pur', bg: 'bg-gradient-to-r from-[#d4af37] to-[#f9ca24] text-[#130f26]' },
                { id: 'silver', name: 'Argent', bg: 'bg-gradient-to-r from-[#bdc3c7] to-[#ecf0f1] text-[#130f26]' },
                { id: 'ruby', name: 'Rubis', bg: 'bg-gradient-to-r from-[#e84393] to-[#fd79a8] text-white' },
                { id: 'emerald', name: 'Émeraude', bg: 'bg-gradient-to-r from-[#00b894] to-[#55efc4] text-[#130f26]' }
              ].map((f) => (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => setScratchColor(f.id as any)}
                  className={`p-2 rounded-xl text-center font-bold text-[11px] shadow-sm transition-all cursor-pointer ${f.bg} ${
                    scratchColor === f.id ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Send size={15} />
              <span>Envoyer le Message à Gratter</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
