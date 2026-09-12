// Sound Effects using Web Audio API for Mikayla
class SoundManager {
  private ctx: AudioContext | null = null;
  private activeRingIntervals: Set<number> = new Set();
  private activeRingNodes: Set<{ osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode }> = new Set();

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Light UI tap haptic audio click
  playTap() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // Audio playback safety catch
    }
  }

  // Quick pleasant bubble pop for swipe-to-reply or interactions
  playPop() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      // Audio playback safety catch
    }
  }

  // Subtle alert sound for errors
  playError() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // Audio playback safety catch
    }
  }

  // Sent message pop sound
  playSent() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1450, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio playback safety catch
    }
  }

  // Message received chime
  playReceived() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      playTone(1046.5, now, 0.12); // C6
      playTone(1318.5, now + 0.08, 0.2); // E6
      playTone(1567.98, now + 0.16, 0.25); // G6 (Emerald Chime)
    } catch {
      // Audio fallback
    }
  }

  // Realistic Intimate Heartbeat (lub-dub low frequency resonator)
  playHeartbeat() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const triggerThump = (time: number, freq: number, gainVal: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.12);

        gain.gain.setValueAtTime(gainVal, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.16);
      };

      // Lub
      triggerThump(now, 85, 0.5);
      // Dub
      triggerThump(now + 0.14, 65, 0.65);
    } catch {
      // Audio fallback
    }
  }

  // Match celebration chime
  playMatchSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.15, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } catch {
      // Audio fallback
    }
  }

  // Wheel tick
  playWheelTick() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(900, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // fallback
    }
  }

  // Reaction pop
  playReaction() {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(750, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      // fallback
    }
  }

  // Romantic heart sound
  playHeart() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      osc2.frequency.setValueAtTime(783.99, now); // G5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12); // C6

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    } catch {
      // fallback
    }
  }

  // Biometric Unlock Success sound
  playBiometricSuccess() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // fallback
    }
  }

  // Biometric Fail buzzer
  playBiometricFail() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.setValueAtTime(120, now + 0.08);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // fallback
    }
  }

  // Stop all active ring tones immediately and cancel oscillators/intervals
  stopRingTone() {
    this.activeRingIntervals.forEach(id => clearInterval(id));
    this.activeRingIntervals.clear();

    const now = this.ctx ? this.ctx.currentTime : 0;
    this.activeRingNodes.forEach(({ osc1, osc2, gain }) => {
      try {
        if (this.ctx) {
          gain.gain.cancelScheduledValues(now);
          gain.gain.setValueAtTime(0, now);
        }
        osc1.stop(now);
        osc2.stop(now);
        osc1.disconnect();
        osc2.disconnect();
        gain.disconnect();
      } catch {
        // Safe catch for already terminated audio nodes
      }
    });
    this.activeRingNodes.clear();
  }

  // Ringtone styles: 'classic' | 'emerald' | 'soft_wave' | 'intimate_pulse'
  playRingTone(style: 'classic' | 'emerald' | 'soft_wave' | 'intimate_pulse' = 'emerald'): () => void {
    try {
      // Always stop previous ringtones first to prevent stacking
      this.stopRingTone();

      const ctx = this.getContext();
      let isPlaying = true;

      // Haptic vibration pulse if supported
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([300, 200, 300, 200, 600]);
        } catch (_) {}
      }

      const ringCycle = () => {
        if (!isPlaying) return;
        const now = ctx.currentTime;

        if (style === 'emerald') {
          // Melodic romantic bell arpeggio
          const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.18);
            gain.gain.setValueAtTime(0.18, now + idx * 0.18);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.9);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.18);
            osc.stop(now + idx * 0.18 + 0.95);
          });
        } else if (style === 'soft_wave') {
          // Warm harmonic chime
          const chord = [440, 554.37, 659.25]; // A4, C#5, E5
          chord.forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 1.7);
          });
        } else if (style === 'intimate_pulse') {
          // Intimate rhythmic synth pulse
          [0, 0.25, 0.5].forEach((offset, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33 + i * 110, now + offset);
            gain.gain.setValueAtTime(0.16, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.3);
          });
        } else {
          // Classic standard dial ringtone
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();

          const nodeGroup = { osc1, osc2, gain };
          this.activeRingNodes.add(nodeGroup);

          osc1.frequency.setValueAtTime(440, now);
          osc2.frequency.setValueAtTime(480, now);

          gain.gain.setValueAtTime(0.12, now);
          gain.gain.setValueAtTime(0.12, now + 1.2);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.3);
          osc2.stop(now + 1.3);

          osc1.onended = () => {
            this.activeRingNodes.delete(nodeGroup);
          };
        }
      };

      ringCycle();
      const intervalId = window.setInterval(() => {
        ringCycle();
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([250, 150, 250]);
          } catch (_) {}
        }
      }, 3000);
      this.activeRingIntervals.add(intervalId);

      return () => {
        isPlaying = false;
        clearInterval(intervalId);
        this.activeRingIntervals.delete(intervalId);
        this.stopRingTone();
      };
    } catch {
      return () => {};
    }
  }
}

export const soundEffects = new SoundManager();
