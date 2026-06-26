import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Input, Select, RiskBadge, Badge, SectionHeader, Modal, EmptyState } from '../components/common/UI';

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_PATIENTS = [
  { id: '1', name: 'Arjun Sharma', age: 9, gender: 'Male', language: 'Hindi', school: 'DPS Lucknow', risk: 'High', assessments: 3, lastSeen: '2025-01-20' },
  { id: '2', name: 'Priya Nair', age: 11, gender: 'Female', language: 'Malayalam', school: 'Ryan International', risk: 'Moderate', assessments: 2, lastSeen: '2025-01-19' },
  { id: '3', name: 'Rohan Verma', age: 8, gender: 'Male', language: 'English', school: 'City Montessori', risk: 'Low', assessments: 4, lastSeen: '2025-01-18' },
  { id: '4', name: 'Sneha Joshi', age: 10, gender: 'Female', language: 'Marathi', school: 'Kendriya Vidyalaya', risk: 'High', assessments: 1, lastSeen: '2025-01-17' },
  { id: '5', name: 'Karan Mehta', age: 12, gender: 'Male', language: 'Gujarati', school: 'The Doon School', risk: 'Moderate', assessments: 2, lastSeen: '2025-01-16' },
];

const MOCK_PROFILE = {
  '1': {
    id: '1', name: 'Arjun Sharma', age: 9, gender: 'Male', language: 'Hindi',
    school: 'DPS Lucknow', risk: 'High', confidence: 0.91, severity: 78,
    assessments: [
      { id: 'a1', date: '2025-01-20', risk: 'High', reading: 42, writing: 38, typing: 55 },
      { id: 'a2', date: '2024-12-15', risk: 'High', reading: 37, writing: 34, typing: 48 },
      { id: 'a3', date: '2024-11-01', risk: 'Moderate', reading: 60, writing: 55, typing: 70 },
    ],
    learningProfile: [
      { skill: 'Reading Fluency', level: 'High Weakness', score: 15 },
      { skill: 'Word Recognition', level: 'Moderate', score: 40 },
      { skill: 'Letter Reversal', level: 'High', score: 85 },
      { skill: 'Typing Accuracy', level: 'Low', score: 30 },
      { skill: 'Spelling Accuracy', level: 'Moderate', score: 45 },
    ],
    exercises: [
      { id: 'e1', title: 'Letter Tracing', skill: 'Letter Reversal', status: 'completed', difficulty: 'Easy' },
      { id: 'e2', title: 'Phonics Blending', skill: 'Reading Fluency', status: 'in-progress', difficulty: 'Medium' },
      { id: 'e3', title: 'Word Sorting', skill: 'Word Recognition', status: 'pending', difficulty: 'Hard' },
    ],
  },
};

// ── Patient List ────────────────────────────────────────────────────────────
export function PatientList() {
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const filtered = MOCK_PATIENTS.filter(
    (p) =>
      (filterRisk === 'All' || p.risk === filterRisk) &&
      p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Patients"
        description={`${MOCK_PATIENTS.length} patients registered`}
        actions={
          <Button onClick={() => setShowModal(true)}>
            <span>+</span> Add Patient
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-3">
        <Input
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterRisk} onChange={(e) => setFilterRisk(e.target.value)} className="w-40">
          <option>All</option>
          <option>High</option>
          <option>Moderate</option>
          <option>Low</option>
        </Select>
      </div>

      {/* Table */}
      <Card padding={false}>
        {filtered.length === 0 ? (
          <EmptyState icon="👥" title="No patients found" description="Try adjusting your search or filters." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Patient', 'Age', 'Language', 'School', 'Risk', 'Assessments', 'Last Seen', ''].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  className={`${i < filtered.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-blue-50/50 cursor-pointer transition`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 text-sm font-semibold">{p.name[0]}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.gender}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{p.age}</td>
                  <td className="px-5 py-4 text-gray-600">{p.language}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{p.school || '—'}</td>
                  <td className="px-5 py-4"><RiskBadge level={p.risk} /></td>
                  <td className="px-5 py-4 text-gray-600 text-center">{p.assessments}</td>
                  <td className="px-5 py-4 text-gray-500">{new Date(p.lastSeen).toLocaleDateString('en-IN')}</td>
                  <td className="px-5 py-4">
                    <span className="text-blue-600 text-xs font-medium">View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <AddPatientModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}

// ── Add Patient Modal ─────────────────────────────────────────────────────────
function AddPatientModal({ open, onClose }) {
  const [form, setForm] = useState({ name: '', age: '', gender: 'Male', language: 'English', school: '' });
  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Register New Patient"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Save Patient</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Full name" placeholder="Patient's full name" value={form.name} onChange={f('name')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Age" type="number" placeholder="8" value={form.age} onChange={f('age')} />
          <Select label="Gender" value={form.gender} onChange={f('gender')}>
            <option>Male</option><option>Female</option><option>Other</option>
          </Select>
        </div>
        <Select label="Primary Language" value={form.language} onChange={f('language')}>
          {['English','Hindi','Tamil','Telugu','Malayalam','Kannada','Marathi','Bengali','Gujarati','Odia'].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </Select>
        <Input label="School (optional)" placeholder="School name" value={form.school} onChange={f('school')} />
      </div>
    </Modal>
  );
}

// ── Patient Profile ───────────────────────────────────────────────────────────
export function PatientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const data = MOCK_PROFILE[id] || MOCK_PROFILE['1'];
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'learning', label: 'Learning Profile' },
    { id: 'exercises', label: 'Exercises' },
  ];

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
        ← Back to patients
      </button>

      {/* Patient header card */}
      <Card>
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 text-2xl font-bold">{data.name[0]}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
                <p className="text-gray-500 text-sm mt-0.5">
                  Age {data.age} · {data.gender} · {data.language} · {data.school}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <RiskBadge level={data.risk} />
                <Link to={`/assessment/new?patientId=${data.id}`}>
                  <Button size="sm">New Assessment</Button>
                </Link>
              </div>
            </div>
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{data.assessments.length}</p>
                <p className="text-xs text-gray-400">Assessments</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{data.exercises.filter(e => e.status === 'completed').length}</p>
                <p className="text-xs text-gray-400">Completed Exercises</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{data.severity}</p>
                <p className="text-xs text-gray-400">Risk Score</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
              activeTab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && <PatientOverviewTab data={data} />}
      {activeTab === 'assessments' && <AssessmentsTab data={data} />}
      {activeTab === 'learning' && <LearningProfileTab data={data} />}
      {activeTab === 'exercises' && <ExercisesTab data={data} />}
    </div>
  );
}

function PatientOverviewTab({ data }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Latest Assessment</h3>
        {data.assessments[0] && (
          <div className="space-y-3">
            {[
              { label: 'Reading', score: data.assessments[0].reading, color: 'blue' },
              { label: 'Writing', score: data.assessments[0].writing, color: 'purple' },
              { label: 'Typing', score: data.assessments[0].typing, color: 'amber' },
            ].map(({ label, score, color }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium">{score}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-${color}-500 transition-all duration-700`}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 mb-4">Key Weaknesses</h3>
        <div className="space-y-3">
          {data.learningProfile
            .filter((l) => l.level.includes('High') || l.level === 'Moderate')
            .slice(0, 4)
            .map((l) => (
              <div key={l.skill} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{l.skill}</span>
                <Badge color={l.score < 30 ? 'red' : l.score < 60 ? 'amber' : 'green'}>
                  {l.level}
                </Badge>
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

function AssessmentsTab({ data }) {
  return (
    <div className="space-y-3">
      {data.assessments.map((a, i) => (
        <Card key={a.id} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-semibold text-sm">
              #{data.assessments.length - i}
            </div>
            <div>
              <p className="font-medium text-gray-900">{new Date(a.date).toLocaleDateString('en-IN', { year:'numeric', month:'long', day:'numeric' })}</p>
              <p className="text-xs text-gray-400">
                Reading {a.reading}% · Writing {a.writing}% · Typing {a.typing}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RiskBadge level={a.risk} />
            <Link to={`/assessment/${a.id}/results`}>
              <Button variant="secondary" size="sm">View Report</Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
  );
}

function LearningProfileTab({ data }) {
  return (
    <Card>
      <h3 className="font-semibold text-gray-900 mb-5">Skill Profile</h3>
      <div className="space-y-4">
        {data.learningProfile.map((l) => (
          <div key={l.skill} className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 font-medium">{l.skill}</span>
              <Badge color={l.score < 30 ? 'red' : l.score < 60 ? 'amber' : 'green'}>
                {l.level}
              </Badge>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${l.score < 30 ? 'bg-red-500' : l.score < 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${l.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ExercisesTab({ data }) {
  const statusColor = { completed: 'green', 'in-progress': 'blue', pending: 'gray' };
  return (
    <div className="space-y-3">
      {data.exercises.map((ex) => (
        <Card key={ex.id} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{ex.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{ex.skill} · {ex.difficulty}</p>
          </div>
          <Badge color={statusColor[ex.status]}>
            {ex.status.charAt(0).toUpperCase() + ex.status.slice(1)}
          </Badge>
        </Card>
      ))}
    </div>
  );
}