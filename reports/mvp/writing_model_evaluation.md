# Writing MVP Model Evaluation

This MVP model is optimized for dyslexia risk screening. It is not a medical diagnostic system.

**Selected model:** logistic_regression
**Selected threshold:** 0.09

## Metrics

| Metric | Value |
| --- | ---: |
| accuracy | 0.8958 |
| precision | 0.8276 |
| recall | 1.0000 |
| specificity | 0.7917 |
| f1 | 0.9057 |
| f2 | 0.9600 |
| roc_auc | 0.9757 |
| false_negative | 0.0000 |

## Features

stroke_irregularity, letter_spacing_variance, baseline_drift, letter_reversal_count, word_alignment_error, pressure_variability

## Recall Priority

The selected threshold prioritizes recall first, then F2 score, then ROC-AUC. False negatives are tracked explicitly because missing an at-risk learner is the highest-risk screening failure.

## Important Prototype Factors

- Irregular handwriting stroke patterns
- Higher letter reversal count
- Unstable baseline alignment
