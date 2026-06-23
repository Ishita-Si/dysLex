# DysLexAI MVP Model Comparison

This MVP uses compact real-anchored and synthetic realistic tabular features to validate the end-to-end screening pipeline quickly. Results are prototype metrics and must not be interpreted as clinical performance.

## Generated Datasets

- Reading: `D:\dysLex\datasets\processed\mvp_reading_features.csv`
- Writing: `D:\dysLex\datasets\processed\mvp_writing_features.csv`
- Typing: `D:\dysLex\datasets\processed\mvp_typing_features.csv`
- Fusion: `D:\dysLex\datasets\processed\mvp_multimodal_features.csv`

## Model Comparison

| Modality | Model | Threshold | Accuracy | Precision | Recall | Specificity | F1 | F2 | ROC-AUC | False Negatives |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| reading | random_forest | 0.11 | 0.604 | 0.558 | 1.000 | 0.208 | 0.716 | 0.863 | 0.962 | 0 |
| writing | logistic_regression | 0.09 | 0.896 | 0.828 | 1.000 | 0.792 | 0.906 | 0.960 | 0.976 | 0 |
| typing | random_forest | 0.20 | 0.854 | 0.774 | 1.000 | 0.708 | 0.873 | 0.945 | 0.946 | 0 |
| fusion | logistic_regression | 0.42 | 0.896 | 0.828 | 1.000 | 0.792 | 0.906 | 0.960 | 0.950 | 0 |

## Selection Rule

Models and thresholds are selected by Recall first, F2 score second, ROC-AUC third, and Accuracy last.

## MVP Data Note

The reading dataset uses real ETDD70 labels as anchors plus synthetic realistic features. Writing and typing use synthetic realistic features until extracted real datasets are available. The fusion model uses the three unimodal model probabilities as its input features. The writing archive password provided is `WanAsy321`, but the local extractor cannot decrypt encrypted RAR files.
