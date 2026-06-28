import { createContext, useContext, useState, useCallback } from 'react';

const AssessmentContext = createContext(null);

const initialState = {
  sessionId: null,
  patientId: null,
  step: 'reading', // reading | writing | typing | analyzing | results
  reading: null,
  writing: null,
  typing: null,
  finalResult: null,
  learningProfile: null,
};

export function AssessmentProvider({ children }) {
  const [state, setState] = useState(initialState);

  const setSessionId = useCallback((id) => setState((s) => ({ ...s, sessionId: id })), []);
  const setPatientId = useCallback((id) => setState((s) => ({ ...s, patientId: id })), []);
  const setStep = useCallback((step) => setState((s) => ({ ...s, step })), []);

  const setReadingResult = useCallback((data) =>
    setState((s) => ({ ...s, reading: data, step: 'writing' })), []);

  const setWritingResult = useCallback((data) =>
    setState((s) => ({ ...s, writing: data, step: 'typing' })), []);

  const setTypingResult = useCallback((data) =>
    setState((s) => ({ ...s, typing: data, step: 'analyzing' })), []);

  const setFinalResult = useCallback((data) =>
    setState((s) => ({ ...s, finalResult: data, step: 'results' })), []);

  const setLearningProfile = useCallback((data) =>
    setState((s) => ({ ...s, learningProfile: data })), []);

  const reset = useCallback(() => setState(initialState), []);

  return (
    <AssessmentContext.Provider value={{
      ...state,
      setSessionId, setPatientId, setStep,
      setReadingResult, setWritingResult, setTypingResult,
      setFinalResult, setLearningProfile, reset,
    }}>
      {children}
    </AssessmentContext.Provider>
  );
}

export const useAssessment = () => {
  const ctx = useContext(AssessmentContext);
  if (!ctx) throw new Error('useAssessment must be used within AssessmentProvider');
  return ctx;
};