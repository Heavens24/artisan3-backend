let pc = null;
let localStream = null;

const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

export const startCall = async (video = false) => {
  pc = new RTCPeerConnection(servers);

  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video
  });

  localStream.getTracks().forEach(track => {
    pc.addTrack(track, localStream);
  });

  return { pc, localStream };
};

export const createOffer = async () => {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  return offer;
};

export const createAnswer = async (offer) => {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
};

export const addAnswer = async (answer) => {
  if (!pc.currentRemoteDescription) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
};

export const onTrack = (callback) => {
  pc.ontrack = (event) => {
    callback(event.streams[0]);
  };
};

export const endCall = () => {
  pc?.close();
  localStream?.getTracks().forEach(t => t.stop());
};