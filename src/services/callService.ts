import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SignalingPayload, CallType } from '../types';

export type CallEventCallback = (payload: SignalingPayload) => void;

class CallService {
  private peerConnection: RTCPeerConnection | null = null;
  private signalingChannel: any = null;
  private localStream: MediaStream | null = null;
  private onRemoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private onCallEventCallback: CallEventCallback | null = null;

  private coupleId: string | null = null;
  private currentUserId: string | null = null;
  private partnerId: string | null = null;

  public setup(coupleId: string, currentUserId: string, partnerId: string) {
    this.coupleId = coupleId;
    this.currentUserId = currentUserId;
    this.partnerId = partnerId;

    if (!isSupabaseConfigured()) return;

    if (this.signalingChannel) {
      supabase.removeChannel(this.signalingChannel);
    }

    this.signalingChannel = supabase
      .channel(`signaling:${coupleId}`)
      .on('broadcast', { event: 'signal' }, (response) => {
        const payload = response.payload as SignalingPayload;
        if (payload.receiverId === this.currentUserId) {
          this.handleIncomingSignal(payload);
        }
      })
      .subscribe();
  }

  public setOnCallEvent(callback: CallEventCallback) {
    this.onCallEventCallback = callback;
  }

  public setOnRemoteStream(callback: (stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  private async handleIncomingSignal(payload: SignalingPayload) {
    if (this.onCallEventCallback) {
      this.onCallEventCallback(payload);
    }

    try {
      switch (payload.type) {
        case 'offer':
          if (payload.sdp) {
            if (!this.peerConnection) {
              console.warn('[CallService] Received offer but peerConnection is null. Creating one.');
              // This case might happen if signaling is faster than UI, but usually request handles it.
              // We'll try to recover if possible, but without local stream it's limited.
            }
            await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await this.peerConnection?.createAnswer();
            if (answer) {
              await this.peerConnection?.setLocalDescription(answer);
              this.sendSignal({
                type: 'answer',
                senderId: this.currentUserId!,
                receiverId: this.partnerId!,
                coupleId: this.coupleId!,
                sdp: answer
              });
            }
          }
          break;
        case 'answer':
          if (payload.sdp) {
            await this.peerConnection?.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          }
          break;
        case 'candidate':
          if (payload.candidate && this.peerConnection) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn('[CallService] Error adding ICE candidate:', e);
            }
          }
          break;
        case 'hangup':
          this.cleanup();
          break;
      }
    } catch (err) {
      console.error('[CallService] Signal handling error:', err);
    }
  }

  public async startCall(type: CallType): Promise<MediaStream> {
    this.cleanup();
    
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    });

    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.localStream.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.peerConnection.ontrack = (event) => {
      if (this.onRemoteStreamCallback && event.streams[0]) {
        this.onRemoteStreamCallback(event.streams[0]);
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

    // Send initial request to wake up the partner
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
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    });

    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.localStream.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.peerConnection.ontrack = (event) => {
      if (this.onRemoteStreamCallback && event.streams[0]) {
        this.onRemoteStreamCallback(event.streams[0]);
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

    return this.localStream;
  }

  public async createOffer() {
    if (!this.peerConnection) return;
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.sendSignal({
      type: 'offer',
      senderId: this.currentUserId!,
      receiverId: this.partnerId!,
      coupleId: this.coupleId!,
      sdp: offer
    });
  }

  public hangup() {
    this.sendSignal({
      type: 'hangup',
      senderId: this.currentUserId!,
      receiverId: this.partnerId!,
      coupleId: this.coupleId!
    });
    this.cleanup();
  }

  private sendSignal(payload: SignalingPayload) {
    if (this.signalingChannel) {
      this.signalingChannel.send({
        type: 'broadcast',
        event: 'signal',
        payload
      });
    }
  }

  private cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  public getLocalStream() {
    return this.localStream;
  }
}

export const callService = new CallService();
export default callService;
