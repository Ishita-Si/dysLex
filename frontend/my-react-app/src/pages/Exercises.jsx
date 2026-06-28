import { useState } from 'react';
import { Card, Button, Badge, SectionHeader, Tabs, EmptyState } from '../components/common/UI';

const EXERCISES = [
  { id: 'e1', title: 'Letter Tracing — b/d Pair', skill: 'Letter Reversal', difficulty: 'Easy', duration: 10, status: 'completed', target: 'Visual discrimination', progress: 100 },
  { id: 'e2', title: 'Phonics Blending — CVC Words', skill: 'Reading Fluency', difficulty: 'Medium', duration: 15, status: 'in-progress', target: 'Phonemic awareness', progress: 60 },
  { id: 'e3', title: 'Sight Word Flash Cards', skill: 'Word Recognition', difficulty: 'Easy', duration: 12, status: 'pending', target: 'Automatic recognition', progress: 0 },
  { id: 'e4', title: 'Sentence Typing Practice', skill: 'Typing Practice', difficulty: 'Medium', duration: 20, status: 'pending', target: 'Motor coordination', progress: 0 },
  { id: 'e5', title: 'Rhyming Word Pairs', skill: 'Phonics Practice', difficulty: 'Easy', duration: 8, status: 'completed', target: 'Phonological awareness', progress: 100 },
  { id: 'e6', title: 'Syllable Clapping', skill: 'Reading Fluency', difficulty: 'Medium', duration: 12, status: 'skipped', target: 'Prosody & fluency', progress: 0 },
];

const DIFFICULTY_COLOR = { Easy: 'green', Medium: 'amber', Hard: 'red' };
const STATUS_COLOR = { completed: 'green', 'in-progress': 'blue', pending: 'gray', skipped: 'amber' };

function ExerciseCard({ ex }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-gray-900">{ex.title}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge color={DIFFICULTY_COLOR[ex.difficulty]}>{ex.difficulty}</Badge>
            <Badge color="blue">{ex.skill}</Badge>
            <span className="text-xs text-gray-400">⏱ {ex.duration} min</span>
          </div>
        </div>
        <Badge color={STATUS_COLOR[ex.status]}>
          {ex.status === 'in-progress' ? 'In Progress' : ex.status.charAt(0).toUpperCase() + ex.status.slice(1)}
        </Badge>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress</span><span>{ex.progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${ex.status === 'completed' ? 'bg-emerald-500' : ex.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-300'}`}
            style={{ width: `${ex.progress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        {ex.status === 'pending' && <Button size="sm">Start Exercise</Button>}
        {ex.status === 'in-progress' && <Button size="sm">Continue</Button>}
        {ex.status === 'completed' && <Button variant="secondary" size="sm">Review</Button>}
        {ex.status !== 'completed' && ex.status !== 'skipped' && (
          <Button variant="ghost" size="sm">Skip</Button>
        )}
      </div>
    </Card>
  );
}

export default function ExercisesPage() {
  const [activeTab, setActiveTab] = useState('all');

  const filtered = EXERCISES.filter((ex) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ex.status === 'in-progress' || ex.status === 'pending';
    if (activeTab === 'completed') return ex.status === 'completed';
    return true;
  });

  const completedCount = EXERCISES.filter((e) => e.status === 'completed').length;
  const totalTime = EXERCISES.filter((e) => e.status === 'completed').reduce((s, e) => s + e.duration, 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Exercises"
        description="Intervention exercises assigned from the repository"
      />

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Assigned', value: EXERCISES.length, color: 'blue' },
          { label: 'Completed', value: completedCount, color: 'green' },
          { label: 'Time Spent', value: `${totalTime}m`, color: 'purple' },
        ].map(({ label, value, color }) => (
          <Card key={label} className="text-center py-4">
            <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </Card>
        ))}
      </div>

      <Tabs
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'completed', label: 'Completed' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {filtered.length === 0 ? (
        <EmptyState icon="📚" title="No exercises here" description="Exercises will appear once recommended by the AI." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((ex) => <ExerciseCard key={ex.id} ex={ex} />)}
        </div>
      )}
    </div>
  );
}