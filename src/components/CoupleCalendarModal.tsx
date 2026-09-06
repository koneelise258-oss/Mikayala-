import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  MapPin, 
  Trash2, 
  X, 
  Check, 
  Heart, 
  Gift, 
  Sparkles, 
  Share2, 
  ChevronLeft, 
  ChevronRight, 
  Tag, 
  Bell, 
  Flame 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, EventData } from '../types';
import { triggerHaptic } from '../utils/security';
import { soundEffects } from '../utils/audio';
import { calendarService, CoupleEvent, INITIAL_CALENDAR_EVENTS } from '../services/calendarService';

interface CoupleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  partnerUser: User;
  coupleId?: string;
  onShareToChat?: (text: string) => void;
}

export const CoupleCalendarModal: React.FC<CoupleCalendarModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  partnerUser,
  coupleId = 'local_couple',
  onShareToChat
}) => {
  const [events, setEvents] = useState<CoupleEvent[]>(() => calendarService.getEvents());

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAddingEvent, setIsAddingEvent] = useState<boolean>(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTime, setNewTime] = useState('20:00');
  const [newLocation, setNewLocation] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<'date' | 'anniversary' | 'trip' | 'surprise' | 'intimate' | 'other'>('date');

  useEffect(() => {
    if (!isOpen) return;

    setEvents(calendarService.getEvents());
    calendarService.setup(coupleId, currentUser.id, (updated) => {
      setEvents(updated);
      soundEffects.playReceived();
      triggerHaptic(30);
    });

    return () => {
      calendarService.cleanup();
    };
  }, [isOpen, coupleId, currentUser.id]);

  if (!isOpen) return null;

  const categories = [
    { id: 'date', label: 'Rendez-vous Romantique', icon: Heart, color: '#fd79a8' },
    { id: 'anniversary', label: 'Anniversaire & Jalon', icon: Sparkles, color: '#ffeaa7' },
    { id: 'trip', label: 'Voyage & Escapade', icon: MapPin, color: '#00b894' },
    { id: 'surprise', label: 'Surprise Secrète', icon: Gift, color: '#6c5ce7' },
    { id: 'intimate', label: 'Moment Intime & Nuit', icon: Flame, color: '#ff7675' }
  ];

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const catObj = categories.find(c => c.id === newCategory);
    const newEvt: CoupleEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: newTitle.trim(),
      date: newDate,
      time: newTime,
      location: newLocation.trim() || 'Lieu intime',
      description: newDescription.trim(),
      category: newCategory,
      color: catObj ? catObj.color : '#fd79a8',
      createdBy: currentUser.id,
      createdAt: Date.now(),
      attendees: [{ userId: currentUser.id, status: 'going' }]
    };

    const updated = calendarService.addEvent(newEvt);
    setEvents(updated);
    setIsAddingEvent(false);
    setNewTitle('');
    setNewLocation('');
    setNewDescription('');
    triggerHaptic([50, 50, 100]);
    soundEffects.playSent();
    confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
  };

  const handleDeleteEvent = (id: string) => {
    triggerHaptic(30);
    const updated = calendarService.deleteEvent(id);
    setEvents(updated);
  };

  const handleShareEvent = (event: CoupleEvent) => {
    triggerHaptic(25);
    soundEffects.playSent();
    const shareText = `📅✨ *Rendez-vous Couple :* ${event.title}\n` +
      `🗓️ Date : ${new Date(event.date).toLocaleDateString('fr-FR')} à ${event.time}\n` +
      `📍 Lieu : ${event.location}\n` +
      (event.description ? `📝 "${event.description}"\n` : '') +
      `❤️ J'ai tellement hâte d'y être avec toi !`;
    
    if (onShareToChat) {
      onShareToChat(shareText);
    }
  };

  // Calendar calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
  const adjustedFirstDay = (firstDayOfMonth + 6) % 7; // 0 = Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const prevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const selectedDateEvents = events.filter(e => e.date === selectedDate);
  const upcomingEvents = events.filter(e => e.date >= new Date().toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#1b1435] border border-[#2d2254] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#171230] to-[#251948] border-b border-[#2d2254] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-[#00b894]/20 border border-[#00b894]/30 text-[#00b894]">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#f1f2f6] flex items-center gap-1.5">
                Calendrier d'Événements & Dates
              </h3>
              <p className="text-[11px] text-[#a29bfe]">
                {currentUser.name} & {partnerUser.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setNewDate(selectedDate);
                setIsAddingEvent(!isAddingEvent);
              }}
              className="flex items-center gap-1 bg-[#00b894] hover:bg-[#00a884] text-[#130f26] font-bold text-xs px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={15} />
              <span>{isAddingEvent ? 'Fermer' : 'Ajouter'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[#a29bfe] hover:text-white rounded-xl hover:bg-[#281e4b] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* Add Event Form */}
          {isAddingEvent && (
            <form onSubmit={handleAddEvent} className="p-4 rounded-2xl bg-[#130f26] border border-[#372863] space-y-3 animate-in fade-in duration-150">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#55efc4] flex items-center gap-1.5">
                <Plus size={14} />
                <span>Nouveau Rendez-vous de Couple</span>
              </h4>

              <div>
                <label className="text-[11px] text-[#a29bfe] block mb-1">Titre de l'événement</label>
                <input
                  type="text"
                  placeholder="Ex: Dîner romantique, Soirée massage, Cinéma..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#1b1435] border border-[#2d2254] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#55efc4]"
                  autoFocus
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#a29bfe] block mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full bg-[#1b1435] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#55efc4]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#a29bfe] block mb-1">Heure</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-[#1b1435] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#55efc4]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#a29bfe] block mb-1">Lieu</label>
                  <input
                    type="text"
                    placeholder="Ex: Chez nous, Restaurant..."
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-[#1b1435] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#55efc4]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#a29bfe] block mb-1">Catégorie</label>
                  <select
                    value={newCategory}
                    onChange={(e: any) => setNewCategory(e.target.value)}
                    className="w-full bg-[#1b1435] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#55efc4]"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-[#a29bfe] block mb-1">Description / Notes secrètes</label>
                <textarea
                  rows={2}
                  placeholder="Détails, tenue vestimentaire, vœux..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-[#1b1435] border border-[#2d2254] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#55efc4]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(false)}
                  className="px-3 py-1.5 text-xs text-[#a29bfe] hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-[#00b894] hover:bg-[#00a884] text-[#130f26] rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Ajouter au Calendrier</span>
                </button>
              </div>
            </form>
          )}

          {/* Month Navigation & Grid */}
          <div className="p-4 rounded-3xl bg-[#130f26] border border-[#2d2254]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-[#f1f2f6]">
                {monthNames[month]} {year}
              </h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={prevMonth}
                  className="p-1.5 text-[#a29bfe] hover:text-white rounded-lg hover:bg-[#281e4b] transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentMonthDate(new Date())}
                  className="px-2 py-1 text-[11px] font-bold text-[#55efc4] hover:bg-[#281e4b] rounded-lg transition-colors"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 text-[#a29bfe] hover:text-white rounded-lg hover:bg-[#281e4b] transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#a29bfe]/60 mb-2">
              <span>LUN</span>
              <span>MAR</span>
              <span>MER</span>
              <span>JEU</span>
              <span>VEN</span>
              <span>SAM</span>
              <span>DIM</span>
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: adjustedFirstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-9 sm:h-11 rounded-xl opacity-0" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isSelected = selectedDate === dateStr;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const dayEvents = events.filter(e => e.date === dateStr);

                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      triggerHaptic(15);
                    }}
                    className={`h-9 sm:h-11 rounded-xl p-1 flex flex-col items-center justify-between transition-all relative ${
                      isSelected
                        ? 'bg-[#6c5ce7] text-white font-bold ring-2 ring-[#a29bfe]'
                        : isToday
                        ? 'bg-[#281e4b] text-[#55efc4] font-bold border border-[#00b894]/40'
                        : 'hover:bg-[#1b1435] text-[#f1f2f6]'
                    }`}
                  >
                    <span className="text-xs leading-none mt-0.5">{dayNum}</span>
                    <div className="flex gap-0.5 mt-auto mb-0.5">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <span 
                          key={idx}
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: e.color || '#fd79a8' }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Events on Selected Date */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#a29bfe] flex items-center gap-1.5">
                <Clock size={13} className="text-[#55efc4]" />
                <span>Événements du {new Date(selectedDate).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              </h4>
              <span className="text-[10px] text-[#55efc4]">
                {selectedDateEvents.length} prévu(s)
              </span>
            </div>

            {selectedDateEvents.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#130f26]/60 border border-[#2d2254] text-center text-xs text-[#a29bfe]/60">
                <p>Aucun rendez-vous noté pour ce jour.</p>
                <button
                  onClick={() => {
                    setNewDate(selectedDate);
                    setIsAddingEvent(true);
                  }}
                  className="mt-2 text-[#00b894] font-bold hover:underline cursor-pointer"
                >
                  + Planifier un moment à deux
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDateEvents.map(evt => (
                  <div
                    key={evt.id}
                    className="p-3.5 rounded-2xl bg-[#130f26] border border-[#2d2254] hover:border-[#372863] transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2.5">
                        <div 
                          className="p-2 rounded-xl text-[#130f26] font-bold mt-0.5"
                          style={{ backgroundColor: evt.color || '#fd79a8' }}
                        >
                          <Heart size={15} />
                        </div>
                        <div>
                          <h5 className="font-bold text-sm text-[#f1f2f6]">{evt.title}</h5>
                          <div className="flex items-center gap-3 text-xs text-[#a29bfe] mt-0.5">
                            <span className="flex items-center gap-1 text-[#55efc4] font-semibold">
                              <Clock size={12} /> {evt.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {evt.location}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleShareEvent(evt)}
                          className="p-1.5 text-[#a29bfe] hover:text-[#55efc4] rounded-lg hover:bg-[#281e4b] transition-colors"
                          title="Partager dans le chat"
                        >
                          <Share2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="p-1.5 text-[#a29bfe] hover:text-[#ff7675] rounded-lg hover:bg-[#281e4b] transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {evt.description && (
                      <p className="text-xs text-[#a29bfe]/80 bg-[#1b1435] p-2 rounded-xl border border-[#2d2254]">
                        {evt.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prochains Rendez-vous Summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#a29bfe] mb-2.5 flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#ffeaa7]" />
              <span>Tous les prochains rendez-vous ({upcomingEvents.length})</span>
            </h4>
            <div className="space-y-2">
              {upcomingEvents.slice(0, 5).map(evt => (
                <div 
                  key={evt.id}
                  onClick={() => setSelectedDate(evt.date)}
                  className="p-2.5 rounded-xl bg-[#130f26] border border-[#2d2254] hover:border-[#6c5ce7] cursor-pointer flex items-center justify-between text-xs transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: evt.color || '#fd79a8' }}
                    />
                    <span className="font-semibold text-[#f1f2f6] truncate max-w-[200px]">{evt.title}</span>
                  </div>
                  <span className="text-[#a29bfe] text-[11px] font-medium">
                    {new Date(evt.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {evt.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#130f26] border-t border-[#2d2254] flex items-center justify-between text-xs text-[#a29bfe]">
          <span className="flex items-center gap-1 text-[11px]">
            <Sparkles size={13} className="text-[#ffeaa7]" />
            <span>Synchronisation automatique P2P & Cloud</span>
          </span>
          <span className="font-bold text-[#55efc4]">
            {events.length} moments enregistrés
          </span>
        </div>

      </div>
    </div>
  );
};
