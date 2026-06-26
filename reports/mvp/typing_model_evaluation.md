# Typing MVP Model Evaluation

This MVP model is optimized for dyslexia risk screening. It is not a medical diagnostic system.

**Selected model:** calibrated_random_forest
**Selected threshold:** 0.11

## Metrics

| Metric | Value |
| --- | ---: |
| accuracy | 0.8542 |
| precision | 0.7742 |
| recall | 1.0000 |
| specificity | 0.7083 |
| f1 | 0.8727 |
| f2 | 0.9449 |
| roc_auc | 0.9514 |
| false_negative | 0.0000 |

## Features

mean_hold_time_ms, mean_flight_time_ms, pause_rate, backspace_rate, typing_speed_wpm, latency_variability_ms

## Accountability

**Evidence level:** MVP prototype

**Data provenance:**

- real_component: No real typing dataset currently available in workspace
- synthetic_component: Generated realistic typing behavior features
- current_status: Synthetic-only MVP proxy

**Known limitations:**

- Not clinically validated.
- Metrics are from MVP holdout data, not independent real-world validation.
- Synthetic data can overstate model reliability.
- No real typing dataset has been integrated yet.

## Recall Priority

The selected threshold prioritizes recall first, then F2 score, then ROC-AUC. False negatives are tracked explicitly because missing an at-risk learner is the highest-risk screening failure.

## Important Prototype Factors

- Longer pauses while typing
- Frequent typing corrections
- Higher keystroke latency variation
