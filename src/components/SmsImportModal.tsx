import React, { useState } from 'react';
import { MessageSquare, ArrowDownToLine, X, Sparkles, Check, Send, AlertCircle } from 'lucide-react';
import { User } from '../types';
import { parseIncomingSms } from '../utils/networkManager';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface SmsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerUser: User;
  onImportSms: (text: string) => void;
}

export const SmsImportModal: React.FC<SmsImportModalProps> = ({
  isOpen,
  onClose,
  partnerUser,
  onImportSms
}) => {
  const [smsContent, setSmsContent] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setSmsContent(text);
          triggerHaptic(30);
        }
      }
    } catch {
      // clipboard access error
    }
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsContent.trim()) return;

    const { cleanText } = parseIncomingSms(smsContent);
    onImportSms(cleanText);
    
    setIsSuccess(true);
    triggerHaptic([40, 40, 80]);
    soundEffects.playSent();

    setTimeout(() => {
      setIsSuccess(false);
      setSmsContent('');
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0b1c]/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-[#171230] border border-[#ff7675]/40 rounded-3xl p-5 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 border-b border-[#2d2254] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#ff7675]/20 border border-[#ff7675]/40 flex items-center justify-center text-[#ff7675]">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Importer un SMS reçu</h3>
              <p className="text-[10px] text-[#a29bfe]">Communication sans internet (Mode SMS)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#a29bfe] hover:text-white rounded-lg hover:bg-[#281e4b] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info card */}
        <div className="bg-[#1e173e] p-3 rounded-2xl border border-[#2d2254] mb-3 text-[11px] text-[#a29bfe] leading-relaxed flex items-start gap-2">
          <Sparkles size={14} className="text-[#ffeaa7] shrink-0 mt-0.5" />
          <span>
            Collez ici le SMS reçu de <strong>{partnerUser.name}</strong> pour l'intégrer automatiquement dans votre fil de discussion chiffré Mikayla.
          </span>
        </div>

        <form onSubmit={handleImport} className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[#a29bfe] font-semibold text-[11px]">Contenu du SMS :</label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[10px] text-[#55efc4] hover:underline font-bold"
              >
                Coller depuis le presse-papier
              </button>
            </div>
            <textarea
              value={smsContent}
              onChange={e => setSmsContent(e.target.value)}
              placeholder="Ex: [MK] Mon amour, je viens d'arriver ! ❤️"
              rows={4}
              className="w-full bg-[#130f26] border border-[#2d2254] rounded-2xl p-3 text-white placeholder:text-[#a29bfe]/40 focus:border-[#ff7675] outline-none text-xs resize-none"
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-[#a29bfe] hover:bg-[#281e4b] font-semibold text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!smsContent.trim() || isSuccess}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#ff7675] to-[#fd79a8] hover:opacity-90 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 transition-transform active:scale-95"
            >
              {isSuccess ? (
                <>
                  <Check size={15} />
                  <span>Importé !</span>
                </>
              ) : (
                <>
                  <ArrowDownToLine size={15} />
                  <span>Intégrer au Chat</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
