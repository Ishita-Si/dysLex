# Fusion MVP Model Evaluation

This MVP model is optimized for dyslexia risk screening. It is not a medical diagnostic system.

**Selected model:** logistic_regression
**Selected threshold:** 0.27

## Metrics

| Metric | Value |
| --- | ---: |
| accuracy | 0.8750 |
| precision | 0.8000 |
| recall | 1.0000 |
| specificity | 0.7500 |
| f1 | 0.8889 |
| f2 | 0.9524 |
| roc_auc | 0.9514 |
| false_negative | 0.0000 |

## Features

reading_probability, writing_probability, typing_probability

## Accountability

**Evidence level:** MVP prototype

**Data provenance:**

- real_component: Uses outputs from MVP unimodal models
- synthetic_component: Fusion labels and probabilities are MVP generated
- current_status: Integration prototype

**Known limitations:**

- Not clinically validated.
- Metrics are from MVP holdout data, not independent real-world validation.
- Synthetic data can overstate model reliability.
- Fusion quality depends entirely on the MVP unimodal probability estimates.

## Recall Priority

The selected threshold prioritizes recall first, then F2 score, then ROC-AUC. False negatives are tracked explicitly because missing an at-risk learner is the highest-risk screening failure.

## Important Prototype Factors

- Reading model probability
- Writing model probability
- Typing model probability
