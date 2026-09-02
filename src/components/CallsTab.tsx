import React, { useState } from 'react';
import { User, CallRecord, CallType } from '../types';
import { Link2, Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Copy, Check, Sparkles, Heart } from 'lucide-react';
import { formatTime, formatDateDivider, formatDuration } from '../utils/formatters';

interface CallsTabProps {
  currentUser: User;
  partnerUser: User;
  calls: CallRecord[];
  onStartCall: (type: CallType) => void;
}

export const CallsTab: React.FC<CallsTabProps> = ({
  currentUser,
  partnerUser,
  calls,
  onStartCall
}) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const callLink = `https://mikayala.app/duo/${partnerUser.id}-${Date.now().toString(36)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(callLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#130f26] flex flex-col select-none">
      {/* Create Call Link Banner */}
      <div
        onClick={() => setShowLinkModal(true)}
        className="flex items-center px-4 py-3.5 cursor-pointer bg-[#1b1435] hover:bg-[#231a44] transition-colors border-b border-[#2d2254]"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00b894] to-[#6c5ce7] flex items-center justify-center text-[#130f26] mr-4 shrink-0 shadow-md">
          <Link2 size={22} className="rotate-45 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-[#f1f2f6]">Créer un salon d'appel privé</h3>
          <p className="text-xs text-[#a29bfe]">Lien chiffré de bout en bout pour votre duo</p>
        </div>
      </div>

      {/* Recents Section Header */}
      <div className="px-4 py-2.5 bg-[#130f26]">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#a29bfe]">Historique des Appels</h4>
      </div>

      {/* Calls List */}
      <div className="divide-y divide-[#2d2254]/40">
        {calls.map((call) => {
          const isCaller = call.callerId === currentUser.id;

          const renderStatusIcon = () => {
            if (call.status === 'missed') {
              return <PhoneMissed size={15} className="text-[#ff7675] shrink-0" />;
            }
            if (isCaller) {
              return <PhoneOutgoing size={15} className="text-[#00b894] shrink-0" />;
            }
            return <PhoneIncoming size={15} className="text-[#55efc4] shrink-0" />;
          };

          return (
            <div
              key={call.id}
              className="flex items-center px-4 py-3.5 hover:bg-[#1b1435] transition-colors"
            >
              {/* Avatar */}
              <img
                src={partnerUser.avatar}
                alt={partnerUser.name}
                className="w-12 h-12 rounded-2xl object-cover mr-4 shrink-0 border border-[#2d2254]"
              />

              {/* Call Details */}
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-sm truncate ${call.status === 'missed' ? 'text-[#ff7675]' : 'text-[#f1f2f6]'}`}>
                  {partnerUser.name}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-[#a29bfe] mt-0.5">
                  {renderStatusIcon()}
                  <span>{formatDateDivider(call.timestamp)}, {formatTime(call.timestamp)}</span>
                  {call.duration && (
                    <span>• {formatDuration(call.duration)}</span>
                  )}
                </div>
              </div>

              {/* Direct Call Button */}
              <button
                onClick={() => onStartCall(call.type)}
                className="p-2.5 text-[#00b894] hover:bg-[#281e4b] rounded-2xl transition-colors ml-2 cursor-pointer"
                title={call.type === 'video' ? 'Appel vidéo intime' : 'Appel vocal'}
              >
                {call.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Call Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 bg-[#0e0b1c]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#171230] text-[#f1f2f6] rounded-3xl w-full max-w-sm p-5 border border-[#2d2254] shadow-2xl">
            <h3 className="font-bold text-base text-white mb-1.5">Lien d'appel chiffré Mikayla</h3>
            <p className="text-xs text-[#a29bfe] mb-4">
              Lien direct sécurisé réservé exclusivement à votre duo intime.
            </p>

            <div className="bg-[#130f26] p-3 rounded-2xl border border-[#2d2254] flex items-center justify-between gap-2 mb-4">
              <span className="text-xs text-[#55efc4] truncate font-mono">{callLink}</span>
              <button
                onClick={handleCopyLink}
                className="text-[#a29bfe] hover:text-white p-1.5 rounded-xl hover:bg-[#281e4b] transition-colors cursor-pointer"
                title="Copier"
              >
                {copied ? <Check size={16} className="text-[#00b894]" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowLinkModal(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-[#a29bfe] hover:text-white rounded-xl hover:bg-[#1f1742] transition-colors cursor-pointer"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  onStartCall('video');
                }}
                className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-[#00b894] text-[#130f26] hover:bg-[#00a884] shadow-md transition-colors cursor-pointer"
              >
                Lancer l'appel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
