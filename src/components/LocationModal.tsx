import React, { useState } from 'react';
import { X, MapPin, Navigation, Compass } from 'lucide-react';
import { LocationData } from '../types';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation: (location: LocationData) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, onSendLocation }) => {
  const [name, setName] = useState('Position actuelle');
  const [address, setAddress] = useState('Paris, Île-de-France, France');
  const [lat, setLat] = useState(48.8566);
  const [lng, setLng] = useState(2.3522);
  const [isGettingGps, setIsGettingGps] = useState(false);

  if (!isOpen) return null;

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      setIsGettingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setName('Ma position en direct');
          setAddress(`Coordonnées: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setIsGettingGps(false);
        },
        (err) => {
          console.warn('GPS error:', err);
          setIsGettingGps(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  };

  const handleSend = () => {
    onSendLocation({
      name: name.trim() || 'Position partagée',
      address: address.trim() || 'Position géographique',
      lat,
      lng
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#202c33] text-[#e9edef] rounded-2xl w-full max-w-md p-5 border border-[#374248] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#374248]">
          <div className="flex items-center gap-2 text-[#00a884]">
            <MapPin size={20} />
            <h3 className="font-semibold text-base text-[#e9edef]">Partager la localisation</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Map Preview Card */}
        <div className="my-4 rounded-xl overflow-hidden border border-[#374248] relative bg-[#111b21] h-40 flex items-center justify-center">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#00a884_1px,transparent_1px)] [background-size:16px_16px]"></div>
          
          {/* Stylized Map View */}
          <div className="z-10 flex flex-col items-center gap-2 text-center p-4">
            <div className="w-10 h-10 rounded-full bg-[#ea4335]/20 border-2 border-[#ea4335] flex items-center justify-center text-[#ea4335] shadow-lg animate-bounce">
              <MapPin size={22} />
            </div>
            <div>
              <p className="font-semibold text-sm text-[#e9edef]">{name}</p>
              <p className="text-xs text-[#8696a0]">{address}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isGettingGps}
            className="absolute bottom-2 right-2 bg-[#202c33] hover:bg-[#2a3942] border border-[#374248] text-xs text-[#00a884] px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md transition-all z-20"
          >
            <Navigation size={13} className={isGettingGps ? 'animate-spin' : ''} />
            <span>{isGettingGps ? 'Localisation...' : 'Actualiser GPS'}</span>
          </button>
        </div>

        {/* Form fields */}
        <div className="space-y-3 text-sm mb-4">
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Nom du lieu
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#111b21] border border-[#374248] rounded-xl px-3 py-2 text-[#e9edef] focus:border-[#00a884] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Adresse / Description
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#111b21] border border-[#374248] rounded-xl px-3 py-2 text-[#e9edef] focus:border-[#00a884] focus:outline-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[#374248]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21]"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-[#00a884] text-[#111b21] hover:bg-[#029070] shadow-md transition-all flex items-center gap-2"
          >
            <Compass size={16} />
            <span>Envoyer la position</span>
          </button>
        </div>
      </div>
    </div>
  );
};
