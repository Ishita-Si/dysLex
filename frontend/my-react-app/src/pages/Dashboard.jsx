import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { patientAPI } from '../api/apiService';
import { Card, StatCard, RiskBadge, Button, Spinner, SectionHeader } from '../components/common/UI';

const MOCK_STATS = {
  totalPatients: 24,
  assessmentsToday: 3,
  highRisk: 5,
  avgProgress: 68,
};

const MOCK_RECENT = [
  { id: '1', name: 'Arjun Sharma', age: 9, risk: 'High', lastAssessment: '2025-01-20', progress: 32 },
  { id: '2', name: 'Priya Nair', age: 11, risk: 'Moderate', lastAssessment: '2025-01-19', progress: 61 },
  { id: '3', name: 'Rohan Verma', age: 8, risk: 'Low', lastAssessment: '2025-01-18', progress: 85 },
  { id: '4', name: 'Sneha Joshi', age: 10, risk: 'High', lastAssessment: '2025-01-17', progress: 27 },
  { id: '5', name: 'Karan Mehta', age: 12, risk: 'Moderate', lastAssessment: '2025-01-16', progress: 54 },
];

const MOCK_NOTIFICATIONS = [
  { id: 1, type: 'warning', message: 'Reassessment due for Arjun Sharma in 2 days', time: '2h ago' },
  { id: 2, type: 'info', message: 'Priya Nair completed 3 exercises today', time: '4h ago' },
  { id: 3, type: 'alert', message: 'Sneha Joshi missed her scheduled session', time: '1d ago' },
];

function NotifItem({ item }) {
  const map = {
    warning: { bg: 'bg-amber-50', dot: 'bg-amber-400', text: 'text-amber-800' },
    info:    { bg: 'bg-blue-50',  dot: 'bg-blue-400',  text: 'text-blue-800' },
    alert:   { bg: 'bg-red-50',   dot: 'bg-red-400',   text: 'text-red-800' },
  };
  const s = map[item.type];
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl ${s.bg}`}>
      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${s.text}`}>{item.message}</p>
        <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Link to="/assessment/new">
          <Button size="lg">
            <span>+</span> New Assessment
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients" value={MOCK_STATS.totalPatients} color="blue" />
        <StatCard label="Assessments Today" value={MOCK_STATS.assessmentsToday} color="purple" />
        <StatCard label="High Risk Patients" value={MOCK_STATS.highRisk} color="red" />
        <StatCard label="Avg. Progress" value={MOCK_STATS.avgProgress} unit="%" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent patients */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Recent Patients"
            actions={<Link to="/patients" className="text-sm text-blue-600 hover:underline">View all →</Link>}
          />
          <Card padding={false}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Patient</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Risk</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Progress</th>
                  <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Assessment</th>
                  <th className="px-6 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {MOCK_RECENT.map((p, i) => (
                  <tr key={p.id} className={`${i < MOCK_RECENT.length - 1 ? 'border-b border-gray-50' : ''} hover:bg-gray-50 transition`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 text-xs font-semibold">{p.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{p.name}</p>
                          <p className="text-xs text-gray-400">Age {p.age}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><RiskBadge level={p.risk} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full w-20">
                          <div
                            className={`h-full rounded-full ${p.progress > 70 ? 'bg-emerald-500' : p.progress > 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${p.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{p.progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{new Date(p.lastAssessment).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <Link to={`/patients/${p.id}`} className="text-blue-600 hover:underline text-xs font-medium">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <SectionHeader title="Notifications" />
          <div className="space-y-2">
            {MOCK_NOTIFICATIONS.map((n) => <NotifItem key={n.id} item={n} />)}
          </div>

          <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 text-white">
            <p className="font-semibold mb-1">Quick Assessment</p>
            <p className="text-blue-100 text-sm mb-4">Start a new session for a patient in under 2 minutes.</p>
            <Link to="/assessment/new">
              <Button variant="secondary" size="sm" className="text-blue-700">Start now →</Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}