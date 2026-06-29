import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = {
  muted: '#68748a',
  line: '#d9e0ea',
  blue: '#2563eb',
  cyan: '#0891b2',
  green: '#059669',
  amber: '#d97706',
  red: '#dc2626',
};

const DOMAIN_COLOR = {
  reading: COLORS.blue,
  writing: COLORS.cyan,
  typing: COLORS.green,
};

/**
 * PredictionSummary
 * Displays the three real-API prediction results.
 *
 * Each `data` object is the raw FastAPI _predict() response:
 * {
 *   risk_probability, risk_prediction, risk_band, threshold,
 *   confidence, top_factors, evidence_level,
 *   data_provenance, accountability_note, clinical_note
 * }
 */
export default function PredictionSummary({ result, learnerName, isRunning, error }) {
  if (isRunning) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-semibold">Running assessment pipeline…</p>
          <p className="text-xs text-slate-400">
            /predict-reading-audio → /predict-writing-image → /predict-typing-keystrokes
          </p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-red-600">API error</p>
        <p className="mt-1 text-sm font-semibold text-red-800">{error}</p>
        <p className="mt-2 text-xs text-red-500">
          Make sure the FastAPI server is running:
          <code className="ml-1 rounded bg-red-100 px-1">uvicorn src.mvp.api:app --reload</code>
        </p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 shadow-sm text-center">
        <p className="text-sm font-semibold text-slate-400">
          Submit the assessment form to see prediction results here.
        </p>
      </section>
    );
  }

  const modalities = [
    { key: 'reading', label: 'Reading', data: result.reading },
    { key: 'writing', label: 'Writing', data: result.writing },
    { key: 'typing',  label: 'Typing',  data: result.typing  },
  ];

  const barData = modalities.map(({ key, label, data }) => ({
    name: label,
    score: data ? Math.round((data.risk_probability ?? 0) * 100) : 0,
    color: DOMAIN_COLOR[key],
  }));

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">
            Live API output
          </p>
          <h2 className="text-2xl font-black text-slate-950">
            {learnerName ? `${learnerName}'s` : 'Assessment'} risk profile
          </h2>
          <p className="text-sm text-slate-500">Results from the real FastAPI pipeline.</p>
        </div>
        <OverallRiskPill modalities={modalities} />
      </div>

      {/* Per-modality cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {modalities.map(({ key, label, data }) => (
          <ModalityCard key={key} label={label} data={data} color={DOMAIN_COLOR[key]} />
        ))}
      </div>

      {/* Bar chart */}
      <div className="h-56 rounded-lg bg-slate-50 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ left: -20, right: 10, top: 15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.line} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: COLORS.muted, fontSize: 12 }} domain={[0, 100]} />
            <Tooltip cursor={{ fill: '#e8eef7' }} formatter={(v) => [`${v}%`, 'Risk probability']} />
            <Bar dataKey="score" radius={[6, 6, 0, 0]}>
              {barData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Raw feature debug panel */}
      <FeatureDebugPanel result={result} />
    </section>
  );
}

/* ── ModalityCard ─────────────────────────────────────────────────────────── */

function ModalityCard({ label, data, color }) {
  if (!data) {
    return (
      <article className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-2 text-sm text-slate-400 italic">No data returned</p>
      </article>
    );
  }

  const pct      = Math.round((data.risk_probability ?? 0) * 100);
  const threshPct = Math.round((data.threshold ?? 0) * 100);
  const confPct  = Math.round((data.confidence ?? 0) * 100);
  const factors  = data.top_factors ?? [];

  return (
    <article className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
      {/* Title + band badge */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-black text-white"
          style={{ backgroundColor: color }}
        >
          {data.risk_band ?? data.risk_prediction}
        </span>
      </div>

      {/* Risk probability bar */}
      <div>
        <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
          <span>Risk probability</span>
          <span>{pct}%</span>
        </div>
        <div className="relative h-2 overflow-visible rounded-full bg-slate-200">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
          {/* Threshold marker */}
          <div
            className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-slate-500"
            style={{ left: `${threshPct}%` }}
            title={`Threshold: ${threshPct}%`}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>0%</span>
          <span>Threshold: {threshPct}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Confidence */}
      <p className="text-xs text-slate-500">
        Confidence:{' '}
        <span className="font-bold text-slate-700">{confPct}%</span>
      </p>

      {/* Top factors */}
      <div>
        <p className="mb-1 text-xs font-black text-slate-500">Key factors</p>
        {factors.length > 0 ? (
          <ul className="space-y-1">
            {factors.map((f) => (
              <li key={f} className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                {f}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs italic text-slate-400">No strong risk-driving factor detected.</p>
        )}
      </div>

      {/* Clinical note */}
      {data.clinical_note && (
        <p className="text-[11px] italic text-slate-400">{data.clinical_note}</p>
      )}
    </article>
  );
}

/* ── OverallRiskPill ──────────────────────────────────────────────────────── */

function OverallRiskPill({ modalities }) {
  const scores = modalities
    .map(({ data }) => data?.risk_probability ?? null)
    .filter((v) => v !== null);
  if (scores.length === 0) return null;

  const avg   = scores.reduce((a, b) => a + b, 0) / scores.length;
  const pct   = Math.round(avg * 100);
  const level = pct >= 70 ? 'High' : pct >= 35 ? 'Moderate' : 'Low';
  const color = level === 'High' ? COLORS.red : level === 'Moderate' ? COLORS.amber : COLORS.green;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 text-center shadow-sm shrink-0">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Overall risk</p>
      <p className="text-4xl font-black" style={{ color }}>{pct}</p>
      <p className="text-sm font-bold" style={{ color }}>{level}</p>
    </div>
  );
}

/* ── FeatureDebugPanel ────────────────────────────────────────────────────── */

/**
 * Collapsible panel showing the raw extracted feature values that were
 * sent to each ML model. Helps diagnose "always Low Risk" issues by making
 * it visible when features are all near-zero (e.g. blank canvas, silent audio).
 */
function FeatureDebugPanel({ result }) {
  const [open, setOpen] = useState(false);

  // Build feature rows from data_provenance if available, or from known fields
  const sections = [
    { label: 'Writing features', data: result?.writing },
    { label: 'Reading features', data: result?.reading },
    { label: 'Typing features',  data: result?.typing  },
  ]
    .filter(({ data }) => data?.data_provenance)
    .map(({ label, data }) => ({ label, provenance: data.data_provenance }));

  // Always show raw probability + threshold even without provenance
  const rawRows = [
    { modality: 'Reading', data: result?.reading },
    { modality: 'Writing', data: result?.writing },
    { modality: 'Typing',  data: result?.typing  },
  ].filter(({ data }) => data);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-500"
        onClick={() => setOpen((v) => !v)}
      >
        <span>Debug — raw API response values</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-200 px-4 pb-4 pt-3 space-y-4">
          <p className="text-xs text-slate-400">
            If Writing shows 0% risk every time, check that the extracted feature values below are
            non-zero. All-zero features mean the image wasn't received correctly by the CV pipeline
            (e.g. transparent canvas, empty file).
          </p>

          {/* Probability + threshold table */}
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="pb-1 font-black">Modality</th>
                <th className="pb-1 font-black">risk_probability</th>
                <th className="pb-1 font-black">threshold</th>
                <th className="pb-1 font-black">confidence</th>
                <th className="pb-1 font-black">prediction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rawRows.map(({ modality, data }) => (
                <tr key={modality}>
                  <td className="py-1 font-semibold text-slate-700">{modality}</td>
                  <td className="py-1 font-mono text-slate-600">
                    {data.risk_probability?.toFixed(4) ?? '—'}
                  </td>
                  <td className="py-1 font-mono text-slate-600">
                    {data.threshold?.toFixed(4) ?? '—'}
                  </td>
                  <td className="py-1 font-mono text-slate-600">
                    {data.confidence?.toFixed(4) ?? '—'}
                  </td>
                  <td className="py-1 text-slate-600">{data.risk_prediction ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* data_provenance blocks if present */}
          {sections.length > 0 ? (
            sections.map(({ label, provenance }) => (
              <div key={label}>
                <p className="mb-1 text-xs font-black text-slate-500">{label}</p>
                <pre className="overflow-x-auto rounded-md bg-white p-3 text-[11px] text-slate-600">
                  {JSON.stringify(provenance, null, 2)}
                </pre>
              </div>
            ))
          ) : (
            <div>
              <p className="mb-1 text-xs font-black text-slate-500">Full API response (writing)</p>
              <pre className="overflow-x-auto rounded-md bg-white p-3 text-[11px] text-slate-600 max-h-48">
                {JSON.stringify(result?.writing ?? {}, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}