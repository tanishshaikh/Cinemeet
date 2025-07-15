// ---------- tiny tracker-relay via P2PT ----------
const trackers = ['wss://tracker.openwebtorrent.com', 'wss://tracker.files.fm:7073/announce'];
const room = location.hash.slice(1) || 'public';
const p2pt = new P2PT(trackers, 'cinemeet-' + room);

// ---------- helpers ----------
const qs = sel => document.querySelector(sel);
const toast = msg => {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  qs('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

// expose for button
window.shareRoom = () => {
  const r = prompt('Room name:') || 'public';
  const url = location.origin + location.pathname + '#' + r;
  navigator.clipboard.writeText(url);
  toast('Link copied: ' + url);
  location.hash = r;
  location.reload();
};

// ---------- camera + peer ----------
let peerInstance;
navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then(stream => {
    qs('#local').srcObject = stream;

    p2pt.on('peer', peer => {
      peerInstance = new SimplePeer({ initiator: true, trickle: false, stream });
      peerInstance.on('signal', data => p2pt.send(peer, data));
      peerInstance.on('stream', remote => qs('#remote').srcObject = remote);
      peerInstance.on('connect', () => toast('Peer joined'));
    });

    p2pt.on('msg', (msg, peer) => {
      if (!peerInstance) {
        peerInstance = new SimplePeer({ initiator: false, trickle: false, stream });
        peerInstance.on('signal', data => p2pt.send(peer, data));
        peerInstance.on('stream', remote => qs('#remote').srcObject = remote);
      }
      peerInstance.signal(msg);
    });

    p2pt.start();
    toast('Room: ' + room);
  })
  .catch(() => toast('Camera denied'));

// ---------- rest (chat, file, screen, theme) ----------
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

// theme toggle
const themeBtn = qs('#themeBtn');
themeBtn.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
});

// file player
qs('#fileInput').addEventListener('change', e => loadFile(e.target.files[0]));
qs('#dropZone').addEventListener('dragover', e => e.preventDefault());
qs('#dropZone').addEventListener('drop', e => {
  e.preventDefault();
  loadFile(e.dataTransfer.files[0]);
});
function loadFile(file) {
  if (!file) return;
  const player = qs('#player');
  player.src = URL.createObjectURL(file);
  player.play();
}

// screen share
const screenBtn = qs('#screenBtn');
const myCam = qs('#myCam');
let sharing = false;
screenBtn.addEventListener('click', async () => {
  if (!sharing) {
    try {
      const scr = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      myCam.srcObject = qs('#local').srcObject;
      myCam.hidden = false;
      const sender = peerInstance._pc
        .getSenders()
        .find(s => s.track && s.track.kind === 'video');
      sender.replaceTrack(scr.getVideoTracks()[0]);
      scr.getVideoTracks()[0].onended = stopShare;
      sharing = true;
      screenBtn.innerHTML = '<i class="material-icons-round">stop_screen_share</i>';
      toast('Sharing screen');
    } catch {
      toast('Screen share failed');
    }
  } else stopShare();
});
function stopShare() {
  const camTrack = qs('#local').srcObject.getVideoTracks()[0];
  const sender = peerInstance._pc
    .getSenders()
    .find(s => s.track && s.track.kind === 'video');
  sender.replaceTrack(camTrack);
  myCam.hidden = true;
  sharing = false;
  screenBtn.innerHTML = '<i class="material-icons-round">present_to_all</i>';
  toast('Stopped sharing');
}
