import React, { useState } from 'react';
import { X, Calendar, Clock, MapPin, AlignLeft } from 'lucide-react';
import { EventData, User } from '../types';

interface EventModalProps {
  isOpen: boolean;
  currentUser: User;
  onClose: () => void;
  onCreateEvent: (event: EventData) => void;
}

export const EventModal: React.FC<EventModalProps> = ({ isOpen, currentUser, onClose, onCreateEvent }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:30');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateEvent({
      title: title.trim(),
      date,
      time,
      location: location.trim() || 'À définir',
      description: description.trim(),
      attendees: [
        { userId: currentUser.id, status: 'going' }
      ]
    });

    setTitle('');
    setLocation('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-[#202c33] text-[#e9edef] rounded-2xl w-full max-w-md p-5 border border-[#374248] shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#374248]">
          <div className="flex items-center gap-2 text-[#00a884]">
            <Calendar size={20} />
            <h3 className="font-semibold text-base text-[#e9edef]">Créer un événement</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pt-4 space-y-3.5 pr-1 text-sm">
          {/* Nom de l'événement */}
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Nom de l'événement
            </label>
            <input
              type="text"
              placeholder="Ex: Dîner aux chandelles, Week-end..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#111b21] border border-[#374248] rounded-xl px-3.5 py-2 text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
              autoFocus
              required
            />
          </div>

          {/* Date & Heure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={13} /> Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#111b21] border border-[#374248] rounded-xl px-3 py-2 text-[#e9edef] focus:border-[#00a884] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={13} /> Heure
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-[#111b21] border border-[#374248] rounded-xl px-3 py-2 text-[#e9edef] focus:border-[#00a884] focus:outline-none"
              />
            </div>
          </div>

          {/* Lieu */}
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin size={13} /> Lieu (optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: Chez nous, Restaurant, Parc..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-[#111b21] border border-[#374248] rounded-xl px-3.5 py-2 text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlignLeft size={13} /> Description
            </label>
            <textarea
              rows={2}
              placeholder="Détails, tenue, ce qu'il faut apporter..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#111b21] border border-[#374248] rounded-xl px-3.5 py-2 text-[#e9edef] placeholder-[#8696a0] focus:border-[#00a884] focus:outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <div className="pt-3 flex justify-end gap-2 border-t border-[#374248]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl text-[#8696a0] hover:text-[#e9edef] hover:bg-[#111b21]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
                title.trim()
                  ? 'bg-[#00a884] text-[#111b21] hover:bg-[#029070] shadow-md'
                  : 'bg-[#2a3942] text-[#8696a0] cursor-not-allowed'
              }`}
            >
              Créer l'événement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
