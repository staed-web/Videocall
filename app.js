// HTML Elements
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const myIdDisplay = document.getElementById('my-id');
const peerIdInput = document.getElementById('peer-id-input');
const callBtn = document.getElementById('call-btn');
const hangupBtn = document.getElementById('hangup-btn');

// Chat Elements
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
        console.error('Failed to get local stream', err);
        alert("Please allow camera and microphone permissions.");
    });

// 2. Handle INCOMING Calls (Video)
peer.on('call', (call) => {
    currentCall = call;
    call.answer(localStream); // Answer automatically
    
    call.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        updateUIForCall(true);
    });
});

// 3. Handle INCOMING Data Connections (Chat)
peer.on('connection', (conn) => {
    setupDataConnection(conn);
});

// 4. Handle OUTGOING Calls
callBtn.addEventListener('click', () => {
    const peerIdToCall = peerIdInput.value.trim();
    if (!peerIdToCall) return alert("Enter a valid ID.");

    // Start video call
    currentCall = peer.call(peerIdToCall, localStream);
    currentCall.on('stream', (remoteStream) => {
        remoteVideo.srcObject = remoteStream;
        updateUIForCall(true);
    });

    // Start data connection (Chat)
    const conn = peer.connect(peerIdToCall);
    setupDataConnection(conn);
});

// 5. Setup Chat Connection Logic
function setupDataConnection(conn) {
    currentConnection = conn;
    
    conn.on('open', () => {
        enableChat(true);
        addChatMessage("Connected! You can now chat.", 'system');
    });

    conn.on('data', (data) => {
        // If we receive the secret hangup command, end the call on this side
        if (data === "SIGNAL_HANGUP") {
            endCall();
        } else {
            addChatMessage(data, 'other');
        }
    });

    conn.on('close', () => {
        endCall();
    });
}

// 6. Hang Up Button Logic
hangupBtn.addEventListener('click', () => {
    // Tell the other person we are hanging up
    if (currentConnection) {
        currentConnection.send("SIGNAL_HANGUP");
    }
    endCall();
});

// 7. Send Chat Message Logic
function sendMessage() {
    const text = chatInput.value.trim();
    if (text && currentConnection && currentConnection.open) {
        currentConnection.send(text); // Send to peer
        addChatMessage(text, 'self'); // Show on our screen
        chatInput.value = ''; // Clear input
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
    remoteVideo.srcObject = null; // Clear their video
    
    updateUIForCall(false);
    enableChat(false);
    addChatMessage("Call ended.", 'system');
}

function updateUIForCall(inCall) {
    if (inCall) {
        callBtn.style.display = 'none';
        hangupBtn.style.display = 'inline-block';
        peerIdInput.style.display = 'none';
    } else {
        callBtn.style.display = 'inline-block';
        hangupBtn.style.display = 'none';
        peerIdInput.style.display = 'inline-block';
        peerIdInput.value = '';
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
    // Auto-scroll to bottom
    messagesArea.scrollTop = messagesArea.scrollHeight;
}
