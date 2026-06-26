import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, RiskBadge, Badge, SectionHeader, StatCard } from '../components/common/UI';

const HISTORY = [
  {
    id: 'a1', date: '2025-01-20', patient: 'Arjun Sharma', patientId: '1',
    risk: 'High', severity: 78, confidence: 0.91,
    reading: 42, writing: 38, typing: 55,
  },
  {
    id: 'a2', date: '2024-12-15', patient: 'Priya Nair', patientId: '2',
    risk: 'Moderate', severity: 56, confidence: 0.84,
    reading: 61, writing: 58, typing: 72,
  },
  {
    id: 'a3', date: '2024-12-01', patient: 'Rohan Verma', patientId: '3',
    risk: 'Low', severity: 22, confidence: 0.89,
    reading: 88, writing: 82, typing: 91,
  },
  {
    id: 'a4', date: '2024-11-20', patient: 'Sneha Joshi', patientId: '4',
    risk: 'High', severity: 82, confidence: 0.93,
    reading: 35, writing: 31, typing: 48,
  },
  {
    id: 'a5', date: '2024-11-01', patient: 'Arjun Sharma', patientId: '1',
    risk: 'High', severity: 85, confidence: 0.88,
    reading: 37, writing: 34, typing: 50,
  },
];

// ── History Page ──────────────────────────────────────────────────────────────
export function HistoryPage() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = HISTORY.filter((h) =>
    h.patient.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader title="Assessment History" description="All past assessments in chronological order" />

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by patient name..."
        className="w-full max-w-sm px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-8 bottom-8 w-0.5 bg-gray-100" />

        <div className="space-y-4">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-start gap-5">
              {/* Dot */}
              <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white shadow-sm ${
                item.risk === 'High' ? 'bg-red-100' :
                item.risk === 'Moderate' ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                <span className="text-sm">📋</span>
              </div>

              {/* Card */}
              <Card
                className={`flex-1 cursor-pointer transition-all ${selected?.id === item.id ? 'ring-2 ring-blue-500' : 'hover:border-gray-200'}`}
                onClick={() => setSelected(selected?.id === item.id ? null : item)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{item.patient}</p>
                      <p className="text-xs text-gray-400">{new Date(item.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RiskBadge level={item.risk} />
                    <span className="text-gray-300">›</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {selected?.id === item.id && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {[
                        { label: 'Reading', value: item.reading },
                        { label: 'Writing', value: item.writing },
                        { label: 'Typing', value: item.typing },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-2xl font-bold text-gray-900">{value}</p>
                          <p className="text-xs text-gray-400">{label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Severity: <strong>{item.severity}</strong></span>
                      <span className="text-gray-500">Confidence: <strong>{Math.round(item.confidence * 100)}%</strong></span>
                    </div>
                    <div className="flex gap-2">
                      <Link to={`/patients/${item.patientId}`}>
                        <Button variant="secondary" size="sm">Patient Profile</Button>
                      </Link>
                      <Button size="sm">Full Report</Button>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Reports Page ──────────────────────────────────────────────────────────────
export function ReportsPage() {
  const [generating, setGenerating] = useState(null);

  const handleGenerate = async (id) => {
    setGenerating(id);
    await new Promise((r) => setTimeout(r, 1800));
    setGenerating(null);
    // In production: trigger PDF download via reportAPI.generate()
    alert('PDF report downloaded! (Connect to backend to enable real downloads)');
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Reports"
        description="Generate and download detailed PDF assessment reports"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Reports Generated" value={8} color="blue" />
        <StatCard label="This Month" value={3} color="purple" />
        <StatCard label="Pending Reports" value={2} color="amber" />
      </div>

      <Card padding={false}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Patient', 'Date', 'Risk', 'Severity', 'Contents', 'Action'].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HISTORY.map((item, i) => (
              <tr key={item.id} className={`${i < HISTORY.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition`}>
                <td className="px-5 py-4 font-medium text-gray-900">{item.patient}</td>
                <td className="px-5 py-4 text-gray-500">
                  {new Date(item.date).toLocaleDateString('en-IN')}
                </td>
                <td className="px-5 py-4"><RiskBadge level={item.risk} /></td>
                <td className="px-5 py-4 text-gray-600 font-medium">{item.severity}/100</td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-1">
                    {['Profile', 'Baseline', 'Recommendations', 'Progress'].map((tag) => (
                      <Badge key={tag} color="gray">{tag}</Badge>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={generating === item.id}
                    onClick={() => handleGenerate(item.id)}
                  >
                    {generating === item.id ? 'Generating...' : '↓ PDF'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
        <div className="flex items-start gap-4">
          <span className="text-3xl">📊</span>
          <div>
            <p className="font-semibold text-blue-900">Batch Report Generation</p>
            <p className="text-blue-700 text-sm mt-0.5">Generate reports for all patients at once for review.</p>
            <Button size="sm" className="mt-3">Generate All Reports</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}