import React, { useState } from 'react';
import { 
  Globe, 
  MessageSquare, 
  Radio, 
  Bluetooth, 
  Wifi, 
  Check, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  PhoneCall, 
  SignalHigh, 
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { NetworkMode, NetworkState, ProximityTech, User } from '../types';
import { connectProximityBluetooth, connectProximityWifiHotspot } from '../utils/networkManager';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';

interface NetworkModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  networkState: NetworkState;
  onSelectMode: (mode: NetworkMode, tech?: ProximityTech) => void;
  partnerUser: User;
}

export const NetworkModeModal: React.FC<NetworkModeModalProps> = ({
  isOpen,
  onClose,
  networkState,
  onSelectMode,
  partnerUser
}) => {
  const [isPairing, setIsPairing] = useState(false);
  const [pairingStatus, setPairingStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentMode = networkState?.mode || 'cloud';

  const handleModeChange = (mode: NetworkMode) => {
    triggerHaptic(40);
    soundEffects.playReaction();
    onSelectMode(mode);
  };

  const handlePairBluetooth = async () => {
    setIsPairing(true);
    setPairingStatus('Recherche du smartphone partenaire...');
    triggerHaptic([40, 40]);

    try {
      const result = await connectProximityBluetooth(partnerUser.name);
      setPairingStatus(result.message || 'Jumelage réussi !');
      soundEffects.playBiometricSuccess();
      triggerHaptic([60, 40, 100]);
      onSelectMode('proximity', 'bluetooth');
    } catch {
      setPairingStatus('Erreur lors du jumelage');
    } finally {
      setTimeout(() => setIsPairing(false), 800);
    }
  };

  const handleConnectWifi = async () => {
    setIsPairing(true);
    setPairingStatus('Synchronisation Wi-Fi Local Hotspot...');
    triggerHaptic([40, 40]);

    try {
      const result = await connectProximityWifiHotspot(partnerUser.name);
      setPairingStatus(result.message || 'Point Wi-Fi connecté !');
      soundEffects.playBiometricSuccess();
      triggerHaptic([60, 40, 100]);
      onSelectMode('proximity', 'wifi_hotspot');
    } catch {
      setPairingStatus('Erreur Wi-Fi Direct');
    } finally {
      setTimeout(() => setIsPairing(false), 800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0e0b1c]/90 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-[#171230] border border-[#2d2254] rounded-3xl p-5 shadow-2xl overflow-hidden flex flex-col text-xs">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 border-b border-[#2d2254] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#6c5ce7] via-[#00b894] to-[#fd79a8] flex items-center justify-center text-white shadow-md">
              <Radio size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Matrice Réseau Tri-Modes</h3>
              <p className="text-[10px] text-[#a29bfe]">Communication Avec & Sans Data Internet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#a29bfe] hover:text-white rounded-lg hover:bg-[#281e4b] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 3 Modes List */}
        <div className="space-y-2.5">
          {/* MODE 1: CLOUD / DATA */}
          <div
            onClick={() => handleModeChange('cloud')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              currentMode === 'cloud'
                ? 'bg-[#1e173e] border-[#00b894] shadow-[0_0_20px_rgba(0,184,148,0.2)] ring-1 ring-[#00b894]'
                : 'bg-[#130f26] border-[#2d2254] hover:border-[#6c5ce7]/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#00b894]/20 border border-[#00b894]/40 flex items-center justify-center text-[#00b894]">
                  <Globe size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-white text-xs">Mode 1 : DATA / CLOUD</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#00b894]/20 text-[#55efc4]">
                      Internet
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a29bfe] mt-0.5">
                    Distance illimitée via Supabase Realtime & WebSockets.
                  </p>
                </div>
              </div>
              {currentMode === 'cloud' && (
                <div className="w-5 h-5 rounded-full bg-[#00b894] text-[#130f26] flex items-center justify-center shrink-0">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-[#2d2254]/50 flex items-center justify-between text-[10px] text-[#a29bfe]">
              <span>Photos, Vidéos, Audios, Visio WebRTC</span>
              <span className="text-[#55efc4] font-semibold">● Connecté</span>
            </div>
          </div>

          {/* MODE 2: SMS DISTANCE */}
          <div
            onClick={() => handleModeChange('sms')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              currentMode === 'sms'
                ? 'bg-[#1e173e] border-[#ff7675] shadow-[0_0_20px_rgba(255,118,117,0.2)] ring-1 ring-[#ff7675]'
                : 'bg-[#130f26] border-[#2d2254] hover:border-[#ff7675]/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#ff7675]/20 border border-[#ff7675]/40 flex items-center justify-center text-[#ff7675]">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-white text-xs">Mode 2 : SMS DISTANCE</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#ff7675]/20 text-[#ff7675]">
                      0 Data
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a29bfe] mt-0.5">
                    Longue distance quand vous n'avez pas de forfait 4G/5G.
                  </p>
                </div>
              </div>
              {currentMode === 'sms' && (
                <div className="w-5 h-5 rounded-full bg-[#ff7675] text-white flex items-center justify-center shrink-0">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </div>

            <div className="mt-2 pt-2 border-t border-[#2d2254]/50 flex items-center justify-between text-[10px] text-[#a29bfe]">
              <span>Pont SMS natif avec bulles Mikayla</span>
              <span className="text-[#ffeaa7] font-semibold">Prêt pour {partnerUser?.name || 'Partenaire'}</span>
            </div>
          </div>

          {/* MODE 3: PROXIMITÉ PROCHE */}
          <div
            onClick={() => handleModeChange('proximity')}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              currentMode === 'proximity'
                ? 'bg-[#1e173e] border-[#6c5ce7] shadow-[0_0_20px_rgba(108,92,231,0.25)] ring-1 ring-[#6c5ce7]'
                : 'bg-[#130f26] border-[#2d2254] hover:border-[#6c5ce7]/60'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#6c5ce7]/20 border border-[#6c5ce7]/40 flex items-center justify-center text-[#a29bfe]">
                  <Bluetooth size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-white text-xs">Mode 3 : PROXIMITÉ PROCHE</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#6c5ce7]/20 text-[#a29bfe]">
                      Sans Internet
                    </span>
                  </div>
                  <p className="text-[11px] text-[#a29bfe] mt-0.5">
                    Bluetooth Direct & Wi-Fi Hotspot (maison, voiture, voyage).
                  </p>
                </div>
              </div>
              {currentMode === 'proximity' && (
                <div className="w-5 h-5 rounded-full bg-[#6c5ce7] text-white flex items-center justify-center shrink-0">
                  <Check size={12} strokeWidth={3} />
                </div>
              )}
            </div>

            {/* Sub-buttons for Proximity Pairing */}
            <div className="mt-3 pt-2.5 border-t border-[#2d2254]/50 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePairBluetooth();
                }}
                disabled={isPairing}
                className="flex-1 py-1.5 px-2 rounded-xl bg-[#130f26] border border-[#2d2254] hover:border-[#6c5ce7] text-[#a29bfe] hover:text-white flex items-center justify-center gap-1.5 text-[10px] font-semibold active:scale-95 transition-all"
              >
                <Bluetooth size={12} className="text-[#a29bfe]" />
                <span>Bluetooth Direct</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConnectWifi();
                }}
                disabled={isPairing}
                className="flex-1 py-1.5 px-2 rounded-xl bg-[#130f26] border border-[#2d2254] hover:border-[#00b894] text-[#a29bfe] hover:text-white flex items-center justify-center gap-1.5 text-[10px] font-semibold active:scale-95 transition-all"
              >
                <Wifi size={12} className="text-[#55efc4]" />
                <span>Wi-Fi Hotspot</span>
              </button>
            </div>

            {pairingStatus && (
              <p className="text-[10px] text-[#55efc4] mt-2 text-center animate-pulse">
                {pairingStatus}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-[#2d2254] flex items-center justify-between">
          <span className="text-[10px] text-[#a29bfe] flex items-center gap-1">
            <ShieldCheck size={12} className="text-[#00b894]" />
            Chiffrement de bout en bout actif
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#6c5ce7] hover:bg-[#5b4bc4] text-white font-bold text-xs"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
