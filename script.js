/* helpers */
const qs = sel => document.querySelector(sel);
const toast = msg => {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  qs('#toasts').appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

/* theme */
const themeBtn = qs('#themeBtn');
const setTheme = t => {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('theme', t);
};
setTheme(localStorage.getItem('theme') || 'dark');
themeBtn.onclick = () =>
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

/* room & peer */
const ROOM = location.hash.slice(1) || 'defaultRoom';
history.replaceState(null, null, '#' + ROOM);
let peerInstance;

function initPeer(stream) {
  peerInstance = new SimplePeer({
    initiator: ROOM === 'init',
    trickle: false,
    stream
  });
  peerInstance.on('signal', data =>
    navigator.clipboard.writeText(JSON.stringify(data)).then(() =>
      toast('Signal copied – send to friend')
    )
  );
  peerInstance.on('connect', () => toast('Connected'));
  peerInstance.on('stream', remote => (qs('#remote').srcObject = remote));
  peerInstance.on('data', txt => addChat(txt.toString()));
  peerInstance.on('error', e => toast(e.message));
}

navigator.mediaDevices
  .getUserMedia({ video: true, audio: true })
  .then(stream => {
    qs('#local').srcObject = stream;
    initPeer(stream);
  })
  .catch(() => toast('Camera access denied'));

/* chat */
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
    peerInstance.send(e.target.value);
    addChat('You: ' + e.target.value);
    e.target.value = '';
  }
});
const picker = new EmojiButton();
picker.on('emoji', emoji => (chatInput.value += emoji));
qs('#emojiBtn').addEventListener('click', () => picker.togglePicker(chatInput));

/* file player */
const fileInput = qs('#fileInput');
const player = qs('#player');
const dropZone = qs('#dropZone');
fileInput.addEventListener('change', e => loadFile(e.target.files[0]));
dropZone.addEventListener('dragover', e => e.preventDefault());
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  loadFile(e.dataTransfer.files[0]);
});
function loadFile(file) {
  if (!file) return;
  player.src = URL.createObjectURL(file);
  player.play();
}

/* screen share */
const screenBtn = qs('#screenBtn');
const myCam = qs('#myCam');
let sharing = false;
screenBtn.addEventListener('click', async () => {
  if (!sharing) {
    try {
      const scr = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
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

/* draggable PiP */
['local', 'myCam'].forEach(id => {
  const el = qs('#' + id);
  let ox, oy, dragging = false;
  el.addEventListener('mousedown', e => {
    dragging = true;
    ox = e.clientX - el.offsetLeft;
    oy = e.clientY - el.offsetTop;
  });
  window.addEventListener('mousemove', e => {
    if (!dragging) return;
    el.style.left = e.clientX - ox + 'px';
    el.style.top = e.clientY - oy + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  });
  window.addEventListener('mouseup', () => (dragging = false));
});