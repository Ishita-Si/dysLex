# DysLexAI MVP Accountability Report

This report explains what the MVP can and cannot claim.

## Accountability Position

DysLexAI MVP is a working screening workflow prototype. It is not clinically validated and must not be used for diagnosis, school placement, treatment decisions, or standalone eligibility screening.

## Data Provenance

| Modality | Real Data | Synthetic Data | Notes |
| --- | --- | --- | --- |
| Reading | ETDD70 labels from `dyslexia_class_label.csv` | Realistic generated reading features | Real labels anchor class balance; raw gaze feature extraction is future work. |
| Writing | Archive present but encrypted RAR not extracted locally | Realistic generated handwriting features | Password is known, but local extractor cannot decrypt RAR. |
| Typing | No real typing dataset currently placed | Realistic generated typing features | Replace when real keystroke data is available. |
| Fusion | Unimodal model probabilities | Probability-level fusion examples | Fusion tests integration, not clinical validity. |

## Model Cards

### Reading

- Selected model: `random_forest`
- Threshold: `0.11`
- Recall: `1.000`
- F2 score: `0.863`
- ROC-AUC: `0.962`
- False negatives on MVP holdout: `0`
- Intended use: demo and engineering validation
- Not intended use: medical diagnosis or formal educational decision-making

### Writing

- Selected model: `logistic_regression`
- Threshold: `0.09`
- Recall: `1.000`
- F2 score: `0.960`
- ROC-AUC: `0.976`
- False negatives on MVP holdout: `0`
- Intended use: demo and engineering validation
- Not intended use: medical diagnosis or formal educational decision-making

### Typing

- Selected model: `calibrated_random_forest`
- Threshold: `0.11`
- Recall: `1.000`
- F2 score: `0.945`
- ROC-AUC: `0.951`
- False negatives on MVP holdout: `0`
- Intended use: demo and engineering validation
- Not intended use: medical diagnosis or formal educational decision-making

### Fusion

- Selected model: `logistic_regression`
- Threshold: `0.27`
- Recall: `1.000`
- F2 score: `0.952`
- ROC-AUC: `0.951`
- False negatives on MVP holdout: `0`
- Intended use: demo and engineering validation
- Not intended use: medical diagnosis or formal educational decision-making

## What To Say If Asked About Accountability

The honest answer is: this MVP proves the pipeline works, shows recall-first thresholding, exposes model decisions in human-readable terms, and documents synthetic-data limitations. It does not prove real-world dyslexia detection performance yet.

## Next Validation Steps

1. Extract real handwriting data with WinRAR or 7-Zip.
2. Add a real typing dataset.
3. Replace synthetic features with real extracted features.
4. Evaluate on participant-level splits to avoid leakage.
5. Report confidence intervals and subgroup performance.
