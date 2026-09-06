import { supabase, isSupabaseConfigured, safeCreateChannel } from '../lib/supabase';
import { EventData } from '../types';

export interface CoupleEvent extends EventData {
  id: string;
  category?: 'date' | 'anniversary' | 'trip' | 'surprise' | 'intimate' | 'other';
  color?: string;
  reminderMinutes?: number;
  notes?: string;
  createdBy?: string;
  createdAt?: number;
}

const STORAGE_KEY_CALENDAR_EVENTS = 'mikayala_couple_calendar_events';

export const INITIAL_CALENDAR_EVENTS: CoupleEvent[] = [
  {
    id: 'evt-1',
    title: 'Dîner aux chandelles & Vue panoramique',
    date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    time: '20:00',
    location: 'Restaurant Le Ciel de Paris',
    description: 'Une soirée en amoureux sans téléphone portable (juste Mikayla !)',
    category: 'date',
    color: '#fd79a8',
    attendees: []
  },
  {
    id: 'evt-2',
    title: 'Notre Anniversaire de Rencontre 💖',
    date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
    time: '19:30',
    location: 'Lieu secret surprise',
    description: 'Célébration de notre amour, échange de cadeaux et de vœux intimes.',
    category: 'anniversary',
    color: '#ffeaa7',
    attendees: []
  },
  {
    id: 'evt-3',
    title: 'Week-end Spa & Déconnexion',
    date: new Date(Date.now() + 86400000 * 28).toISOString().split('T')[0],
    time: '14:00',
    location: 'Château & Spa Thermal',
    description: 'Massage en duo, bain bouillonnant et nuit magique.',
    category: 'trip',
    color: '#00b894',
    attendees: []
  }
];

export type CalendarUpdateCallback = (events: CoupleEvent[]) => void;

class CalendarService {
  private coupleId: string = '';
  private currentUserId: string = '';
  private localBroadcastChannel: BroadcastChannel | null = null;
  private realtimeChannel: any = null;
  private onUpdateCallback: CalendarUpdateCallback | null = null;

  public setup(coupleId: string, currentUserId: string, onUpdate?: CalendarUpdateCallback) {
    this.coupleId = coupleId;
    this.currentUserId = currentUserId;
    if (onUpdate) {
      this.onUpdateCallback = onUpdate;
    }

    // 1. Cross-tab BroadcastChannel for immediate local & offline syncing
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (this.localBroadcastChannel) {
          this.localBroadcastChannel.close();
        }
        this.localBroadcastChannel = new BroadcastChannel(`mikayala_calendar_channel_${coupleId || 'local'}`);
        this.localBroadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'sync_events' && Array.isArray(event.data.events)) {
            if (event.data.senderId !== this.currentUserId) {
              this.applyEventsUpdate(event.data.events, false);
            }
          }
        };
      }
    } catch (e) {
      console.warn('[CalendarService] BroadcastChannel setup warning:', e);
    }

    // 2. Supabase Realtime Broadcast Channel
    if (isSupabaseConfigured() && coupleId) {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = safeCreateChannel(`calendar_broadcast:${coupleId}`)
        ?.on('broadcast', { event: 'sync_events' }, (response) => {
          const payload = response.payload;
          if (payload && payload.senderId !== this.currentUserId && Array.isArray(payload.events)) {
            this.applyEventsUpdate(payload.events, false);
          }
        })
        .subscribe();
    }
  }

  public getEvents(): CoupleEvent[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CALENDAR_EVENTS);
      return stored ? JSON.parse(stored) : INITIAL_CALENDAR_EVENTS;
    } catch {
      return INITIAL_CALENDAR_EVENTS;
    }
  }

  public saveEvents(events: CoupleEvent[], broadcast: boolean = true): void {
    try {
      localStorage.setItem(STORAGE_KEY_CALENDAR_EVENTS, JSON.stringify(events));
    } catch (err) {
      console.warn('[CalendarService] LocalStorage error:', err);
    }

    if (broadcast) {
      this.broadcastEvents(events);
    }
  }

  public addEvent(newEvent: CoupleEvent): CoupleEvent[] {
    const current = this.getEvents();
    const updated = [newEvent, ...current.filter(e => e.id !== newEvent.id)];
    this.saveEvents(updated, true);
    if (this.onUpdateCallback) {
      this.onUpdateCallback(updated);
    }
    return updated;
  }

  public updateEvent(updatedEvent: CoupleEvent): CoupleEvent[] {
    const current = this.getEvents();
    const updated = current.map(e => (e.id === updatedEvent.id ? updatedEvent : e));
    this.saveEvents(updated, true);
    if (this.onUpdateCallback) {
      this.onUpdateCallback(updated);
    }
    return updated;
  }

  public deleteEvent(eventId: string): CoupleEvent[] {
    const current = this.getEvents();
    const updated = current.filter(e => e.id !== eventId);
    this.saveEvents(updated, true);
    if (this.onUpdateCallback) {
      this.onUpdateCallback(updated);
    }
    return updated;
  }

  private applyEventsUpdate(events: CoupleEvent[], broadcast: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY_CALENDAR_EVENTS, JSON.stringify(events));
    } catch (e) {}

    if (this.onUpdateCallback) {
      this.onUpdateCallback(events);
    }
  }

  private broadcastEvents(events: CoupleEvent[]) {
    const payload = {
      type: 'sync_events',
      senderId: this.currentUserId,
      coupleId: this.coupleId,
      events
    };

    try {
      if (this.localBroadcastChannel) {
        this.localBroadcastChannel.postMessage(payload);
      }
    } catch (e) {}

    if (this.realtimeChannel) {
      this.realtimeChannel.send({
        type: 'broadcast',
        event: 'sync_events',
        payload
      });
    }
  }

  public cleanup() {
    if (this.localBroadcastChannel) {
      this.localBroadcastChannel.close();
      this.localBroadcastChannel = null;
    }
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.onUpdateCallback = null;
  }
}

export const calendarService = new CalendarService();
