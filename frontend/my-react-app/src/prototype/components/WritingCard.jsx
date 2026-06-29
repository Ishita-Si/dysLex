import { useRef, useState } from 'react';

/**
 * WritingCard
 * Handles handwriting input: file upload or on-screen canvas drawing.
 *
 * Key fix: canvas is saved with a white background fill before toBlob(),
 * so the CV pipeline receives proper black-on-white pixel data instead of
 * black strokes on a transparent (alpha=0) background that scores as near-zero.
 *
 * Props
 * ─────
 * handwritingFileName  {string}
 * handwritingSource    {string}
 * onFile               {(file: File|Blob, name: string, mimeType: string) => void}
 */
export default function WritingCard({ handwritingFileName, handwritingSource, onFile }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [hasSaved, setHasSaved] = useState(false);

  /* ── Canvas helpers ─────────────────────────────────────────────────────── */

  const pointFromEvent = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const pointer = event.touches?.[0] || event;
    return {
      x: ((pointer.clientX - rect.left) / rect.width) * canvas.width,
      y: ((pointer.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDrawing = (event) => {
    event.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pt = pointFromEvent(event);
    isDrawingRef.current = true;
    ctx.strokeStyle = '#172033';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const draw = (event) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pt = pointFromEvent(event);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  /**
   * Composite the drawing onto a white background before encoding.
   * Without this, PNG alpha=0 pixels look like zeros to the CV model,
   * producing all-zero features → 0% risk every time regardless of strokes.
   */
  const saveCanvas = (mimeType = 'image/png') => {
    const src = canvasRef.current;
    // Offscreen canvas with white background
    const off = document.createElement('canvas');
    off.width = src.width;
    off.height = src.height;
    const ctx = off.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, off.width, off.height);
    ctx.drawImage(src, 0, 0);

    off.toBlob(
      (blob) => {
        if (!blob) return;
        const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
        const name = `handwriting-canvas-${Date.now()}.${ext}`;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setHasSaved(true);
        onFile(blob, name, mimeType);
      },
      mimeType,
      0.92,
    );
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setPreviewUrl('');
    setHasSaved(false);
    onFile(null, '', '');
  };

  const safePreviewUrl =
    typeof previewUrl === 'string' &&
    (previewUrl.startsWith('blob:') || previewUrl.startsWith('data:image/'))
      ? previewUrl
      : '';

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-black text-slate-900">Handwriting PNG / JPG</h3>
        <p className="text-xs leading-5 text-slate-500">
          Upload a sample or draw on the canvas. Saved with a white background so the CV pipeline
          receives correct pixel values.{' '}
          <code className="rounded bg-slate-200 px-1 text-[11px]">POST /predict-writing-image</code>
        </p>
      </div>

      {/* File upload */}
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
        <input
          className="hidden"
          type="file"
          accept="image/png,image/jpeg"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setPreviewUrl('');
              setHasSaved(false);
              onFile(file, file.name, file.type);
            }
          }}
        />
        <span className="text-sm font-black text-slate-800">
          {handwritingFileName || 'Choose PNG / JPG'}
        </span>
        <span className="mt-1 text-xs font-semibold text-slate-400">
          {handwritingSource ? `Source: ${handwritingSource}` : 'PNG or JPG image'}
        </span>
      </label>

      {/* Canvas drawing */}
      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-slate-400">
          Draw handwriting below, then click Save PNG / Save JPG before submitting.
        </p>
        <canvas
          ref={canvasRef}
          width={700}
          height={260}
          className="h-40 w-full touch-none rounded-md border border-slate-200 bg-white"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white"
            onClick={() => saveCanvas('image/png')}
          >
            Save PNG
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-800 px-3 py-2 text-xs font-black text-white"
            onClick={() => saveCanvas('image/jpeg')}
          >
            Save JPG
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
            onClick={clearCanvas}
          >
            Clear
          </button>
          {hasSaved && (
            <span className="text-xs font-semibold text-green-600">✓ Saved — ready to submit</span>
          )}
          {!hasSaved && handwritingSource === 'canvas' && (
            <span className="text-xs font-semibold text-amber-600">⚠ Draw something then save</span>
          )}
        </div>

        {safePreviewUrl && (
          <img
            className="mt-3 max-h-28 rounded-md border border-slate-200 bg-white object-contain"
            src={safePreviewUrl}
            alt="Saved handwriting preview"
          />
        )}
      </div>
    </section>
  );
}