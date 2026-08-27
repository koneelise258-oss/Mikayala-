import React, { useState } from 'react';
import { X, Phone, Video, Search, Lock, Clock, ShieldCheck, Star, ChevronRight, Image, FileText, Link, Bell, Trash2 } from 'lucide-react';
import { User, Message, ChatSettings, CallType } from '../types';

interface ContactInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  partnerUser: User;
  messages: Message[];
  settings: ChatSettings;
  onUpdateSettings: (settings: ChatSettings) => void;
  onStartCall: (type: CallType) => void;
  onClearChat: () => void;
  onViewMedia: (msg: Message) => void;
}

export const ContactInfoModal: React.FC<ContactInfoModalProps> = ({
  isOpen,
  onClose,
  partnerUser,
  messages,
  settings,
  onUpdateSettings,
  onStartCall,
  onClearChat,
  onViewMedia
}) => {
  const [activeMediaTab, setActiveMediaTab] = useState<'media' | 'docs' | 'links'>('media');
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showEphemeralModal, setShowEphemeralModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [pinInput, setPinInput] = useState('');

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 bg-[#111b21] flex flex-col select-none overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Top Bar Header */}
      <div className="bg-[#202c33] text-[#e9edef] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-full">
            <X size={22} />
          </button>
          <h2 className="font-semibold text-base">Infos du contact</h2>
        </div>
      </div>

      {/* Main Profile Info Header */}
      <div className="bg-[#111b21] p-6 flex flex-col items-center text-center border-b border-[#222e35]">
        <img
          src={partnerUser.avatar}
          alt={partnerUser.name}
          className="w-32 h-32 rounded-full object-cover border-2 border-[#374248] shadow-xl mb-3"
        />
        <h3 className="text-xl font-bold text-[#e9edef]">{partnerUser.name}</h3>
        <p className="text-sm text-[#8696a0] mt-0.5">{partnerUser.phone}</p>
        <span className="text-xs text-[#00a884] font-medium mt-1">
          {partnerUser.isOnline ? 'En ligne' : `Vu à ${partnerUser.lastSeen}`}
        </span>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-6 mt-5">
          <button
            onClick={() => onStartCall('audio')}
            className="flex flex-col items-center gap-1.5 text-xs text-[#00a884] hover:opacity-80 transition-opacity"
          >
            <div className="w-11 h-11 rounded-full bg-[#202c33] border border-[#374248] flex items-center justify-center">
              <Phone size={20} />
            </div>
            <span>Audio</span>
          </button>

          <button
            onClick={() => onStartCall('video')}
            className="flex flex-col items-center gap-1.5 text-xs text-[#00a884] hover:opacity-80 transition-opacity"
          >
            <div className="w-11 h-11 rounded-full bg-[#202c33] border border-[#374248] flex items-center justify-center">
              <Video size={20} />
            </div>
            <span>Vidéo</span>
          </button>

          <button
            onClick={onClose}
            className="flex flex-col items-center gap-1.5 text-xs text-[#00a884] hover:opacity-80 transition-opacity"
          >
            <div className="w-11 h-11 rounded-full bg-[#202c33] border border-[#374248] flex items-center justify-center">
              <Search size={20} />
            </div>
            <span>Rechercher</span>
          </button>
        </div>
      </div>

      {/* Actu / Bio */}
      <div className="bg-[#111b21] p-4 border-b border-[#222e35]">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8696a0] mb-1">Actu</h4>
        <p className="text-sm text-[#e9edef]">{partnerUser.bio}</p>
      </div>

      {/* Media, Links & Docs Section */}
      <div className="bg-[#111b21] p-4 border-b border-[#222e35]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8696a0]">
            Médias, liens et documents
          </h4>
          <span className="text-xs text-[#8696a0]">{mediaMessages.length + docMessages.length + linkMessages.length}</span>
        </div>

        {/* Sub Tabs */}
        <div className="flex border-b border-[#222e35] text-xs mb-3">
          <button
            onClick={() => setActiveMediaTab('media')}
            className={`flex-1 py-2 text-center font-medium border-b-2 ${
              activeMediaTab === 'media' ? 'text-[#00a884] border-[#00a884]' : 'text-[#8696a0] border-transparent'
            }`}
          >
            Médias ({mediaMessages.length})
          </button>
          <button
            onClick={() => setActiveMediaTab('docs')}
            className={`flex-1 py-2 text-center font-medium border-b-2 ${
              activeMediaTab === 'docs' ? 'text-[#00a884] border-[#00a884]' : 'text-[#8696a0] border-transparent'
            }`}
          >
            Documents ({docMessages.length})
          </button>
          <button
            onClick={() => setActiveMediaTab('links')}
            className={`flex-1 py-2 text-center font-medium border-b-2 ${
              activeMediaTab === 'links' ? 'text-[#00a884] border-[#00a884]' : 'text-[#8696a0] border-transparent'
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
                  className="aspect-square rounded-lg overflow-hidden cursor-pointer bg-[#202c33] border border-[#374248] hover:opacity-80 transition-opacity"
                >
                  <img src={msg.mediaUrl} alt="Média" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8696a0] py-3 text-center">Aucun média partagé</p>
          )
        )}

        {activeMediaTab === 'docs' && (
          docMessages.length > 0 ? (
            <div className="space-y-2">
              {docMessages.map(msg => (
                <div key={msg.id} className="flex items-center gap-3 p-2 rounded-xl bg-[#202c33] text-sm">
                  <FileText size={20} className="text-[#00a884]" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-semibold text-[#e9edef]">{msg.fileName || 'Fichier'}</p>
                    <p className="text-[11px] text-[#8696a0]">{msg.fileSize || '1.2 Mo'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8696a0] py-3 text-center">Aucun document partagé</p>
          )
        )}

        {activeMediaTab === 'links' && (
          linkMessages.length > 0 ? (
            <div className="space-y-2">
              {linkMessages.map(msg => (
                <div key={msg.id} className="p-2 rounded-xl bg-[#202c33] text-xs">
                  <div className="flex items-center gap-2 text-[#53bdeb] font-semibold truncate">
                    <Link size={14} />
                    <span className="truncate">{msg.content}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#8696a0] py-3 text-center">Aucun lien partagé</p>
          )
        )}
      </div>

      {/* Settings list items */}
      <div className="bg-[#111b21] divide-y divide-[#222e35]">
        {/* Starred Messages */}
        <div className="px-4 py-3.5 flex items-center justify-between hover:bg-[#202c33] cursor-pointer">
          <div className="flex items-center gap-3 text-sm text-[#e9edef]">
            <Star size={20} className="text-[#8696a0]" />
            <span>Messages importants</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8696a0]">
            <span>{starredMessages.length}</span>
            <ChevronRight size={16} />
          </div>
        </div>

        {/* Disappearing Messages */}
        <div
          onClick={() => setShowEphemeralModal(true)}
          className="px-4 py-3.5 flex items-center justify-between hover:bg-[#202c33] cursor-pointer"
        >
          <div className="flex items-center gap-3 text-sm text-[#e9edef]">
            <Clock size={20} className="text-[#8696a0]" />
            <div>
              <p>Messages éphémères</p>
              <p className="text-xs text-[#8696a0]">
                {settings.ephemeralDuration === 0 ? 'Désactivé' : `${settings.ephemeralDuration / 86400} jours`}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#8696a0]" />
        </div>

        {/* Chat Lock */}
        <div
          onClick={() => setShowLockModal(true)}
          className="px-4 py-3.5 flex items-center justify-between hover:bg-[#202c33] cursor-pointer"
        >
          <div className="flex items-center gap-3 text-sm text-[#e9edef]">
            <Lock size={20} className={settings.isLocked ? 'text-[#00a884]' : 'text-[#8696a0]'} />
            <div>
              <p>Verrouillage de la discussion</p>
              <p className="text-xs text-[#8696a0]">
                {settings.isLocked ? 'Verrouillée avec code PIN' : 'Désactivé'}
              </p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#8696a0]" />
        </div>

        {/* Encryption Verification */}
        <div
          onClick={() => setShowSecurityModal(true)}
          className="px-4 py-3.5 flex items-center justify-between hover:bg-[#202c33] cursor-pointer"
        >
          <div className="flex items-center gap-3 text-sm text-[#e9edef]">
            <ShieldCheck size={20} className="text-[#00a884]" />
            <div>
              <p>Chiffrement</p>
              <p className="text-xs text-[#8696a0]">Les messages et appels sont chiffrés de bout en bout</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#8696a0]" />
        </div>

        {/* Clear Chat */}
        <div
          onClick={() => {
            if (confirm('Voulez-vous vraiment effacer tous les messages de cette discussion ?')) {
              onClearChat();
            }
          }}
          className="px-4 py-3.5 flex items-center gap-3 text-sm text-[#ea4335] hover:bg-[#202c33] cursor-pointer"
        >
          <Trash2 size={20} />
          <span>Vider la discussion</span>
        </div>
      </div>

      {/* Security Code Verification Modal */}
      {showSecurityModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#202c33] rounded-2xl w-full max-w-sm p-6 border border-[#374248] text-center">
            <ShieldCheck size={40} className="text-[#00a884] mx-auto mb-3" />
            <h3 className="font-bold text-base text-[#e9edef]">Vérifier le code de sécurité</h3>
            <p className="text-xs text-[#8696a0] mt-2 mb-4">
              Pour vérifier que vos messages et appels avec {partnerUser.name} sont chiffrés de bout en bout, comparez ce numéro :
            </p>

            <div className="bg-[#111b21] p-3 rounded-xl border border-[#374248] font-mono text-xs text-[#00a884] tracking-widest leading-relaxed mb-4 select-all">
              49821 78923 10928 44719<br />
              88371 66201 94820 11928<br />
              09182 38472 55910 28471
            </div>

            <button
              onClick={() => setShowSecurityModal(false)}
              className="w-full py-2 bg-[#00a884] text-[#111b21] font-bold text-sm rounded-xl hover:bg-[#029070]"
            >
              Compris
            </button>
          </div>
        </div>
      )}

      {/* Ephemeral Modal */}
      {showEphemeralModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#202c33] rounded-2xl w-full max-w-sm p-5 border border-[#374248]">
            <h3 className="font-bold text-base text-[#e9edef] mb-3">Délai des messages éphémères</h3>
            
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
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors ${
                    settings.ephemeralDuration === item.val
                      ? 'bg-[#00a884]/20 text-[#00a884] font-semibold border border-[#00a884]/40'
                      : 'hover:bg-[#111b21] text-[#e9edef]'
                  }`}
                >
                  <span>{item.label}</span>
                  {settings.ephemeralDuration === item.val && <div className="w-2 h-2 rounded-full bg-[#00a884]" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowEphemeralModal(false)}
              className="mt-4 w-full py-2 text-xs text-[#8696a0] hover:text-[#e9edef]"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Lock PIN Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#202c33] rounded-2xl w-full max-w-sm p-5 border border-[#374248]">
            <h3 className="font-bold text-base text-[#e9edef] mb-2">
              {settings.isLocked ? 'Désactiver le verrouillage' : 'Définir un code PIN (4 chiffres)'}
            </h3>
            <p className="text-xs text-[#8696a0] mb-4">
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
                className="w-full bg-[#111b21] border border-[#374248] rounded-xl px-3 py-2 text-center text-lg font-mono text-[#00a884] mb-4 tracking-widest focus:outline-none"
              />
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowLockModal(false)}
                className="flex-1 py-2 text-xs text-[#8696a0] hover:text-[#e9edef]"
              >
                Annuler
              </button>
              <button
                onClick={handleToggleLock}
                disabled={!settings.isLocked && pinInput.length !== 4}
                className="flex-1 py-2 bg-[#00a884] text-[#111b21] font-bold text-xs rounded-xl hover:bg-[#029070] disabled:opacity-50"
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
