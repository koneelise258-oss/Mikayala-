import React, { useState } from 'react';
import { X, Phone, Video, Search, Lock, Clock, ShieldCheck, Star, ChevronRight, Image, FileText, Link, Bell, Trash2, Edit3, Check, Loader2, User as UserIcon } from 'lucide-react';
import { User, Message, ChatSettings, CallType, UserProfile } from '../types';
import { profileService } from '../services/profileService';
import { formatLastSeen } from '../services/presenceService';
import { triggerHaptic } from '../utils/security';

interface ContactInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerUser: User;
  partnerProfile?: UserProfile | null;
  partnerNickname?: string | null;
  onNicknameUpdated?: () => void;
  coupleId?: string;
  messages: Message[];
  settings: ChatSettings;
  onUpdateSettings: (settings: ChatSettings) => void;
  onStartCall: (type: CallType) => void;
  onClearChat: () => void;
  onViewMedia: (msg: Message) => void;
  isPartnerOnline?: boolean;
  partnerLastSeen?: string | null;
}

export const ContactInfoModal: React.FC<ContactInfoModalProps> = ({
  isOpen,
  onClose,
  partnerUser,
  partnerProfile,
  partnerNickname,
  onNicknameUpdated,
  coupleId,
  messages,
  settings,
  onUpdateSettings,
  onStartCall,
  onClearChat,
  onViewMedia,
  isPartnerOnline = false,
  partnerLastSeen = null
}) => {
  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'docs' | 'links'>('media');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showEphemeralModal, setShowEphemeralModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Nickname states
  const [newNickname, setNewNickname] = useState(partnerNickname || '');
  const [isUpdatingNickname, setIsUpdatingNickname] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameSuccess, setNicknameSuccess] = useState(false);

  if (!isOpen) return null;

  const handleUpdateNickname = async () => {
    if (!coupleId || !partnerUser.id) return;
    const trimmed = newNickname.trim();
    if (!trimmed) {
      setNicknameError('Le surnom ne peut pas être vide');
      return;
    }
    if (trimmed.length > 50) {
      setNicknameError('Le surnom est trop long (max 50 caractères)');
      return;
    }
    
    setIsUpdatingNickname(true);
    setNicknameError(null);
    setNicknameSuccess(false);
    try {
      const result = await profileService.setPartnerNickname(coupleId, partnerUser.id, trimmed);
      if (result.success) {
        triggerHaptic(40);
        setNicknameSuccess(true);
        if (onNicknameUpdated) onNicknameUpdated();
        setTimeout(() => setNicknameSuccess(false), 3000);
      } else {
        setNicknameError(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err: any) {
      setNicknameError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsUpdatingNickname(false);
    }
  };

  const handleRemoveNickname = async () => {
    if (!coupleId || !partnerUser.id) return;
    
    setIsUpdatingNickname(true);
    setNicknameError(null);
    setNicknameSuccess(false);
    try {
      const result = await profileService.removePartnerNickname(coupleId, partnerUser.id);
      if (result.success) {
        triggerHaptic(40);
        setNewNickname('');
        setNicknameSuccess(true);
        if (onNicknameUpdated) onNicknameUpdated();
        setTimeout(() => setNicknameSuccess(false), 3000);
      } else {
        setNicknameError(result.error || 'Erreur lors de la suppression');
      }
    } catch (err: any) {
      setNicknameError(err.message || 'Erreur lors de la suppression');
    } finally {
      setIsUpdatingNickname(false);
    }
  };

  const mediaMessages = messages.filter(m => m.type === 'image' || m.type === 'video');
  const docMessages = messages.filter(m => m.type === 'document');
  const linkMessages = messages.filter(m => m.content && (m.content.includes('http://') || m.content.includes('https://')));
  const starredMessages = messages.filter(m => m.isStarred);

  const handleToggleLock = () => {
    if (settings.isLocked) {
      onUpdateSettings({ ...settings, isLocked: false, lockPin: undefined });
      setShowLockModal(false);
    } else {
      if (pinInput.length === 4) {
        onUpdateSettings({ ...settings, isLocked: true, lockPin: pinInput });
        setPinInput('');
        setShowLockModal(false);
      }
    }
  };

  const handleSetEphemeral = (seconds: number) => {
    onUpdateSettings({ ...settings, ephemeralDuration: seconds });
    setShowEphemeralModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0e14] flex flex-col select-none overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Top Bar Header */}
      <div className="bg-[#11141d]/90 backdrop-blur-xl text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 text-[#8e95a5] hover:text-white bg-white/5 hover:bg-white/10 rounded-full cursor-pointer transition-colors">
            <X size={18} />
          </button>
          <h2 className="font-bold text-sm tracking-tight">Infos du contact</h2>
        </div>
      </div>

      {/* Main Profile Info Header */}
      <div className="bg-[#0b0e14] p-6 flex flex-col items-center text-center border-b border-white/5">
        <div className="relative mb-4">
          <div className="w-32 h-32 rounded-full p-[3px] bg-gradient-to-tr from-[#fd79a8] via-[#a29bfe] to-[#6c5ce7] shadow-2xl flex items-center justify-center">
            <div className="w-full h-full rounded-full overflow-hidden bg-[#11141d]">
              {partnerUser.avatar ? (
                <img
                  src={partnerUser.avatar}
                  alt={partnerNickname || partnerProfile?.display_name || partnerUser.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#8e95a5]">
                  <UserIcon size={48} />
                </div>
              )}
            </div>
          </div>
          {isPartnerOnline && (
            <span className="absolute bottom-1 right-1 w-5 h-5 bg-[#00b894] border-3 border-[#0b0e14] rounded-full shadow-lg animate-pulse" />
          )}
        </div>
        
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-1">
          {partnerNickname || partnerProfile?.display_name || partnerUser.name}
        </h3>

        <p className="text-xs sm:text-sm text-[#8e95a5] font-medium">{partnerUser.phone}</p>
        
        <div className="mt-2.5">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            isPartnerOnline 
              ? 'bg-[#00b894]/10 text-[#00b894] border border-[#00b894]/20' 
              : 'bg-[#8e95a5]/10 text-[#8e95a5] border border-white/5'
          }`}>
            {isPartnerOnline 
              ? 'En ligne' 
              : partnerLastSeen 
                ? formatLastSeen(partnerLastSeen) 
                : 'Hors ligne'}
          </span>
        </div>

        {/* Private Nickname Section */}
        <div className="w-full mt-6 px-4 py-4 bg-[#11141d]/80 rounded-2xl border border-white/5 text-left">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#8e95a5] mb-3">
            Nom que je donne à mon partenaire
          </h4>
          
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => {
                    setNewNickname(e.target.value);
                    if (nicknameError) setNicknameError(null);
                  }}
                  placeholder="Surnom privé..."
                  className="w-full bg-[#171b26] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7]/30 transition-all"
                />
                {nicknameSuccess && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00b894] animate-pulse">
                    <Check size={18} />
                  </div>
                )}
              </div>
              
              <button
                onClick={handleUpdateNickname}
                disabled={isUpdatingNickname || !newNickname.trim()}
                className="p-2.5 bg-[#6c5ce7] hover:bg-[#5b4ddf] text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                title="Enregistrer le surnom"
              >
                {isUpdatingNickname ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              </button>

              {partnerNickname && (
                <button
                  onClick={handleRemoveNickname}
                  disabled={isUpdatingNickname}
                  className="p-2.5 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500/20 transition-all border border-red-500/20 cursor-pointer"
                  title="Effacer le surnom"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {nicknameError && (
              <p className="text-[11px] text-red-400 px-1">{nicknameError}</p>
            )}

            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#8e95a5]">
              <Edit3 size={10} />
              <span>Vrai nom : {partnerProfile?.display_name || partnerUser.name}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-6 mt-5">
          <button
            onClick={() => onStartCall('audio')}
            className="flex flex-col items-center gap-1.5 text-[11px] text-[#8e95a5] hover:text-white transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-full bg-white/5 border border-white/5 flex items-center justify-center transition-all group-hover:bg-white/10 group-hover:scale-105">
              <Phone size={18} className="text-[#a29bfe]" />
            </div>
            <span>Audio</span>
          </button>

          <button
            onClick={() => onStartCall('video')}
            className="flex flex-col items-center gap-1.5 text-[11px] text-[#8e95a5] hover:text-white transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-full bg-white/5 border border-white/5 flex items-center justify-center transition-all group-hover:bg-white/10 group-hover:scale-105">
              <Video size={18} className="text-[#a29bfe]" />
            </div>
            <span>Vidéo</span>
          </button>

          <button
            onClick={onClose}
            className="flex flex-col items-center gap-1.5 text-[11px] text-[#8e95a5] hover:text-white transition-all cursor-pointer group"
          >
            <div className="w-11 h-11 rounded-full bg-white/5 border border-white/5 flex items-center justify-center transition-all group-hover:bg-white/10 group-hover:scale-105">
              <Search size={18} className="text-[#a29bfe]" />
            </div>
            <span>Rechercher</span>
          </button>
        </div>
      </div>

      {/* Actu / Bio */}
      <div className="bg-[#11141d]/40 p-4 border-b border-white/5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#8e95a5] mb-1">Actu</h4>
        <p className="text-sm text-white font-medium">{partnerProfile?.bio || partnerUser.bio || "Aucun statut"}</p>
      </div>

      {/* Media, Links & Docs Section */}
      <div className="bg-[#0b0e14] p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8e95a5]">
            Médias, liens et documents
          </h4>
          <span className="text-xs text-[#8e95a5] font-semibold">{mediaMessages.length + docMessages.length + linkMessages.length}</span>
        </div>

        {/* Sub Tabs */}
        <div className="flex border-b border-white/5 text-xs mb-3.5">
          <button
            onClick={() => setActiveMediaTab('media')}
            className={`flex-1 py-2 text-center font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
              activeMediaTab === 'media' ? 'text-[#6c5ce7] border-[#6c5ce7]' : 'text-[#8e95a5] border-transparent hover:text-white'
            }`}
          >
            Médias ({mediaMessages.length})
          </button>
          <button
            onClick={() => setActiveMediaTab('docs')}
            className={`flex-1 py-2 text-center font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
              activeMediaTab === 'docs' ? 'text-[#6c5ce7] border-[#6c5ce7]' : 'text-[#8e95a5] border-transparent hover:text-white'
            }`}
          >
            Documents ({docMessages.length})
          </button>
          <button
            onClick={() => setActiveMediaTab('links')}
            className={`flex-1 py-2 text-center font-bold tracking-tight border-b-2 transition-all cursor-pointer ${
              activeMediaTab === 'links' ? 'text-[#6c5ce7] border-[#6c5ce7]' : 'text-[#8e95a5] border-transparent hover:text-white'
            }`}
          >
            Liens ({linkMessages.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeMediaTab === 'media' && (
          mediaMessages.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {mediaMessages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => onViewMedia(msg)}
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer bg-white/5 border border-white/5 hover:opacity-80 transition-opacity"
                >
                  <img src={msg.mediaUrl} alt="Média" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8e95a5] py-3 text-center">Aucun média partagé</p>
          )
        )}

        {activeMediaTab === 'docs' && (
          docMessages.length > 0 ? (
            <div className="space-y-2">
              {docMessages.map(msg => (
                <div key={msg.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#11141d] text-sm border border-white/5">
                  <FileText size={20} className="text-[#6c5ce7]" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold text-white">{msg.fileName || 'Fichier'}</p>
                    <p className="text-[11px] text-[#8e95a5]">{msg.fileSize || '1.2 Mo'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8e95a5] py-3 text-center">Aucun document partagé</p>
          )
        )}

        {activeMediaTab === 'links' && (
          linkMessages.length > 0 ? (
            <div className="space-y-2">
              {linkMessages.map(msg => (
                <div key={msg.id} className="p-2.5 rounded-xl bg-[#11141d] text-xs border border-white/5">
                  <div className="flex items-center gap-2 text-[#a29bfe] font-semibold truncate">
                    <Link size={14} />
                    <span className="truncate">{msg.content}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8e95a5] py-3 text-center">Aucun lien partagé</p>
          )
        )}
      </div>

      {/* Settings list items */}
      <div className="bg-[#0b0e14] divide-y divide-white/5 border-t border-b border-white/5">
        {/* Starred Messages */}
        <div className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors">
          <div className="flex items-center gap-3 text-sm text-white font-medium">
            <Star size={18} className="text-[#8e95a5]" />
            <span>Messages importants</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8e95a5]">
            <span className="font-bold">{starredMessages.length}</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* Disappearing Messages */}
        <div
          onClick={() => setShowEphemeralModal(true)}
          className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 text-sm text-white font-medium">
            <Clock size={18} className="text-[#8e95a5]" />
            <div>
              <p>Messages éphémères</p>
              <p className="text-xs text-[#8e95a5] mt-0.5">
                {settings.ephemeralDuration === 0 ? 'Désactivé' : `${settings.ephemeralDuration / 86400} jours`}
              </p>
            </div>
          </div>
          <ChevronRight size={14} className="text-[#8e95a5]" />
        </div>

        {/* Chat Lock */}
        <div
          onClick={() => setShowLockModal(true)}
          className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 text-sm text-white font-medium">
            <Lock size={18} className={settings.isLocked ? 'text-[#6c5ce7]' : 'text-[#8e95a5]'} />
            <div>
              <p>Verrouillage de la discussion</p>
              <p className="text-xs text-[#8e95a5] mt-0.5">
                {settings.isLocked ? 'Verrouillée avec code PIN' : 'Désactivé'}
              </p>
            </div>
          </div>
          <ChevronRight size={14} className="text-[#8e95a5]" />
        </div>

        {/* Encryption Verification */}
        <div
          onClick={() => setShowSecurityModal(true)}
          className="px-4 py-3.5 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3 text-sm text-white font-medium">
            <ShieldCheck size={18} className="text-[#6c5ce7]" />
            <div>
              <p>Chiffrement</p>
              <p className="text-xs text-[#8e95a5] mt-0.5">Les messages et appels sont chiffrés de bout en bout</p>
            </div>
          </div>
          <ChevronRight size={14} className="text-[#8e95a5]" />
        </div>

        {/* Clear Chat */}
        <div
          onClick={() => {
            if (confirm('Voulez-vous vraiment effacer tous les messages de cette discussion ?')) {
              onClearChat();
            }
          }}
          className="px-4 py-3.5 flex items-center gap-3 text-sm text-red-400 font-bold hover:bg-white/5 cursor-pointer transition-colors"
        >
          <Trash2 size={18} />
          <span>Vider la discussion</span>
        </div>
      </div>

      {/* Security Code Verification Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[#11141d] rounded-2xl w-full max-w-sm p-6 border border-white/5 text-center shadow-2xl">
            <ShieldCheck size={40} className="text-[#6c5ce7] mx-auto mb-3" />
            <h3 className="font-bold text-base text-white">Vérifier le code de sécurité</h3>
            <p className="text-xs text-[#8e95a5] mt-2 mb-4">
              Pour vérifier que vos messages et appels avec {partnerUser.name} sont chiffrés de bout en bout, comparez ce numéro :
            </p>

            <div className="bg-[#171b26] p-3 rounded-xl border border-white/5 font-mono text-xs text-[#a29bfe] tracking-widest leading-relaxed mb-4 select-all">
              49821 78923 10928 44719<br />
              88371 66201 94820 11928<br />
              09182 38472 55910 28471
            </div>

            <button
              onClick={() => setShowSecurityModal(false)}
              className="w-full py-2.5 bg-[#6c5ce7] hover:bg-[#5b4ddf] text-white font-bold text-sm rounded-xl transition-all cursor-pointer shadow-md"
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {/* Ephemeral Modal */}
      {showEphemeralModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[#11141d] rounded-2xl w-full max-w-sm p-5 border border-white/5 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-3">Délai des messages éphémères</h3>
            
            <div className="space-y-2 text-sm">
              {[
                { label: '24 heures', val: 86400 },
                { label: '7 jours', val: 604800 },
                { label: '90 jours', val: 7776000 },
                { label: 'Désactivé', val: 0 }
              ].map(item => (
                <button
                  key={item.val}
                  onClick={() => handleSetEphemeral(item.val)}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    settings.ephemeralDuration === item.val
                      ? 'bg-[#6c5ce7]/20 text-[#a29bfe] font-semibold border border-[#6c5ce7]/30'
                      : 'hover:bg-white/5 text-[#8e95a5] hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {settings.ephemeralDuration === item.val && <div className="w-2 h-2 rounded-full bg-[#6c5ce7]" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowEphemeralModal(false)}
              className="mt-4 w-full py-2 text-xs text-[#8e95a5] hover:text-white cursor-pointer transition-colors text-center font-semibold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Lock PIN Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-100">
          <div className="bg-[#11141d] rounded-2xl w-full max-w-sm p-5 border border-white/5 shadow-2xl">
            <h3 className="font-bold text-base text-white mb-2">
              {settings.isLocked ? 'Désactiver le verrouillage' : 'Définir un code PIN (4 chiffres)'}
            </h3>
            <p className="text-xs text-[#8e95a5] mb-4">
              {settings.isLocked
                ? 'Cette discussion est protégée. Cliquez ci-dessous pour déverrouiller.'
                : 'Protégez l’accès à cette discussion privée avec un code secret.'}
            </p>

            {!settings.isLocked && (
              <input
                type="password"
                maxLength={4}
                placeholder="Ex: 1234"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-[#171b26] border border-white/5 rounded-xl px-3 py-2.5 text-center text-lg font-mono text-[#a29bfe] mb-4 tracking-widest focus:outline-none focus:border-[#6c5ce7] transition-all"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="flex-1 py-2.5 text-xs text-[#8e95a5] hover:text-white cursor-pointer font-semibold transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleToggleLock}
                disabled={!settings.isLocked && pinInput.length !== 4}
                className="flex-1 py-2.5 bg-[#6c5ce7] hover:bg-[#5b4ddf] text-white font-bold text-xs rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                {settings.isLocked ? 'Déverrouiller' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
