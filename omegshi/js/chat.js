let chatSessionId = null;
let userId = null;
let pollingInterval = null;
let heartbeatInterval = null;

const startBtn = document.getElementById('start-chat');
const endBtn = document.getElementById('end-chat');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesDiv = document.getElementById('messages');
const statusDiv = document.getElementById('status');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// WebRTC variables
let localStream = null;
let peerConnection = null;
let signalingInterval = null;
const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

function appendMessage(sender, text, time) {
    const msg = document.createElement('div');
    msg.className = sender === userId ? 'my-message' : 'their-message';
    msg.innerHTML = `<span>${text}</span> <span class="msg-time">${time ? new Date(time).toLocaleTimeString() : ''}</span>`;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function setStatus(text) {
    statusDiv.textContent = text;
    statusDiv.setAttribute('aria-live', 'polite');
}

async function startCamera() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;
    } catch (err) {
        console.error('Camera/Microphone error:', err);
        let msg = 'Could not access camera/microphone.';
        if (navigator.userAgent.match(/iPhone|iPad|iPod/)) {
            msg += ' On iOS/Safari, camera/mic access may require HTTPS.';
        } else if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) {
            msg += ' Please check your browser permissions and try again.';
        }
        setStatus(msg);
        alert(msg);
        throw err;
    }
}

function startChat() {
    setStatus('Looking for a partner...');
    fetch('php/start_chat.php', { method: 'POST' })
        .then(res => res.json())
        .then(async data => {
            userId = data.user_id;
            if (data.status === 'connected') {
                chatSessionId = data.chat_session_id;
                setStatus('Connected! Say hi!');
                startBtn.disabled = true;
                endBtn.disabled = false;
                messageInput.disabled = false;
                sendBtn.disabled = false;
                messagesDiv.innerHTML = '';
                await startCamera();
                startWebRTC();
                startPolling();
                startHeartbeat();
                messageInput.focus();
            } else {
                setStatus('Waiting for a partner...');
                startBtn.disabled = true;
                endBtn.disabled = false;
                messageInput.disabled = true;
                sendBtn.disabled = true;
                setTimeout(startChat, 2000); // Retry pairing
            }
        });
}

function endChat() {
    if (chatSessionId && userId) {
        fetch('php/end_chat.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `session_id=${chatSessionId}&user_id=${userId}`
        }).then(() => {
            setStatus('Chat ended.');
            startBtn.disabled = false;
            endBtn.disabled = true;
            messageInput.disabled = true;
            sendBtn.disabled = true;
            stopPolling();
            stopHeartbeat();
            stopWebRTC();
            chatSessionId = null;
            messagesDiv.innerHTML = '';
        });
    }
}

function sendMessage(e) {
    e.preventDefault();
    const msg = messageInput.value.trim();
    if (!msg || !chatSessionId || !userId) return;
    fetch('php/send_message.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `session_id=${chatSessionId}&sender_id=${userId}&message=${encodeURIComponent(msg)}`
    }).then(res => res.json()).then(data => {
        if (data.success) {
            messageInput.value = '';
            fetchMessages();
            messageInput.focus();
        }
    });
}

function fetchMessages() {
    if (!chatSessionId) return;
    fetch(`php/get_messages.php?session_id=${chatSessionId}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                messagesDiv.innerHTML = '';
                data.messages.forEach(m => {
                    appendMessage(m.sender_id, m.message, m.sent_at);
                });
            }
        });
}

function startPolling() {
    stopPolling();
    pollingInterval = setInterval(fetchMessages, 1500);
}
function stopPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
}

function startHeartbeat() {
    stopHeartbeat();
    heartbeatInterval = setInterval(() => {
        if (userId) {
            fetch('php/heartbeat.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `user_id=${userId}`
            });
        }
    }, 5000);
}
function stopHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
}

// --- WebRTC logic ---
function startWebRTC() {
    peerConnection = new RTCPeerConnection(rtcConfig);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
    peerConnection.ontrack = (event) => {
        remoteVideo.srcObject = event.streams[0];
    };
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal({ type: 'candidate', candidate: event.candidate });
        }
    };
    // If user is the one who just connected, create offer
    if (startBtn.disabled) {
        createAndSendOffer();
    }
    startSignalingPolling();
}

function stopWebRTC() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
        localVideo.srcObject = null;
    }
    remoteVideo.srcObject = null;
    stopSignalingPolling();
}

async function createAndSendOffer() {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    sendSignal({ type: 'offer', sdp: offer });
}

async function createAndSendAnswer(offer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    sendSignal({ type: 'answer', sdp: answer });
}

function sendSignal(data) {
    fetch('php/send_signal.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: chatSessionId, user_id: userId, signal: data })
    });
}

function startSignalingPolling() {
    stopSignalingPolling();
    signalingInterval = setInterval(receiveSignal, 1000);
}
function stopSignalingPolling() {
    if (signalingInterval) clearInterval(signalingInterval);
}

async function receiveSignal() {
    const res = await fetch(`php/get_signal.php?session_id=${chatSessionId}&user_id=${userId}`);
    const data = await res.json();
    if (data.signal) {
        if (data.signal.type === 'offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
            await createAndSendAnswer(data.signal.sdp);
        } else if (data.signal.type === 'answer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
        } else if (data.signal.type === 'candidate') {
            try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
            } catch (e) {}
        }
    }
}

startBtn.onclick = () => {
    startCamera().then(startChat);
};
endBtn.onclick = endChat;
messageForm.onsubmit = sendMessage;
// Message input is only disabled when not in a chat
messageInput.disabled = true;
sendBtn.disabled = true; 