require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const dirs = { uploads: path.join(ROOT, 'uploads'), outputs: path.join(ROOT, 'outputs'), temp: path.join(ROOT, 'temp') };
Object.values(dirs).forEach((dir) => fs.mkdirSync(dir, { recursive: true }));

const app = express();
const jobs = new Map();
const port = Number(process.env.PORT || 3000);
const maxMb = Number(process.env.MAX_FILE_SIZE_MB || 500);
const allowed = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi']);

const storage = multer.diskStorage({
  destination: dirs.uploads,
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => allowed.has(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Format video tidak didukung.'))
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(ROOT, 'public')));

function update(job, status, progress, message, extra = {}) {
  Object.assign(job, { status, progress, message, ...extra, updatedAt: Date.now() });
}

function run(command, args, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (data) => { stderr += data.toString(); if (onProgress) onProgress(stderr); });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(stderr) : reject(new Error(`${command} gagal (kode ${code}). ${stderr.slice(-1200)}`)));
  });
}

function assTime(seconds) {
  const cs = Math.max(0, Math.round(seconds * 100));
  const h = Math.floor(cs / 360000); const m = Math.floor((cs % 360000) / 6000);
  const s = Math.floor((cs % 6000) / 100); const c = cs % 100;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}

function cleanText(value) { return String(value || '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim(); }

function readWhisperWords(jsonPath) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const words = [];

  for (const segment of data.transcription || data.segments || []) {
    const hasOffsets = segment.offsets?.from !== undefined;
    // Whisper JSON offsets are milliseconds; t0/t1 are centiseconds.
    const scale = hasOffsets ? 0.001 : 0.01;
    const segmentFrom = Number(segment.offsets?.from ?? segment.t0 ?? segment.start ?? 0);
    const segmentTo = Number(segment.offsets?.to ?? segment.t1 ?? segment.end ?? segmentFrom + 1000);

    if (Array.isArray(segment.tokens) && segment.tokens.length) {
      for (const token of segment.tokens) {
        const text = cleanText(token.text ?? token.token);
        if (!text) continue;

        const from = Number(token.offsets?.from ?? token.t0 ?? segmentFrom) * scale;
        const to = Number(token.offsets?.to ?? token.t1 ?? segmentTo) * scale;
        words.push({ text, start: from, end: Math.max(from + 0.05, to) });
      }
    } else {
      const text = cleanText(segment.text);
      if (!text) continue;

      // Some whisper.cpp JSON formats contain timestamps per segment only.
      // Split the segment and distribute its duration across the words.
      const parts = text.split(/\s+/).filter(Boolean);
      const start = segmentFrom * scale;
      const end = Math.max(start + 0.2, segmentTo * scale);
      const totalWeight = parts.reduce((sum, part) => sum + part.length, 0);
      let cursor = start;

      for (const part of parts) {
        const duration = (end - start) * (part.length / totalWeight);
        const wordEnd = Math.max(cursor + 0.05, cursor + duration);
        words.push({ text: part, start: cursor, end: wordEnd });
        cursor = wordEnd;
      }
    }
  }

  return words
    .filter((word) => Number.isFinite(word.start) && Number.isFinite(word.end))
    .sort((a, b) => a.start - b.start);
}

function makeAss(words, outputPath) {
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Shorts,Arial,74,&H00FFFFFF,&H0000FFFF,&H00000000,&H99000000,-1,0,0,0,100,100,0,0,1,5,1,2,70,70,250,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const groups = [];
  let group = [];

  const flush = () => {
    if (!group.length) return;
    groups.push(group);
    group = [];
  };

  for (const word of words) {
    group.push(word);
    const punctuation = /[.!?,:;!?]$/.test(word.text);
    if (group.length >= 4 || punctuation) flush();
  }
  flush();
  const lines = groups.map((current, index) => {
    const start = current[0].start;
    const naturalEnd = current[current.length - 1].end;
    const nextStart = groups[index + 1]?.[0]?.start;
    // Jangan biarkan event subtitle bertumpuk dengan frasa berikutnya.
    const end = nextStart !== undefined
      ? Math.max(start + 0.08, nextStart - 0.01)
      : Math.max(start + 0.15, naturalEnd + 0.08);
    const text = current.map((word) => word.text).join(' ');
    return `Dialogue: 0,${assTime(start)},${assTime(end)},Shorts,,0,0,0,,${text}`;
  });
  fs.writeFileSync(outputPath, header + lines.join('\n') + '\n');
}

async function processJob(job) {
  const base = path.join(dirs.temp, job.id); fs.mkdirSync(base, { recursive: true });
  const audio = path.join(base, 'audio.wav'); const json = path.join(base, 'transcription.json');
  const ass = path.join(base, 'subtitles.ass'); const output = path.join(dirs.outputs, `${job.id}.mp4`);
  try {
    update(job, 'extracting', 15, 'Mengekstrak audio dari video…');
    await run('ffmpeg', ['-y', '-i', job.input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', audio]);
    update(job, 'transcribing', 40, 'Mentranskripsi audio dengan Whisper.cpp…');
    const whisper = process.env.WHISPER_BINARY || 'whisper-cli'; const model = path.resolve(ROOT, process.env.WHISPER_MODEL || './models/ggml-base.bin');
    await run(whisper, [
      '-m', model,
      '-f', audio,
      '-oj',
      '-of', json.replace(/\.json$/, '')
    ], (log) => {
      const match = log.match(/(\d+)%/); if (match) update(job, 'transcribing', Math.min(65, 40 + Number(match[1]) * 0.25), 'Mentranskripsi audio dengan Whisper.cpp…');
    });
    const words = readWhisperWords(json); if (!words.length) throw new Error('Whisper tidak menghasilkan teks.');
    update(job, 'subtitling', 72, 'Membuat subtitle ASS bergaya Shorts…'); makeAss(words, ass);
    update(job, 'rendering', 82, 'Membakar subtitle ke video…');
    await run('ffmpeg', ['-y', '-i', job.input, '-vf', `ass=${ass.replace(/\\/g, '/').replace(/:/g, '\\:')}`, '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-c:a', 'aac', '-movflags', '+faststart', output]);
    update(job, 'completed', 100, 'Video selesai dan siap diunduh.', { downloadUrl: `/api/jobs/${job.id}/download` });
  } catch (error) {
    update(job, 'failed', 0, error.message.includes('ENOENT') ? 'FFmpeg atau Whisper.cpp belum ditemukan. Periksa konfigurasi .env.' : error.message);
  } finally {
    fs.rmSync(base, { recursive: true, force: true }); fs.rmSync(job.input, { force: true });
  }
}

app.post('/api/jobs', upload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Video belum dipilih.' });
  const id = path.basename(req.file.filename, path.extname(req.file.filename));
  const job = { id, input: req.file.path, filename: req.file.originalname, status: 'queued', progress: 5, message: 'Menunggu proses…', createdAt: Date.now() };
  jobs.set(id, job); res.status(202).json({ id }); processJob(job);
});
app.get('/api/jobs/:id', (req, res) => { const job = jobs.get(req.params.id); job ? res.json(job) : res.status(404).json({ error: 'Job tidak ditemukan.' }); });
app.get('/api/jobs/:id/download', (req, res) => { const job = jobs.get(req.params.id); if (!job || job.status !== 'completed') return res.status(404).end(); res.download(path.join(dirs.outputs, `${job.id}.mp4`), `auto-subtitle-${job.id}.mp4`); });
app.use((error, _req, res, _next) => res.status(400).json({ error: error.message || 'Request gagal.' }));
app.listen(port, () => console.log(`Auto Clipper berjalan di http://localhost:${port}`));
