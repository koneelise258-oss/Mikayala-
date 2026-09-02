import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SignalingPayload, CallType } from '../types';

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

  // Perfect Negotiation flags & state
  private isCallActive: boolean = false;
  private makingOffer: boolean = false;
  private isSettingRemoteDescription: boolean = false;
  private ignoreOffer: boolean = false;

  private coupleId: string | null = null;
  private currentUserId: string | null = null;
  private partnerId: string | null = null;

  public setup(coupleId: string, currentUserId: string, partnerId: string) {
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

  public setOnRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  public getIsCallActive(): boolean {
    return this.isCallActive;
  }

  private isPolitePeer(): boolean {
    if (!this.currentUserId || !this.partnerId) return true;
    return this.currentUserId < this.partnerId;
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
          senderId: this.currentUserId!,
          receiverId: this.partnerId!,
          coupleId: this.coupleId!,
          candidate: event.candidate
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log('[WebRTC connectionState]:', state);
      if (state === 'failed') {
        console.error('[WebRTC connectionState] Connection FAILED (terminal failure). Ending call.');
        if (this.onCallEventCallback) {
          this.onCallEventCallback({
            type: 'hangup',
            senderId: this.partnerId || '',
            receiverId: this.currentUserId || '',
            coupleId: this.coupleId || ''
          });
        }
        this.cleanup();
      } else if (state === 'disconnected') {
        console.warn('[WebRTC connectionState] Disconnected (temporary/transient state, waiting for potential recovery...)');
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC iceConnectionState]:', this.peerConnection?.iceConnectionState);
    };

    this.peerConnection.onsignalingstatechange = () => {
      console.log('[WebRTC signalingState]:', this.peerConnection?.signalingState);
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
    if (this.onCallEventCallback) {
      this.onCallEventCallback(payload);
    }

    try {
      switch (payload.type) {
        case 'offer':
          if (payload.sdp) {
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
              senderId: this.currentUserId!,
              receiverId: this.partnerId!,
              coupleId: this.coupleId!,
              sdp: answer
            });
          }
          break;

        case 'answer':
          if (payload.sdp && this.peerConnection) {
            this.isSettingRemoteDescription = true;
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            this.isSettingRemoteDescription = false;
            await this.processIceCandidatesQueue();
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
          console.log('[CallService] Received hangup signal. Cleaning up.');
          this.cleanup();
          break;
      }
    } catch (err) {
      console.error('[CallService] Signal handling error:', err);
    }
  }

  public async startCall(type: CallType): Promise<MediaStream> {
    console.log('[CallService startCall] Starting call session of type:', type);
    this.cleanup();
    this.isCallActive = true;

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    });

    const audioTracks = this.localStream.getAudioTracks();
    console.log('[CallService startCall] Local audio tracks count:', audioTracks.length);

    this.createPeerConnection();

    this.localStream.getTracks().forEach(track => {
      console.log('[CallService startCall] Adding track:', track.kind, track.label);
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.sendSignal({
      type: 'request',
      senderId: this.currentUserId!,
      receiverId: this.partnerId!,
      coupleId: this.coupleId!,
      callType: type
    });

    return this.localStream;
  }

  public async acceptCall(type: CallType): Promise<MediaStream> {
    console.log('[CallService acceptCall] Accepting call of type:', type);
    if (!this.localStream) {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
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
    console.log('[CallService hangup] Sending hangup signal & cleaning up.');
    this.sendSignal({
      type: 'hangup',
      senderId: this.currentUserId!,
      receiverId: this.partnerId!,
      coupleId: this.coupleId!
    });
    this.cleanup();
  }

  private sendSignalDirect(payload: SignalingPayload) {
    console.log('[Call signal sent]', payload);
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
    } else {
      console.warn('[Call signal sent] Failed: signalingChannel is null');
    }
  }

  private sendSignal(payload: SignalingPayload) {
    if (this.isSignalingReady && this.signalingChannel) {
      this.sendSignalDirect(payload);
    } else {
      console.log('[Call signal queued - not SUBSCRIBED yet]', {
        payload,
        isSignalingReady: this.isSignalingReady,
        hasChannel: !!this.signalingChannel
      });
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

  public cleanup() {
    console.log('[CallService cleanup] Cleaning up media tracks, RTCPeerConnection, and queues.');
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
  }

  public getLocalStream() {
    return this.localStream;
  }
}

export const callService = new CallService();
export default callService;

