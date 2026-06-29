import { useRef } from 'react';

export const TYPING_PROMPT =
  'The bright kite drifted above the quiet field while the child read each word carefully.';

/**
 * TypingCard — captures typed text and raw keystroke event stream.
 */
export default function TypingCard({
  typedText,
  typingBackspaces,
  onTypedText,
  onBackspace,
  eventsRef,
  startTimeRef,
}) {
  const handleKeyDown = (e) => {
    if (!startTimeRef.current) startTimeRef.current = Date.now();
    if (e.key === 'Backspace') onBackspace();
    eventsRef.current.push({ key: e.key, code: e.code, type: 'down', ts: Date.now() });
  };

  const handleKeyUp = (e) => {
    eventsRef.current.push({ key: e.key, code: e.code, type: 'up', ts: Date.now() });
  };

  const accuracy = typedText.length > 0
    ? Math.round(Math.max(0, 100 - (typingBackspaces / Math.max(typedText.length, 1)) * 100))
    : null;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>
          </svg>
        </div>
        <div>
          <h3 className="card-title">Typing capture</h3>
          <p className="card-subtitle">Keystroke timings are recorded automatically while the learner types.</p>
        </div>
      </div>

      <div className="prompt-box prompt-box--green">
        <span className="prompt-label">Type this sentence</span>
        <p className="prompt-text">{TYPING_PROMPT}</p>
      </div>

      <textarea
        value={typedText}
        onChange={(e) => onTypedText(e.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        rows={3}
        className="typing-area"
        placeholder="Learner types here…"
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />

      <div className="typing-stats">
        <div className="typing-stat">
          <span className="typing-stat-value">{typedText.length}</span>
          <span className="typing-stat-label">chars</span>
        </div>
        <div className="typing-stat">
          <span className="typing-stat-value">{typingBackspaces}</span>
          <span className="typing-stat-label">backspaces</span>
        </div>
        <div className="typing-stat">
          <span className="typing-stat-value">{eventsRef?.current?.length ?? 0}</span>
          <span className="typing-stat-label">keystrokes</span>
        </div>
        {accuracy !== null && (
          <div className="typing-stat">
            <span className="typing-stat-value" style={{ color: accuracy > 80 ? '#059669' : accuracy > 60 ? '#d97706' : '#dc2626' }}>
              {accuracy}%
            </span>
            <span className="typing-stat-label">accuracy</span>
          </div>
        )}
      </div>
    </div>
  );
}
