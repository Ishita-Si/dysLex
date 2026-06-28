import { useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  defaultAssessment,
  adaptMvpResponseToPrototype,
  buildMvpApiPayload,
  datasetAssessmentCases,
  processAssessmentInput,
  runDummyMlPrediction,
  getGeminiImprovementPlan,
  buildReevaluationForecast,
  createPracticeAssessment,
} from './data-process/dummyPipeline';
import { apiErrorMessage, mvpAPI } from './api/apiService';

const COLORS = {
  muted: '#68748a',
  line: '#d9e0ea',
  blue: '#2563eb',
  cyan: '#0891b2',
  green: '#059669',
  amber: '#d97706',
  red: '#dc2626',
};

const skillColor = {
  Reading: COLORS.blue,
  Writing: COLORS.cyan,
  Typing: COLORS.green,
  Attention: COLORS.amber,
};

const numericFields = new Set([
  'age',
  'typingBackspaces',
  'reevaluateWeeks',
]);

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PrototypeApp() {
  const [form, setForm] = useState(defaultAssessment);
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activePlan, setActivePlan] = useState('reading');
  const [apiNotice, setApiNotice] = useState('Live preview is using the local dummy pipeline until you run prediction.');

  const preview = useMemo(() => processAssessmentInput(form), [form]);
  const previewPrediction = useMemo(() => runDummyMlPrediction(preview), [preview]);
  const previewPlan = useMemo(() => getGeminiImprovementPlan(preview, previewPrediction), [preview, previewPrediction]);
  const previewForecast = useMemo(
    () => buildReevaluationForecast(previewPrediction, previewPlan, form.reevaluateWeeks),
    [previewPrediction, previewPlan, form.reevaluateWeeks],
  );

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: numericFields.has(field) ? toNumber(value) : value,
    }));
  };

  const runPrototype = async (typingJson = null) => {
    setIsRunning(true);
  
    console.log("Typing JSON:", typingJson);
  
    const processed = processAssessmentInput(form);
  
    let prediction;
    let source = "dummy";
  
    try {
      const response = await mvpAPI.learningProfile(buildMvpApiPayload(form));
      prediction = adaptMvpResponseToPrototype(processed, response.data);
      source = "real-ml";
      setApiNotice("Connected to FastAPI /learning-profile. Result is from the main MVP ML prototype.");
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      prediction = runDummyMlPrediction(processed);
      setApiNotice(`Using dummy fallback. Real ML was not reached: ${apiErrorMessage(error)}`);
    }
  
    const plan = getGeminiImprovementPlan(processed, prediction);
    const forecast = buildReevaluationForecast(prediction, plan, form.reevaluateWeeks);
  
    setResult({ processed, prediction, plan, forecast, source });
    setActivePlan(plan.modules[0]?.id || "reading");
    setIsRunning(false);
  };

  const displayed = result || {
    processed: preview,
    prediction: previewPrediction,
    plan: previewPlan,
    forecast: previewForecast,
    source: 'preview',
  };

  const selectedModule = displayed.plan.modules.find((module) => module.id === activePlan) || displayed.plan.modules[0];
  const practiceAssessment = createPracticeAssessment(selectedModule, displayed.processed.learner.name);

  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">DL</span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">DysLex Prototype</p>
                <h1 className="text-3xl font-black tracking-normal text-slate-950">Assessment to improvement loop</h1>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-6 text-slate-600">
              Upload reading audio, add a handwriting image, and capture typing. Until extraction is built,
              existing dataset rows are used as model-ready feature payloads for the ML prototype.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
            {['Input', 'ML', 'Improve'].map((step, index) => (
              <div key={step} className="min-w-20 rounded-md bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-bold text-slate-400">0{index + 1}</p>
                <p className="text-sm font-extrabold text-slate-800">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 lg:grid-cols-[410px_1fr]">
        <AssessmentForm form={form} updateField={updateField} runPrototype={runPrototype} isRunning={isRunning} />

        <div className="space-y-5">
          <PipelineStrip processed={displayed.processed} prediction={displayed.prediction} plan={displayed.plan} />
          <ResultSummary result={displayed} hasRun={Boolean(result)} apiNotice={apiNotice} />
          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <ImprovementModules
              modules={displayed.plan.modules}
              activePlan={activePlan}
              setActivePlan={setActivePlan}
              selectedModule={selectedModule}
            />
            <ProgressForecast forecast={displayed.forecast} />
          </div>
          <PracticeAssessment assessment={practiceAssessment} />
        </div>
      </section>
    </main>
  );
}

function AssessmentForm({ form, updateField, runPrototype, isRunning }) {
  const typingPrompt = 'The bright kite drifted above the quiet field while the child read each word carefully.';

  const typingEvents = useRef([]);
  const typingStartTime = useRef(null);

  const handleTypingKeyDown = (event) => {
    if (!typingStartTime.current) {
      typingStartTime.current = Date.now();
    }
  
    if (event.key === 'Backspace') {
      updateField('typingBackspaces', form.typingBackspaces + 1);
    }
  
    typingEvents.current.push({
      key: event.key,
      code: event.code,
      type: "down",
      ts: Date.now(),
    });
  };
  
  const handleTypingKeyUp = (event) => {
    typingEvents.current.push({
      key: event.key,
      code: event.code,
      type: "up",
      ts: Date.now(),
    });
  };

  const submitAssessment = () => {
    const typingJson = {
      prompt: typingPrompt,
      typed_text: form.typedText,
      started_at: typingStartTime.current,
      ended_at: Date.now(),
      events: typingEvents.current,
    };
  
    console.log(JSON.stringify(typingJson, null, 2));
  
    runPrototype(typingJson);

  };
  

  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-950">Assessment input</h2>
          <p className="text-sm text-slate-500">Audio, handwriting image, and typing capture. Dataset rows stand in for extraction.</p>
        </div>
        <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Dataset-backed</span>
      </div>

      <div className="grid gap-4">
        <label className="field">
          <span>Learner name</span>
          <input value={form.name} onChange={(event) => updateField('name', event.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            <span>Age</span>
            <input type="number" min="5" max="18" value={form.age} onChange={(event) => updateField('age', event.target.value)} />
          </label>
          <label className="field">
            <span>Reevaluate</span>
            <select value={form.reevaluateWeeks} onChange={(event) => updateField('reevaluateWeeks', event.target.value)}>
              <option value={2}>2 weeks</option>
              <option value={4}>4 weeks</option>
              <option value={6}>6 weeks</option>
              <option value={8}>8 weeks</option>
            </select>
          </label>
        </div>

        <InputCard
          title="Reading audio"
          description="Upload or record the learner reading aloud. Until audio processing exists, choose the dataset row used as extracted reading features."
          accept="audio/*"
          fileName={form.audioFileName}
          source={form.audioSource}
          onFile={(file) => {
            updateField("audioBlob", file || null);
          
            updateField("audioFileName", file?.name || "");
            updateField("audioSource", file ? "upload" : "");
            updateField("audioMimeType", file?.type || "");
          
            console.log(file);
          }}
          recorder={
            <AudioRecorder
            onSave={(audio) => {
              updateField("audioBlob", audio.blob);

              updateField("audioFileName", audio.name);
              updateField("audioSource", "microphone");
              updateField("audioMimeType", audio.type);

              console.log(audio.blob);

              console.log({
                name: audio.name,
                type: audio.type,
                size: audio.blob.size,
              });
              console.log(audio.blob);
            }}
          />
          }
          selectLabel="Reading feature stand-in"
          selectValue={form.readingCase}
          onSelect={(value) => updateField('readingCase', value)}
        />

        <WritingInputCard form={form} updateField={updateField} />

        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900">Typing capture</h3>
            <p className="text-xs leading-5 text-slate-500">The typed text is captured here. The model feature payload currently comes from a dataset row.</p>
          </div>
          <p className="mb-2 rounded-md bg-white p-3 text-sm font-semibold leading-6 text-slate-700">{typingPrompt}</p>
          <textarea
            value={form.typedText}
            onChange={(event) => updateField('typedText', event.target.value)}
            onKeyDown={handleTypingKeyDown}
            onKeyUp={handleTypingKeyUp}
            rows={4}
            className="w-full rounded-md border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            placeholder="Learner types here..."
          />
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
            <span className="rounded-md bg-white px-3 py-2">Characters: {form.typedText.length}</span>
            <span className="rounded-md bg-white px-3 py-2">Backspaces: {form.typingBackspaces}</span>
          </div>
          <label className="field mt-3">
            <span>Typing feature stand-in</span>
            <DatasetSelect value={form.typingCase} onChange={(value) => updateField('typingCase', value)} />
          </label>
        </section>

        <label className="field">
          <span>Observation notes</span>
          <textarea value={form.notes} onChange={(event) => updateField('notes', event.target.value)} rows={4} />
        </label>

        <button className="primary-action" onClick={submitAssessment} disabled={isRunning}
>
          {isRunning ? 'Processing assessment...' : 'Run prototype prediction'}
        </button>
      </div>
    </aside>
  );
}

function InputCard({ title, description, accept, fileName, source, onFile, recorder, selectLabel, selectValue, onSelect }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-black text-slate-900">{title}</h3>
        <p className="text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
        <input className="hidden" type="file" accept={accept} onChange={(event) => onFile(event.target.files?.[0])} />
        <span className="text-sm font-black text-slate-800">{fileName || 'Choose file'}</span>
        <span className="mt-1 text-xs font-semibold text-slate-400">{source ? `Source: ${source}` : accept.includes('audio') ? 'Audio file' : 'PNG or JPG image'}</span>
      </label>
      {recorder}
      <label className="field mt-3">
        <span>{selectLabel}</span>
        <DatasetSelect value={selectValue} onChange={onSelect} />
      </label>
    </section>
  );
}

function AudioRecorder({ onSave }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type });
        const extension = type.includes('mpeg') ? 'mp3' : type.includes('wav') ? 'wav' : 'webm';
        const name = `reading-recording-${Date.now()}.${extension}`;
        setAudioUrl(URL.createObjectURL(blob));
        onSave({ blob, name, type });
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus('recording');
    } catch (recordingError) {
      setError(recordingError?.message || 'Microphone access failed.');
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setStatus('saved');
  };

  return (
    <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        {status === 'recording' ? (
          <button type="button" className="rounded-md bg-red-600 px-3 py-2 text-xs font-black text-white" onClick={stopRecording}>
            Stop recording
          </button>
        ) : (
          <button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white" onClick={startRecording}>
            Record with mic
          </button>
        )}
        <span className="text-xs font-semibold text-slate-500">{status === 'recording' ? 'Recording reading audio...' : 'Saves browser recording for processing holder.'}</span>
      </div>
      {audioUrl && <audio className="mt-3 w-full" src={audioUrl} controls />}
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

function WritingInputCard({ form, updateField }) {
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const pointFromEvent = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const pointer = event.touches?.[0] || event;
    return {
      x: ((pointer.clientX - rect.left) / rect.width) * canvas.width,
      y: ((pointer.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const draw = (event) => {
    if (!isDrawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const point = pointFromEvent(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const startDrawing = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const point = pointFromEvent(event);
    isDrawingRef.current = true;
    context.strokeStyle = '#172033';
    context.lineWidth = 5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const saveCanvas = (type = 'image/png') => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const extension = type === 'image/jpeg' ? 'jpg' : 'png';
      const name = `handwriting-canvas-${Date.now()}.${extension}`;
      updateField("handwritingBlob", blob);

      console.log(blob);

      console.log({
        name,
        type,
        size: blob.size,
      });

      setPreviewUrl(URL.createObjectURL(blob));
      updateField('handwritingFileName', name);
      updateField('handwritingSource', 'canvas');
      updateField('handwritingMimeType', type);
    }, type, 0.92);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    setPreviewUrl('');
    updateField('handwritingFileName', '');
    updateField('handwritingSource', '');
    updateField('handwritingMimeType', '');
  };

  const safePreviewUrl =
    typeof previewUrl === 'string' &&
    (previewUrl.startsWith('blob:') || previewUrl.startsWith('data:image/'))
      ? previewUrl
      : '';

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3">
        <h3 className="text-sm font-black text-slate-900">Handwriting PNG/JPG</h3>
        <p className="text-xs leading-5 text-slate-500">Upload a sample or draw directly on canvas. The saved image is passed to the processing holder.</p>
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-4 py-5 text-center transition hover:border-blue-400 hover:bg-blue-50">
        <input
          className="hidden"
          type="file"
          accept="image/png,image/jpeg"
          onChange={(event) => {
            const file = event.target.files?.[0];
            updateField("handwritingBlob", file || null);
            updateField('handwritingFileName', file?.name || '');
            updateField('handwritingSource', file ? 'upload' : '');
            updateField('handwritingMimeType', file?.type || '');
            setPreviewUrl(file ? URL.createObjectURL(file) : '');
          }}
        />
        <span className="text-sm font-black text-slate-800">{form.handwritingFileName || 'Choose PNG/JPG'}</span>
        <span className="mt-1 text-xs font-semibold text-slate-400">{form.handwritingSource ? `Source: ${form.handwritingSource}` : 'PNG or JPG image'}</span>
      </label>

      <div className="mt-3 rounded-md border border-slate-200 bg-white p-3">
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-xs font-black text-white" onClick={() => saveCanvas('image/png')}>
            Save PNG
          </button>
          <button type="button" className="rounded-md bg-slate-800 px-3 py-2 text-xs font-black text-white" onClick={() => saveCanvas('image/jpeg')}>
            Save JPG
          </button>
          <button type="button" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600" onClick={clearCanvas}>
            Clear
          </button>
        </div>
        {safePreviewUrl && <img className="mt-3 max-h-28 rounded-md border border-slate-200 bg-white object-contain" src={safePreviewUrl} alt="Saved handwriting preview" />}
      </div>

      <label className="field mt-3">
        <span>Writing feature stand-in</span>
        <DatasetSelect value={form.writingCase} onChange={(value) => updateField('writingCase', value)} />
      </label>
    </section>
  );
}

function DatasetSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {datasetAssessmentCases.map((item) => (
        <option key={item.case_id} value={item.case_id}>{item.label}</option>
      ))}
    </select>
  );
}

function PipelineStrip({ processed, prediction, plan }) {
  const cards = [
    { title: 'Data process', value: `${processed.featureVector.length} features`, text: 'Normalized holder payload ready for backend storage.' },
    { title: 'ML prediction', value: `${prediction.riskScore}/100`, text: `${prediction.riskLevel} dyslexia risk with ${prediction.confidence}% confidence.` },
    { title: 'Gemini module', value: `${plan.modules.length} modules`, text: 'Interventions generated from the prediction profile.' },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => (
        <article key={card.title} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{card.title}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{card.value}</p>
          <p className="mt-1 text-sm leading-5 text-slate-500">{card.text}</p>
        </article>
      ))}
    </div>
  );
}

function ResultSummary({ result, hasRun, apiNotice }) {
  const domainData = Object.entries(result.prediction.domainScores).map(([name, score]) => ({
    name,
    score,
    color: skillColor[name] || COLORS.blue,
  }));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{hasRun ? 'Latest output' : 'Live preview'}</p>
          <h2 className="text-2xl font-black text-slate-950">{result.processed.learner.name}'s risk profile</h2>
          <p className="text-sm text-slate-500">{apiNotice}</p>
        </div>
        <RiskPill level={result.prediction.riskLevel} score={result.prediction.riskScore} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="mb-4 text-sm font-black text-slate-700">Prediction drivers</p>
          <div className="space-y-3">
            {result.prediction.drivers.map((driver) => (
              <div key={driver.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">{driver.label}</span>
                  <span className="text-slate-500">{driver.impact}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${driver.impact}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-72 rounded-lg bg-slate-50 p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={domainData} margin={{ left: -20, right: 10, top: 15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} domain={[0, 100]} />
              <Tooltip cursor={{ fill: '#e8eef7' }} />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {domainData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function PracticeAssessment({ assessment }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Practice assessment</p>
          <h2 className="text-xl font-black text-slate-950">{assessment.title}</h2>
          <p className="text-sm text-slate-500">{assessment.note}</p>
        </div>
        <span className="rounded-md bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{assessment.generatedBy}</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {assessment.tasks.map((task, index) => (
          <article key={`${task.type}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">{task.type}</p>
            <p className="mt-2 min-h-12 text-sm font-bold leading-6 text-slate-800">{task.prompt}</p>
            <div className="mt-3 grid gap-2">
              {task.items.map((item) => (
                <button key={item} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">
                  {item}
                </button>
              ))}
            </div>
            <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-500">Expected: {task.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RiskPill({ level, score }) {
  const color = level === 'High' ? COLORS.red : level === 'Moderate' ? COLORS.amber : COLORS.green;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-center shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Risk score</p>
      <p className="text-4xl font-black" style={{ color }}>{score}</p>
      <p className="text-sm font-bold" style={{ color }}>{level}</p>
    </div>
  );
}

function ImprovementModules({ modules, activePlan, setActivePlan, selectedModule }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Gemini-ready suggestions</p>
        <h2 className="text-xl font-black text-slate-950">Improvement module</h2>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {modules.map((module) => (
          <button
            key={module.id}
            className={`module-tab ${activePlan === module.id ? 'module-tab-active' : ''}`}
            onClick={() => setActivePlan(module.id)}
          >
            {module.title}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-slate-50 p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-950">{selectedModule.title}</h3>
            <p className="text-sm leading-6 text-slate-600">{selectedModule.summary}</p>
          </div>
          <span className="rounded-md bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">{selectedModule.frequency}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {selectedModule.activities.map((activity) => (
            <div key={activity} className="rounded-md border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700">
              {activity}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProgressForecast({ forecast }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-green-700">Reevaluation</p>
          <h2 className="text-xl font-black text-slate-950">Improvement graph</h2>
        </div>
        <span className="rounded-md bg-green-50 px-3 py-1 text-xs font-black text-green-700">{forecast.length - 1} week plan</span>
      </div>
      <div className="h-72 rounded-lg bg-slate-50 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={forecast} margin={{ left: -20, right: 12, top: 15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} domain={[0, 100]} />
            <Tooltip />
            <Line type="monotone" dataKey="riskScore" stroke={COLORS.red} strokeWidth={3} dot={{ r: 4 }} name="Risk score" />
            <Line type="monotone" dataKey="skillScore" stroke={COLORS.green} strokeWidth={3} dot={{ r: 4 }} name="Skill score" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 h-28 rounded-lg bg-slate-50 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={forecast} margin={{ left: -20, right: 12, top: 5, bottom: 0 }}>
            <XAxis dataKey="week" hide />
            <YAxis hide domain={[0, 100]} />
            <Tooltip />
            <Area type="monotone" dataKey="confidence" stroke={COLORS.blue} fill="#bfdbfe" name="Reevaluation confidence" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
