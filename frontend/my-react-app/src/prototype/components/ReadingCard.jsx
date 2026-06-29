import { useRef, useState } from 'react';

const READING_PROMPT =
  'The bright kite drifted above the quiet field while the child read each word carefully.';

/**
 * ReadingCard — reading-audio input: file upload or microphone recording.
 */
export default function ReadingCard({ audioFileName, audioSource, onFile }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 18.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z"/>
            <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
          </svg>
        </div>
        <div>
          <h3 className="card-title">Reading audio</h3>
          <p className="card-subtitle">
            Ask learner to read the prompt aloud, then record or upload.
          </p>
        </div>
      </div>

      <div className="prompt-box">
        <span className="prompt-label">Reading prompt</span>
        <p className="prompt-text">"{READING_PROMPT}"</p>
      </div>

      <label className="upload-zone">
        <input
          className="sr-only"
          type="file"
          accept="audio/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file, file.name, file.type);
          }}
        />
        {audioFileName ? (
          <div className="upload-zone-filled">
            <svg width="18" height="18" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
            </svg>
            <span className="upload-filename">{audioFileName}</span>
            <span className="upload-source">{audioSource}</span>
          </div>
        ) : (
          <div className="upload-zone-empty">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M4 16.5v1A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-1M12 3v13M8 7l4-4 4 4"/>
            </svg>
            <span>Drop audio file or click to browse</span>
            <span className="upload-hint">WAV · MP3 · M4A · WebM · FLAC</span>
          </div>
        )}
      </label>

      <AudioRecorder onSave={onFile} />
    </div>
  );
}

function AudioRecorder({ onSave }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);

  const startRecording = async () => {
    setError('');
    setAudioUrl('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        clearInterval(timerRef.current);
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const ext = type.includes('mpeg') ? 'mp3' : type.includes('wav') ? 'wav' : 'webm';
        const name = `reading-recording-${Date.now()}.${ext}`;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setSeconds(0);
        onSave(blob, name, type);
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setError(err?.message || 'Microphone access denied.');
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setStatus('saved');
  };

  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="recorder">
      <div className="recorder-controls">
        {status === 'recording' ? (
          <>
            <button type="button" className="btn-stop" onClick={stopRecording}>
              <span className="rec-dot" />
              Stop — {fmt(seconds)}
            </button>
          </>
        ) : (
          <button type="button" className="btn-record" onClick={startRecording}>
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            Record with microphone
          </button>
        )}
      </div>
      {audioUrl && (
        <audio className="audio-preview" src={audioUrl} controls />
      )}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}
