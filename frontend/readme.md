# Current DysLexAI MVP Frontend

This folder now contains a Vite/React screening dashboard aligned with the actual FastAPI backend in `src/mvp/api.py`.

Important: DysLexAI is a screening support prototype. It is not a diagnostic system.

The active app in `frontend/my-react-app/src/App.jsx`:

- checks `GET /health`
- loads low, moderate, and high manual-test samples from the MVP data contract
- lets you edit reading, handwriting, and typing feature values
- sends the nested payload to `POST /learning-profile`
- renders overall risk, modality scores, baseline deviations, learning profile, top factors, and recommended module identifiers

Run the API from the repository root:

```bash
uvicorn src.mvp.api:app --reload
```

Run the frontend:

```bash
cd frontend/my-react-app
npm install
npm run dev
```

The frontend currently uses these real repo endpoints:

```text
GET  /health
POST /predict-reading
POST /predict-writing
POST /predict-typing
POST /predict-fusion
POST /predict-full
POST /learning-profile
POST /baseline-reference/regenerate
```

The older auth, patient, report, progress, and exercise pages below are inactive prototype notes until matching backend endpoints exist.

# DysLexAI Frontend Dashboard

A production-grade React dashboard for the DysLexAI dyslexia detection and intervention platform.

## Features

| Module | Description |
|---|---|
| Authentication | Login / Register / Forgot Password with role-based access |
| Patient Management | Register patients, full profile with assessment history |
| Assessment Flow | 5-step guided flow: Reading → Writing → Typing → AI Analysis → Results |
| Baseline Comparison | Visual comparison of patient metrics vs reference norms |
| Learning Profile | Skill-level breakdown with progress bars |
| Explainability | Plain-language explanations of AI predictions |
| Recommendation Mapping | Category-based intervention selection |
| Exercise Dashboard | Track assigned exercises from Intervention Repository |
| Progress Tracking | Line charts, radar charts, weekly activity |
| Reassessment | Configurable intervals, improvement reports |
| History | Timeline of all past assessments |
| Reports | Generate downloadable PDF reports |

## Tech Stack

- **React 18** + Vite
- **TailwindCSS** (utility-first styling)
- **React Router v6** (client-side routing)
- **Recharts** (Line, Bar, Radar charts)
- **Axios** (FastAPI integration)
- **Zustand / Context API** (state management)

## Project Structure

```
src/
├── api/
│   └── apiService.js          # All FastAPI + Intervention API calls
├── components/
│   ├── auth/
│   │   └── AuthPages.jsx      # Login, Register, ForgotPassword
│   └── common/
│       ├── Layout.jsx         # Sidebar + main layout shell
│       └── UI.jsx             # Button, Card, Badge, Modal, Input, etc.
├── context/
│   ├── AuthContext.jsx        # Auth state (user, login, logout)
│   └── AssessmentContext.jsx  # Multi-step assessment state
└── pages/
    ├── Dashboard.jsx          # Main overview with stats + patient table
    ├── Patients.jsx           # Patient list + profile
    ├── Assessment.jsx         # 5-step assessment flow
    ├── Exercises.jsx          # Exercise dashboard
    ├── Progress.jsx           # Charts + reassessment
    └── History.jsx            # Assessment history + PDF reports
```

## Setup

```bash
# 1. Clone into your repo alongside your backend
git clone https://github.com/Ishita-Si/dysLex
cd dysLex

# 2. Replace the existing frontend
# (copy all src/ files into your project's src/ directory)

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env
# Edit .env to point to your FastAPI backend

# 5. Run development server
npm run dev
```

## FastAPI Integration

All API calls are in `src/api/apiService.js`. The endpoints match your spec:

```
POST /auth/login
POST /auth/register
POST /assessment/start
POST /predict-reading
POST /predict-writing
POST /predict-typing
POST /predict-final
GET  /patient/{id}
GET  /history/{id}
GET  /profile/{id}
POST /reassessment
POST /progress/update
POST /intervention/recommendations
POST /report/generate
```


## Customisation

- **Colors**: Tailwind classes. Risk colors: `emerald` (Low), `amber` (Moderate), `red` (High)
- **Reference baseline**: Edit `BASELINE` constant in `src/pages/Assessment.jsx`
- **Navigation**: Edit `NAV` array in `src/components/common/Layout.jsx`
