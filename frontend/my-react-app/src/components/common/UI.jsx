// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({
    children, onClick, variant = 'primary', size = 'md',
    disabled = false, loading = false, type = 'button', className = '',
  }) {
    const base = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 focus:ring-gray-300',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-300',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-4 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
  
  // ─── Card ──────────────────────────────────────────────────────────────────────
  export function Card({ children, className = '', padding = true }) {
    return (
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
        {children}
      </div>
    );
  }
  
  // ─── RiskBadge ────────────────────────────────────────────────────────────────
  export function RiskBadge({ level }) {
    const map = {
      Low:      { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Low Risk' },
      Moderate: { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Moderate Risk' },
      High:     { bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'High Risk' },
    };
    const s = map[level] || map.Low;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${s.bg} ${s.text}`}>
        <span className={`w-2 h-2 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  }
  
  // ─── Badge ─────────────────────────────────────────────────────────────────────
  export function Badge({ children, color = 'blue' }) {
    const colors = {
      blue:    'bg-blue-50 text-blue-700',
      green:   'bg-emerald-50 text-emerald-700',
      amber:   'bg-amber-50 text-amber-700',
      red:     'bg-red-50 text-red-700',
      gray:    'bg-gray-100 text-gray-600',
      purple:  'bg-purple-50 text-purple-700',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
        {children}
      </span>
    );
  }
  
  // ─── ProgressBar ──────────────────────────────────────────────────────────────
  export function ProgressBar({ value, max = 100, color = 'blue', label, showValue = true }) {
    const pct = Math.min((value / max) * 100, 100);
    const colors = {
      blue:   'bg-blue-500',
      green:  'bg-emerald-500',
      amber:  'bg-amber-500',
      red:    'bg-red-500',
      purple: 'bg-purple-500',
    };
    return (
      <div className="space-y-1.5">
        {(label || showValue) && (
          <div className="flex justify-between text-sm">
            {label && <span className="text-gray-600">{label}</span>}
            {showValue && <span className="font-medium text-gray-900">{Math.round(pct)}%</span>}
          </div>
        )}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${colors[color]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }
  
  // ─── RiskMeter ────────────────────────────────────────────────────────────────
  export function RiskMeter({ score }) {
    // score 0-100
    const angle = (score / 100) * 180 - 90;
    const color = score < 34 ? '#10b981' : score < 67 ? '#f59e0b' : '#ef4444';
    return (
      <div className="flex flex-col items-center gap-2">
        <svg viewBox="0 0 200 110" className="w-48">
          {/* Background arc */}
          <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="#e5e7eb" strokeWidth="16" strokeLinecap="round" />
          {/* Green zone */}
          <path d="M 10 100 A 90 90 0 0 1 70 19" fill="none" stroke="#d1fae5" strokeWidth="14" strokeLinecap="butt" />
          {/* Amber zone */}
          <path d="M 70 19 A 90 90 0 0 1 130 19" fill="none" stroke="#fef3c7" strokeWidth="14" strokeLinecap="butt" />
          {/* Red zone */}
          <path d="M 130 19 A 90 90 0 0 1 190 100" fill="none" stroke="#fee2e2" strokeWidth="14" strokeLinecap="butt" />
          {/* Needle */}
          <line
            x1="100" y1="100"
            x2={100 + 75 * Math.cos(((angle) * Math.PI) / 180)}
            y2={100 + 75 * Math.sin(((angle) * Math.PI) / 180)}
            stroke={color} strokeWidth="3" strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="6" fill={color} />
          <text x="100" y="80" textAnchor="middle" fontSize="22" fontWeight="bold" fill={color}>
            {score}
          </text>
          <text x="100" y="95" textAnchor="middle" fontSize="9" fill="#6b7280">RISK SCORE</text>
        </svg>
      </div>
    );
  }
  
  // ─── Spinner ──────────────────────────────────────────────────────────────────
  export function Spinner({ size = 'md', color = 'blue' }) {
    const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
    const colors = { blue: 'text-blue-600', white: 'text-white', gray: 'text-gray-400' };
    return (
      <svg className={`animate-spin ${sizes[size]} ${colors[color]}`} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    );
  }
  
  // ─── EmptyState ───────────────────────────────────────────────────────────────
  export function EmptyState({ icon, title, description, action }) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        {icon && <div className="text-gray-300 mb-4 text-5xl">{icon}</div>}
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
        {description && <p className="text-gray-500 text-sm mb-6 max-w-sm">{description}</p>}
        {action}
      </div>
    );
  }
  
  // ─── StatCard ─────────────────────────────────────────────────────────────────
  export function StatCard({ label, value, unit, trend, color = 'blue' }) {
    const colors = {
      blue:   'text-blue-600 bg-blue-50',
      green:  'text-emerald-600 bg-emerald-50',
      amber:  'text-amber-600 bg-amber-50',
      red:    'text-red-600 bg-red-50',
      purple: 'text-purple-600 bg-purple-50',
    };
    return (
      <Card className="space-y-3">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="flex items-end gap-1.5">
          <span className={`text-3xl font-bold ${colors[color].split(' ')[0]}`}>{value}</span>
          {unit && <span className="text-gray-400 text-sm pb-1">{unit}</span>}
        </div>
        {trend !== undefined && (
          <div className={`text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from last assessment
          </div>
        )}
      </Card>
    );
  }
  
  // ─── SectionHeader ────────────────────────────────────────────────────────────
  export function SectionHeader({ title, description, actions }) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          {description && <p className="text-gray-500 text-sm mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    );
  }
  
  // ─── Alert ────────────────────────────────────────────────────────────────────
  export function Alert({ type = 'info', title, message }) {
    const map = {
      info:    { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-800',    icon: 'ℹ️' },
      success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: '✅' },
      warning: { bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-800',   icon: '⚠️' },
      error:   { bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-800',     icon: '❌' },
    };
    const s = map[type];
    return (
      <div className={`${s.bg} ${s.border} border rounded-xl p-4 flex gap-3`}>
        <span className="flex-shrink-0 text-lg leading-5">{s.icon}</span>
        <div>
          {title && <p className={`font-semibold text-sm ${s.text}`}>{title}</p>}
          {message && <p className={`text-sm mt-0.5 ${s.text} opacity-90`}>{message}</p>}
        </div>
      </div>
    );
  }
  
  // ─── Input ────────────────────────────────────────────────────────────────────
  export function Input({ label, error, className = '', ...props }) {
    return (
      <div className="space-y-1.5">
        {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
        <input
          className={`w-full px-4 py-2.5 rounded-xl border ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
          } text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
  
  // ─── Select ───────────────────────────────────────────────────────────────────
  export function Select({ label, error, children, className = '', ...props }) {
    return (
      <div className="space-y-1.5">
        {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
        <select
          className={`w-full px-4 py-2.5 rounded-xl border ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
          } text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
  
  // ─── Tabs ─────────────────────────────────────────────────────────────────────
  export function Tabs({ tabs, active, onChange }) {
    return (
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              active === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }
  
  // ─── Modal ────────────────────────────────────────────────────────────────────
  export function Modal({ open, onClose, title, children, footer }) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6">{children}</div>
          {footer && <div className="px-6 pb-6 flex justify-end gap-3">{footer}</div>}
        </div>
      </div>
    );
  }