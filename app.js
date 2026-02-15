// Video Elements
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');

// Overlay Elements
const joinOverlay = document.getElementById('join-overlay');
const myIdDisplay = document.getElementById('my-id');
const peerIdInput = document.getElementById('peer-id-input');
const callBtn = document.getElementById('call-btn');

// Control Bar & Actions
const controlsBar = document.getElementById('controls-bar');
const hangupBtn = document.getElementById('hangup-btn');
const chatToggleBtn = document.getElementById('chat-toggle-btn');

// Chat Elements
const chatSection = document.getElementById('chat-section');
const closeChatBtn = document.getElementById('close-chat-btn');
const messagesArea = document.getElementById('messages-area');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

let localStream;
let currentCall = null;
let currentConnection = null;

// Initialize PeerJS
const peer = new Peer();

peer.on('open', (id) => {
    myIdDisplay.textContent = id;
});

// 1. Get Local Camera
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
        localStream = stream;
        localVideo.srcObject = stream;
    })
    .catch((err) => {
        console.error('Camera failed', err);
        alert("Camera and microphone access is required for this app.");
    });

// 2. Handle INCOMING Calls
peer.on('call', (call) => {
    currentCall = call;
    call.answer(localStream);
    
    call.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        transitionToInCallUI(true);
    });
});

// 3. Handle INCOMING Chat Connections
peer.on('connection', (conn) => {
    setupDataConnection(conn);
});

// 4. Handle OUTGOING Calls
callBtn.addEventListener('click', () => {
    const peerIdToCall = peerIdInput.value.trim();
    if (!peerIdToCall) {
        // Simple visual shake or alert could go here
        return alert("Please enter a valid Partner ID.");
    }

    callBtn.textContent = "Connecting...";

    currentCall = peer.call(peerIdToCall, localStream);
    currentCall.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        transitionToInCallUI(true);
    });

    const conn = peer.connect(peerIdToCall);
    setupDataConnection(conn);
});

// 5. Chat Connection Logic
function setupDataConnection(conn) {
    currentConnection = conn;
    
    conn.on('open', () => {
        enableChat(true);
        addChatMessage("Meeting securely connected.", 'system');
    });

    conn.on('data', (data) => {
        if (data === "SIGNAL_HANGUP") {
            endCall();
        } else {
            addChatMessage(data, 'other');
            // Auto-open chat if it's closed and we get a message
            chatSection.classList.add('active'); 
        }
    });

    conn.on('close', () => endCall());
}

// 6. UI Interaction Logic
hangupBtn.addEventListener('click', () => {
    if (currentConnection) currentConnection.send("SIGNAL_HANGUP");
    endCall();
});

chatToggleBtn.addEventListener('click', () => {
    chatSection.classList.toggle('active');
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
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// --- Helper Functions ---

function endCall() {
    if (currentCall) currentCall.close();
    if (currentConnection) currentConnection.close();
    
    currentCall = null;
    currentConnection = null;
    remoteVideo.srcObject = null;
    
    transitionToInCallUI(false);
    enableChat(false);
    callBtn.textContent = "Start Meeting";
    messagesArea.innerHTML = '<div class="msg system">Meeting ended.</div>';
}

function transitionToInCallUI(inCall) {
    if (inCall) {
        // Hide the join menu, show the controls
        joinOverlay.classList.add('hidden');
        controlsBar.classList.add('active');
        // Make the local video smaller and push it to the corner
        localVideo.style.width = '200px';
        localVideo.style.height = '150px';
        localVideo.style.bottom = '100px';
    } else {
        // Show the join menu, hide the controls
        joinOverlay.classList.remove('hidden');
        controlsBar.classList.remove('active');
        chatSection.classList.remove('active'); // Close chat panel
        // Reset local video to look normal in the background
        localVideo.style.width = '100%';
        localVideo.style.height = '100%';
        localVideo.style.bottom = '0';
    }
}

function enableChat(enable) {
    chatInput.disabled = !enable;
    sendBtn.disabled = !enable;
}

function addChatMessage(text, senderType) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msg', senderType);
    msgDiv.textContent = text;
    messagesArea.appendChild(msgDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}
