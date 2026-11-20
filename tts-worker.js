// Kokoro neural voice, running entirely on this device (WebGPU when available, otherwise WebAssembly).
// The model downloads once and is cached by the browser, so reading works offline afterwards.
import { KokoroTTS, TextSplitterStream } from 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js';

const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX-timestamped';
const PUNCT = /[\s;:,.!?¡¿—…"«»“”(){}[\]]/;
let tts = null, loading = null, device = 'wasm', lastDurations = null;
const queue = [];
let busy = false;

// kokoro-js waits for more text unless the splitter is closed, so always hand it a closed stream.
function streamOf(text, voice) {
  const sp = new TextSplitterStream();
  sp.push(text); sp.close();
  return tts.stream(sp, { voice });
}

async function load(opts) {
  if (loading) return loading;
  loading = (async () => {
    let gpu = false;
    if (opts.allowGPU && self.navigator && navigator.gpu) {
      try { gpu = !!(await navigator.gpu.requestAdapter()); } catch { gpu = false; }
    }
    device = gpu ? 'webgpu' : 'wasm';
    const seen = {};
    tts = await KokoroTTS.from_pretrained(MODEL, {
      dtype: gpu ? (opts.gpuDtype || 'fp32') : 'q8',
      device,
      progress_callback: p => {
        if (p.status === 'progress' && p.file) {
          seen[p.file] = { loaded: p.loaded || 0, total: p.total || 0 };
          let l = 0, t = 0; for (const k in seen) { l += seen[k].loaded; t += seen[k].total; }
          postMessage({ type: 'progress', loaded: l, total: t });
        }
      }
    });
    // Wrap the model call so we can read the per-phoneme durations it predicts (used for word timing).
    const model = tts.model;
    tts.model = async inputs => {
      const out = await model(inputs);
      const d = out.durations || out.pred_dur || out.duration;
      lastDurations = d ? Array.from(d.data, Number) : null;
      return out;
    };
    // warm up so the first real sentence is fast
    for await (const _ of streamOf('Ready.', 'af_heart')) { /* discard */ }
    postMessage({ type: 'ready', device, dtype: gpu ? (opts.gpuDtype || 'fp32') : 'q8' });
  })().catch(e => {
    loading = null;
    postMessage({ type: 'error', message: String((e && e.message) || e) });
  });
  return loading;
}

// Turn phoneme durations into start times (seconds) for each spoken word.
function wordStarts(phonemes, durations, seconds) {
  if (!durations || durations.length < 3) return null;
  const total = durations.reduce((a, b) => a + b, 0) || 1;
  const spf = seconds / total;                  // seconds per duration unit
  const inner = durations.length - 2;            // without the start/end pad tokens
  const ratio = inner / Math.max(1, phonemes.length);
  const startOf = k => {                         // time at which phoneme char k begins
    const idx = Math.min(durations.length - 1, 1 + Math.floor(k * ratio));
    let t = 0; for (let j = 0; j < idx; j++) t += durations[j];
    return t * spf;
  };
  const starts = []; let inWord = false;
  for (let k = 0; k < phonemes.length; k++) {
    const w = !PUNCT.test(phonemes[k]);
    if (w && !inWord) starts.push(startOf(k));
    inWord = w;
  }
  return starts;
}

async function synth({ id, text, voice }) {
  await load({ allowGPU: true });
  const parts = []; const starts = []; let offset = 0, exact = true;
  for await (const chunk of streamOf(text, voice)) {
    const samples = chunk.audio.audio;
    const secs = samples.length / chunk.audio.sampling_rate;
    const ws = wordStarts(chunk.phonemes || '', lastDurations, secs);
    if (ws) ws.forEach(s => starts.push(offset + s)); else exact = false;
    parts.push(samples); offset += secs;
  }
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Float32Array(len); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  postMessage({ type: 'audio', id, samples: out, rate: 24000, starts, exact, seconds: offset }, [out.buffer]);
}

async function pump() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const job = queue.shift();
    try { await synth(job); }
    catch (e) { postMessage({ type: 'fail', id: job.id, message: String((e && e.message) || e) }); }
  }
  busy = false;
}

onmessage = ({ data }) => {
  if (data.type === 'load') load(data);
  else if (data.type === 'speak') {
    // urgent requests (the sentence the reader is waiting for) jump the queue
    if (data.urgent) queue.unshift(data); else queue.push(data);
    pump();
  } else if (data.type === 'prioritize') {
    const k = queue.findIndex(j => j.id === data.id);
    if (k > 0) queue.unshift(queue.splice(k, 1)[0]);
  } else if (data.type === 'cancel') {
    const keep = new Set(data.keep || []);
    for (let i = queue.length - 1; i >= 0; i--) if (!keep.has(queue[i].id)) {
      postMessage({ type: 'fail', id: queue[i].id, message: 'cancelled' });
      queue.splice(i, 1);
    }
  }
};
