/**
 * PrototypeApp.jsx — DysLexAI real-pipeline prototype
 *
 * All three modalities call live FastAPI endpoints:
 *   POST /predict-reading-audio      (multipart: audio file)
 *   POST /predict-writing-image      (multipart: PNG/JPG)
 *   POST /predict-typing-keystrokes  (JSON: keystroke event array)
 *
 * dummyPipeline.js is NOT used or imported here.
 */

import { useState } from 'react';
import AssessmentForm from './components/AssessmentForm';
import PredictionSummary from './components/PredictionSummary';
import {
  predictReadingAudio,
  predictWritingImage,
  predictTypingKeystrokes,
  apiErrorMessage,
} from './api/apiService';
import './App.css';

/* ── Default form state ───────────────────────────────────────────────────── */

const DEFAULT_FORM = {
  name: '',
  age: 9,
  notes: '',
  reevaluateWeeks: 0,
  audioBlob: null,
  audioFileName: '',
  audioSource: '',
  audioMimeType: '',
  handwritingBlob: null,
  handwritingFileName: '',
  handwritingSource: '',
  handwritingMimeType: '',
  typedText: '',
  typingBackspaces: 0,
};

/* ── Root component ───────────────────────────────────────────────────────── */

export default function PrototypeApp() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  /**
   * Submit handler — only calls endpoints for modalities that have real data.
   */
  const handleSubmit = async ({ audioFile, handwritingFile, typingPayload }) => {
    setIsRunning(true);
    setError('');
    setResult(null);

    try {
      const [readingRes, writingRes, typingRes] = await Promise.all([
        audioFile
          ? predictReadingAudio(audioFile)
          : Promise.resolve({ data: null }),
        handwritingFile
          ? predictWritingImage(handwritingFile)
          : Promise.resolve({ data: null }),
        typingPayload.events?.length > 0
          ? predictTypingKeystrokes(typingPayload.events)
          : Promise.resolve({ data: null }),
      ]);

      setResult({
        reading: readingRes.data,
        writing: writingRes.data,
        typing: typingRes.data,
      });
    } catch (err) {
      console.error(err);
      setError(apiErrorMessage(err));
    } finally {
      setIsRunning(false);
    }
  };

  const hasResult = !!result;
  const completedModalities = result
    ? [result.reading, result.writing, result.typing].filter(Boolean).length
    : 0;

  return (
    <div className="app">
      {/* ── Top nav ── */}
      <header className="topnav">
        <div className="topnav-inner">
          <div className="brand">
            <div className="brand-logo">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <span className="brand-name">DysLexAI</span>
              <span className="brand-tag">Screening prototype</span>
            </div>
          </div>

          <div className="pipeline-steps">
            <PipelineStep n="1" label="Collect" done={
              !!(form.audioBlob || form.handwritingBlob || form.typedText)
            } />
            <PipelineArrow />
            <PipelineStep n="2" label="Analyse" done={hasResult} active={isRunning} />
            <PipelineArrow />
            <PipelineStep n="3" label="Report" done={hasResult && completedModalities > 0} />
          </div>

          <div className="nav-status">
            {isRunning && <span className="status-pill status-pill--running">Running…</span>}
            {hasResult && !isRunning && (
              <span className="status-pill status-pill--done">
                {completedModalities} modalities scored
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">
            Dyslexia risk assessment
          </h1>
          <p className="hero-sub">
            Collect reading audio, handwriting, and typing from the learner.
            Each input goes directly to the FastAPI ML pipeline — no sample data, no placeholders.
          </p>
        </div>
      </div>

      {/* ── Main layout ── */}
      <main className="layout">
        <AssessmentForm
          form={form}
          updateField={updateField}
          onSubmit={handleSubmit}
          isRunning={isRunning}
        />

        <div className="results-col">
          {/* Live endpoint strip */}
          <EndpointStrip result={result} isRunning={isRunning} />

          {/* Results panel */}
          <PredictionSummary
            result={result}
            learnerName={form.name}
            isRunning={isRunning}
            error={error}
          />
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="footer">
        <p>DysLexAI MVP · Screening support only · Not a medical diagnostic system</p>
      </footer>
    </div>
  );
}

/* ── Pipeline steps ─────────────────────────────────────────────────────── */

function PipelineStep({ n, label, done, active }) {
  return (
    <div className={`ps ${done ? 'ps--done' : active ? 'ps--active' : ''}`}>
      <span className="ps-n">{done ? '✓' : n}</span>
      <span className="ps-label">{label}</span>
    </div>
  );
}

function PipelineArrow() {
  return (
    <svg className="ps-arrow" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  );
}

/* ── Endpoint strip ─────────────────────────────────────────────────────── */

function EndpointStrip({ result, isRunning }) {
  const endpoints = [
    {
      label: 'Reading audio',
      endpoint: '/predict-reading-audio',
      color: '#3b82f6',
      data: result?.reading,
    },
    {
      label: 'Handwriting',
      endpoint: '/predict-writing-image',
      color: '#06b6d4',
      data: result?.writing,
    },
    {
      label: 'Typing',
      endpoint: '/predict-typing-keystrokes',
      color: '#10b981',
      data: result?.typing,
    },
  ];

  return (
    <div className="endpoint-strip">
      {endpoints.map((ep) => (
        <div key={ep.label} className="endpoint-card">
          <div className="endpoint-dot" style={{ backgroundColor: ep.color }} />
          <div className="endpoint-body">
            <span className="endpoint-label">{ep.label}</span>
            <code className="endpoint-path">{ep.endpoint}</code>
          </div>
          <div className="endpoint-value" style={{ color: ep.color }}>
            {ep.data
              ? `${Math.round((ep.data.risk_probability ?? 0) * 100)}%`
              : isRunning ? '…' : '—'}
          </div>
        </div>
      ))}
    </div>
  );
}
