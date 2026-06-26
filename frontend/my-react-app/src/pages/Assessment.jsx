import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assessmentAPI } from '../api/apiService';
import { useAssessment } from '../context/AssessmentContext';
import { Card, Button, Alert, Spinner, SectionHeader, Input, Select } from '../components/common/UI';

// ── Step indicator ────────────────────────────────────────────────────────────
const STEPS = ['Select Patient', 'Reading', 'Writing', 'Typing', 'AI Analysis', 'Results'];

function StepBar({ current }) {
  const stepIndex = { patient: 0, reading: 1, writing: 2, typing: 3, analyzing: 4, results: 5 };
  const idx = stepIndex[current] ?? 0;
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all ${
            i < idx ? 'text-emerald-600' : i === idx ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400'
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border-2 ${
              i < idx ? 'bg-emerald-500 border-emerald-500 text-white' :
              i === idx ? 'border-white text-white' : 'border-gray-200 text-gray-400'
            }`}>
              {i < idx ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-6 sm:w-12 ${i < idx ? 'bg-emerald-400' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Assessment Shell ──────────────────────────────────────────────────────────
export function AssessmentShell() {
  const { step } = useAssessment();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Assessment</h1>
        <p className="text-gray-500 text-sm mt-1">Complete all three assessments to generate an AI-powered risk profile.</p>
      </div>
      <Card>
        <StepBar current={step} />
      </Card>
      {step === 'patient'   && <SelectPatientStep />}
      {step === 'reading'   && <ReadingStep />}
      {step === 'writing'   && <WritingStep />}
      {step === 'typing'    && <TypingStep />}
      {step === 'analyzing' && <AnalyzingStep />}
      {step === 'results'   && <ResultsStep />}
    </div>
  );
}

// ── Step 0: Select Patient ────────────────────────────────────────────────────
const MOCK_PATIENTS_SHORT = [
  { id: '1', name: 'Arjun Sharma', age: 9 },
  { id: '2', name: 'Priya Nair', age: 11 },
  { id: '3', name: 'Rohan Verma', age: 8 },
  { id: '4', name: 'Sneha Joshi', age: 10 },
  { id: '5', name: 'Karan Mehta', age: 12 },
];

function SelectPatientStep() {
  const { setPatientId, setStep, setSessionId } = useAssessment();
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      // const res = await assessmentAPI.start(selected);
      // setSessionId(res.data.session_id);
      setSessionId('mock-session-' + Date.now());
      setPatientId(selected);
      setStep('reading');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Patient</h2>
      <div className="space-y-4">
        <Select label="Patient" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Choose a patient...</option>
          {MOCK_PATIENTS_SHORT.map((p) => (
            <option key={p.id} value={p.id}>{p.name} (Age {p.age})</option>
          ))}
        </Select>
        <Alert type="info" message="The patient should be present and ready before starting the assessment." />
        <Button onClick={handleStart} loading={loading} disabled={!selected} size="lg" className="w-full">
          Begin Assessment
        </Button>
      </div>
    </Card>
  );
}

// ── Step 1: Reading Assessment ────────────────────────────────────────────────
function ReadingStep() {
  const { setReadingResult } = useAssessment();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [metrics, setMetrics] = useState({
    readingSpeed: 72, pauseCount: 8, wordErrorRate: 14.3,
    charErrorRate: 5.2, duration: 180,
  });

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setReadingResult({ ...metrics, score: 42 });
    setLoading(false);
  };

  const SAMPLE_TEXT = "The quick brown fox jumps over the lazy dog. She sells seashells by the seashore. Peter Piper picked a peck of pickled peppers.";

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionHeader title="Reading Assessment" description="Have the patient read the passage aloud while capturing metrics." />

      <Card className="bg-blue-50 border-blue-100">
        <p className="text-sm font-semibold text-blue-800 mb-2">Reading Passage</p>
        <p className="text-blue-900 leading-relaxed font-serif text-lg">{SAMPLE_TEXT}</p>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Reading Speed (WPM)', key: 'readingSpeed', unit: 'WPM' },
          { label: 'Pause Count', key: 'pauseCount', unit: 'pauses' },
          { label: 'Word Error Rate (%)', key: 'wordErrorRate', unit: '%' },
          { label: 'Char Error Rate (%)', key: 'charErrorRate', unit: '%' },
          { label: 'Duration (seconds)', key: 'duration', unit: 's' },
        ].map(({ label, key }) => (
          <Card key={key} className="space-y-2">
            <p className="text-xs text-gray-500">{label}</p>
            <input
              type="number"
              step="0.1"
              value={metrics[key]}
              onChange={(e) => setMetrics({ ...metrics, [key]: parseFloat(e.target.value) })}
              className="w-full text-2xl font-bold text-gray-900 bg-transparent border-none outline-none"
            />
          </Card>
        ))}
      </div>

      <Alert
        type="info"
        title="Summary"
        message={`Reading speed: ${metrics.readingSpeed} WPM · Word errors: ${metrics.wordErrorRate}% · Duration: ${Math.floor(metrics.duration / 60)}m ${metrics.duration % 60}s`}
      />

      <Button onClick={handleSubmit} loading={loading} size="lg">
        Submit Reading Assessment →
      </Button>
    </div>
  );
}

// ── Step 2: Writing Assessment ────────────────────────────────────────────────
function WritingStep() {
  const { setWritingResult } = useAssessment();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1800));
    setWritingResult({ file: file?.name, score: 38, letterReversal: 0.72, spacingErrors: 5 });
    setProcessing(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionHeader title="Writing Assessment" description="Upload a handwriting sample from the patient." />

      <Card
        className="border-2 border-dashed border-gray-200 cursor-pointer hover:border-blue-400 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <div className="text-center py-8">
          {preview ? (
            <img src={preview} alt="handwriting sample" className="max-h-64 mx-auto rounded-xl object-contain" />
          ) : (
            <>
              <p className="text-4xl mb-3">📎</p>
              <p className="text-gray-700 font-medium">Click to upload handwriting sample</p>
              <p className="text-gray-400 text-sm mt-1">PNG, JPG up to 10MB</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </Card>

      {file && (
        <Card className="bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🖼️</span>
            <div>
              <p className="font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · Ready to process</p>
            </div>
          </div>
        </Card>
      )}

      {processing && (
        <Card className="bg-blue-50 border-blue-100">
          <div className="flex items-center gap-3">
            <Spinner size="sm" color="blue" />
            <div>
              <p className="font-medium text-blue-800">Processing handwriting...</p>
              <p className="text-xs text-blue-600">Analyzing letter formation and reversal patterns</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} loading={processing} disabled={!file} size="lg">
          Analyse Handwriting →
        </Button>
        <Button variant="secondary" onClick={() => setWritingResult({ score: 38, skipped: true })} size="lg">
          Skip Writing
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Typing Assessment ────────────────────────────────────────────────
const TYPING_PROMPT = "The sun sets slowly behind the mountains as birds return to their nests.";

function TypingStep() {
  const { setTypingResult } = useAssessment();
  const [typed, setTyped] = useState('');
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [backspaces, setBackspaces] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  const handleKey = (e) => {
    if (!started) { setStarted(true); setStartTime(Date.now()); }
    if (e.key === 'Backspace') setBackspaces((b) => b + 1);
    if (typed.length >= TYPING_PROMPT.length - 1) setFinished(true);
  };

  const duration = started && startTime ? ((Date.now() - startTime) / 1000) : 0;
  const wpm = duration > 0 ? Math.round((typed.length / 5) / (duration / 60)) : 0;
  const accuracy = typed.length > 0
    ? Math.round((typed.split('').filter((c, i) => c === TYPING_PROMPT[i]).length / typed.length) * 100)
    : 100;
  const errors = typed.split('').filter((c, i) => c !== TYPING_PROMPT[i]).length;

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setTypingResult({ wpm, accuracy, errors, backspaces, score: Math.round(accuracy * 0.7 + (Math.min(wpm, 60) / 60) * 30) });
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <SectionHeader title="Typing Assessment" description="Have the patient type the text below as accurately as possible." />

      <Card className="bg-gray-50 font-mono text-base leading-relaxed text-gray-600 select-none">
        {TYPING_PROMPT.split('').map((char, i) => {
          const typedChar = typed[i];
          let cls = 'text-gray-400';
          if (typedChar !== undefined) {
            cls = typedChar === char ? 'text-emerald-600' : 'text-red-500 bg-red-50 rounded';
          } else if (i === typed.length) {
            cls = 'text-gray-900 underline decoration-blue-500 decoration-2';
          }
          return <span key={i} className={cls}>{char}</span>;
        })}
      </Card>

      <textarea
        ref={ref}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Start typing here..."
        className="w-full h-24 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
        disabled={finished}
      />

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Speed', value: `${wpm} WPM`, color: 'blue' },
          { label: 'Accuracy', value: `${accuracy}%`, color: accuracy > 85 ? 'green' : accuracy > 60 ? 'amber' : 'red' },
          { label: 'Errors', value: errors, color: errors > 5 ? 'red' : 'green' },
          { label: 'Backspaces', value: backspaces, color: 'purple' },
        ].map(({ label, value, color }) => (
          <Card key={label} padding={true} className="text-center">
            <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <Button onClick={handleSubmit} loading={loading} size="lg" disabled={!started}>
        Submit Typing Assessment →
      </Button>
    </div>
  );
}

// ── Step 4: AI Analysis ───────────────────────────────────────────────────────
const ANALYSIS_STEPS = [
  { label: 'Processing reading features', icon: '📖', delay: 0 },
  { label: 'Processing writing features', icon: '✍️', delay: 600 },
  { label: 'Processing typing features', icon: '⌨️', delay: 1200 },
  { label: 'Running fusion model', icon: '🔗', delay: 1800 },
  { label: 'Generating learning profile', icon: '🧠', delay: 2400 },
  { label: 'Building explainability report', icon: '💡', delay: 3000 },
];

function AnalyzingStep() {
  const { setFinalResult } = useAssessment();
  const [done, setDone] = useState([]);

  useEffect(() => {
    ANALYSIS_STEPS.forEach((s, i) => {
      setTimeout(() => setDone((d) => [...d, i]), s.delay + 400);
    });
    setTimeout(() => {
      setFinalResult({
        risk: 'High',
        confidence: 0.91,
        severity: 78,
        reading: { score: 42, wpm: 72, wer: 14.3 },
        writing: { score: 38, letterReversal: 0.72 },
        typing: { score: 55, wpm: 38, accuracy: 71 },
        reasons: [
          'High word reading error rate (14.3%)',
          'Frequent letter reversals detected in handwriting',
          'Long fixation duration on complex words',
          'Frequent backspace corrections during typing',
        ],
        profile: [
          { skill: 'Reading Fluency', level: 'High Weakness', score: 15 },
          { skill: 'Word Recognition', level: 'Moderate', score: 40 },
          { skill: 'Letter Reversal', level: 'High', score: 85 },
          { skill: 'Typing Accuracy', level: 'Low', score: 30 },
          { skill: 'Spelling Accuracy', level: 'Moderate', score: 45 },
        ],
        recommendations: [
          'Reading Fluency Training',
          'Letter Reversal Training',
          'Phonics Practice',
          'Typing Practice',
        ],
      });
    }, 4200);
  }, []);

  return (
    <Card className="max-w-md mx-auto text-center">
      <div className="py-4 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto">
          <Spinner size="lg" color="blue" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analysing Assessment Data</h2>
          <p className="text-gray-500 text-sm mt-1">The AI is processing all three inputs...</p>
        </div>
        <div className="space-y-3 text-left">
          {ANALYSIS_STEPS.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 transition-all duration-300 ${done.includes(i) ? 'opacity-100' : 'opacity-30'}`}>
              <span className="text-xl">{done.includes(i) ? '✅' : s.icon}</span>
              <span className={`text-sm ${done.includes(i) ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ── Step 5: Results ───────────────────────────────────────────────────────────
const BASELINE = {
  readingSpeed: 110, wer: 3, letterReversal: 0.05, typingWpm: 55, typingAccuracy: 95,
};

function ResultsStep() {
  const { finalResult } = useAssessment();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  if (!finalResult) return null;

  const TABS = [
    { id: 'summary', label: 'Summary' },
    { id: 'baseline', label: 'Baseline Comparison' },
    { id: 'profile', label: 'Learning Profile' },
    { id: 'explain', label: 'Explanation' },
    { id: 'recommendations', label: 'Recommendations' },
  ];

  const riskColor = finalResult.risk === 'High' ? 'red' : finalResult.risk === 'Moderate' ? 'amber' : 'emerald';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Assessment Results</h2>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm">Download PDF</Button>
          <Button size="sm" onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>

      {/* Risk overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={`bg-${riskColor}-50 border-${riskColor}-100 col-span-1 text-center`}>
          <p className="text-xs text-gray-500 mb-1">Overall Risk</p>
          <p className={`text-4xl font-bold text-${riskColor}-600`}>{finalResult.risk}</p>
          <p className={`text-sm text-${riskColor}-500 mt-1`}>Confidence: {Math.round(finalResult.confidence * 100)}%</p>
        </Card>
        <Card className="text-center">
          <p className="text-xs text-gray-500 mb-1">Severity Score</p>
          <p className="text-4xl font-bold text-gray-900">{finalResult.severity}</p>
          <p className="text-sm text-gray-400 mt-1">out of 100</p>
        </Card>
        <Card className="grid grid-cols-3 gap-2 text-center col-span-1">
          {[
            { label: 'Reading', score: finalResult.reading.score },
            { label: 'Writing', score: finalResult.writing.score },
            { label: 'Typing',  score: finalResult.typing.score },
          ].map(({ label, score }) => (
            <div key={label}>
              <p className="text-2xl font-bold text-gray-900">{score}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === t.id ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && <SummaryTab r={finalResult} />}
      {activeTab === 'baseline' && <BaselineTab r={finalResult} />}
      {activeTab === 'profile' && <ProfileTab r={finalResult} />}
      {activeTab === 'explain' && <ExplainTab r={finalResult} />}
      {activeTab === 'recommendations' && <RecommendTab r={finalResult} />}
    </div>
  );
}

function SummaryTab({ r }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {[
        { label: 'Reading Speed', patient: `${r.reading.wpm} WPM`, ref: `${BASELINE.readingSpeed} WPM`, diff: `${r.reading.wpm - BASELINE.readingSpeed}`, status: r.reading.wpm < BASELINE.readingSpeed * 0.8 ? 'Needs Improvement' : 'Acceptable' },
        { label: 'Word Error Rate', patient: `${r.reading.wer}%`, ref: `${BASELINE.wer}%`, diff: `+${(r.reading.wer - BASELINE.wer).toFixed(1)}%`, status: r.reading.wer > 8 ? 'Needs Improvement' : 'Acceptable' },
        { label: 'Typing Accuracy', patient: `${r.typing.accuracy}%`, ref: `${BASELINE.typingAccuracy}%`, diff: `${r.typing.accuracy - BASELINE.typingAccuracy}%`, status: r.typing.accuracy < 80 ? 'Needs Improvement' : 'Acceptable' },
      ].map((m) => (
        <Card key={m.label}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{m.label}</p>
          <div className="space-y-2">
            <div className="flex justify-between"><span className="text-sm text-gray-500">Patient</span><span className="font-bold text-gray-900">{m.patient}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">Reference</span><span className="text-gray-400">{m.ref}</span></div>
            <div className="flex justify-between"><span className="text-sm text-gray-400">Difference</span><span className={`font-medium ${m.diff.startsWith('-') || m.diff.startsWith('+') && m.label === 'Word Error Rate' ? 'text-red-600' : 'text-emerald-600'}`}>{m.diff}</span></div>
            <div className={`text-xs px-2 py-1 rounded-lg text-center font-medium ${m.status === 'Needs Improvement' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{m.status}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function BaselineTab({ r }) {
  const comparisons = [
    { label: 'Reading Speed', patient: r.reading.wpm, baseline: BASELINE.readingSpeed, unit: 'WPM', higher: true },
    { label: 'Word Error Rate', patient: r.reading.wer, baseline: BASELINE.wer, unit: '%', higher: false },
    { label: 'Letter Reversal Rate', patient: Math.round(r.writing.letterReversal * 100), baseline: Math.round(BASELINE.letterReversal * 100), unit: '%', higher: false },
    { label: 'Typing Speed', patient: r.typing.wpm, baseline: BASELINE.typingWpm, unit: 'WPM', higher: true },
    { label: 'Typing Accuracy', patient: r.typing.accuracy, baseline: BASELINE.typingAccuracy, unit: '%', higher: true },
  ];

  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-5">Reference Baseline Comparison</h3>
      <div className="space-y-5">
        {comparisons.map((c) => {
          const better = c.higher ? c.patient >= c.baseline : c.patient <= c.baseline;
          const pct = Math.min((c.patient / (c.baseline * 1.5)) * 100, 100);
          const bpct = Math.min((c.baseline / (c.baseline * 1.5)) * 100, 100);
          return (
            <div key={c.label} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{c.label}</span>
                <span className={`font-semibold ${better ? 'text-emerald-600' : 'text-red-600'}`}>
                  {better ? '✓ Within range' : '⚠ Needs improvement'}
                </span>
              </div>
              <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
                {/* Reference marker */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10" style={{ left: `${bpct}%` }} />
                {/* Patient bar */}
                <div
                  className={`absolute top-1 bottom-1 rounded-full ${better ? 'bg-emerald-400' : 'bg-red-400'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Patient: <strong>{c.patient}{c.unit}</strong></span>
                <span className="text-gray-400">┤ Reference: {c.baseline}{c.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ProfileTab({ r }) {
  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-5">Learning Profile</h3>
      <div className="space-y-4">
        {r.profile.map((p) => (
          <div key={p.skill} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">{p.skill}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                p.score < 30 ? 'bg-red-50 text-red-700' :
                p.score < 60 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
              }`}>{p.level}</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${p.score < 30 ? 'bg-red-500' : p.score < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${p.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExplainTab({ r }) {
  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-2">Why this prediction?</h3>
      <p className="text-gray-500 text-sm mb-5">These are the key factors the AI model identified as evidence of dyslexia risk:</p>
      <div className="space-y-3">
        {r.reasons.map((reason, i) => (
          <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
            <span className="text-amber-500 text-lg flex-shrink-0">⚠</span>
            <p className="text-amber-900 text-sm">{reason}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4">
        This explanation is generated from model feature importance and is meant to support — not replace — clinical judgment.
      </p>
    </Card>
  );
}

function RecommendTab({ r }) {
  const [selected, setSelected] = useState([]);

  const toggle = (rec) => setSelected((s) => s.includes(rec) ? s.filter((x) => x !== rec) : [...s, rec]);

  const icons = {
    'Reading Fluency Training': '📖',
    'Letter Reversal Training': '🔤',
    'Phonics Practice': '🎵',
    'Typing Practice': '⌨️',
  };

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold text-gray-900 mb-1">Recommended Interventions</h3>
        <p className="text-gray-500 text-sm mb-5">Select categories to load exercises from the Intervention Repository.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {r.recommendations.map((rec) => (
            <button
              key={rec}
              onClick={() => toggle(rec)}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                selected.includes(rec)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <span className="text-2xl">{icons[rec] || '📚'}</span>
              <span className={`font-medium text-sm ${selected.includes(rec) ? 'text-blue-800' : 'text-gray-700'}`}>{rec}</span>
              {selected.includes(rec) && <span className="ml-auto text-blue-600">✓</span>}
            </button>
          ))}
        </div>
      </Card>
      {selected.length > 0 && (
        <Button size="lg">
          Load {selected.length} Exercise {selected.length > 1 ? 'Packs' : 'Pack'} →
        </Button>
      )}
    </div>
  );
}