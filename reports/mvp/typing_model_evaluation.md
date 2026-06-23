# Typing MVP Model Evaluation

This MVP model is optimized for dyslexia risk screening. It is not a medical diagnostic system.

**Selected model:** random_forest
**Selected threshold:** 0.20

## Metrics

| Metric | Value |
| --- | ---: |
| accuracy | 0.8542 |
| precision | 0.7742 |
| recall | 1.0000 |
| specificity | 0.7083 |
| f1 | 0.8727 |
| f2 | 0.9449 |
| roc_auc | 0.9462 |
| false_negative | 0.0000 |

## Features

mean_hold_time_ms, mean_flight_time_ms, pause_rate, backspace_rate, typing_speed_wpm, latency_variability_ms

## Recall Priority

The selected threshold prioritizes recall first, then F2 score, then ROC-AUC. False negatives are tracked explicitly because missing an at-risk learner is the highest-risk screening failure.

## Important Prototype Factors

- Longer pauses while typing
- Frequent typing corrections
- Higher keystroke latency variation
