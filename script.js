// ---------- helpers ----------
const qs = sel => document.querySelector(sel);
const toast = msg => {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  qs('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

// ---------- simple DIY signalling ----------
const room = location.hash.slice(1) || 'public';
const SIGNAL_URL = `https://signal-cinemeet.glitch.me/${room}`; // free relay
let socket, peerInstance;

// connect to relay
function connect() {
  socket = new WebSocket(SIGNAL_URL);
  socket.onopen = () => toast('Connected to room');
  socket.onmessage = e => peerInstance && peerInstance.signal(JSON.parse(e.data));
  socket.onerror = () => toast('Signal error');
}

// camera + peer
navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then(stream => {
    qs('#local').srcObject = stream;

    const isInitiator = !location.hash;
    peerInstance = new SimplePeer({
      initiator: isInitiator,
      trickle: false,
      stream
    });

    peerInstance.on('signal', data => socket.send(JSON.stringify(data)));
    peerInstance.on('stream', remote => qs('#remote').srcObject = remote);
    peerInstance.on('connect', () => toast('Peer joined'));

    connect();
  })
  .catch(() => toast('Camera denied'));

// expose for button
window.shareRoom = () => {
  const r = prompt('Room name:') || 'public';
  const url = location.origin + location.pathname + '#' + r;
  navigator.clipboard.writeText(url);
  toast('Link copied: ' + url);
  location.hash = r;
  location.reload();
};

// ---------- rest unchanged ----------
/* chat, file, screen, theme toggle – same as last version */
const chatBox = qs('#chat');
const chatInput = qs('#chatMsg');
function addChat(txt) {
  const div = document.createElement('div');
  div.textContent = txt;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    peerInstance && peerInstance.send(e.target.value);
    addChat('You: ' + e.target.value);
    e.target.value = '';
  }
});
// theme, file drop, screen share code unchanged – keep from last file
