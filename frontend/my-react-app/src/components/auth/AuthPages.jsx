import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Input, Button, Alert, Select } from '../common/UI';

function AuthCard({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-200">
            <span className="text-white text-2xl font-bold">D</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Login ───────────────────────────────────────────────────────────────────
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form);
      navigate(user.role === 'patient' ? '/patient/me' : '/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your DysLexAI account">
      <form onSubmit={handle} className="space-y-5">
        {error && <Alert type="error" message={error} />}
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <div className="space-y-1.5">
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Sign in
        </Button>
        <p className="text-center text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'teacher' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handle = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch {
      setError('Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Create your account" subtitle="Join DysLexAI to support learners">
      <form onSubmit={handle} className="space-y-4">
        {error && <Alert type="error" message={error} />}
        <Input label="Full name" placeholder="Dr. Jane Smith" value={form.name} onChange={f('name')} required />
        <Input label="Email address" type="email" placeholder="you@example.com" value={form.email} onChange={f('email')} required />
        <Input label="Password" type="password" placeholder="At least 8 characters" value={form.password} onChange={f('password')} required />
        <Select label="Role" value={form.role} onChange={f('role')}>
          <option value="teacher">Teacher</option>
          <option value="parent">Parent</option>
          <option value="patient">Student / Patient</option>
          <option value="admin">Administrator</option>
        </Select>
        <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
          Create account
        </Button>
        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthCard>
  );
}

// ─── ForgotPassword ───────────────────────────────────────────────────────────
export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setSent(true); setLoading(false); }, 1000);
  };

  return (
    <AuthCard title="Reset your password" subtitle="We'll send you a link to reset it">
      {sent ? (
        <div className="text-center space-y-4">
          <div className="text-5xl">📬</div>
          <Alert type="success" title="Check your inbox" message={`We sent a reset link to ${email}`} />
          <Link to="/login" className="text-blue-600 text-sm hover:underline block">← Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handle} className="space-y-4">
          <Input label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" loading={loading} className="w-full" size="lg">Send reset link</Button>
          <Link to="/login" className="text-sm text-gray-500 hover:underline block text-center">← Back to sign in</Link>
        </form>
      )}
    </AuthCard>
  );
}