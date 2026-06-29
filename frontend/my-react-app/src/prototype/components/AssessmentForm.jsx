import { useRef } from 'react';
import ReadingCard from './ReadingCard';
import WritingCard from './WritingCard';
import TypingCard, { TYPING_PROMPT } from './TypingCard';

/**
 * AssessmentForm — sidebar that collects learner inputs and submits them to
 * the real FastAPI pipeline. No dummy data involved.
 *
 * Props
 * ─────
 * form        {object}   – controlled form state
 * updateField {fn}       – (field, value) => void
 * onSubmit    {fn}       – ({ audioFile, handwritingFile, typingPayload }) => void
 * isRunning   {boolean}
 */
export default function AssessmentForm({ form, updateField, onSubmit, isRunning }) {
  const typingEventsRef = useRef([]);
  const typingStartTimeRef = useRef(null);

  const canSubmit =
    !isRunning &&
    (form.audioBlob || form.handwritingBlob || typingEventsRef.current.length > 0);

  const handleSubmit = () => {
    const typingPayload = {
      prompt: TYPING_PROMPT,
      typed_text: form.typedText,
      started_at: typingStartTimeRef.current,
      ended_at: Date.now(),
      events: typingEventsRef.current,
    };
    onSubmit({
      audioFile: form.audioBlob || null,
      handwritingFile: form.handwritingBlob || null,
      typingPayload,
    });
  };

  const completedCount = [
    !!form.audioBlob,
    !!form.handwritingBlob,
    form.typedText.length > 0,
  ].filter(Boolean).length;

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div>
          <h2 className="sidebar-title">Assessment</h2>
          <p className="sidebar-subtitle">
            {completedCount} of 3 modalities ready
          </p>
        </div>
        <div className="modality-dots">
          <span className={`dot ${form.audioBlob ? 'dot--active dot--blue' : ''}`} title="Reading audio" />
          <span className={`dot ${form.handwritingBlob ? 'dot--active dot--cyan' : ''}`} title="Handwriting" />
          <span className={`dot ${form.typedText.length > 0 ? 'dot--active dot--green' : ''}`} title="Typing" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${(completedCount / 3) * 100}%` }} />
      </div>

      <div className="form-body">
        {/* Learner info */}
        <div className="form-section">
          <h3 className="form-section-title">Learner details</h3>
          <div className="field-group">
            <label className="field-label">
              Name
              <input
                className="field-input"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Learner's full name"
              />
            </label>
            <div className="field-row">
              <label className="field-label">
                Age
                <input
                  className="field-input"
                  type="number"
                  min="5"
                  max="18"
                  value={form.age}
                  onChange={(e) => updateField('age', Number(e.target.value))}
                />
              </label>
              <label className="field-label">
                Re-evaluate in
                <select
                  className="field-input"
                  value={form.reevaluateWeeks}
                  onChange={(e) => updateField('reevaluateWeeks', Number(e.target.value))}
                >
                  {[2, 4, 6, 8].map((w) => (
                    <option key={w} value={w}>{w} weeks</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* Modality cards */}
        <ReadingCard
          audioFileName={form.audioFileName}
          audioSource={form.audioSource}
          onFile={(file, name, mimeType) => {
            updateField('audioBlob', file ?? null);
            updateField('audioFileName', name);
            updateField('audioSource', file
              ? (name.startsWith('reading-recording') ? 'microphone' : 'upload') : '');
            updateField('audioMimeType', mimeType);
          }}
        />

        <WritingCard
          handwritingFileName={form.handwritingFileName}
          handwritingSource={form.handwritingSource}
          onFile={(file, name, mimeType) => {
            updateField('handwritingBlob', file ?? null);
            updateField('handwritingFileName', name);
            updateField('handwritingSource', file
              ? (name.startsWith('handwriting-canvas') ? 'canvas' : 'upload') : '');
            updateField('handwritingMimeType', mimeType);
          }}
        />

        <TypingCard
          typedText={form.typedText}
          typingBackspaces={form.typingBackspaces}
          onTypedText={(text) => updateField('typedText', text)}
          onBackspace={() => updateField('typingBackspaces', form.typingBackspaces + 1)}
          eventsRef={typingEventsRef}
          startTimeRef={typingStartTimeRef}
        />

        {/* Observation notes */}
        <div className="form-section">
          <label className="field-label">
            Observation notes
            <textarea
              className="field-input field-textarea"
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              rows={3}
              placeholder="Describe observed reading difficulties, letter confusion, etc."
            />
          </label>
        </div>

        {/* Readiness summary */}
        {!form.audioBlob && !form.handwritingBlob && form.typedText.length === 0 && (
          <div className="alert alert--warn">
            Add at least one modality (audio, handwriting, or typing) before running the assessment.
          </div>
        )}

        <button
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {isRunning ? (
            <>
              <span className="spinner" />
              Analysing…
            </>
          ) : (
            <>
              Run assessment
              {completedCount > 0 && (
                <span className="submit-badge">{completedCount} modalities</span>
              )}
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
