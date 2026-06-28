# DysLexAI

DysLexAI is an MVP dyslexia risk-screening prototype. It combines reading behavior, handwriting behavior, and typing behavior signals into recall-first risk assessments.

Important: DysLexAI is a screening and support tool. It is not a medical diagnostic system.

## Current Focus

The current implementation prioritizes a working end-to-end MVP pipeline .

It trains lightweight tabular models for:

- Reading risk
- Writing risk
- Typing risk
- Multimodal fusion risk

The model-selection priority is:

1. Recall
2. F2 score
3. ROC-AUC
4. Accuracy

False negatives are treated as the highest-risk screening failure.

## Project Structure

```text
DysLexAI/
|-- datasets/
|   |-- reading/
|   |-- writing/
|   |-- typing/
|   |-- processed/
|   `-- manual_tests/
|-- src/
|   |-- mvp/
|   |   |-- api.py
|   |   |-- manual_tests.py
|   |   |-- synthetic_data.py
|   |   `-- training.py
|   |-- reading_model/
|   |-- writing_model/
|   |-- typing_model/
|   |-- utils/
|   |-- run_mvp.py
|   `-- run_phase1.py
|-- reports/
|   |-- mvp/
|   `-- figures/
|-- models/
|   `-- mvp/
|-- requirements.txt
`-- environment.yml
```

## Data Strategy

For speed, the MVP uses compact realistic feature tables:

- Reading: real ETDD70 labels as anchors plus synthetic realistic reading features
- Writing: synthetic realistic handwriting features
- Typing: synthetic realistic typing behavior features
- Fusion: selected features from all three modalities

The writing archive password is `WanAsy321`, but the local Windows `tar` extractor cannot decrypt encrypted RAR files. Use WinRAR or 7-Zip later if you want to extract the real handwriting images.

Synthetic data is used only to build and validate the MVP workflow. Reported metrics are prototype metrics, not clinical performance claims.

## Dataset Placement Instructions

Place the ETDD70 Eye Tracking Dataset files in:

```text
datasets/reading/
```

Place the Synthetic Dyslexia Handwriting Dataset in class-named folders:

```text
datasets/writing/<class_name>/
```

Place the Typing Fluencies of Dyslexia Students and Peers dataset files in:

```text
datasets/typing/
```

Supported reading and typing formats include CSV, TSV, Excel, and JSON. Supported handwriting formats include PNG, JPG, JPEG, BMP, TIF, and TIFF.

## How To Run Validation

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the complete Phase 1 workflow:

```bash
python -m src.run_phase1
```

The command runs file validation, tabular validation, image validation, exploratory analysis, and markdown report generation.

## How To Generate Reports

Reports are generated automatically by:

```bash
python -m src.run_phase1
```

Generated reports:

- `reports/validation_report.md`
- `reports/dataset_overview.md`
- `reports/research_journal.md`

Generated figures:

- `reports/figures/reading/`
- `reports/figures/writing/`
- `reports/figures/typing/`

## Expected Outputs

The Phase 1 pipeline produces:

- Dataset validation warnings for missing, empty, duplicated, corrupted, mislabeled, imbalanced, null, or range-invalid data.
- EDA summaries for reading, writing, and typing datasets.
- Research-grade markdown documentation with natural-language observations.
- Placeholder figures when datasets have not yet been placed.


## Phase 2.5 Detection Intelligence Layer

Phase 2.5 turns trained model probabilities into a complete inference response for dashboards and downstream intervention systems. It does **not** retrain models. Instead, it loads the existing trained reading, writing, typing, and fusion model artifacts from `models/mvp/`.

The intelligence layer now generates:

- reading, writing, typing, and fused risk probabilities
- overall risk level and confidence
- modality severity scores
- non-dyslexic reference-baseline comparison
- rule-based learning weaknesses
- learning-profile dimensions
- plain-English top contributing factors
- intervention category identifiers only, not exercises

Generate or refresh the non-dyslexic reference baseline from processed feature tables:

```bash
python -m src.mvp.intelligence
```

This writes:

```text
models/mvp/baseline_reference.json
```

The baseline contains the mean, median, and standard deviation for every numeric feature among rows with `label == 0`.

Start the API after trained model artifacts exist:

```bash
uvicorn src.mvp.api:app --reload
```

Phase 2.5 endpoints:

- `POST /predict-full` returns the complete learning-profile response.
- `POST /learning-profile` is an explicit alias for dashboard and intervention consumers.
- `POST /baseline-reference/regenerate` recalculates `baseline_reference.json` from processed data.

The final response shape is:

```json
{
  "overall_risk": {
    "score": 0.84,
    "level": "High",
    "confidence": 0.91
  },
  "modality_scores": {
    "reading": 0.88,
    "writing": 0.74,
    "typing": 0.69
  },
  "baseline_comparison": {
    "reading_time_seconds": {
      "user": 110,
      "reference_mean": 74.13,
      "difference": 35.87,
      "severity": "Moderate"
    }
  },
  "learning_profile": {
    "reading_fluency": "High",
    "letter_reversal": "Moderate",
    "spelling_accuracy": "Moderate",
    "typing_accuracy": "Low",
    "phonological_processing": "High"
  },
  "top_contributing_factors": [
    "Reading completion time is above the reference baseline."
  ],
  "recommended_modules": [
    "reading_fluency_training",
    "letter_reversal_training",
    "phonics_training"
  ]
}
```

See `reports/detection_intelligence_layer.md` for implementation details.

## Future Development Roadmap

1. Add real datasets and rerun Phase 1 validation.
2. Freeze dataset schemas and cleaning rules.
3. Implement Phase 2 feature engineering for reading, writing, and typing.
4. Train baseline unimodal models only after data quality checks pass.
5. Compare multimodal fusion strategies.
6. Add explainability with SHAP and user-facing reports.
7. Build a FastAPI backend and frontend screening interface.

## MVP Training Pipeline

The MVP pipeline trains quick, recall-first screening models for reading,
writing, typing, and multimodal fusion using compact real-anchored and
synthetic realistic features.

Run:

```bash
python -m src.run_mvp
```

Outputs:

- `datasets/processed/mvp_reading_features.csv`
- `datasets/processed/mvp_writing_features.csv`
- `datasets/processed/mvp_typing_features.csv`
- `datasets/processed/mvp_multimodal_features.csv`
- `datasets/manual_tests/*_manual_tests.csv`
- `datasets/manual_tests/*_payloads.json`
- `models/mvp/*_model.pkl`
- `models/mvp/*_threshold.json`
- `reports/mvp/model_comparison.md`
- `reports/figures/mvp/`

Start the MVP API after training:

```bash
uvicorn src.mvp.api:app --reload
```

Available endpoints:

- `POST /predict-reading`
- `POST /predict-writing`
- `POST /predict-typing`
- `POST /predict-fusion`
- `POST /predict-full`

Open the demo frontend after starting the API:

```text
frontend/index.html
```

MVP note: writing and typing features are synthetic realistic features until
extractable real datasets are available. The MVP is for screening workflow
development and is not a diagnostic system.

Manual test payloads are available in:

```text
datasets/manual_tests/
```

Each modality has low-risk, moderate-risk, and high-risk examples.


cited ASSOCIATED PAPER:

M. S. A. B. Rosli, I. S. Isa, S. A. Ramlan, S. N. Sulaiman and M. I. F. Maruzuki, "Development of CNN Transfer Learning for Dyslexia Handwriting Recognition," 2021 11th IEEE International Conference on Control System, Computing and Engineering (ICCSCE), 2021, pp. 194-199, doi: 10.1109/ICCSCE52189.2021.9530971.
N. S. L. Seman, I. S. Isa, S. A. Ramlan, W. Li-Chih and M. I. F. Maruzuki, "Notice of Removal: Classification of Handwriting Impairment Using CNN for Potential Dyslexia Symptom," 2021 11th IEEE International Conference on Control System, Computing and Engineering (ICCSCE), 2021, pp. 188-193, doi: 10.1109/ICCSCE52189.2021.9530989.
Isa, Iza Sazanita. CNN Comparisons Models On Dyslexia Handwriting Classification / Iza Sazanita Isa … [et Al.]. Universiti Teknologi MARA Cawangan Pulau Pinang, 2021.
Isa, I. S., Rahimi, W. N. S., Ramlan, S. A., & Sulaiman, S. N. (2019). Automated detection of dyslexia symptom based on handwriting image for primary school children. Procedia Computer Science, 163, 440-449.
Sedmidubsky, J., Dostalova, N., Svaricek, R., & Culemann, W. (2024). ETDD70: Eye-tracking dataset for classification of dyslexia using AI-based methods. In Proceedings of the 17th International Conference on Similarity Search and Applications (SISAP) (pp. 1-14). Springer.

CITED DATASET

Dostalova, N., Svaricek, R., Sedmidubsky, J., Culemann, W., Sasinka, C., Zezula, P., & Cenek, J. (2024). ETDD70: Eye-tracking Dyslexia Dataset [Data set]. Zenodo. https://doi.org/10.5281/zenodo.13332134
 

