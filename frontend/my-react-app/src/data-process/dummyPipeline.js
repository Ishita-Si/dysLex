export const defaultAssessment = {
  name: 'Aarav Mehta',
  age: 9,
  readingCase: 'full_moderate_risk',
  writingCase: 'full_moderate_risk',
  typingCase: 'full_moderate_risk',
  audioFileName: '',
  audioSource: '',
  audioMimeType: '',
  audioBlob: null,
  audioFile: null,
  handwritingFileName: '',
  handwritingSource: '',
  handwritingMimeType: '',
  handwritingBlob: null,
  handwritingFile: null,
  typedText: '',
  typingBackspaces: 0,
  reevaluateWeeks: 4,
  notes: 'Mixes b/d, pauses on unfamiliar words, and needs repeated reading prompts.',
};

export const datasetAssessmentCases = [
  {
    case_id: 'full_low_risk',
    label: 'Dataset sample: low risk',
    reading: {
      fixation_duration_mean: 210,
      fixation_duration_std: 48,
      fixation_count: 78,
      saccade_length_mean: 8.2,
      saccade_velocity_mean: 35,
      regression_count: 4,
      reading_time_seconds: 62,
      blink_rate: 0.11,
    },
    writing: {
      stroke_irregularity: 0.22,
      letter_spacing_variance: 0.2,
      baseline_drift: 0.15,
      letter_reversal_count: 0,
      word_alignment_error: 0.14,
      pressure_variability: 0.24,
    },
    typing: {
      mean_hold_time_ms: 82,
      mean_flight_time_ms: 105,
      pause_rate: 0.07,
      backspace_rate: 0.03,
      typing_speed_wpm: 49,
      latency_variability_ms: 32,
    },
  },
  {
    case_id: 'full_moderate_risk',
    label: 'Dataset sample: moderate risk',
    reading: {
      fixation_duration_mean: 270,
      fixation_duration_std: 76,
      fixation_count: 108,
      saccade_length_mean: 6.2,
      saccade_velocity_mean: 27,
      regression_count: 9,
      reading_time_seconds: 92,
      blink_rate: 0.17,
    },
    writing: {
      stroke_irregularity: 0.5,
      letter_spacing_variance: 0.45,
      baseline_drift: 0.42,
      letter_reversal_count: 2,
      word_alignment_error: 0.36,
      pressure_variability: 0.48,
    },
    typing: {
      mean_hold_time_ms: 118,
      mean_flight_time_ms: 158,
      pause_rate: 0.2,
      backspace_rate: 0.11,
      typing_speed_wpm: 33,
      latency_variability_ms: 70,
    },
  },
  {
    case_id: 'full_high_risk',
    label: 'Dataset sample: high risk',
    reading: {
      fixation_duration_mean: 340,
      fixation_duration_std: 118,
      fixation_count: 145,
      saccade_length_mean: 4.8,
      saccade_velocity_mean: 19,
      regression_count: 17,
      reading_time_seconds: 132,
      blink_rate: 0.25,
    },
    writing: {
      stroke_irregularity: 0.78,
      letter_spacing_variance: 0.74,
      baseline_drift: 0.68,
      letter_reversal_count: 5,
      word_alignment_error: 0.62,
      pressure_variability: 0.72,
    },
    typing: {
      mean_hold_time_ms: 152,
      mean_flight_time_ms: 230,
      pause_rate: 0.36,
      backspace_rate: 0.22,
      typing_speed_wpm: 21,
      latency_variability_ms: 118,
    },
  },
];

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));

function normalizeHigherRisk(value, low, high) {
  return clamp(((value - low) / (high - low)) * 100);
}

function normalizeLowerRisk(value, low, high) {
  return clamp(((high - value) / (high - low)) * 100);
}

function getCase(caseId) {
  return datasetAssessmentCases.find((item) => item.case_id === caseId) || datasetAssessmentCases[1];
}

export function processAssessmentInput(input) {
  const payload = buildMvpApiPayload(input);
  const reading = payload.reading;
  const writing = payload.writing;
  const typing = payload.typing;
  const readingRisk = clamp(
    normalizeHigherRisk(reading.fixation_duration_mean, 210, 340) * 0.35
    + normalizeHigherRisk(reading.regression_count, 4, 17) * 0.35
    + normalizeHigherRisk(reading.reading_time_seconds, 62, 132) * 0.3,
  );
  const writingRisk = clamp(
    normalizeHigherRisk(writing.stroke_irregularity, 0.22, 0.78) * 0.35
    + normalizeHigherRisk(writing.letter_reversal_count, 0, 5) * 0.35
    + normalizeHigherRisk(writing.word_alignment_error, 0.14, 0.62) * 0.3,
  );
  const typingRisk = clamp(
    normalizeHigherRisk(typing.pause_rate, 0.07, 0.36) * 0.38
    + normalizeHigherRisk(typing.backspace_rate, 0.03, 0.22) * 0.32
    + normalizeLowerRisk(typing.typing_speed_wpm, 21, 49) * 0.3,
  );
  const attentionRisk = clamp(normalizeHigherRisk(reading.blink_rate, 0.11, 0.25) * 0.5 + normalizeHigherRisk(typing.pause_rate, 0.07, 0.36) * 0.5);

  return {
    learner: {
      name: input.name.trim() || 'Unnamed learner',
      age: input.age,
      notes: input.notes,
      reevaluateWeeks: input.reevaluateWeeks,
    },
    rawInput: { ...input },
    normalizedDomains: {
      Reading: readingRisk,
      Writing: writingRisk,
      Typing: typingRisk,
      Attention: attentionRisk,
    },
    featureVector: [
      ...Object.entries(reading).map(([key, value]) => ({ key: `reading.${key}`, value })),
      ...Object.entries(writing).map(([key, value]) => ({ key: `writing.${key}`, value })),
      ...Object.entries(typing).map(([key, value]) => ({ key: `typing.${key}`, value })),
    ],
    holderPayload: {
      targetFolder: 'data-process',
      status: 'dummy-holder-only',
      message: 'Replace this module with backend persistence and preprocessing.',
    },
    uploadedInputs: {
      audioFileName: input.audioFileName,
      audioSource: input.audioSource,
      audioMimeType: input.audioMimeType,
      hasAudioArtifact: Boolean(input.audioBlob || input.audioFile),
      handwritingFileName: input.handwritingFileName,
      handwritingSource: input.handwritingSource,
      handwritingMimeType: input.handwritingMimeType,
      hasHandwritingArtifact: Boolean(input.handwritingBlob || input.handwritingFile),
      typedCharacters: input.typedText.length,
      typingBackspaces: input.typingBackspaces,
      datasetStandIns: {
        reading: input.readingCase,
        writing: input.writingCase,
        typing: input.typingCase,
      },
    },
  };
}

export function buildMvpApiPayload(input) {
  const readingCase = getCase(input.readingCase);
  const writingCase = getCase(input.writingCase);
  const typingCase = getCase(input.typingCase);
  return {
    reading: { ...readingCase.reading },
    writing: { ...writingCase.writing },
    typing: { ...typingCase.typing },
  };
}

export function adaptMvpResponseToPrototype(processed, response) {
  const score = Math.round((response.overall_risk?.score || 0) * 100);
  const modalityScores = response.modality_scores || {};
  const profile = response.learning_profile || {};
  const comparison = response.baseline_comparison || {};

  const domainScores = {
    Reading: Math.round((modalityScores.reading || score / 100) * 100),
    Writing: Math.round((modalityScores.writing || score / 100) * 100),
    Typing: Math.round((modalityScores.typing || score / 100) * 100),
    Attention: processed.normalizedDomains.Attention,
  };

  const drivers = (response.top_contributing_factors || [])
    .slice(0, 4)
    .map((label, index) => ({ label, impact: clamp(86 - index * 13) }));

  return {
    modelName: 'src.mvp.api:/learning-profile',
    riskScore: score,
    riskLevel: response.overall_risk?.level || 'Moderate',
    confidence: Math.round((response.overall_risk?.confidence || 0.7) * 100),
    domainScores,
    drivers: drivers.length ? drivers : runDummyMlPrediction(processed).drivers,
    backend: {
      clinicalNote: response.clinical_note,
      recommendedModules: response.recommended_modules || [],
      learningProfile: profile,
      baselineComparison: comparison,
    },
  };
}

export function runDummyMlPrediction(processed) {
  const { Reading, Writing, Typing, Attention } = processed.normalizedDomains;
  const riskScore = clamp(Reading * 0.34 + Writing * 0.28 + Typing * 0.24 + Attention * 0.14);
  const riskLevel = riskScore >= 68 ? 'High' : riskScore >= 42 ? 'Moderate' : 'Low';
  const confidence = clamp(62 + Math.abs(riskScore - 50) * 0.45 + processed.featureVector.length * 1.4);

  const drivers = Object.entries(processed.normalizedDomains)
    .map(([label, impact]) => ({ label, impact }))
    .sort((a, b) => b.impact - a.impact);

  return {
    modelName: 'dummy-fusion-risk-v0',
    riskScore,
    riskLevel,
    confidence,
    domainScores: processed.normalizedDomains,
    drivers,
  };
}

export function getGeminiImprovementPlan(processed, prediction) {
  const topDrivers = prediction.drivers.slice(0, 3).map((driver) => driver.label.toLowerCase()).join(', ');

  return {
    provider: 'Gemini API placeholder',
    prompt: `Create a dyslexia support plan for ${processed.learner.name}. Main weak areas: ${topDrivers}. Notes: ${processed.learner.notes}`,
    modules: [
      {
        id: 'reading',
        title: 'Reading fluency',
        frequency: '15 min daily',
        summary: 'Short repeated-reading sessions with guided decoding and error awareness.',
        activities: ['Timed paired reading', 'Syllable chunking cards', 'High-frequency word sprint', 'Audio-assisted reread'],
        expectedLift: prediction.domainScores.Reading > 65 ? 18 : 11,
      },
      {
        id: 'writing',
        title: 'Writing clarity',
        frequency: '4 sessions/week',
        summary: 'Letter formation, reversal correction, and spelling pattern practice.',
        activities: ['b/d discrimination sheet', 'Trace-copy-recall drill', 'Word family sorting', 'One-minute spelling review'],
        expectedLift: prediction.domainScores.Writing > 65 ? 16 : 10,
      },
      {
        id: 'typing',
        title: 'Typing confidence',
        frequency: '10 min daily',
        summary: 'Low-pressure typing practice with accuracy-first feedback.',
        activities: ['Copy typing ladder', 'Backspace reduction goal', 'Keyboard rhythm practice', 'Accuracy streak challenge'],
        expectedLift: prediction.domainScores.Typing > 65 ? 14 : 8,
      },
      {
        id: 'attention',
        title: 'Focus routine',
        frequency: 'Before tasks',
        summary: 'Simple structure to reduce cognitive load before assessment tasks.',
        activities: ['Two-minute warmup', 'Task checklist', 'Break timer', 'Reflection note'],
        expectedLift: prediction.domainScores.Attention > 55 ? 10 : 6,
      },
    ],
  };
}

export function createPracticeAssessment(module, learnerName = 'the learner') {
  const banks = {
    reading: [
      { type: 'Decode', prompt: 'Read these aloud and tap the difficult one.', items: ['ship', 'chip', 'skip', 'brip'], answer: 'brip' },
      { type: 'Fluency', prompt: 'Read this sentence twice, then record time and errors.', items: ['The bright kite drifted above the quiet field.'], answer: 'Track WPM and missed words' },
      { type: 'Chunking', prompt: 'Break the word into syllables.', items: ['butterfly', 'remember', 'fantastic'], answer: 'but-ter-fly / re-mem-ber / fan-tas-tic' },
    ],
    writing: [
      { type: 'Reversal check', prompt: 'Choose the correctly formed letter in each pair.', items: ['b / d', 'p / q', 'm / w'], answer: 'Teacher marks direction accuracy' },
      { type: 'Trace-copy-recall', prompt: 'Trace once, copy once, then write from memory.', items: ['bed', 'dog', 'pin'], answer: 'Compare letter order and shape' },
      { type: 'Spelling pattern', prompt: 'Sort words by sound pattern.', items: ['cake', 'rain', 'play', 'cat'], answer: 'Long-a: cake, rain, play' },
    ],
    typing: [
      { type: 'Copy typing', prompt: 'Type the phrase with no backspaces first, then improve speed.', items: ['blue birds fly home'], answer: 'Measure accuracy before speed' },
      { type: 'Accuracy streak', prompt: 'Complete three perfect short lines.', items: ['red pen', 'big map', 'sun hat'], answer: 'Three correct lines' },
      { type: 'Correction awareness', prompt: 'Find and fix only the wrong word.', items: ['The cat sat on the mat', 'The cat sat on the map'], answer: 'mat' },
    ],
    attention: [
      { type: 'Warmup', prompt: 'Do a two-minute focus routine before practice.', items: ['Breathe', 'Read task', 'Start timer'], answer: 'Completed routine' },
      { type: 'Checklist', prompt: 'Mark each step before moving on.', items: ['Look', 'Say', 'Write', 'Check'], answer: 'All steps checked' },
      { type: 'Reflection', prompt: 'Pick one thing that felt easier today.', items: ['reading', 'writing', 'typing', 'focus'], answer: 'Learner reflection' },
    ],
  };

  const selectedBank = banks[module.id] || banks.reading;
  return {
    title: `${module.title} practice for ${learnerName}`,
    generatedBy: 'Gemini API placeholder',
    note: 'This is the real practice area in the UI. Replace this local generator with a backend Gemini call.',
    tasks: selectedBank,
  };
}

export function buildReevaluationForecast(prediction, plan, weeks) {
  const moduleLift = plan.modules.reduce((total, module) => total + module.expectedLift, 0) / plan.modules.length;
  const rows = [];

  for (let week = 0; week <= weeks; week += 1) {
    const progressRatio = weeks === 0 ? 1 : week / weeks;
    const projectedLift = moduleLift * progressRatio;
    rows.push({
      week: `W${week}`,
      riskScore: clamp(prediction.riskScore - projectedLift, 0, 100),
      skillScore: clamp(100 - prediction.riskScore + projectedLift * 1.25, 0, 100),
      confidence: clamp(prediction.confidence + progressRatio * 9, 0, 99),
    });
  }

  return rows;
}
