const fs = require('fs');
const filePath = 'src/components/CallOverlay.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add console.log when attaching localStream
const localEffect = `useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isOpen]);`;

const updatedLocalEffect = `useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('[CallOverlay] Attaching local stream to <video>. Video tracks:', localStream.getVideoTracks().length);
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isOpen]);`;

content = content.replace(localEffect, updatedLocalEffect);

// Add console.log when attaching remoteStream
const remoteEffect = `useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isOpen]);`;

const updatedRemoteEffect = `useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log('[CallOverlay] Attaching remote stream to <video>. Video tracks:', remoteStream.getVideoTracks().length);
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isOpen]);`;

content = content.replace(remoteEffect, updatedRemoteEffect);

fs.writeFileSync(filePath, content);
