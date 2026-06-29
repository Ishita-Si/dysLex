import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ─── Structured JSON endpoints ────────────────────────────────────────────────

export const mvpAPI = {
  health: () => api.get('/health'),
  root: () => api.get('/'),
  predictReading: (payload) => api.post('/predict-reading', payload),
  predictWriting: (payload) => api.post('/predict-writing', payload),
  predictTyping: (payload) => api.post('/predict-typing', payload),
  predictFusion: (payload) => api.post('/predict-fusion', payload),
  predictFull: (payload) => api.post('/predict-full', payload),
  learningProfile: (payload) => api.post('/learning-profile', payload),
  regenerateBaseline: () => api.post('/baseline-reference/regenerate'),
};

// ─── Multipart / file endpoints ───────────────────────────────────────────────

/**
 * POST /predict-reading-audio
 * @param {File|Blob} audioFile     – real File (upload) or recorded Blob (mic)
 * @param {string}    [fileName]    – original or generated filename (must carry extension)
 * @param {string}    [mimeType]    – e.g. 'audio/webm'
 * @param {string}    [referenceText]
 *
 * FastAPI validates `file.filename` and rejects requests where the extension is
 * missing or empty. A raw Blob from MediaRecorder has no filename, so we always
 * wrap it in a File with the correct name before appending to FormData.
 */
export const predictReadingAudio = (audioFile, fileName, mimeType, referenceText) => {
  // Derive a safe extension from mimeType or existing filename fallback
  const safeExt = (() => {
    if (fileName && Path.extname(fileName)) return ''; // already has extension — use as-is
    const mt = (mimeType || '').toLowerCase();
    if (mt.includes('webm')) return '.webm';
    if (mt.includes('mpeg') || mt.includes('mp3')) return '.mp3';
    if (mt.includes('wav'))  return '.wav';
    if (mt.includes('ogg'))  return '.ogg';
    if (mt.includes('mp4'))  return '.mp4';
    return '.webm'; // safe default for MediaRecorder output
  })();

  const finalName = fileName
    ? (fileName.includes('.') ? fileName : fileName + safeExt)
    : `reading-recording-${Date.now()}${safeExt}`;

  // Always construct a File so FormData sends a proper filename header
  const fileToSend =
    audioFile instanceof File ? audioFile : new File([audioFile], finalName, { type: mimeType || 'audio/webm' });

  const form = new FormData();
  form.append('file', fileToSend, finalName);
  if (referenceText) form.append('reference_text', referenceText);
  return api.post('/predict-reading-audio', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Tiny helper — avoid importing path module in browser
const Path = { extname: (name) => { const m = name.match(/(\.[^.]+)$/); return m ? m[1] : ''; } };

/**
 * POST /predict-writing-image
 * @param {File|Blob} imageFile
 * @param {string}    [fileName]   – must carry .png / .jpg / .jpeg extension
 * @param {string}    [mimeType]
 *
 * FastAPI checks `file.filename` suffix. canvas.toBlob() returns a plain Blob
 * with no name, so FormData gives it a generic filename without extension → 400.
 * We use the `image_b64` form field instead for canvas Blobs (FastAPI supports
 * both paths), and fall back to a named File for real uploads.
 *
 * Strategy:
 *  - If caller passes a real File (upload) → send as multipart file field
 *  - If caller passes a Blob (canvas) → convert to base64 and send as image_b64
 */
export const predictWritingImage = async (imageFile, fileName, mimeType) => {
  const form = new FormData();

  if (imageFile instanceof File) {
    // Real file upload — filename already has extension
    form.append('file', imageFile, imageFile.name);
  } else {
    // Canvas Blob — convert to base64 and use image_b64 field
    const base64 = await blobToBase64(imageFile);
    // Strip the data-URL prefix FastAPI doesn't want: "data:image/png;base64,<data>"
    const b64data = base64.includes(',') ? base64.split(',')[1] : base64;
    form.append('image_b64', b64data);
  }

  return api.post('/predict-writing-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** Convert a Blob to a base64 data-URL string */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * POST /predict-typing-keystrokes
 * @param {Array<{key:string, code:string, type:'down'|'up', ts:number}>} events
 */
export const predictTypingKeystrokes = (events) =>
  api.post('/predict-typing-keystrokes', { events });

// ─── Error helper ─────────────────────────────────────────────────────────────

export function apiErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || item.type).join(', ');
  if (error?.code === 'ECONNABORTED') return 'The API request timed out.';
  if (error?.message === 'Network Error')
    return `Cannot reach the FastAPI server at ${API_BASE_URL}. Start it with: uvicorn src.mvp.api:app --reload`;
  return error?.message || 'Something went wrong while calling the API.';
}

export default api;