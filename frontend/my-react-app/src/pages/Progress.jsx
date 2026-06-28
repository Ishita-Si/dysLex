import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend, RadarChart,
  Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { Card, SectionHeader, StatCard, Tabs, Badge } from '../components/common/UI';

const PROGRESS_DATA = [
  { week: 'Week 1', reading: 42, writing: 38, typing: 55, overall: 45 },
  { week: 'Week 2', reading: 47, writing: 41, typing: 59, overall: 49 },
  { week: 'Week 3', reading: 53, writing: 46, typing: 63, overall: 54 },
  { week: 'Week 4', reading: 58, writing: 52, typing: 67, overall: 59 },
  { week: 'Week 5', reading: 61, writing: 55, typing: 70, overall: 62 },
  { week: 'Week 6', reading: 66, writing: 60, typing: 74, overall: 67 },
];

const RADAR_DATA = [
  { skill: 'Reading Fluency', previous: 15, current: 30 },
  { skill: 'Word Recognition', previous: 40, current: 56 },
  { skill: 'Letter Reversal', previous: 20, current: 38 },
  { skill: 'Typing Accuracy', previous: 30, current: 48 },
  { skill: 'Spelling', previous: 45, current: 60 },
];

const WEEKLY_ACTIVITY = [
  { day: 'Mon', exercises: 2, minutes: 25 },
  { day: 'Tue', exercises: 3, minutes: 40 },
  { day: 'Wed', exercises: 1, minutes: 15 },
  { day: 'Thu', exercises: 4, minutes: 55 },
  { day: 'Fri', exercises: 2, minutes: 30 },
  { day: 'Sat', exercises: 0, minutes: 0 },
  { day: 'Sun', exercises: 1, minutes: 12 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-gray-600 capitalize">{entry.dataKey}:</span>
          <span className="font-medium">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ProgressPage() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-6">
      <SectionHeader title="Progress Tracking" description="Monitor improvement across all skill areas" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Exercises Completed" value={13} color="green" trend={+15} />
        <StatCard label="Total Time" value="177" unit="min" color="blue" />
        <StatCard label="Completion Rate" value="72" unit="%" color="purple" trend={+8} />
        <StatCard label="Overall Improvement" value="+22" unit="pts" color="amber" />
      </div>

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'skills', label: 'Skill Radar' },
          { id: 'activity', label: 'Weekly Activity' },
          { id: 'reassessment', label: 'Reassessment' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-6">Score Trajectory</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={PROGRESS_DATA} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                formatter={(value) => <span className="capitalize text-gray-600">{value}</span>}
              />
              <Line type="monotone" dataKey="reading" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="writing" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4, fill: '#8b5cf6' }} />
              <Line type="monotone" dataKey="typing" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: '#f59e0b' }} />
              <Line type="monotone" dataKey="overall" stroke="#10b981" strokeWidth={3} strokeDasharray="6 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab === 'skills' && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-2">Skill Comparison — Before vs After</h3>
          <p className="text-gray-400 text-sm mb-6">Comparing current assessment against initial baseline</p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={RADAR_DATA} cx="50%" cy="50%">
              <PolarGrid stroke="#f3f4f6" />
              <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Radar name="Previous" dataKey="previous" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Current" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab === 'activity' && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-6">This Week's Activity</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={WEEKLY_ACTIVITY} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              <Bar dataKey="exercises" name="Exercises" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              <Bar dataKey="minutes" name="Minutes" fill="#c7d2fe" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {tab === 'reassessment' && (
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Improvement Report</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: 'Previous Risk', value: 'High', sub: '78 severity', color: 'red' },
                { label: 'Current Risk', value: 'Moderate', sub: '56 severity', color: 'amber' },
                { label: 'Improvement', value: '−22', sub: 'severity points', color: 'green' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className={`p-4 rounded-xl bg-${color}-50 border border-${color}-100 text-center`}>
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
                  <p className={`text-xs text-${color}-500 mt-0.5`}>{sub}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold text-gray-900 mb-4">Skill Improvements</h3>
            {RADAR_DATA.map((d) => (
              <div key={d.skill} className="flex items-center gap-4 mb-3">
                <span className="text-sm text-gray-700 w-36 flex-shrink-0">{d.skill}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                  <div className="absolute h-full bg-red-200 rounded-full" style={{ width: `${d.previous}%` }} />
                  <div className="absolute h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${d.current}%` }} />
                </div>
                <span className="text-xs text-emerald-600 font-semibold w-12 text-right">
                  +{d.current - d.previous}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-red-200 rounded inline-block" /> Previous</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-blue-500 rounded inline-block" /> Current</span>
            </div>
          </Card>

          <Card className="bg-blue-50 border-blue-100">
            <div className="flex items-start gap-4">
              <span className="text-3xl">📅</span>
              <div>
                <p className="font-semibold text-blue-900">Next Reassessment</p>
                <p className="text-blue-700 text-sm mt-0.5">Scheduled for 4 weeks from today — February 20, 2025</p>
                <div className="flex gap-2 mt-3">
                  {['2 weeks', '4 weeks', '8 weeks'].map((opt) => (
                    <button key={opt} className="px-3 py-1.5 rounded-lg text-xs border border-blue-200 bg-white text-blue-700 hover:bg-blue-100 transition">
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}