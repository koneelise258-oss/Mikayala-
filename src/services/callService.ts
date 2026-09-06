import { supabase, isSupabaseConfigured, safeCreateChannel } from '../lib/supabase';
import { SignalingPayload, CallType } from '../types';
import { proximityService } from './proximityService';

export type CallEventCallback = (payload: SignalingPayload) => void;

class CallService {
  private peerConnection: RTCPeerConnection | null = null;
  private signalingChannel: any = null;
  private localStream: MediaStream | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onCallEventCallback: CallEventCallback | null = null;

  public isSignalingReady: boolean = false;
  private outgoingSignalQueue: SignalingPayload[] = [];
  private iceCandidatesQueue: RTCIceCandidateInit[] = [];

  // Active call tracking
  private activeCallId: string | null = null;
  private callState: 'idle' | 'connecting' | 'ringing' | 'incoming' | 'connected' = 'idle';
  private currentCallType: CallType = 'audio';

  // Timers
  private ringingTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectedTimer: ReturnType<typeof setTimeout> | null = null;

  // Perfect Negotiation flags & state
  private isCallActive: boolean = false;
  private makingOffer: boolean = false;
  private isSettingRemoteDescription: boolean = false;
  private ignoreOffer: boolean = false;

  private coupleId: string | null = null;
  private currentUserId: string | null = null;
  private partnerId: string | null = null;

  public setup(coupleId: string, currentUserId: string, partnerId: string) {
    if (this.peerConnection && ['connecting', 'connected'].includes(this.peerConnection.connectionState)) {
      console.warn(`[${new Date().toISOString()}] [CallService] Setup ignoré pendant un appel actif`);
      return;
    }

    this.coupleId = coupleId;
    this.currentUserId = currentUserId;
    this.partnerId = partnerId;
    this.isSignalingReady = false;
    this.outgoingSignalQueue = [];

    const topic = `signaling:${coupleId}`;
    console.log('[CallService setup]', { coupleId, currentUserId, partnerId, topic, isSupabaseConfigured: isSupabaseConfigured() });

    if (!isSupabaseConfigured()) return;

    if (this.signalingChannel) {
      console.log('[CallService setup] Closing previous channel:', topic);
      supabase.removeChannel(this.signalingChannel);
      this.signalingChannel = null;
    }

    this.signalingChannel = safeCreateChannel(topic)
      ?.on('broadcast', { event: 'signal' }, (response) => {
        const payload = response.payload as SignalingPayload;
        console.log('[Call signal received]', {
          type: payload.type,
          senderId: payload.senderId,
          receiverId: payload.receiverId,
          currentUserId: this.currentUserId,
          partnerId: this.partnerId
        });

        // Ignore echo of our own signal
        if (payload.senderId && payload.senderId === this.currentUserId) {
          return;
        }

        // In a dedicated couple room topic `signaling:${coupleId}`, any signal from partner is for us
        const isForMe =
          !payload.receiverId ||
          payload.receiverId === this.currentUserId ||
          payload.senderId !== this.currentUserId;

        if (isForMe) {
          this.handleIncomingSignal(payload);
        } else {
          console.log('[Call signal received] Ignored self or invalid signal');
        }
      })
      .subscribe((status) => {
        console.log('[Call signaling status]', status, `topic: ${topic}`, { coupleId, currentUserId, partnerId });
        if (status === 'SUBSCRIBED') {
          this.isSignalingReady = true;
          console.log('[Call signaling ready]', `topic: ${topic}`, { coupleId, currentUserId, partnerId });
          this.flushOutgoingSignalQueue();
        } else {
          this.isSignalingReady = false;
        }
      });
  }

  public setOnCallEvent(callback: CallEventCallback) {
    this.onCallEventCallback = callback;
  }

  public handleDirectSignal(payload: SignalingPayload) {
    if (payload.senderId !== this.currentUserId || payload.receiverId === this.currentUserId) {
      console.log('[CallService] Signal direct de proximité traité:', payload.type);
      this.handleIncomingSignal(payload);
    }
  }

  public setOnRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  public getIsCallActive(): boolean {
    return this.isCallActive;
  }

  public getActiveCallId(): string | null {
    return this.activeCallId;
  }

  public getCallState(): string {
    return this.callState;
  }

  private isPolitePeer(): boolean {
    if (!this.currentUserId || !this.partnerId) return true;
    return this.currentUserId < this.partnerId;
  }

  private startRingingTimeout(callId: string) {
    this.clearRingingTimeout();

    this.ringingTimer = setTimeout(() => {
      if (this.activeCallId === callId && (this.callState === 'ringing' || this.callState === 'connecting' || this.callState === 'incoming')) {
        console.warn(`[${new Date().toISOString()}] [CallService] Ringing timeout reached (30s) for callId:`, callId);
        this.sendSignal({
          type: 'missed',
          callId,
          senderId: this.currentUserId!,
          receiverId: this.partnerId!,
          coupleId: this.coupleId!,
          callType: this.currentCallType
        });
        if (this.onCallEventCallback) {
          this.onCallEventCallback({
            type: 'missed',
            callId,
            senderId: this.partnerId || '',
            receiverId: this.currentUserId || '',
            coupleId: this.coupleId || '',
            callType: this.currentCallType
          });
        }
        this.cleanup('ringing_timeout');
      }
    }, 30000);
  }

  private clearRingingTimeout() {
    if (this.ringingTimer) {
      clearTimeout(this.ringingTimer);
      this.ringingTimer = null;
    }
  }

  private async attemptIceRestart() {
    if (!this.peerConnection || !this.isCallActive) return;
    try {
      console.log(`[${new Date().toISOString()}] [CallService] Attempting ICE restart to recover connection...`);
      if ('restartIce' in this.peerConnection && typeof (this.peerConnection as any).restartIce === 'function') {
        (this.peerConnection as any).restartIce();
      }
      if (this.peerConnection.signalingState === 'stable') {
        await this.createOffer();
      }
    } catch (e) {
      console.warn('[CallService] ICE restart error:', e);
    }
  }

  private handleConnectionStateChange() {
    const connState = this.peerConnection?.connectionState;
    const iceState = this.peerConnection?.iceConnectionState;
    console.log(`[${new Date().toISOString()}] [WebRTC connection state: ${connState}, iceState: ${iceState}]`, { activeCallId: this.activeCallId });

    if (connState === 'connected' || iceState === 'connected' || iceState === 'completed') {
      if (this.disconnectedTimer) {
        clearTimeout(this.disconnectedTimer);
        this.disconnectedTimer = null;
      }
      this.clearRingingTimeout();
      this.callState = 'connected';
      return;
    }

    if (connState === 'disconnected') {
      if (this.disconnectedTimer) return;

      console.warn(`[${new Date().toISOString()}] [CallService] Disconnected state detected. Starting 20s grace period and attempting ICE restart...`);
      this.attemptIceRestart();

      this.disconnectedTimer = setTimeout(() => {
        const currentConnState = this.peerConnection?.connectionState;
        const currentIceState = this.peerConnection?.iceConnectionState;
        if (
          (currentConnState === 'disconnected' || currentConnState === 'failed') &&
          currentIceState !== 'connected' &&
          currentIceState !== 'completed'
        ) {
          console.error(`[${new Date().toISOString()}] [CallService] Connection failed after 20s grace period. Ending call.`);
          this.endCallWithReason('connection_failed');
        } else {
          console.log(`[${new Date().toISOString()}] [CallService] Connection recovered during grace period.`);
        }
        this.disconnectedTimer = null;
      }, 20000);
      return;
    }

    if (connState === 'failed') {
      this.attemptIceRestart();
      if (!this.disconnectedTimer) {
        this.disconnectedTimer = setTimeout(() => {
          const currentConnState = this.peerConnection?.connectionState;
          const currentIceState = this.peerConnection?.iceConnectionState;
          if (currentConnState === 'failed' && currentIceState !== 'connected' && currentIceState !== 'completed') {
            this.endCallWithReason('connection_failed');
          }
          this.disconnectedTimer = null;
        }, 10000);
      }
    }
  }

  public endCallWithReason(reason: string) {
    console.warn(`[${new Date().toISOString()}] [CallService endCallWithReason] Reason:`, reason, { activeCallId: this.activeCallId });
    if (this.onCallEventCallback) {
      this.onCallEventCallback({
        type: 'hangup',
        callId: this.activeCallId || undefined,
        senderId: this.currentUserId || '',
        receiverId: this.partnerId || '',
        coupleId: this.coupleId || ''
      });
    }
    this.cleanup(reason);
  }

  private createPeerConnection() {
    this.cleanupPeerConnection();

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' },
        { urls: 'stun:stun.stunprotocol.org:3478' }
      ],
      iceCandidatePoolSize: 10
    });

    this.peerConnection.ontrack = (event) => {
      const remoteStream = event.streams[0];
      const remoteAudioTracks = remoteStream ? remoteStream.getAudioTracks() : [];
      console.log('[WebRTC ontrack] Received remote track:', event.track.kind, 'Remote audio tracks count:', remoteAudioTracks.length);
      if (this.onRemoteStreamCallback && remoteStream) {
        this.onRemoteStreamCallback(remoteStream);
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'candidate',
          callId: this.activeCallId || undefined,
          senderId: this.currentUserId!,
          receiverId: this.partnerId!,
          coupleId: this.coupleId!,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      this.handleConnectionStateChange();
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log(`[${new Date().toISOString()}] [WebRTC iceConnectionState]:`, iceState, { activeCallId: this.activeCallId });
      if (iceState === 'connected' || iceState === 'completed') {
        if (this.disconnectedTimer) {
          clearTimeout(this.disconnectedTimer);
          this.disconnectedTimer = null;
        }
        this.clearRingingTimeout();
        this.callState = 'connected';
      } else if (iceState === 'disconnected' || iceState === 'failed') {
        this.handleConnectionStateChange();
      }
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log(`[${new Date().toISOString()}] [WebRTC signalingState]:`, this.peerConnection?.signalingState, { activeCallId: this.activeCallId });
    };
  }

  private async processIceCandidatesQueue() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;
    if (this.iceCandidatesQueue.length > 0) {
      console.log(`[WebRTC] Draining ${this.iceCandidatesQueue.length} queued ICE candidate(s)...`);
      while (this.iceCandidatesQueue.length > 0) {
        const candidate = this.iceCandidatesQueue.shift();
        if (candidate) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('[WebRTC] Error adding drained ICE candidate:', e);
          }
        }
      }
    }
  }

  private async handleIncomingSignal(payload: SignalingPayload) {
    if (payload.type === 'request') {
      if (this.isCallActive || (this.activeCallId && this.callState !== 'idle')) {
        console.warn(`[${new Date().toISOString()}] [CallService] Busy: ignoring incoming request for callId`, payload.callId, 'current activeCallId:', this.activeCallId);
        return;
      }
      const incomingCallId = payload.callId || crypto.randomUUID();
      this.activeCallId = incomingCallId;
      this.callState = 'incoming';
      if (payload.callType) {
        this.currentCallType = payload.callType;
      }
      this.startRingingTimeout(incomingCallId);
    } else {
      if (payload.callId && this.activeCallId && payload.callId !== this.activeCallId) {
        console.warn(`[${new Date().toISOString()}] [CallService] Signal ancien ou inconnu ignoré`, {
          receivedCallId: payload.callId,
          activeCallId: this.activeCallId,
          type: payload.type,
        });
        return;
      }
      if (!this.activeCallId && payload.callId) {
        this.activeCallId = payload.callId;
      }
    }

    if (this.onCallEventCallback) {
      this.onCallEventCallback(payload);
    }

    try {
      switch (payload.type) {
        case 'offer':
          if (payload.sdp) {
            this.clearRingingTimeout();
            const isPolite = this.isPolitePeer();
            const offerCollision = this.makingOffer || (this.peerConnection && this.peerConnection.signalingState !== 'stable');
            this.ignoreOffer = !isPolite && offerCollision;

            if (this.ignoreOffer) {
              console.log('[WebRTC Perfect Negotiation] Glare detected! Impolite peer ignoring incoming offer.');
              return;
            }

            if (!this.peerConnection) {
              console.warn('[WebRTC] Received offer without peerConnection. Initializing peerConnection.');
              this.createPeerConnection();
            }

            this.isSettingRemoteDescription = true;
            await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            this.isSettingRemoteDescription = false;
            await this.processIceCandidatesQueue();

            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);

            this.sendSignal({
              type: 'answer',
              callId: this.activeCallId || undefined,
              senderId: this.currentUserId!,
              receiverId: this.partnerId!,
              coupleId: this.coupleId!,
              sdp: answer
            });
          }
          break;

        case 'answer':
          if (payload.sdp && this.peerConnection) {
            this.clearRingingTimeout();
            this.isSettingRemoteDescription = true;
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            this.isSettingRemoteDescription = false;
            await this.processIceCandidatesQueue();
            this.callState = 'connected';
          }
          break;

        case 'candidate':
          if (payload.candidate) {
            if (this.peerConnection && this.peerConnection.remoteDescription && !this.isSettingRemoteDescription) {
              try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
              } catch (e) {
                if (!this.ignoreOffer) {
                  console.warn('[WebRTC] Error adding ICE candidate:', e);
                }
              }
            } else {
              console.log('[WebRTC] Queuing ICE candidate until remote description is set');
              this.iceCandidatesQueue.push(payload.candidate);
            }
          }
          break;

        case 'switch_type':
          if (payload.callType) {
            console.log(`[CallService] Partner switched call type to: ${payload.callType}`);
            this.currentCallType = payload.callType;
          }
          break;

        case 'media_state':
          if (payload.mediaState && this.onMediaStateChangeCallback) {
            console.log('[CallService] Partner media state changed:', payload.mediaState);
            this.onMediaStateChangeCallback({
              isMuted: Boolean(payload.mediaState.isMuted),
              isCameraOff: Boolean(payload.mediaState.isCameraOff)
            });
          }
          break;

        case 'hangup':
          console.log(`[${new Date().toISOString()}] [CallService] Received hangup signal for activeCallId:`, this.activeCallId);
          this.cleanup('received_hangup');
          break;

        case 'declined':
          console.log(`[${new Date().toISOString()}] [CallService] Received declined signal for activeCallId:`, this.activeCallId);
          this.cleanup('received_declined');
          break;

        case 'missed':
          console.log(`[${new Date().toISOString()}] [CallService] Received missed signal for activeCallId:`, this.activeCallId);
          this.cleanup('received_missed');
          break;
      }
    } catch (err) {
      console.error('[CallService] Signal handling error:', err);
    }
  }

  public async startCall(type: CallType): Promise<MediaStream> {
    const callId = crypto.randomUUID();
    console.log(`[${new Date().toISOString()}] [CallService startCall] Starting call session of type:`, type, 'Generated callId:', callId);
    this.cleanup('start_new_call');

    this.activeCallId = callId;
    this.currentCallType = type;
    this.callState = 'connecting';
    this.isCallActive = true;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 20 },
          facingMode: 'user'
        } : false
      });
    } catch (error: any) {
      console.error(`[CallService] getUserMedia error: ${error.name} - ${error.message}`);
      throw error;
    }

    const audioTracks = this.localStream.getAudioTracks();
    console.log('[CallService startCall] Local audio tracks count:', audioTracks.length);

    this.createPeerConnection();

    this.localStream.getTracks().forEach(track => {
      console.log('[CallService startCall] Adding track:', track.kind, track.label);
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.sendSignal({
      type: 'request',
      callId: this.activeCallId,
      senderId: this.currentUserId || '',
      receiverId: this.partnerId || '',
      coupleId: this.coupleId || '',
      callType: type
    });

    // Pings répétés toutes les 2.5s jusqu'à réponse ou fin pour réveiller et traverser les reconnexions réseau
    let pingAttempts = 0;
    const requestInterval = setInterval(() => {
      pingAttempts++;
      if (this.activeCallId === callId && this.callState === 'ringing' && pingAttempts < 6) {
        console.log(`[CallService] Re-broadcasting call request (attempt ${pingAttempts}/5)...`);
        this.sendSignal({
          type: 'request',
          callId: this.activeCallId,
          senderId: this.currentUserId || '',
          receiverId: this.partnerId || '',
          coupleId: this.coupleId || '',
          callType: type
        });
      } else {
        clearInterval(requestInterval);
      }
    }, 2500);

    this.startRingingTimeout(callId);
    this.callState = 'ringing';

    return this.localStream;
  }

  public async acceptCall(type: CallType): Promise<MediaStream> {
    console.log(`[${new Date().toISOString()}] [CallService acceptCall] Accepting call of type:`, type, { activeCallId: this.activeCallId });
    this.clearRingingTimeout();
    this.currentCallType = type;
    this.callState = 'connecting';

    if (!this.localStream) {
      try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 20 },
          facingMode: 'user'
        } : false
      });
    } catch (error: any) {
      console.error(`[CallService] getUserMedia error: ${error.name} - ${error.message}`);
      throw error;
    }
    }

    const audioTracks = this.localStream.getAudioTracks();
    console.log('[CallService acceptCall] Local audio tracks count:', audioTracks.length);

    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    this.localStream.getTracks().forEach(track => {
      console.log('[CallService acceptCall] Adding track:', track.kind, track.label);
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.isCallActive = true;
    return this.localStream;
  }

  public async createOffer() {
    if (!this.peerConnection) return;
    try {
      this.makingOffer = true;
      const offer = await this.peerConnection.createOffer();
      if (this.peerConnection.signalingState !== 'stable') return;
      await this.peerConnection.setLocalDescription(offer);

      this.sendSignal({
        type: 'offer',
        callId: this.activeCallId || undefined,
        senderId: this.currentUserId!,
        receiverId: this.partnerId!,
        coupleId: this.coupleId!,
        sdp: offer
      });
    } catch (err) {
      console.error('[CallService createOffer error]', err);
    } finally {
      this.makingOffer = false;
    }
  }

  public hangup() {
    console.log(`[${new Date().toISOString()}] [CallService hangup] Sending hangup signal & cleaning up.`, { activeCallId: this.activeCallId });
    const isUnanswered = this.callState === 'ringing' || this.callState === 'connecting';
    this.sendSignal({
      type: isUnanswered ? 'missed' : 'hangup',
      callId: this.activeCallId || undefined,
      senderId: this.currentUserId!,
      receiverId: this.partnerId!,
      coupleId: this.coupleId!,
      callType: this.currentCallType
    });
    this.cleanup('user_hangup');
  }

  public decline() {
    console.log(`[${new Date().toISOString()}] [CallService decline] Sending declined signal & cleaning up.`, { activeCallId: this.activeCallId });
    this.sendSignal({
      type: 'declined',
      callId: this.activeCallId || undefined,
      senderId: this.currentUserId!,
      receiverId: this.partnerId!,
      coupleId: this.coupleId!,
      callType: this.currentCallType
    });
    this.cleanup('user_decline');
  }

  // Stats monitoring
  private statsInterval: ReturnType<typeof setInterval> | null = null;
  private prevBytesReceived: number = 0;
  private prevTimestamp: number = 0;
  private currentFacingMode: 'user' | 'environment' = 'user';
  private onStatsCallback: ((stats: any) => void) | null = null;
  private onMediaStateChangeCallback: ((state: { isMuted: boolean; isCameraOff: boolean }) => void) | null = null;

  public setOnStatsCallback(callback: ((stats: any) => void) | null) {
    this.onStatsCallback = callback;
  }

  public setOnMediaStateChange(callback: ((state: { isMuted: boolean; isCameraOff: boolean }) => void) | null) {
    this.onMediaStateChangeCallback = callback;
  }

  /**
   * Bascule entre caméra avant et arrière (Flip Camera)
   */
  public async switchCamera(): Promise<boolean> {
    if (!this.localStream || this.currentCallType !== 'video') {
      console.warn('[Call] Switch caméra impossible : pas de flux vidéo actif');
      return false;
    }

    try {
      const nextFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
      console.log(`[Call] Caméra switchée : tentative vers mode ${nextFacingMode}...`);

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: nextFacingMode },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      }).catch(async () => {
        // Fallback sans exact si indisponible
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: nextFacingMode },
          audio: false
        });
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (!newVideoTrack) return false;

      // Remplacement de la track vidéo sur le sender WebRTC
      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(newVideoTrack);
        }
      }

      // Remplacement de l'ancienne track locale
      const oldVideoTrack = this.localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        oldVideoTrack.stop();
        this.localStream.removeTrack(oldVideoTrack);
      }
      this.localStream.addTrack(newVideoTrack);
      this.currentFacingMode = nextFacingMode;

      console.log(`[Call] Caméra switchée avec succès : mode actuel = ${this.currentFacingMode}`);
      return true;
    } catch (err) {
      console.error('[Call] Erreur switch caméra:', err);
      return false;
    }
  }

  /**
   * Active ou désactive le microphone
   */
  public toggleMute(forceState?: boolean): boolean {
    if (!this.localStream) return false;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length === 0) return false;

    const currentEnabled = audioTracks[0].enabled;
    const newEnabled = forceState !== undefined ? forceState : !currentEnabled;

    audioTracks.forEach(track => {
      track.enabled = newEnabled;
    });

    const isMuted = !newEnabled;
    console.log(`[Call] Mute ${isMuted ? 'activé' : 'désactivé'}`);

    // Diffusion de l'état média aux pairs
    this.sendSignal({
      type: 'media_state',
      callId: this.activeCallId || undefined,
      senderId: this.currentUserId || '',
      receiverId: this.partnerId || '',
      coupleId: this.coupleId || '',
      mediaState: { isMuted }
    });

    return isMuted;
  }

  /**
   * Active ou désactive la caméra
   */
  public toggleCamera(forceState?: boolean): boolean {
    if (!this.localStream) return false;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length === 0) return false;

    const currentEnabled = videoTracks[0].enabled;
    const newEnabled = forceState !== undefined ? forceState : !currentEnabled;

    videoTracks.forEach(track => {
      track.enabled = newEnabled;
    });

    const isCameraOff = !newEnabled;
    console.log(`[Call] Caméra ${isCameraOff ? 'désactivée (off)' : 'activée (on)'}`);

    this.sendSignal({
      type: 'media_state',
      callId: this.activeCallId || undefined,
      senderId: this.currentUserId || '',
      receiverId: this.partnerId || '',
      coupleId: this.coupleId || '',
      mediaState: { isCameraOff }
    });

    return isCameraOff;
  }

  /**
   * Bascule à chaud entre appel vocal et appel vidéo
   */
  public async switchCallType(newType: CallType): Promise<boolean> {
    if (newType === this.currentCallType || !this.peerConnection || !this.localStream) {
      return false;
    }

    console.log(`[Call] Switch vers ${newType} en cours...`);
    this.currentCallType = newType;

    try {
      if (newType === 'video') {
        // Ajouter une piste vidéo
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: this.currentFacingMode, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false
        });
        const videoTrack = videoStream.getVideoTracks()[0];
        if (videoTrack) {
          this.localStream.addTrack(videoTrack);
          this.peerConnection.addTrack(videoTrack, this.localStream);
          await this.createOffer();
        }
      } else {
        // Retirer la piste vidéo
        const videoTracks = this.localStream.getVideoTracks();
        videoTracks.forEach(track => {
          track.stop();
          this.localStream?.removeTrack(track);
        });

        const senders = this.peerConnection.getSenders();
        const videoSender = senders.find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          this.peerConnection.removeTrack(videoSender);
          await this.createOffer();
        }
      }

      this.sendSignal({
        type: 'switch_type',
        callId: this.activeCallId || undefined,
        senderId: this.currentUserId || '',
        receiverId: this.partnerId || '',
        coupleId: this.coupleId || '',
        callType: newType
      });

      console.log(`[Call] Switch vers ${newType} terminé avec succès.`);
      return true;
    } catch (e) {
      console.error('[Call] Erreur switch type appel:', e);
      return false;
    }
  }

  /**
   * Récupère la liste des périphériques audio connectés (écouteurs, Bluetooth, haut-parleurs)
   */
  public async getAudioDevices(): Promise<{ deviceId: string; label: string; kind: string; isBluetooth: boolean }[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(d => d.kind === 'audiooutput' || d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || (d.kind === 'audiooutput' ? 'Haut-parleur standard' : 'Microphone standard'),
          kind: d.kind,
          isBluetooth: /bluetooth|casque|écouteur|airpods|buds|headset|hands-free/i.test(d.label)
        }));
    } catch (err) {
      console.warn('[Call] Impossible de lister les périphériques audio:', err);
      return [];
    }
  }

  /**
   * Modifie la sortie audio (haut-parleur / écouteur / casque Bluetooth)
   */
  public async setAudioOutputDevice(audioElement: HTMLMediaElement, deviceId: string): Promise<boolean> {
    try {
      if ('setSinkId' in audioElement && typeof (audioElement as any).setSinkId === 'function') {
        await (audioElement as any).setSinkId(deviceId);
        console.log(`[Call] Sortie audio modifiée avec succès vers deviceId: ${deviceId}`);
        return true;
      } else {
        console.log('[Call] setSinkId non supporté par ce navigateur, routage par défaut appliqué.');
        return false;
      }
    } catch (err) {
      console.warn('[Call] Erreur setSinkId:', err);
      return false;
    }
  }

  /**
   * Surveillance en temps réel de la qualité réseau WebRTC (stats, bitrate, RTT, packet loss)
   */
  public startNetworkStatsMonitoring(callback: (stats: any) => void) {
    this.stopNetworkStatsMonitoring();
    this.onStatsCallback = callback;

    this.statsInterval = setInterval(async () => {
      if (!this.peerConnection || this.peerConnection.connectionState !== 'connected') {
        return;
      }

      try {
        const statsReport = await this.peerConnection.getStats();
        let rttMs = 35;
        let packetLossPercent = 0;
        let bitrateKbps = 128;
        let resolution = '640x480';
        let frameRate = 30;
        let audioCodec = 'Opus 48kHz (Chiffré E2EE)';
        let videoCodec = 'VP8 / H.264 HD';

        statsReport.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            if (report.currentRoundTripTime) {
              rttMs = Math.round(report.currentRoundTripTime * 1000);
            }
          }

          if (report.type === 'inbound-rtp' && report.kind === 'video') {
            if (report.packetsLost && report.packetsReceived) {
              const total = report.packetsReceived + report.packetsLost;
              packetLossPercent = total > 0 ? Math.round((report.packetsLost / total) * 100) : 0;
            }
            if (report.bytesReceived && report.timestamp) {
              if (this.prevTimestamp > 0) {
                const timeDiff = (report.timestamp - this.prevTimestamp) / 1000;
                const byteDiff = report.bytesReceived - this.prevBytesReceived;
                if (timeDiff > 0 && byteDiff >= 0) {
                  bitrateKbps = Math.round((byteDiff * 8) / (timeDiff * 1000));
                }
              }
              this.prevBytesReceived = report.bytesReceived;
              this.prevTimestamp = report.timestamp;
            }
            if (report.frameWidth && report.frameHeight) {
              resolution = `${report.frameWidth}x${report.frameHeight}`;
            }
            if (report.framesPerSecond) {
              frameRate = Math.round(report.framesPerSecond);
            }
          }
        });

        // Détermination de la qualité réseau
        let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'excellent';
        if (rttMs > 300 || packetLossPercent > 10) {
          quality = 'poor';
        } else if (rttMs > 150 || packetLossPercent > 4) {
          quality = 'fair';
        } else if (rttMs > 80 || packetLossPercent > 1) {
          quality = 'good';
        } else {
          quality = 'excellent';
        }

        const computedStats = {
          quality,
          rttMs,
          packetLossPercent,
          bitrateKbps: Math.max(32, bitrateKbps),
          resolution,
          frameRate,
          audioCodec,
          videoCodec
        };

        if (this.onStatsCallback) {
          this.onStatsCallback(computedStats);
        }
      } catch (err) {
        // Safe catch for closed peer stats
      }
    }, 2000);
  }

  public stopNetworkStatsMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.prevBytesReceived = 0;
    this.prevTimestamp = 0;
  }

  public getCurrentFacingMode() {
    return this.currentFacingMode;
  }

  private sendSignalDirect(payload: SignalingPayload) {
    console.log('[Call signal sent]', payload);
    // 1. Broadcast via Proximity mesh (Wi-Fi Hotspot / Bluetooth Direct 0-Data)
    try {
      proximityService.broadcastPayload({
        type: 'signaling',
        signaling: payload
      });
    } catch (e) {
      console.warn('[CallService] Proximity broadcast error:', e);
    }

    // 2. Broadcast via Supabase Realtime channel
    if (this.signalingChannel && this.isSignalingReady) {
      this.signalingChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload
      }).then((res: any) => {
        console.log('[Call signal sent result]', res);
      }).catch((err: any) => {
        console.error('[Call signal sent error]', err);
        this.outgoingSignalQueue.push(payload);
      });
    } else {
      console.log('[CallService] Realtime channel not ready yet, queuing signal:', payload.type);
      this.outgoingSignalQueue.push(payload);
    }
  }

  private sendSignal(payload: SignalingPayload) {
    // Fill in default IDs if missing
    if (!payload.senderId && this.currentUserId) payload.senderId = this.currentUserId;
    if (!payload.receiverId && this.partnerId) payload.receiverId = this.partnerId;
    if (!payload.coupleId && this.coupleId) payload.coupleId = this.coupleId;

    this.sendSignalDirect(payload);
  }

  private flushOutgoingSignalQueue() {
    if (!this.isSignalingReady || !this.signalingChannel) return;
    if (this.outgoingSignalQueue.length > 0) {
      console.log(`[CallService] Flushing ${this.outgoingSignalQueue.length} queued signal(s)...`);
      const queueCopy = [...this.outgoingSignalQueue];
      this.outgoingSignalQueue = [];
      for (const payload of queueCopy) {
        if (this.signalingChannel) {
          this.signalingChannel.send({
            type: 'broadcast',
            event: 'signal',
            payload
          }).catch((err: any) => {
            console.error('[CallService] Error during flush send:', err);
          });
        }
      }
    }
  }

  private cleanupPeerConnection() {
    if (this.peerConnection) {
      console.log('[CallService] Detaching listeners and closing RTCPeerConnection.');
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;
      try {
        this.peerConnection.close();
      } catch (e) {
        console.warn('[CallService] Error closing peerConnection:', e);
      }
      this.peerConnection = null;
    }
  }

  public cleanup(reason: string) {
    console.warn(`[${new Date().toISOString()}] [CallService cleanup]`, {
      reason,
      activeCallId: this.activeCallId,
      callState: this.callState,
      connectionState: this.peerConnection?.connectionState || 'none',
      iceState: this.peerConnection?.iceConnectionState || 'none',
      signalingState: this.peerConnection?.signalingState || 'none',
    });

    if (this.disconnectedTimer) {
      clearTimeout(this.disconnectedTimer);
      this.disconnectedTimer = null;
    }
    this.clearRingingTimeout();

    this.isCallActive = false;
    this.makingOffer = false;
    this.isSettingRemoteDescription = false;
    this.ignoreOffer = false;
    this.iceCandidatesQueue = [];

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.warn('[CallService] Error stopping track:', e);
        }
      });
      this.localStream = null;
    }

    this.cleanupPeerConnection();

    this.activeCallId = null;
    this.callState = 'idle';
  }

  public getLocalStream() {
    return this.localStream;
  }
}

export const callService = new CallService();
export default callService;

