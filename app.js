// Video & UI Elements
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const joinOverlay = document.getElementById('join-overlay');
const myIdDisplay = document.getElementById('my-id');
const peerIdInput = document.getElementById('peer-id-input');
const callBtn = document.getElementById('call-btn');

// Controls
const controlsBar = document.getElementById('controls-bar');
const hangupBtn = document.getElementById('hangup-btn');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const micBtn = document.getElementById('mic-btn');
const camBtn = document.getElementById('cam-btn');
const micIcon = document.getElementById('mic-icon');
const camIcon = document.getElementById('cam-icon');

// Chat Elements
const chatSection = document.getElementById('chat-section');
const closeChatBtn = document.getElementById('close-chat-btn');
const messagesArea = document.getElementById('messages-area');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

let localStream;
let currentCall = null;
let currentConnection = null;
let isMicMuted = false;
let isCamOff = false;

// 1. Initialize PeerJS securely
const peer = new Peer();

peer.on('open', (id) => {
    myIdDisplay.textContent = id;
});

// GLITCH FIX: Handle PeerJS errors so the app doesn't freeze
peer.on('error', (err) => {
    console.error(err);
    alert("Connection Error: " + err.type);
    callBtn.textContent = "Join Meeting";
    callBtn.disabled = false;
});

// 2. Request Camera/Mic cleanly
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localStream = stream;
        localVideo.srcObject = stream;
    })
    .catch((err) => {
        alert("Please allow camera and mic permissions in your browser settings.");
    });

// 3. Handle Incoming Call
peer.on('call', (call) => {
    currentCall = call;
    call.answer(localStream);
    
    call.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        setupCallUI(true);
    });

    call.on('close', endCall); // Glitch fix: auto-end if they drop
});

// 4. Handle Incoming Chat
peer.on('connection', (conn) => {
    setupDataConnection(conn);
});

// 5. Make Outgoing Call
callBtn.addEventListener('click', () => {
    const peerId = peerIdInput.value.trim();
    if (!peerId) return alert("Please paste an ID to join.");

    callBtn.textContent = "Connecting...";
    callBtn.disabled = true; // Prevent double-clicking glitch

    currentCall = peer.call(peerId, localStream);
    
    currentCall.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        setupCallUI(true);
    });

    currentCall.on('close', endCall);

    const conn = peer.connect(peerId);
    setupDataConnection(conn);
});

// 6. Data/Chat Connection Logic
function setupDataConnection(conn) {
    currentConnection = conn;
    
    conn.on('open', () => {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        addChatMessage("Connected securely.", 'system');
    });

    conn.on('data', (data) => {
        if (data === "SIGNAL_HANGUP") {
            endCall();
        } else {
            addChatMessage(data, 'other');
            // Show dot or open chat if hidden
            if (!chatSection.classList.contains('active')) {
                chatToggleBtn.style.color = "#60a5fa"; // Notification color
            }
        }
    });

    conn.on('close', endCall);
}

// 7. Media Controls (Mute & Video Off)
micBtn.addEventListener('click', () => {
    if (!localStream) return;
    isMicMuted = !isMicMuted;
    // Actually disable the audio track
    localStream.getAudioTracks()[0].enabled = !isMicMuted; 
    
    // Update UI
    micIcon.textContent = isMicMuted ? 'mic_off' : 'mic';
    micBtn.classList.toggle('muted', isMicMuted);
});

camBtn.addEventListener('click', () => {
    if (!localStream) return;
    isCamOff = !isCamOff;
    // Actually disable the video track (turns screen black)
    localStream.getVideoTracks()[0].enabled = !isCamOff;
    
    // Update UI
    camIcon.textContent = isCamOff ? 'videocam_off' : 'videocam';
    camBtn.classList.toggle('muted', isCamOff);
});

// 8. Buttons & UI Management
hangupBtn.addEventListener('click', () => {
    if (currentConnection) currentConnection.send("SIGNAL_HANGUP");
    endCall();
});

chatToggleBtn.addEventListener('click', () => {
    chatSection.classList.add('active');
    chatToggleBtn.style.color = "white"; // Reset notification color
});

closeChatBtn.addEventListener('click', () => {
    chatSection.classList.remove('active');
});

function sendMessage() {
    const text = chatInput.value.trim();
    if (text && currentConnection && currentConnection.open) {
        currentConnection.send(text);
        addChatMessage(text, 'self');
        chatInput.value = '';
    }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

// 9. Core UI Transitions
function endCall() {
    if (currentCall) currentCall.close();
    if (currentConnection) currentConnection.close();
    
    currentCall = null;
    currentConnection = null;
    remoteVideo.srcObject = null;
    
    setupCallUI(false);
    chatInput.disabled = true;
    sendBtn.disabled = true;
    callBtn.textContent = "Join Meeting";
    callBtn.disabled = false;
}

function setupCallUI(inCall) {
    if (inCall) {
        joinOverlay.classList.add('hidden');
        controlsBar.classList.add('active');
        localVideo.classList.remove('fullscreen');
    } else {
        joinOverlay.classList.remove('hidden');
        controlsBar.classList.remove('active');
        chatSection.classList.remove('active');
        localVideo.classList.add('fullscreen');
        messagesArea.innerHTML = '<div class="msg system">Call Ended</div>';
    }
}

function addChatMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msg', type);
    msgDiv.textContent = text;
    messagesArea.appendChild(msgDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}
