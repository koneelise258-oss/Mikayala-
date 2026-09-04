import { supabase, isSupabaseConfigured } from '../lib/supabase';
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

    this.signalingChannel = supabase
      .channel(topic)
      .on('broadcast', { event: 'signal' }, (response) => {
        const payload = response.payload as SignalingPayload;
        console.log('[Call signal received]', {
          payload,
          currentUserId: this.currentUserId,
          isForMe: payload.receiverId === this.currentUserId
        });
        if (payload.receiverId === this.currentUserId) {
          this.handleIncomingSignal(payload);
        } else {
          console.log('[Call signal received] Ignored: receiverId mismatch', {
            receiverId: payload.receiverId,
            currentUserId: this.currentUserId
          });
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
    if (payload.receiverId === this.currentUserId) {
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

  private handleConnectionStateChange() {
    const state = this.peerConnection?.connectionState;
    console.log(`[${new Date().toISOString()}] [WebRTC connection state]`, state, { activeCallId: this.activeCallId });

    if (state === 'connected') {
      if (this.disconnectedTimer) {
        clearTimeout(this.disconnectedTimer);
        this.disconnectedTimer = null;
      }
      this.clearRingingTimeout();
      this.callState = 'connected';
      return;
    }

    if (state === 'disconnected') {
      if (this.disconnectedTimer) return;

      console.warn(`[${new Date().toISOString()}] [CallService] Disconnected state detected. Starting 5s grace period before ending call...`);
      this.disconnectedTimer = setTimeout(() => {
        const currentState = this.peerConnection?.connectionState;
        if (currentState === 'disconnected' || currentState === 'failed') {
          console.error(`[${new Date().toISOString()}] [CallService] Connection failed after 5s grace period. Ending call.`);
          this.endCallWithReason('connection_failed');
        }
        this.disconnectedTimer = null;
      }, 5000);
      return;
    }

    if (state === 'failed') {
      this.endCallWithReason('connection_failed');
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
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
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
      console.log(`[${new Date().toISOString()}] [WebRTC iceConnectionState]:`, this.peerConnection?.iceConnectionState, { activeCallId: this.activeCallId });
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
      senderId: this.currentUserId!,
      receiverId: this.partnerId!,
      coupleId: this.coupleId!,
      callType: type
    });

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

  public getCurrentCallType(): CallType {
    return this.currentCallType;
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
    if (this.signalingChannel) {
      this.signalingChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload
      }).then((res: any) => {
        console.log('[Call signal sent result]', res);
      }).catch((err: any) => {
        console.error('[Call signal sent error]', err);
      });
    }
  }

  private sendSignal(payload: SignalingPayload) {
    // Toujours envoyer immédiatement en Proximity/Local, et en file d'attente Supabase si non connecté
    this.sendSignalDirect(payload);
    if (!this.isSignalingReady && !this.signalingChannel) {
      this.outgoingSignalQueue.push(payload);
    }
  }

  private flushOutgoingSignalQueue() {
    if (!this.isSignalingReady || !this.signalingChannel) return;
    if (this.outgoingSignalQueue.length > 0) {
      console.log(`[CallService] Flushing ${this.outgoingSignalQueue.length} queued signal(s)...`);
      while (this.outgoingSignalQueue.length > 0) {
        const payload = this.outgoingSignalQueue.shift();
        if (payload) {
          this.sendSignalDirect(payload);
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

