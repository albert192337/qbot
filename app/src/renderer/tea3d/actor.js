import { SpinePlayer } from '../pet/spine-player';
import { Player } from '../pet/player';

/** Adapt existing character playback to a transparent Three.js texture. */
export function createActorSource(host, char, onEnded = () => {}) {
  const manifest = structuredClone(char.manifest);
  if (manifest.spine) {
    delete manifest.spine.seat;
    const player = new SpinePlayer(host, char.dirId, manifest, onEnded);
    return { player, canvas: host.querySelector('canvas'), kind: 'Spine', available: Object.keys(manifest.spine.actions || {}),
      canSit: !!manifest.spine.actions?.perch, update() {},
      anchor: kind => player.getSceneAnchor(kind),
    };
  }
  const player = new Player(host, onEnded);
  const available=player.load(char.dirId, manifest);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const probe = document.createElement('canvas');probe.width = probe.height = 128;
  const sample = probe.getContext('2d', { willReadFrequently: true });
  let previous = null, crop = null;
  return { player, canvas, kind: '动画', available, canSit: false,
    anchor: () => ({ x: .5, y: .9 }),
    update() {
      const media = [...host.querySelectorAll('video')].find(v => v.style.visibility === 'visible' && v.readyState >= 2)
        || [...host.querySelectorAll('img')].find(i => i.style.visibility !== 'hidden' && i.complete && i.naturalWidth);
      if (!media) { canvas.dataset.ready = 'false'; return; }
      const width = media.videoWidth || media.naturalWidth, height = media.videoHeight || media.naturalHeight;
      if (media !== previous) {
        sample.clearRect(0, 0, 128, 128);sample.drawImage(media, 0, 0, 128, 128);
        const data = sample.getImageData(0, 0, 128, 128).data;
        let left = 128, top = 128, right = -1, bottom = -1;
        for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) if (data[(y * 128 + x) * 4 + 3] > 24) {
          left = Math.min(left, x);right = Math.max(right, x);top = Math.min(top, y);bottom = Math.max(bottom, y);
        }
        if (right < left) return;
        crop = { cx: (left + right + 1) / 256 * width, bottom: (bottom + 1) / 128 * height,
          scale: Math.min(390 / ((bottom - top + 1) / 128 * height), 420 / ((right - left + 1) / 128 * width)) };
        previous = media;
      }
      ctx.clearRect(0, 0, 512, 512);
      ctx.drawImage(media, 256 - crop.cx * crop.scale, 460.8 - crop.bottom * crop.scale, width * crop.scale, height * crop.scale);
      canvas.dataset.ready = 'true';canvas.dataset.media = media.tagName;
    },
  };
}
