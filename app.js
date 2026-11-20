// Readalong: reads documents aloud with an on-device neural voice and highlights each word.
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HAS_WORD = /[\p{L}\p{N}]/u;
const isTouchDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
const IS_APPLE = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const ICON = {
  play: '<path d="M7 4.5v15l12.5-7.5z"/>',
  pause: '<path d="M6.5 4.5h4v15h-4zM13.5 4.5h4v15h-4z"/>',
  eyeOff: '<svg class="i" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.8M6.6 6.6A16.6 16.6 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  eye: '<svg class="i" viewBox="0 0 24 24"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  x: '<svg class="i" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  check: '<svg class="i" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  playSm: '<svg class="i" viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
};

/* ════════════════════════════ settings */
const DEFAULTS = { theme: 'auto', font: 'literata', size: 20, lh: 1.7, measure: 36, focus: true, dim: 0.32,
  follow: true, bionic: false, paraPause: false, rate: 1, voice: 'af_heart' };
const FONTS = {
  literata: { css: '"Literata", ui-serif, Georgia, serif', name: 'Literata', note: 'Book' },
  newyork: { css: 'ui-serif, "New York", "Iowan Old Style", Georgia, serif', name: 'New York', note: 'Apple serif' },
  atkinson: { css: '"Atkinson Hyperlegible", system-ui, sans-serif', name: 'Atkinson', note: 'Easiest to tell letters apart' },
  sf: { css: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif', name: 'San Francisco', note: 'System' },
};
const local = {
  get(k, d) { try { const v = localStorage.getItem('ra.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ra.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const settings = Object.assign({}, DEFAULTS, local.get('settings', {}));
const saveSettings = () => local.set('settings', settings);
const darkMQ = matchMedia('(prefers-color-scheme: dark)');

function applySettings() {
  const r = document.documentElement;
  const theme = settings.theme === 'auto' ? (darkMQ.matches ? 'dark' : 'light') : settings.theme;
  r.dataset.theme = theme;
  r.style.setProperty('--read', (FONTS[settings.font] || FONTS.literata).css);
  r.style.setProperty('--size', settings.size + 'px');
  r.style.setProperty('--lh', settings.lh);
  r.style.setProperty('--measure', settings.measure + 'em');
  r.style.setProperty('--dim', settings.dim);
  document.body.classList.toggle('focus', settings.focus);
  document.body.classList.toggle('bionic', settings.bionic);
  const meta = $('meta[name=theme-color]');
  if (meta) meta.content = getComputedStyle(r).getPropertyValue('--paper').trim() || '#f7f5f0';
  $('#speedBtn').textContent = fmtRate(settings.rate);
  const v = VOICES.find(v => v.id === settings.voice); $('#voiceName').textContent = v ? v.name : 'Voice';
}
darkMQ.addEventListener('change', applySettings);
const fmtRate = r => { const s = String(Math.round(r * 100) / 100); return (s.includes('.') ? s : s + '.0') + '×'; };
function layoutMode() { document.body.classList.toggle('mobile', isTouchDevice || innerWidth < 640); }
addEventListener('resize', layoutMode);

const VOICES = [
  { id: 'af_heart', name: 'Heart', desc: 'Warm, natural · US', group: 'Recommended' },
  { id: 'af_bella', name: 'Bella', desc: 'Bright, expressive · US', group: 'Recommended' },
  { id: 'af_nicole', name: 'Nicole', desc: 'Soft and calm · US', group: 'Recommended' },
  { id: 'bf_emma', name: 'Emma', desc: 'Clear · British', group: 'Recommended' },
  { id: 'am_michael', name: 'Michael', desc: 'Steady · US', group: 'More voices' },
  { id: 'am_fenrir', name: 'Fenrir', desc: 'Deep · US', group: 'More voices' },
  { id: 'am_puck', name: 'Puck', desc: 'Lively · US', group: 'More voices' },
  { id: 'bm_george', name: 'George', desc: 'Measured · British', group: 'More voices' },
  { id: 'bm_fable', name: 'Fable', desc: 'Storyteller · British', group: 'More voices' },
  { id: 'af_aoede', name: 'Aoede', desc: 'Gentle · US', group: 'More voices' },
  { id: 'af_kore', name: 'Kore', desc: 'Even · US', group: 'More voices' },
  { id: 'af_sarah', name: 'Sarah', desc: 'Friendly · US', group: 'More voices' },
  { id: 'bf_isabella', name: 'Isabella', desc: 'Warm · British', group: 'More voices' },
];

/* ════════════════════════════ storage (IndexedDB, falls back to memory) */
const db = (() => {
  const mem = new Map(); let opened = null;
  const open = () => opened || (opened = new Promise((res, rej) => {
    try {
      const r = indexedDB.open('readalong', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('docs', { keyPath: 'id' });
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  }));
  const run = async (mode, fn) => {
    try {
      const d = await open();
      return await new Promise((res, rej) => {
        const t = d.transaction('docs', mode); const req = fn(t.objectStore('docs'));
        t.oncomplete = () => res(req && req.result); t.onerror = () => rej(t.error);
      });
    } catch { return undefined; }
  };
  return {
    async all() { const r = await run('readonly', s => s.getAll()); return r || [...mem.values()]; },
    async get(id) { return (await run('readonly', s => s.get(id))) || mem.get(id); },
    async put(doc) { mem.set(doc.id, doc); await run('readwrite', s => s.put(doc)); },
    async del(id) { mem.delete(id); await run('readwrite', s => s.delete(id)); },
  };
})();

/* ════════════════════════════ feedback */
let toastTimer;
function toast(msg, opts = {}) {
  const t = $('#toast');
  t.innerHTML = esc(msg) + (opts.action ? ` <button style="margin-left:10px;font-weight:600;text-decoration:underline;color:inherit">${esc(opts.action)}</button>` : '');
  t.style.pointerEvents = opts.action ? 'auto' : 'none';
  if (opts.action) t.querySelector('button').onclick = () => { t.classList.remove('show'); opts.onAction(); };
  t.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), opts.ms || 3200);
}
function busy(msg) { $('#busy').hidden = !msg; if (msg) $('#busyText').textContent = msg; }

/* ════════════════════════════ text cleaning */
const JUNK = new RegExp('^(?:' + [
  'advertisement', 'advertisement continues below', 'sponsored(?: content)?', 'promoted', 'ad', 'ads',
  'skip to (?:main )?content', 'share(?: this(?: article| story)?)?', 'share on \\w+', 'follow us.*', 'subscribe.*',
  'sign up.*', '.*newsletter.*', 'read more.*', 'related(?: articles| stories| reading)?:?.*', 'recommended.*',
  'you (?:may|might) also like.*', 'more from .*', 'most popular.*', 'trending.*', 'click here.*', '.*cookies?.*',
  'image(?: credit)?:.*', 'photo(?:graph)?(?: credit)?:.*', 'credit:.*', 'getty images.*', '(?:\\w+ )?via getty.*',
  'all rights reserved.*', '©.*', 'copyright .*', 'listen to (?:this )?(?:article|story).*', '\\d+ min(?:ute)? read',
  '(?:updated|published|posted) .*\\d{4}.*', 'comments?', 'log ?in', 'sign ?in', 'print', 'email', 'save',
  'continue reading.*', 'back to top', 'table of contents', 'jump to.*', 'download (?:pdf|app).*', 'open in app',
  'this article (?:was|is) .*(?:updated|corrected).*', 'tags?:.*', 'filed under.*', 'see all.*',
].join('|') + ')$', 'i');

const clean = t => t
  .replace(/\[(?:\d+(?:\s*[,–-]\s*\d+)*|citation needed|edit|note \d+|[a-z])\]/gi, '')
  .replace(/\bhttps?:\/\/[^\s)\]>"]+/gi, '')
  .replace(/\bwww\.[^\s)\]>"]+/gi, '')
  .replace(/\b[\w.-]+\.(?:com|org|net|io|edu|gov|co|ai|dev|uk|de|in|ly|me|app)\/[^\s)\]>"]*/gi, '')
  .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '')
  .replace(/\b(?:doi|arxiv|isbn|issn|pmid|pmcid)\s*:?\s*[\w./:-]*\d[\w./:-]*/gi, '')
  .replace(/\(\s*[,;:.]?\s*\)|\[\s*\]|<\s*>/g, '')
  .replace(/\s+([,.;:!?])/g, '$1')
  .replace(/\s+/g, ' ').trim();

function finalize(blocks) {
  const out = [];
  for (const b of blocks) {
    b.text = clean(b.text);
    if (!HAS_WORD.test(b.text)) continue;
    if (b.text.length < 140 && JUNK.test(b.text)) continue;
    const prev = out[out.length - 1];
    if (prev && prev.text === b.text) continue;
    out.push(b);
  }
  return out;
}

/* ════════════════════════════ importers → { title, meta, kind, blocks:[{tag,level,text}] } */
const BLOCK_SEL = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,dt,dd';
function blocksFromHTML(html) {
  const d = new DOMParser().parseFromString(html, 'text/html');
  d.querySelectorAll('script,style,noscript,pre,code,svg,math,figure,figcaption,table,sup.reference,button,nav,form,iframe,aside,footer,[aria-hidden=true]').forEach(e => e.remove());
  const out = [];
  d.body.querySelectorAll(BLOCK_SEL).forEach(el => {
    let t;
    if (el.querySelector(BLOCK_SEL)) { const c = el.cloneNode(true); c.querySelectorAll(BLOCK_SEL).forEach(x => x.remove()); t = c.textContent; }
    else t = el.textContent;
    const h = /^H(\d)$/.exec(el.tagName);
    out.push({ tag: h ? 'h' : el.tagName === 'LI' ? 'li' : el.tagName === 'BLOCKQUOTE' ? 'quote' : 'p', level: h ? +h[1] : 0, text: t || '' });
  });
  const res = finalize(out);
  return res.length ? res : textToBlocks(d.body.textContent || '');
}
function textToBlocks(t) {
  t = t.replace(/\r\n?/g, '\n');
  let paras = t.split(/\n\s*\n/);
  if (paras.length === 1 && t.split('\n').length > 15) paras = t.split('\n');
  return finalize(paras.map(p => ({ tag: 'p', level: 0, text: p.replace(/-\n(?=[a-z])/g, '') })));
}
function mdToBlocks(md) {
  md = md.replace(/\r\n?/g, '\n')
    .replace(/^---\n[\s\S]*?\n---\n?/, '')
    .replace(/%%[\s\S]*?%%/g, '')
    .replace(/!\[\[[^\]]*\]\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
    .replace(/\[\[([^\]]*)\]\]/g, (m, a) => a.replace(/#\^?/g, ', '))
    .replace(/==([^=\n]+)==/g, '$1')
    .replace(/^(\s*>\s*)\[!(\w+)\][+-]?\s*/gm, (m, p, k) => p + k.charAt(0).toUpperCase() + k.slice(1) + '. ')
    .replace(/\s\^[\w-]+$/gm, '')
    .replace(/^\s*[-*] \[[ xX]\] /gm, '- ')
    .replace(/(^|\s)#[\w/-]+/g, '$1');
  return blocksFromHTML(marked.parse(md));
}
function htmlToDoc(html, baseUrl) {
  const d = new DOMParser().parseFromString(html, 'text/html');
  if (baseUrl) { const b = d.createElement('base'); b.href = baseUrl; d.head.prepend(b); }
  d.querySelectorAll([
    '.infobox', '.navbox', '.sidebar', '.vertical-navbox', '.metadata', '.reflist', '.references', '.hatnote', '.mw-editsection',
    '.shortdescription', '[role=navigation]', '[role=complementary]', '[role=banner]', '[role=contentinfo]', 'ins.adsbygoogle',
    '[class*="advert" i]', '[id*="advert" i]', '[class*="sponsor" i]', '[class*="promo" i]', '[class*="newsletter" i]',
    '[class*="subscribe" i]', '[class*="cookie" i]', '[class*="paywall" i]', '[class*="social" i]', '[class*="share-" i]',
    '[class*="related" i]', '[class*="recirc" i]', '[class*="outbrain" i]', '[class*="taboola" i]', '[id^="ad-" i]', '[class^="ad-" i]', '[class*=" ad-" i]',
  ].join(',')).forEach(e => { if (e !== d.body && e.tagName !== 'ARTICLE' && e.tagName !== 'MAIN') e.remove(); });
  const pageTitle = (d.title || '').trim();
  let art = null;
  try { art = new Readability(d, { charThreshold: 300 }).parse(); } catch (e) { console.warn(e); }
  const host = baseUrl ? new URL(baseUrl).hostname.replace(/^www\./, '') : '';
  if (!art || !art.content) return { title: pageTitle || host || 'Web page', meta: host, kind: 'web', blocks: blocksFromHTML(html) };
  const byline = art.byline && !/contributors to wiki/i.test(art.byline) ? art.byline : '';
  const meta = [byline, art.siteName && !/wikimedia/i.test(art.siteName) ? art.siteName : host].filter(Boolean).map(s => s.trim()).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
  return { title: (art.title || pageTitle || 'Web page').trim(), meta, kind: 'web', blocks: blocksFromHTML(art.content) };
}

const PDF_HEAD_WORDS = /^(?:\d+(?:\.\d+)*\.?\s+)?(abstract|introduction|background|related work|methods?|methodology|materials and methods|results|discussion|conclusions?|summary|limitations|future work|references|bibliography|acknowledge?ments|appendix(?: [a-z0-9]+)?|notes)$/i;
function pdfHeading(t) {
  if (t.length > 90 || /[.,;:]$/.test(t)) return 0;
  if (PDF_HEAD_WORDS.test(t)) return /^\d+\.\d/.test(t) ? 3 : 2;
  const m = /^(\d+(?:\.\d+)*)\.?\s+([A-Z][^.!?]{2,80})$/.exec(t);
  if (m && t.split(' ').length <= 12 && !/\d{3,}/.test(m[2])) return 2 + Math.min(2, m[1].split('.').length - 1);
  return 0;
}
async function pdfToDoc(buf, name) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let title = name;
  try { const m = await pdf.getMetadata(); const t = m.info && m.info.Title && m.info.Title.trim(); if (t && t.length > 3 && !/^(untitled|microsoft word|document\d*)/i.test(t)) title = t; } catch { /* no metadata */ }
  // 1) collect lines per page
  const pages = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    busy(`Reading page ${p} of ${pdf.numPages}`);
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const lines = []; let line = null;
    const push = () => { if (line && line.text.trim()) lines.push(line); line = null; };
    for (const it of tc.items) {
      if (!('str' in it)) continue;
      const y = it.transform[5], h = Math.abs(it.transform[3]) || it.height || 10;
      if (line && Math.abs(y - line.y) > h * 0.6) push();
      if (!line) line = { text: '', y, h };
      line.text += it.str;
      if (it.hasEOL) push();
    }
    push();
    pages.push(lines);
  }
  // 2) running headers / footers: lines that repeat at the top or bottom of many pages
  const norm = t => t.trim().toLowerCase().replace(/\d+/g, '#').replace(/\s+/g, ' ');
  const counts = new Map();
  pages.forEach(ls => new Set([...ls.slice(0, 3), ...ls.slice(-3)].map(l => norm(l.text))).forEach(k => counts.set(k, (counts.get(k) || 0) + 1)));
  const minRep = Math.max(3, Math.ceil(pages.length * 0.3));
  const isRepeated = t => pages.length >= 3 && (counts.get(norm(t)) || 0) >= minRep;
  // 3) build paragraphs from line spacing
  const blocks = [];
  let para = '';
  const flush = () => { if (HAS_WORD.test(para)) blocks.push({ tag: 'p', level: 0, text: para }); para = ''; };
  pages.forEach(lines => {
    const last = blocks[blocks.length - 1];
    if (!para && last && last.tag === 'p' && !/[.!?:"”’)\]]$/.test(last.text)) para = blocks.pop().text; // paragraph runs over the page break
    lines.forEach((L, k) => {
      const t = L.text.trim();
      if (/^(?:page\s*)?\d{1,4}(?:\s*(?:of|\/)\s*\d+)?$/i.test(t) || isRepeated(t)) return;
      const lvl = pdfHeading(t);
      if (lvl) { flush(); blocks.push({ tag: 'h', level: lvl, text: t }); return; }
      const prev = lines[k - 1];
      if (prev) { const gap = prev.y - L.y; if (gap < -2 || gap > Math.max(prev.h, L.h) * 1.6) flush(); }
      if (/[A-Za-z]-$/.test(para) && /^[a-z]/.test(t)) para = para.slice(0, -1) + t;
      else para += (para ? ' ' : '') + t;
    });
    flush();
  });
  const res = finalize(blocks);
  if (!res.length) throw new Error('This PDF has no selectable text (it is probably a scan). Open it in Preview and use Live Text, or run OCR first.');
  return { title, meta: `PDF · ${pdf.numPages} pages`, kind: 'pdf', blocks: res };
}

// Parts most people don't want read aloud: reference lists, captions and similar.
const BACK_MATTER = /^(?:\d+(?:\.\d+)*\.?\s*)?(references|bibliography|works cited|literature cited|citations|notes|endnotes|footnotes|acknowledge?ments|see also|further reading|external links|sources|about the authors?|author contributions|competing interests|conflicts? of interest|funding|data availability|supplementary (?:material|information))\s*:?$/i;
function autoSkips(all) {
  const skip = {};
  let on = false, lvl = 0, label = '';
  all.forEach((b, i) => {
    if (i === 0) {
      if ((b.text.match(/\p{L}{2,}/gu) || []).length < 2) skip[0] = 'File name';
      return;
    }
    if (b.text.length < 70 && BACK_MATTER.test(b.text)) {
      on = true; lvl = b.tag === 'h' ? b.level : 0; label = b.text.replace(/^[\d.\s]+/, '');
      skip[i] = label; return;
    }
    if (on) {
      if (b.tag === 'h' && (!lvl || b.level <= lvl) && !BACK_MATTER.test(b.text)) on = false;
      else if (/^appendix\b/i.test(b.text) && b.text.length < 80) on = false;
      else { skip[i] = label; return; }
    }
    if (/^(?:figure|fig\.|table|chart|source|image|photo)\s*\d*[.:]/i.test(b.text) && b.text.length < 400) skip[i] = 'Caption';
  });
  return skip;
}

/* ════════════════════════════ loading sources */
const extOf = n => (n.split('.').pop() || '').toLowerCase();
const baseName = n => n.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ');
const KIND_LABEL = { pdf: 'PDF', web: 'WEB', note: 'MD', docx: 'DOC', text: 'TXT' };

async function loadFile(file) {
  const ext = extOf(file.name);
  busy('Opening ' + file.name);
  try {
    let d;
    if (ext === 'pdf' || file.type === 'application/pdf') d = await pdfToDoc(await file.arrayBuffer(), baseName(file.name));
    else if (ext === 'docx') {
      const r = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      d = { title: baseName(file.name), meta: 'Word document', kind: 'docx', blocks: blocksFromHTML(r.value) };
    } else if (ext === 'md' || ext === 'markdown') d = { title: baseName(file.name), meta: 'Note', kind: 'note', blocks: mdToBlocks(await file.text()) };
    else if (ext === 'html' || ext === 'htm') d = htmlToDoc(await file.text());
    else if (ext === 'doc' || ext === 'pages') throw new Error(`.${ext} files can't be opened. Export it as .docx or PDF first.`);
    else d = { title: baseName(file.name), meta: 'Text', kind: 'text', blocks: textToBlocks(await file.text()) };
    if (d.kind !== 'web' && d.blocks[0] && d.blocks[0].tag === 'h' && d.blocks[0].level <= 1) d.title = d.blocks.shift().text;
    await addAndOpen(d);
  } catch (e) { console.error(e); toast(e.message || String(e), { ms: 7000 }); }
  finally { busy(); }
}

async function fetchVia(url) {
  // Try the site directly first (works for sites that allow it), then a public reader proxy.
  try {
    const r = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (r.ok) return { r, finalUrl: r.url || url, proxied: false };
  } catch { /* blocked by CORS: use the proxy */ }
  const pdfLike = /\.pdf(?:$|[?#])/i.test(url);
  const r = await fetch('https://r.jina.ai/' + url, { headers: pdfLike ? {} : { 'X-Return-Format': 'html' } });
  if (!r.ok) throw new Error(r.status === 451 || r.status === 403
    ? 'That site blocks reading apps. Open it, select the text, copy it, and paste it here.'
    : `Couldn't open that link (error ${r.status}).`);
  return { r, finalUrl: url, proxied: true, pdfLike };
}
async function loadURL(u) {
  u = (u || '').trim(); if (!u) return;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { new URL(u); } catch { return toast('That doesn\'t look like a web link.'); }
  busy('Fetching the page');
  try {
    const { r, finalUrl, proxied, pdfLike } = await fetchVia(u);
    const ct = r.headers.get('Content-Type') || '';
    const host = new URL(finalUrl).hostname.replace(/^www\./, '');
    let d;
    if (!proxied && (ct.includes('pdf') || /\.pdf(?:$|[?#])/i.test(finalUrl))) d = await pdfToDoc(await r.arrayBuffer(), decodeURIComponent(finalUrl.split('/').pop().split('?')[0] || 'PDF'));
    else if (proxied && pdfLike) {
      const txt = await r.text();
      const title = (/^Title:\s*(.+)$/m.exec(txt) || [])[1] || baseName(decodeURIComponent(u.split('/').pop()));
      d = { title, meta: 'PDF', kind: 'pdf', blocks: mdToBlocks(txt.replace(/^[\s\S]*?Markdown Content:\s*/m, '')) };
    } else if (ct.includes('html') || ct.includes('xml') || proxied) d = htmlToDoc(await r.text(), finalUrl);
    else d = { title: host, kind: 'web', blocks: textToBlocks(await r.text()) };
    d.meta = [d.meta, d.meta && d.meta.includes(host) ? '' : host].filter(Boolean).join(' · ');
    d.url = finalUrl;
    if (!d.blocks.length) throw new Error('Couldn\'t find readable text on that page. Select the text, copy it, and paste it here instead.');
    $('#linkInput').value = '';
    await addAndOpen(d);
  } catch (e) {
    console.error(e);
    toast(navigator.onLine === false ? 'You\'re offline. Links need a connection; saved documents still work.' : e.message, { ms: 7000 });
  } finally { busy(); }
}
async function loadText(text, title) {
  const blocks = textToBlocks(text || '');
  if (!blocks.length) return toast('There\'s no text to read.');
  const first = blocks[0].text;
  await addAndOpen({ title: title || (first.length > 64 ? first.slice(0, 60).replace(/\s\S*$/, '') + '…' : first), meta: 'Pasted text', kind: 'text', blocks });
}

function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return h.toString(36); }
async function addAndOpen(d) {
  const all = d.blocks.map(b => b.text).join('\n');
  const id = hash(d.title + '|' + all.length + '|' + all.slice(0, 400) + all.slice(-200));
  const existing = await db.get(id);
  const now = Date.now();
  const doc = existing || { id, added: now, pos: { i: 0, off: 0 }, progress: 0, skips: {} };
  Object.assign(doc, { title: d.title, meta: d.meta || '', kind: d.kind || 'text', url: d.url || '', blocks: d.blocks, opened: now });
  await db.put(doc);
  openDoc(doc);
}

/* ════════════════════════════ text segmentation */
const segS = Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'sentence' }) : null;
const segW = Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'word' }) : null;
function chunkLong(p) {
  const MAX = 240, out = []; let rest = p;
  while (rest.length > MAX) {
    let cut = -1;
    for (const ch of ['; ', ': ', ', ', ' – ', ' — ', ' ']) { const i = rest.lastIndexOf(ch, MAX - 20); if (i > 70) { cut = i + ch.length; break; } }
    if (cut < 0) cut = MAX;
    out.push(rest.slice(0, cut)); rest = rest.slice(cut);
  }
  if (rest) out.push(rest);
  return out;
}
function splitSentences(t) {
  const parts = segS ? [...segS.segment(t)].map(x => x.segment) : (t.match(/[^.!?]+[.!?]+["'”’)\]]*\s*|[^.!?]+$/g) || [t]);
  const merged = [];
  for (const p of parts) {
    const prev = merged[merged.length - 1];
    if (prev && (p.trim().length < 4 || /\b(?:e\.g|i\.e|vs|etc|Dr|Mr|Mrs|Ms|Prof|Fig|No|al|St)\.\s*$/.test(prev))) merged[merged.length - 1] += p;
    else merged.push(p);
  }
  return merged.flatMap(chunkLong);
}
function wordsOf(t) {
  if (segW) return [...segW.segment(t)].map(x => ({ text: x.segment, index: x.index, word: !!x.isWordLike }));
  const out = []; const re = /[\p{L}\p{N}'’]+|[^\p{L}\p{N}'’]+/gu; let m;
  while ((m = re.exec(t))) out.push({ text: m[0], index: m.index, word: HAS_WORD.test(m[0]) });
  return out;
}

/* ════════════════════════════ reader state & rendering */
let doc = null, ALL = [], S = [], skipMap = {}, cur = 0, curOff = 0, curWordEl = null, activeSentEl = null, activeBlockEl = null;
const isSkipped = bi => !!skipMap[bi];

function computeSkips() {
  const auto = autoSkips(ALL);
  skipMap = {};
  ALL.forEach((b, i) => {
    const user = doc.skips ? doc.skips[i] : undefined;
    if (user === true) skipMap[i] = 'Skipped';
    else if (user === false) return;
    else if (auto[i]) skipMap[i] = auto[i];
  });
}

function render() {
  const T = $('#text'); T.innerHTML = ''; S = [];
  let runStart = -1;
  ALL.forEach((b, bi) => {
    const skipped = isSkipped(bi);
    if (skipped && runStart < 0) {
      runStart = bi;
      let n = bi; while (n < ALL.length && isSkipped(n)) n++;
      const count = n - bi;
      const tag = document.createElement('div'); tag.className = 'skip-tag';
      tag.innerHTML = `<span>${esc(skipMap[bi])}${count > 1 ? ` · ${count} parts` : ''} · not read</span><button data-include="${bi}-${n}">Read ${count > 1 ? 'these' : 'this'}</button>`;
      T.appendChild(tag);
    }
    if (!skipped) runStart = -1;
    let el;
    if (bi === 0) { el = document.createElement('h1'); el.className = 'blk doc-title'; }
    else {
      el = document.createElement(b.tag === 'h' ? 'h' + Math.min(Math.max(b.level, 1) + 1, 4) : b.tag === 'p' ? 'p' : 'div');
      el.className = 'blk ' + (b.tag === 'h' ? 'h h' + Math.min(Math.max(b.level, 1), 4) : b.tag);
    }
    if (skipped) el.classList.add('skipped');
    el.dataset.b = bi;
    if (bi > 0) {
      const g = document.createElement('div'); g.className = 'gutter';
      g.innerHTML = `<button data-toggle="${bi}" aria-label="${skipped ? 'Read' : 'Skip'} this paragraph" title="${skipped ? 'Read' : 'Skip'} this ${b.tag === 'h' ? 'section' : 'paragraph'}">${skipped ? ICON.eye : ICON.eyeOff}</button>`;
      el.appendChild(g);
    }
    for (const st of splitSentences(b.text)) {
      const span = document.createElement('span'); span.className = 's'; span.dataset.i = S.length;
      const ws = [];
      for (const w of wordsOf(st)) {
        if (w.word) {
          const we = document.createElement('span'); we.className = 'w'; we.dataset.o = w.index;
          const n = Math.ceil(w.text.length * 0.45);
          we.innerHTML = '<b>' + esc(w.text.slice(0, n)) + '</b>' + esc(w.text.slice(n));
          span.appendChild(we); ws.push({ start: w.index, el: we });
        } else span.appendChild(document.createTextNode(w.text));
      }
      el.appendChild(span);
      S.push({ text: st, words: ws, el: span, block: bi, blockEl: el });
    }
    T.appendChild(el);
    if (bi === 0) {
      const m = document.createElement('div'); m.className = 'doc-meta';
      const mins = Math.max(1, Math.round(ALL.reduce((n, b, i) => n + (isSkipped(i) ? 0 : b.text.length), 0) / 15 / 60));
      m.innerHTML = [doc.meta, `${mins} min listen`].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join('');
      T.appendChild(m);
    }
  });
  S.chars = S.reduce((n, s) => n + s.text.length, 0);
  activeSentEl = activeBlockEl = curWordEl = null;
}

function openDoc(d) {
  pause(); clearClips();
  doc = d; ALL = [{ tag: 'h', level: 1, text: d.title }].concat(d.blocks);
  doc.skips = doc.skips || {};
  computeSkips(); render();
  cur = Math.min(d.pos && d.pos.i || 0, S.length - 1); curOff = 0;
  if (cur <= 0 || isSkipped(S[cur].block)) cur = Math.max(0, nextReadable(cur, 1));
  curClip = null; started = cur > 0;
  $('#rTitle').textContent = d.title;
  document.title = d.title + ' · Readalong';
  showView('reader', true);
  setActive(cur, true); highlightAt(cur, 0);
  updateState();
  mediaMeta();
  toast(cur > 0 ? 'Picking up where you left off.' : 'Tap any sentence to start reading from it.', { ms: 2600 });
}

function setActive(i, jump) {
  const s = S[i]; if (!s) return;
  if (activeSentEl && activeSentEl !== s.el) activeSentEl.classList.remove('active');
  if (activeBlockEl && activeBlockEl !== s.blockEl) activeBlockEl.classList.remove('active');
  activeSentEl = s.el; activeBlockEl = s.blockEl;
  s.el.classList.add('active'); s.blockEl.classList.add('active');
  follow(s.el, jump);
  updateProgress();
  savePos();
}
function highlightAt(i, c) {
  const s = S[i]; if (!s) return;
  let w = null; for (const x of s.words) { if (x.start <= c) w = x; else break; }
  if (curWordEl && (!w || curWordEl !== w.el)) curWordEl.classList.remove('on');
  if (w) { w.el.classList.add('on'); curWordEl = w.el; curOff = w.start; }
}
function readableChars(from, to) { let n = 0; for (let k = from; k < to; k++) if (!isSkipped(S[k].block)) n += S[k].text.length; return n; }
function updateProgress() {
  if (!S.length) return;
  const total = readableChars(0, S.length) || 1, done = readableChars(0, cur);
  const pct = Math.min(100, done / total * 100);
  $('#rProgress').style.width = pct + '%'; $('#scrubFill').style.width = pct + '%';
  const mins = (total - done) / (15 * settings.rate) / 60;
  $('#pLeft').textContent = mins < 1 ? 'Under a minute left' : Math.round(mins) + ' min left';
  doc.progress = pct; doc.minsLeft = Math.round(mins);
}
let saveT;
function savePos() {
  if (!doc) return;
  doc.pos = { i: cur, off: 0 };
  clearTimeout(saveT); saveT = setTimeout(() => db.put(doc), 700);
}

/* following the reading position */
let userScrollAt = 0;
function follow(el, jump) {
  if (!jump && (!settings.follow || Date.now() - userScrollAt < 4000)) return;
  const r = el.getBoundingClientRect(), vh = innerHeight;
  if (jump || r.top < vh * 0.16 || r.bottom > vh * 0.58) scrollTo({ top: scrollY + r.top - vh * 0.3, behavior: jump ? 'auto' : 'smooth' });
}
['wheel', 'touchmove'].forEach(ev => addEventListener(ev, () => { userScrollAt = Date.now(); }, { passive: true }));
let scrollRAF = 0;
addEventListener('scroll', () => {
  if (scrollRAF) return;
  scrollRAF = requestAnimationFrame(() => {
    scrollRAF = 0;
    if (!activeSentEl || $('#reader').hidden) return void ($('#returnPill').hidden = true);
    const r = activeSentEl.getBoundingClientRect();
    $('#returnPill').hidden = !(r.bottom < 70 || r.top > innerHeight - 170);
  });
}, { passive: true });
$('#returnPill').onclick = () => { userScrollAt = 0; if (activeSentEl) follow(activeSentEl, true); $('#returnPill').hidden = true; };

/* ════════════════════════════ voice engine (on-device Kokoro in a worker) */
const voice = { status: 'loading', loaded: 0, total: 0, device: '', error: '' };
let readyWaiters = [];
const worker = new Worker('tts-worker.js', { type: 'module' });
const pending = new Map();
let reqId = 0;
worker.onmessage = ({ data }) => {
  if (data.type === 'progress') { voice.status = 'downloading'; voice.loaded = data.loaded; voice.total = data.total; renderVoiceStatus(); }
  else if (data.type === 'ready') { voice.status = 'ready'; voice.device = data.device; renderVoiceStatus(); readyWaiters.splice(0).forEach(f => f()); }
  else if (data.type === 'error') { voice.status = 'error'; voice.error = data.message; renderVoiceStatus(); readyWaiters.splice(0).forEach(f => f()); }
  else if (data.type === 'audio' || data.type === 'fail') {
    const p = pending.get(data.id); if (!p) return;
    pending.delete(data.id);
    data.type === 'audio' ? p.resolve(data) : p.reject(new Error(data.message));
  }
};
worker.onerror = e => { voice.status = 'error'; voice.error = e.message || 'The voice engine failed to start.'; renderVoiceStatus(); };
// Phones get the lighter 163 MB model; computers get the full-quality 310 MB one. Both run on the GPU when available.
worker.postMessage({ type: 'load', allowGPU: true, gpuDtype: isTouchDevice ? 'fp16' : 'fp32' });
const waitReady = () => voice.status === 'ready' ? Promise.resolve() : new Promise(r => readyWaiters.push(r));

function renderVoiceStatus() {
  const el = $('#voiceStatus'), txt = $('#voiceStatusText');
  el.classList.toggle('ready', voice.status === 'ready');
  let meter = el.querySelector('.meter');
  if (voice.status === 'downloading' && voice.total) {
    if (!meter) { meter = document.createElement('span'); meter.className = 'meter'; meter.innerHTML = '<i></i>'; el.appendChild(meter); }
    meter.firstChild.style.width = (voice.loaded / voice.total * 100).toFixed(1) + '%';
    txt.textContent = `Downloading the voice, one time only · ${Math.round(voice.loaded / 1048576)} of ${Math.round(voice.total / 1048576)} MB`;
  } else {
    if (meter) meter.remove();
    txt.textContent = voice.status === 'ready' ? (voice.device === 'webgpu' ? 'Voice ready · runs on this device · works offline' : 'Voice ready · this device has no GPU access, so there may be short pauses between sentences')
      : voice.status === 'error' ? 'The voice couldn\'t start: ' + voice.error
      : 'Preparing the voice';
  }
  if (!$('#reader').hidden && voice.status !== 'ready' && playing) {
    $('#pStatus').textContent = voice.status === 'downloading' && voice.total ? `Downloading voice ${Math.round(voice.loaded / voice.total * 100)}%` : 'Preparing voice';
  }
}

function wavBlob(samples, rate) {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0, o = 44; i < samples.length; i++, o += 2) v.setInt16(o, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
}
function synthesize(text, voiceId, urgent) {
  const id = ++reqId;
  const p = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  worker.postMessage({ type: 'speak', id, text, voice: voiceId, urgent });
  p.id = id;
  return p;
}

const clips = new Map(); // `${voice}|${text}` -> Promise<{url, starts, exact, seconds}>
function clipFor(i, urgent) {
  const text = S[i].text.trim(), key = settings.voice + '|' + text;
  let c = clips.get(key);
  if (!c) {
    const raw = synthesize(text, settings.voice, urgent);
    c = raw.then(d => ({ url: URL.createObjectURL(wavBlob(d.samples, d.rate)), starts: d.starts, exact: d.exact, seconds: d.seconds }));
    c.id = raw.id;
    c.catch(() => clips.delete(key));
    clips.set(key, c);
    if (clips.size > 80) { const [k, old] = clips.entries().next().value; clips.delete(k); old.then(o => URL.revokeObjectURL(o.url), () => {}); }
  } else if (urgent && pending.has(c.id)) worker.postMessage({ type: 'prioritize', id: c.id });
  return c;
}
function clearClips() {
  worker.postMessage({ type: 'cancel', keep: [] });
  clips.forEach(p => p.then(o => URL.revokeObjectURL(o.url), () => {}));
  clips.clear();
}
// Map spoken-word start times onto the words on screen.
function wordTimes(s, clip) {
  const n = s.words.length, P = clip.starts || [];
  if (n === 0) return [];
  if (P.length === n) return P;
  if (P.length > 0) return s.words.map((_, j) => P[Math.min(P.length - 1, Math.floor(j * P.length / n))]);
  const lead = 0.12, span = Math.max(0.1, clip.seconds - lead - 0.2), L = s.text.length || 1;
  return s.words.map(w => lead + span * (w.start / L));
}

/* ════════════════════════════ playback */
const audio = new Audio();
audio.preload = 'auto';
audio.preservesPitch = audio.mozPreservesPitch = audio.webkitPreservesPitch = true;
let gen = 0, raf = 0, playing = false, started = false, curClip = null, stopAfter = null, unlocked = false, spinT = 0;
const SILENCE = URL.createObjectURL(wavBlob(new Float32Array(1200), 24000));

function primeAudio() { // iOS only lets audio start from a tap; prime the element during the tap.
  if (unlocked) return;
  unlocked = true; audio.src = SILENCE; audio.play().then(() => audio.pause()).catch(() => { unlocked = false; });
}
function halt() { cancelAnimationFrame(raf); audio.onended = null; audio.ontimeupdate = null; audio.pause(); clearTimeout(spinT); setLoading(false); }
function setLoading(on) { $('#playBtn').classList.toggle('loading', on); if (!on) $('#pStatus').textContent = ''; }
function updateState() {
  $('#playIcon').innerHTML = playing ? ICON.pause : ICON.play;
  $('#playBtn').setAttribute('aria-label', playing ? 'Pause' : 'Play');
  document.body.classList.toggle('playing', playing);
  document.body.classList.toggle('paused-mid', !playing && started);
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
}
function nextReadable(i, dir) { while (i >= 0 && i < S.length && isSkipped(S[i].block)) i += dir; return i < 0 || i >= S.length ? -1 : i; }

function play() {
  if (!S.length) return;
  primeAudio();
  playing = true; started = true; userScrollAt = 0; updateState();
  if (curClip && curClip.i === cur && audio.src === curClip.url && audio.currentTime > 0 && !audio.ended) {
    const my = ++gen; audio.playbackRate = settings.rate;
    audio.onended = () => { if (my === gen) advance(); };
    audio.play().then(() => track(my)).catch(() => speakFrom(cur, curOff));
  } else speakFrom(cur, curOff);
}
function pause() { gen++; playing = false; halt(); updateState(); }
function toggle() { playing ? pause() : play(); }

async function speakFrom(i, off = 0) {
  if (isSkipped(S[i] && S[i].block)) { i = nextReadable(i, 1); off = 0; }
  if (i < 0 || i >= S.length) return finish();
  const my = ++gen; halt();
  cur = i; curOff = off; curClip = null; setActive(i); highlightAt(i, off);
  if (!HAS_WORD.test(S[i].text.slice(off))) return void setTimeout(() => { if (my === gen) advance(); }, 0);
  spinT = setTimeout(() => { if (my === gen) setLoading(true); }, 180);
  if (voice.status !== 'ready') {
    if (voice.status === 'error') { pause(); return toast('The voice engine couldn\'t start. Reload the app to try again.', { ms: 6000 }); }
    $('#pStatus').textContent = 'Preparing voice'; renderVoiceStatus();
    await waitReady(); if (my !== gen) return;
  }
  const want = clipFor(i, true);
  const keep = [want.id, ...prefetch(i)].filter(Boolean);
  worker.postMessage({ type: 'cancel', keep }); // drop queued sentences from wherever we were before
  let clip;
  try { clip = await want; } catch (e) {
    if (my !== gen) return;
    if (e.message === 'cancelled') return speakFrom(i, off);
    console.warn(e); toast('Skipped a sentence the voice couldn\'t read.'); return advance();
  }
  if (my !== gen) return;
  setLoading(false);
  curClip = { i, url: clip.url, times: wordTimes(S[i], clip) };
  audio.src = clip.url; audio.playbackRate = settings.rate;
  if (audio.readyState < 1) await new Promise(r => { audio.onloadedmetadata = r; audio.onerror = r; });
  if (my !== gen) return;
  if (off > 0) { const k = S[i].words.findIndex(w => w.start >= off); if (k >= 0) audio.currentTime = Math.max(0, curClip.times[k] - 0.01); }
  audio.onended = () => { if (my === gen) advance(); };
  try { await audio.play(); } catch (e) {
    if (my !== gen) return;
    pause(); return toast('Tap play to start listening.');
  }
  track(my);
}
function prefetch(i) {
  let j = i, n = 0; const ids = [];
  const ahead = voice.device === 'wasm' ? 6 : 3;
  while (n < ahead) { j = nextReadable(j + 1, 1); if (j < 0) break; ids.push(clipFor(j, false).id); n++; }
  return ids;
}
function track(my) {
  const { i, times } = curClip; const ws = S[i].words;
  const update = () => {
    const t = audio.currentTime + 0.03; let k = -1;
    for (let j = 0; j < times.length; j++) { if (times[j] <= t) k = j; else break; }
    if (k >= 0) highlightAt(i, ws[k].start);
  };
  const tick = () => { if (my !== gen) return; update(); raf = requestAnimationFrame(tick); };
  audio.ontimeupdate = () => { if (my === gen) update(); }; // keeps up even when animation frames are paused
  tick();
}
function advance() {
  const prev = cur;
  if (stopAfter != null && cur >= stopAfter) { stopAfter = null; pause(); return toast('Finished the selection.'); }
  const n = nextReadable(cur + 1, 1);
  if (n < 0) return finish();
  if (settings.paraPause && S[n].block !== S[prev].block && ALL[S[prev].block].tag !== 'h' && S[prev].block !== 0) {
    pause(); cur = n; curOff = 0; curClip = null; setActive(n); highlightAt(n, 0);
    return toast('End of paragraph. Press play when you\'re ready.', { ms: 2200 });
  }
  speakFrom(n, 0);
}
function finish() {
  pause(); started = false; updateState();
  if (doc) { doc.pos = { i: 0, off: 0 }; doc.progress = 100; doc.minsLeft = 0; db.put(doc); }
  toast('Finished. Nicely done.', { ms: 4000 });
}
function go(i, dir = 1) {
  i = Math.max(0, Math.min(S.length - 1, i));
  const j = nextReadable(i, dir); if (j < 0) return;
  userScrollAt = 0; stopAfter = null;
  if (playing) speakFrom(j, 0);
  else { cur = j; curOff = 0; curClip = null; setActive(j, true); highlightAt(j, 0); }
}
function paraStep(dir) {
  const b = S[cur].block; let i = cur;
  if (dir > 0) { while (i < S.length && S[i].block === b) i++; go(i, 1); }
  else {
    let start = cur; while (start > 0 && S[start - 1].block === b) start--;
    if (start < cur) return go(start, 1);
    i = start - 1; while (i > 0 && (isSkipped(S[i].block) || S[i - 1].block === S[i].block)) i--;
    go(i, 1);
  }
}
function setRate(r) {
  settings.rate = Math.round(Math.max(0.5, Math.min(2.5, r)) * 20) / 20;
  saveSettings(); audio.playbackRate = settings.rate; applySettings(); updateProgress();
}

/* lock screen / headphone controls */
function mediaMeta() {
  if (!('mediaSession' in navigator) || !doc) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title: doc.title, artist: 'Readalong', album: doc.meta || '',
      artwork: [{ src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }] });
    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('previoustrack', () => go(cur - 1, -1));
    navigator.mediaSession.setActionHandler('nexttrack', () => go(cur + 1, 1));
  } catch { /* unsupported */ }
}

/* ════════════════════════════ skipping */
function setSkip(from, to, value) {
  for (let b = from; b < to; b++) doc.skips[b] = value;
  const keepCur = cur;
  computeSkips(); render();
  cur = Math.min(keepCur, S.length - 1);
  if (isSkipped(S[cur].block)) { const n = nextReadable(cur, 1); cur = n < 0 ? Math.max(0, nextReadable(cur, -1)) : n; }
  setActive(cur); highlightAt(cur, 0);
  db.put(doc);
}
function sectionRange(bi) {
  const b = ALL[bi];
  if (b.tag !== 'h') return [bi, bi + 1];
  let e = bi + 1; while (e < ALL.length && !(ALL[e].tag === 'h' && ALL[e].level <= b.level)) e++;
  return [bi, e];
}
$('#text').addEventListener('click', e => {
  const inc = e.target.closest('[data-include]');
  if (inc) { const [a, b] = inc.dataset.include.split('-').map(Number); setSkip(a, b, false); return toast('These parts will be read now.'); }
  const tog = e.target.closest('[data-toggle]');
  if (tog) {
    const bi = +tog.dataset.toggle, [a, b] = sectionRange(bi), skip = !isSkipped(bi);
    setSkip(a, b, skip);
    return toast(skip ? (ALL[bi].tag === 'h' ? 'Section skipped.' : 'Paragraph skipped.') : 'Will be read.', { action: 'Undo', onAction: () => setSkip(a, b, !skip) });
  }
  if (String(getSelection())) return;
  const s = e.target.closest('.s'); if (!s) return;
  const i = +s.dataset.i, w = e.target.closest('.w');
  if (isSkipped(S[i].block)) setSkip(S[i].block, S[i].block + 1, false);
  primeAudio();
  playing = true; started = true; stopAfter = null; userScrollAt = 0; updateState();
  speakFrom(i, w ? +w.dataset.o : 0);
});

/* selection → read only that, or skip it */
let selRange = null;
document.addEventListener('selectionchange', () => {
  clearTimeout(selRange && selRange.t);
  const t = setTimeout(() => {
    const sel = getSelection(), pill = $('#selPill');
    if (!sel.rangeCount || sel.isCollapsed || $('#reader').hidden || !$('#text').contains(sel.anchorNode)) { pill.hidden = true; return; }
    const r = sel.getRangeAt(0), rect = r.getBoundingClientRect();
    const sents = $$('.s', $('#text')).filter(n => r.intersectsNode(n));
    if (!sents.length) { pill.hidden = true; return; }
    const startEl = (r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer).closest('.w');
    selRange = { a: +sents[0].dataset.i, b: +sents[sents.length - 1].dataset.i, off: startEl && sents[0].contains(startEl) ? +startEl.dataset.o : 0 };
    pill.innerHTML = `<span data-sel="read" style="display:inline-flex;align-items:center;gap:8px">${ICON.playSm}Read selection</span><span style="width:1px;height:18px;background:currentColor;opacity:.25"></span><span data-sel="skip">Skip</span>`;
    pill.style.top = Math.min(innerHeight - 200, rect.bottom + 12) + 'px'; pill.style.bottom = 'auto';
    pill.hidden = false;
  }, 250);
  selRange = Object.assign(selRange || {}, { t });
});
$('#selPill').addEventListener('click', e => {
  const act = e.target.closest('[data-sel]'); if (!act || !selRange) return;
  const { a, b, off } = selRange;
  getSelection().removeAllRanges(); $('#selPill').hidden = true;
  if (act.dataset.sel === 'skip') {
    const ba = S[a].block, bb = S[b].block + 1;
    setSkip(ba, bb, true);
    return toast('Skipped.', { action: 'Undo', onAction: () => setSkip(ba, bb, false) });
  }
  if (isSkipped(S[a].block)) setSkip(S[a].block, S[b].block + 1, false);
  primeAudio(); playing = true; started = true; stopAfter = b; updateState();
  speakFrom(a, off);
});

/* ════════════════════════════ sheets */
let sheetKind = null;
function openSheet(kind, html, opts = {}) {
  sheetKind = kind;
  const sh = $('#sheet'), sc = $('#scrim');
  $('#sheetBody').innerHTML = html;
  sh.classList.toggle('centered', !!opts.centered);
  sh.hidden = false; sc.hidden = false;
  requestAnimationFrame(() => { sh.classList.add('show'); sc.classList.add('show'); });
  if (opts.focus) setTimeout(() => { const f = $(opts.focus, sh); if (f) f.focus(); }, 120);
}
function closeSheet() {
  const sh = $('#sheet'), sc = $('#scrim');
  if (sh.hidden) return;
  sh.classList.remove('show'); sc.classList.remove('show'); sheetKind = null;
  setTimeout(() => { if (!sheetKind) { sh.hidden = true; sc.hidden = true; } }, 200);
}
$('#scrim').onclick = closeSheet;
const head = t => `<h3>${esc(t)}<button class="icon-btn" data-close aria-label="Close">${ICON.x}</button></h3>`;
const toggleRow = (key, title, sub) => `<div class="row"><div class="txt"><b>${title}</b><small>${sub}</small></div><label class="switch"><input type="checkbox" data-key="${key}" ${settings[key] ? 'checked' : ''}><span></span></label></div>`;
const slider = (key, label, min, max, step, fmt) => `<div class="group"><span class="label">${label}</span><div class="stepper"><input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${settings[key]}"><span class="v" data-v="${key}">${fmt(settings[key])}</span></div></div>`;
const FMT = { size: v => v + ' pt', lh: v => (+v).toFixed(2), measure: v => v + ' em', dim: v => Math.round((1 - v) * 100) + '%' };

function openDisplay() {
  openSheet('display', head('Text & display') + `
    <div class="group"><span class="label">Theme</span><div class="swatches">
      ${['light', 'sepia', 'dark', 'auto'].map(t => `<button class="swatch ${settings.theme === t ? 'on' : ''}" data-theme-v="${t}" data-v="${t}">${t === 'auto' ? '' : t[0].toUpperCase() + t.slice(1)}</button>`).join('')}
    </div></div>
    <div class="group" style="margin-top:26px"><span class="label">Typeface</span><div class="fonts">
      ${Object.entries(FONTS).map(([k, f]) => `<button class="font-opt ${settings.font === k ? 'on' : ''}" data-font="${k}"><b style="font-family:${f.css.replace(/"/g, '&quot;')}">Aa</b><small>${f.name}</small></button>`).join('')}
    </div></div>
    ${slider('size', 'Text size', 15, 34, 1, FMT.size)}
    ${slider('lh', 'Line spacing', 1.35, 2.3, 0.05, FMT.lh)}
    ${slider('measure', 'Line length', 24, 48, 1, FMT.measure)}
    <div class="group"><span class="label">Reading aids</span>
      ${toggleRow('focus', 'Focus mode', 'Fades everything except the paragraph being read.')}
      ${toggleRow('follow', 'Follow along', 'Scrolls to keep the voice in view. Scrolling yourself pauses this briefly.')}
      ${toggleRow('bionic', 'Bold word starts', 'Gives your eyes an anchor at the start of every word.')}
      ${toggleRow('paraPause', 'Pause after each paragraph', 'A moment to let it sink in. Press play to continue.')}
    </div>
    ${settings.focus ? slider('dim', 'Focus fade', 0.1, 0.7, 0.02, FMT.dim) : ''}`);
}
function openSpeed() {
  openSheet('speed', head('Speed') + `
    <div class="big-speed" id="bigSpeed">${fmtRate(settings.rate)}</div>
    <input type="range" data-key="rate" min="0.5" max="2.5" step="0.05" value="${settings.rate}" style="width:100%">
    <div class="speeds">${[0.8, 1, 1.2, 1.5, 1.8].map(r => `<button data-rate="${r}" class="${Math.abs(settings.rate - r) < 0.01 ? 'on' : ''}">${fmtRate(r)}</button>`).join('')}</div>
    <p class="note" style="margin:14px 0 0">Changes apply instantly, without restarting the sentence. Shortcut: <kbd>+</kbd> <kbd>−</kbd></p>`);
}
function openVoices() {
  let html = head('Voice') + '<p class="note">All voices run privately on this device.</p><div class="voices">';
  let g = '';
  for (const v of VOICES) {
    if (v.group !== g) { g = v.group; html += `<div class="voice-sub">${g}</div>`; }
    html += `<div class="voice ${settings.voice === v.id ? 'on' : ''}" data-voice="${v.id}" role="button" tabindex="0"><span class="avatar">${v.name[0]}</span><span class="meta"><b>${v.name}</b><small>${v.desc}</small></span><button class="sample" data-sample="${v.id}" aria-label="Hear ${v.name}">${ICON.playSm}</button><span class="check">${ICON.check}</span></div>`;
  }
  openSheet('voice', html + '</div>');
}
function openToc() {
  const heads = ALL.map((b, i) => ({ b, i })).filter(x => x.i > 0 && x.b.tag === 'h');
  const skippedParts = [...new Set(Object.values(skipMap))];
  const curBlock = S[cur] ? S[cur].block : 0;
  let curHead = -1; heads.forEach(h => { if (h.i <= curBlock) curHead = h.i; });
  let html = head('Sections');
  html += skippedParts.length
    ? `<div class="row" style="padding-top:0"><div class="txt"><b>Not reading: ${esc(skippedParts.join(', '))}</b><small>Grey parts are skipped. Tap one in the text to read it anyway.</small></div><button class="btn" data-readall>Read all</button></div>`
    : `<p class="note">Tap a section to start reading there. Select text and choose Skip to leave parts out.</p>`;
  if (!heads.length) html += `<p class="note" style="margin-top:8px">This document has no headings. Tap any sentence in the text to start from it.</p>`;
  else html += '<div class="toc">' + heads.map(({ b, i }) => {
    const sk = isSkipped(i);
    return `<div class="item ${sk ? 'skipped' : ''} ${i === curHead ? 'cur' : ''} lvl${Math.min(b.level, 4)}" style="display:flex;align-items:center;gap:8px;padding:2px 0"><button class="item" data-jump="${i}" style="flex:1;min-width:0"><span class="n">${esc(b.text)}</span></button><button class="tog" data-sec="${i}">${sk ? 'Read' : 'Skip'}</button></div>`;
  }).join('') + '</div>';
  openSheet('toc', html);
}
function openPaste() {
  openSheet('paste', head('Paste text') + `
    <input class="paste-title" id="pasteTitle" placeholder="Title (optional)">
    <textarea class="paste-area" id="pasteText" placeholder="Paste an email, a chapter, notes, anything."></textarea>
    <div class="actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="pasteGo">Start reading</button></div>`, { centered: true, focus: '#pasteText' });
}
function openSettings() {
  const origin = location.origin + location.pathname.replace(/[^/]*$/, '');
  const bmPage = `javascript:void(window.open('${origin}?url='+encodeURIComponent(location.href)))`;
  const bmSel = `javascript:void(window.open('${origin}#text='+encodeURIComponent(String(getSelection())||document.body.innerText).slice(0,60000)+'&title='+encodeURIComponent(document.title)))`;
  const mod = IS_APPLE ? '⌘' : 'Ctrl';
  openSheet('settings', head('Readalong') + `
    <div class="group"><span class="label">Voice</span><p style="margin:0;color:var(--ink-2);font-size:14px">${esc($('#voiceStatusText').textContent)}</p></div>
    <div class="group"><span class="label">Install</span>
      <p style="margin:0 0 6px;color:var(--ink-2);font-size:14px"><b style="color:var(--ink)">iPhone:</b> open this page in Safari, tap Share, then Add to Home Screen.</p>
      <p style="margin:0;color:var(--ink-2);font-size:14px"><b style="color:var(--ink)">Mac:</b> in Safari choose File › Add to Dock. In Chrome use the install icon in the address bar.</p></div>
    ${isTouchDevice ? '' : `<div class="group"><span class="label">Read from any website</span>
      <p style="margin:0;color:var(--ink-2);font-size:14px">Drag these to your bookmarks bar. Use “Selection” on pages that need a login.</p>
      <a class="bm" href="${esc(bmPage)}">Read in Readalong</a><a class="bm" href="${esc(bmSel)}">Read selection</a></div>
    <div class="group"><span class="label">Keyboard</span><div class="kbd-list">
      <kbd>Space</kbd><span>Play or pause</span><kbd>←</kbd><span>Previous sentence · <kbd>→</kbd> next</span>
      <kbd>⇧ ←</kbd><span>Previous paragraph · <kbd>⇧ →</kbd> next</span><kbd>+ −</kbd><span>Faster or slower</span>
      <kbd>F</kbd><span>Focus mode</span><kbd>${mod} V</kbd><span>Read whatever you've copied</span></div></div>`}
    <div class="group"><span class="label">Privacy</span><p style="margin:0;color:var(--ink-2);font-size:14px">Your documents stay on this device. Links are fetched directly, or through the free r.jina.ai reader when a site blocks direct access.</p></div>`);
}
$('#sheet').addEventListener('click', e => {
  const t = e.target;
  if (t.closest('[data-close]')) return closeSheet();
  const th = t.closest('[data-theme-v]'); if (th) { settings.theme = th.dataset.themeV; saveSettings(); applySettings(); $$('.swatch').forEach(s => s.classList.toggle('on', s === th)); return; }
  const f = t.closest('[data-font]'); if (f) { settings.font = f.dataset.font; saveSettings(); applySettings(); $$('.font-opt').forEach(s => s.classList.toggle('on', s === f)); return keepView(); }
  const r = t.closest('[data-rate]'); if (r) { setRate(+r.dataset.rate); return openSpeed(); }
  const smp = t.closest('[data-sample]'); if (smp) { e.stopPropagation(); return sample(smp.dataset.sample, smp); }
  const v = t.closest('[data-voice]'); if (v) return chooseVoice(v.dataset.voice);
  const j = t.closest('[data-jump]'); if (j) { closeSheet(); const i = S.findIndex(s => s.block >= +j.dataset.jump); if (i >= 0) { if (isSkipped(S[i].block)) setSkip(...sectionRange(S[i].block), false); primeAudio(); playing = true; started = true; updateState(); speakFrom(i, 0); } return; }
  const sec = t.closest('[data-sec]'); if (sec) { const bi = +sec.dataset.sec; setSkip(...sectionRange(bi), !isSkipped(bi)); return openToc(); }
  if (t.closest('[data-readall]')) { doc.skips = {}; ALL.forEach((_, i) => { doc.skips[i] = false; }); setSkip(0, 0, false); return openToc(); }
  if (t.closest('#pasteGo')) { const text = $('#pasteText').value, title = $('#pasteTitle').value.trim(); closeSheet(); loadText(text, title); }
});
$('#sheet').addEventListener('input', e => {
  const k = e.target.dataset.key; if (!k) return;
  const val = e.target.type === 'checkbox' ? e.target.checked : +e.target.value;
  if (k === 'rate') { setRate(val); $('#bigSpeed').textContent = fmtRate(settings.rate); $$('[data-rate]').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.rate - settings.rate) < 0.01)); return; }
  settings[k] = val; saveSettings(); applySettings();
  const out = $(`[data-v="${k}"]`, $('#sheet')); if (out && FMT[k]) out.textContent = FMT[k](val);
  if (k === 'focus') openDisplay();
  if (['size', 'lh', 'measure'].includes(k)) keepView();
});
function keepView() { if (activeSentEl && !$('#reader').hidden) follow(activeSentEl, true); }

function chooseVoice(id) {
  if (settings.voice === id) return;
  settings.voice = id; saveSettings(); applySettings();
  $$('.voice').forEach(x => x.classList.toggle('on', x.dataset.voice === id));
  clearClips();
  if (playing) speakFrom(cur, curOff);
}
const sampleAudio = new Audio();
async function sample(id, btn) {
  const v = VOICES.find(x => x.id === id);
  btn.innerHTML = '<span style="width:12px;height:12px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:spin .8s linear infinite"></span>';
  try {
    sampleAudio.src = SILENCE; sampleAudio.play().catch(() => {});
    await waitReady();
    const d = await synthesize(`Hi, I'm ${v.name}. I'll read to you while your eyes follow along.`, id, true);
    if (playing) pause();
    sampleAudio.src = URL.createObjectURL(wavBlob(d.samples, d.rate));
    await sampleAudio.play();
  } catch (e) { console.warn(e); toast('Couldn\'t play the sample.'); }
  btn.innerHTML = ICON.playSm;
}

/* ════════════════════════════ library */
function ago(t) {
  const m = (Date.now() - t) / 60000;
  if (m < 1) return 'Just now'; if (m < 60) return Math.round(m) + ' min ago';
  if (m < 1440) return Math.round(m / 60) + ' h ago'; if (m < 2880) return 'Yesterday';
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
const ring = pct => { const c = 2 * Math.PI * 9; return `<svg class="ring" viewBox="0 0 22 22"><circle class="bg" cx="11" cy="11" r="9"/><circle class="fg" cx="11" cy="11" r="9" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(100, pct || 0) / 100)}"/></svg>`; };
async function renderLibrary() {
  const docs = (await db.all()).sort((a, b) => (b.opened || 0) - (a.opened || 0));
  const resume = docs.find(d => (d.progress || 0) > 0 && (d.progress || 0) < 99);
  $('#resume').innerHTML = resume ? `<div class="resume"><div class="cover"></div><div class="info"><div class="eyebrow">Continue listening</div><h3>${esc(resume.title)}</h3>
    <div class="sub">${esc([resume.meta, resume.minsLeft != null ? resume.minsLeft + ' min left' : ''].filter(Boolean).join(' · '))}</div>
    <div class="bar"><i style="width:${resume.progress || 0}%"></i></div></div><button class="btn primary" data-open="${resume.id}">Resume</button></div>` : '';
  $('#docCount').textContent = docs.length ? docs.length + (docs.length === 1 ? ' item' : ' items') : '';
  $('#libEmpty').hidden = docs.length > 0;
  $('#docList').innerHTML = docs.map(d => `<li class="doc"><button class="open" data-open="${d.id}"><span class="kind">${KIND_LABEL[d.kind] || 'TXT'}</span><span class="t"><b>${esc(d.title)}</b>
    <small>${esc([d.meta, (d.progress || 0) >= 99 ? 'Finished' : d.minsLeft ? d.minsLeft + ' min left' : '', ago(d.opened || d.added)].filter(Boolean).join(' · '))}</small></span>${ring(d.progress)}</button>
    <button class="icon-btn del" data-del="${d.id}" aria-label="Remove ${esc(d.title)}">${ICON.x}</button></li>`).join('');
}
document.addEventListener('click', async e => {
  const o = e.target.closest('[data-open]');
  if (o) { const d = await db.get(o.dataset.open); if (d) openDoc(d); return; }
  const del = e.target.closest('[data-del]');
  if (del) {
    const d = await db.get(del.dataset.del); if (!d) return;
    await db.del(d.id); renderLibrary();
    toast(`Removed “${d.title.slice(0, 40)}”.`, { action: 'Undo', ms: 5000, onAction: async () => { await db.put(d); renderLibrary(); } });
  }
});

/* views + history */
function showView(v, push) {
  const reading = v === 'reader';
  $('#library').hidden = reading; $('#reader').hidden = !reading;
  $('#selPill').hidden = true; $('#returnPill').hidden = true;
  if (!reading) { pause(); document.title = 'Readalong'; renderLibrary(); scrollTo({ top: 0 }); }
  if (push && reading && history.state !== 'reader') history.pushState('reader', '');
}
addEventListener('popstate', () => { if (!$('#reader').hidden) showView('library'); });
$('#backBtn').onclick = () => { if (history.state === 'reader') history.back(); else showView('library'); };

/* vault / folder */
let vaultFiles = [];
const SUPPORTED = ['md', 'markdown', 'txt', 'pdf', 'docx', 'html', 'htm'];
$('#folderIn').onchange = e => {
  vaultFiles = [...e.target.files].filter(f => {
    const p = f.webkitRelativePath || f.name;
    return SUPPORTED.includes(extOf(f.name)) && !/(^|\/)\.[^/]+\//.test(p) && !f.name.startsWith('.');
  }).sort((a, b) => b.lastModified - a.lastModified);
  e.target.value = '';
  if (!vaultFiles.length) return toast('No readable files in that folder.');
  $('#vaultName').textContent = (vaultFiles[0].webkitRelativePath || '').split('/')[0] || 'Folder';
  $('#vaultCount').textContent = vaultFiles.length + ' files';
  $('#vault').hidden = false; renderVault();
};
function renderVault() {
  const q = $('#vaultFilter').value.toLowerCase();
  $('#vaultList').innerHTML = vaultFiles.map((f, i) => ({ f, i })).filter(({ f }) => !q || (f.webkitRelativePath || f.name).toLowerCase().includes(q)).slice(0, 300)
    .map(({ f, i }) => { const parts = (f.webkitRelativePath || f.name).split('/'); return `<button data-vf="${i}"><span>${esc(baseName(f.name))}</span><small>${esc(parts.slice(1, -1).join(' / '))}</small></button>`; }).join('');
}
$('#vaultFilter').oninput = renderVault;
$('#vaultList').onclick = e => { const b = e.target.closest('[data-vf]'); if (b) loadFile(vaultFiles[+b.dataset.vf]); };
$('#vaultClose').onclick = () => { $('#vault').hidden = true; vaultFiles = []; };

/* ════════════════════════════ wiring */
$('#addFile').onclick = () => $('#fileIn').click();
$('#addFolder').onclick = () => $('#folderIn').click();
$('#addText').onclick = openPaste;
$('#fileIn').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadFile(f); };
$('#linkForm').onsubmit = e => { e.preventDefault(); loadURL($('#linkInput').value); };
$('#pasteLinkBtn').onclick = async () => {
  try { const t = (await navigator.clipboard.readText()).trim(); if (!t) return toast('Your clipboard is empty.'); if (/^https?:\/\/\S+$/i.test(t)) { $('#linkInput').value = t; loadURL(t); } else loadText(t); }
  catch { $('#linkInput').focus(); toast('Paste the link into the box.'); }
};
$('#openSettings').onclick = openSettings;
$('#playBtn').onclick = toggle;
$('#prevBtn').onclick = () => go(cur - 1, -1);
$('#nextBtn').onclick = () => go(cur + 1, 1);
$('#speedBtn').onclick = openSpeed;
$('#voiceBtn').onclick = openVoices;
$('#tocBtn').onclick = openToc;
$('#displayBtn').onclick = openDisplay;

// scrubber
(() => {
  const sc = $('#scrub'); let dragging = false;
  const at = x => { const r = sc.getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)); };
  const seek = f => {
    const total = readableChars(0, S.length), target = f * total; let acc = 0, i = 0;
    for (; i < S.length; i++) { if (isSkipped(S[i].block)) continue; acc += S[i].text.length; if (acc >= target) break; }
    go(Math.min(i, S.length - 1), 1);
  };
  sc.addEventListener('pointerdown', e => { dragging = true; sc.setPointerCapture(e.pointerId); $('#scrubFill').style.width = at(e.clientX) * 100 + '%'; });
  sc.addEventListener('pointermove', e => { if (dragging) $('#scrubFill').style.width = at(e.clientX) * 100 + '%'; });
  sc.addEventListener('pointerup', e => { if (!dragging) return; dragging = false; seek(at(e.clientX)); });
  sc.addEventListener('keydown', e => { if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); paraStep(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); paraStep(-1); } });
})();

// drag & drop
let dragDepth = 0;
addEventListener('dragenter', e => { if ([...(e.dataTransfer.types || [])].includes('Files')) { dragDepth++; $('#dropHint').hidden = false; } });
addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('#dropHint').hidden = true; } });
addEventListener('dragover', e => e.preventDefault());
addEventListener('drop', e => {
  e.preventDefault(); dragDepth = 0; $('#dropHint').hidden = true;
  const f = e.dataTransfer.files[0]; if (f) return loadFile(f);
  const t = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
  if (t) /^https?:\/\/\S+$/i.test(t.trim()) ? loadURL(t) : loadText(t);
});
// paste anywhere
addEventListener('paste', e => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const f = e.clipboardData.files[0]; if (f) { e.preventDefault(); return loadFile(f); }
  const t = (e.clipboardData.getData('text/plain') || '').trim(); if (!t) return;
  e.preventDefault(); /^https?:\/\/\S+$/i.test(t) ? loadURL(t) : loadText(t);
});
// keyboard
addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#sheet').hidden) return closeSheet(); if (!$('#reader').hidden) return $('#backBtn').click(); }
  if ((e.target.closest && e.target.closest('input,textarea,select')) || e.metaKey || e.ctrlKey || e.altKey) return;
  if ($('#reader').hidden || !$('#sheet').hidden) return;
  const k = e.key;
  if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
  else if (k === 'ArrowRight') { e.preventDefault(); e.shiftKey ? paraStep(1) : go(cur + 1, 1); }
  else if (k === 'ArrowLeft') { e.preventDefault(); e.shiftKey ? paraStep(-1) : go(cur - 1, -1); }
  else if (k === '+' || k === '=') setRate(settings.rate + 0.1);
  else if (k === '-' || k === '_') setRate(settings.rate - 0.1);
  else if (k === 'f' || k === 'F') { settings.focus = !settings.focus; saveSettings(); applySettings(); toast('Focus mode ' + (settings.focus ? 'on' : 'off'), { ms: 1200 }); }
  else if (k === 'r') $('#returnPill').click();
});
addEventListener('pagehide', () => { if (doc) db.put(doc); });
document.addEventListener('visibilitychange', () => { if (document.hidden && doc) db.put(doc); });

/* ════════════════════════════ start */
layoutMode();
applySettings();
renderVoiceStatus();
renderLibrary();
(async () => {
  const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.slice(1));
  if (q.get('url')) { history.replaceState(null, '', location.pathname); await loadURL(q.get('url')); }
  else if (h.get('text')) { history.replaceState(null, '', location.pathname); await loadText(h.get('text'), h.get('title') || ''); }
})();
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'))
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('offline mode unavailable', e));
