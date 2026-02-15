// --- DOM Elements ---
const lobbyScreen = document.getElementById('lobby-screen');
const callScreen = document.getElementById('call-screen');
const myIdDisplay = document.getElementById('my-id');
const copyBtn = document.getElementById('copy-btn');
const peerIdInput = document.getElementById('peer-id-input');
const callBtn = document.getElementById('call-btn');

const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

const micBtn = document.getElementById('mic-btn');
const micIcon = document.getElementById('mic-icon');
const videoBtn = document.getElementById('video-btn');
const videoIcon = document.getElementById('video-icon');
const hangupBtn = document.getElementById('hangup-btn');
const chatToggleBtn = document.getElementById('chat-toggle-btn');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatSidebar = document.getElementById('chat-sidebar');

const messagesArea = document.getElementById('messages-area');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

// --- State Variables ---
let localStream;
let currentCall = null;
let currentConnection = null;
let isAudioEnabled = true;
let isVideoEnabled = true;

// --- Initialize PeerJS ---
const peer = new Peer();

peer.on('open', (id) => {
    myIdDisplay.textContent = id;
});

// Copy ID to clipboard
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(myIdDisplay.textContent);
    copyBtn.innerHTML = '<span class="material-symbols-outlined" style="color: #4ade80;">check</span>';
    setTimeout(() => {
        copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
    }, 2000);
});

// --- Get Local Media ---
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localStream = stream;
        localVideo.srcObject = stream;
    })
    .catch((err) => {
        console.error('Failed to get local stream', err);
        alert("Please allow camera and microphone permissions to use this app.");
    });

// --- Incoming Calls ---
peer.on('call', (call) => {
    currentCall = call;
    call.answer(localStream);
    
    call.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        switchToCallScreen();
    });
});

peer.on('connection', (conn) => {
    setupDataConnection(conn);
});

// --- Outgoing Calls ---
callBtn.addEventListener('click', () => {
    const peerIdToCall = peerIdInput.value.trim();
    if (!peerIdToCall) return alert("Please enter a valid Meeting ID.");

    // Start Call
    currentCall = peer.call(peerIdToCall, localStream);
    currentCall.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        switchToCallScreen();
    });

    // Start Chat
    const conn = peer.connect(peerIdToCall);
    setupDataConnection(conn);
});

// --- Chat Connection Logic ---
function setupDataConnection(conn) {
    currentConnection = conn;
    
    conn.on('open', () => {
        addChatMessage("User joined the meeting.", 'system');
    });

    conn.on('data', (data) => {
        if (data === "SIGNAL_HANGUP") {
            leaveCall();
        } else {
            addChatMessage(data, 'other');
        }
    });

    conn.on('close', () => {
        leaveCall();
    });
}

// --- Media Controls (Mute/Video Off) ---
micBtn.addEventListener('click', () => {
    isAudioEnabled = !isAudioEnabled;
    localStream.getAudioTracks()[0].enabled = isAudioEnabled;
    micIcon.textContent = isAudioEnabled ? 'mic' : 'mic_off';
    micBtn.classList.toggle('danger', !isAudioEnabled);
});

videoBtn.addEventListener('click', () => {
    isVideoEnabled = !isVideoEnabled;
    localStream.getVideoTracks()[0].enabled = isVideoEnabled;
    videoIcon.textContent = isVideoEnabled ? 'videocam' : 'videocam_off';
    videoBtn.classList.toggle('danger', !isVideoEnabled);
});

// --- Chat UI Toggles ---
chatToggleBtn.addEventListener('click', () => {
    chatSidebar.classList.toggle('hidden');
});
closeChatBtn.addEventListener('click', () => {
    chatSidebar.classList.add('hidden');
});

// --- Sending Messages ---
function sendMessage() {
    const text = chatInput.value.trim();
    if (text && currentConnection && currentConnection.open) {
        currentConnection.send(text);
        addChatMessage(text, 'self');
        chatInput.value = '';
    }
}

sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function addChatMessage(text, senderType) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${senderType}`;
    msgDiv.textContent = text;
    messagesArea.appendChild(msgDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// --- Hangup Logic & Screen Management ---
hangupBtn.addEventListener('click', () => {
    if (currentConnection) currentConnection.send("SIGNAL_HANGUP");
    leaveCall();
});

function leaveCall() {
    if (currentCall) currentCall.close();
    if (currentConnection) currentConnection.close();
    
    currentCall = null;
    currentConnection = null;
    remoteVideo.srcObject = null;
    messagesArea.innerHTML = '<div class="msg system">End-to-end encrypted chat started.</div>'; // Reset chat
    
    switchToLobbyScreen();
}

function switchToCallScreen() {
    lobbyScreen.style.display = 'none';
    callScreen.style.display = 'flex';
}

function switchToLobbyScreen() {
    callScreen.style.display = 'none';
    lobbyScreen.style.display = 'block';
    peerIdInput.value = '';
}
