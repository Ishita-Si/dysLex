# Reading MVP Model Evaluation

This MVP model is optimized for dyslexia risk screening. It is not a medical diagnostic system.

**Selected model:** random_forest
**Selected threshold:** 0.11

## Metrics

| Metric | Value |
| --- | ---: |
| accuracy | 0.6042 |
| precision | 0.5581 |
| recall | 1.0000 |
| specificity | 0.2083 |
| f1 | 0.7164 |
| f2 | 0.8633 |
| roc_auc | 0.9618 |
| false_negative | 0.0000 |

## Features

fixation_duration_mean, fixation_duration_std, fixation_count, saccade_length_mean, saccade_velocity_mean, regression_count, reading_time_seconds, blink_rate

## Recall Priority

The selected threshold prioritizes recall first, then F2 score, then ROC-AUC. False negatives are tracked explicitly because missing an at-risk learner is the highest-risk screening failure.

## Important Prototype Factors

- Longer visual fixation on words
- Frequent regressions during reading
- Slower reading time
