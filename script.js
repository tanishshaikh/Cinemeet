/* 1-line relay server */
import P2PT from 'https://raw.githack.com/subins2000/p2pt/master/dist/p2pt.js';

const trackers = ['wss://tracker.openwebtorrent.com', 'wss://tracker.files.fm:7073/announce'];
const p2pt = new P2PT(trackers, 'cinemeet-' + (location.hash.slice(1) || 'public'));

/* camera + stream */
let peerInstance;
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    document.getElementById('local').srcObject = stream;
    p2pt.on('peer', peer => {
      peerInstance = new SimplePeer({ initiator: true, trickle: false, stream });
      peerInstance.on('signal', data => p2pt.send(peer, data));
      peerInstance.on('stream', remote => document.getElementById('remote').srcObject = remote);
      peerInstance.on('connect', () => console.log('Peer joined'));
    });
    p2pt.on('msg', (msg, peer) => {
      if (!peerInstance) {
        peerInstance = new SimplePeer({ initiator: false, trickle: false, stream });
        peerInstance.on('signal', data => p2pt.send(peer, data));
        peerInstance.on('stream', remote => document.getElementById('remote').srcObject = remote);
      }
      peerInstance.signal(msg);
    });
    p2pt.start();
  })
  .catch(() => alert('Camera denied'));

/* one-click share */
function shareRoom() {
  const room = prompt('Room name (letters/numbers only):') || 'public';
  const url = location.origin + location.pathname + '#' + room;
  navigator.clipboard.writeText(url);
  alert('Room link copied:\n' + url);
}
