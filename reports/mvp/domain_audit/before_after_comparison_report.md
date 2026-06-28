# Before vs After Domain-Shift Fix Report

## Before

- Inference accepted feature values without a dedicated validation/sanity layer.
- Baseline reference lacked normal operating ranges for dashboard warnings.
- No automated domain-shift audit or real-validation threshold-search deliverable existed.

## After

- Added feature validation with missing/non-finite imputation to reference means and out-of-range warnings.
- Regenerated baseline reference with normal ranges, percentiles, min/max, mean, median, and standard deviation.
- Added automated schema audit, distribution plots, threshold-search scaffolding, and calibration reporting.

## Threshold status

- **reading**: `{'status': 'skipped_missing_artifacts', 'model_path': '/workspace/dysLex/models/mvp/reading_model.pkl', 'metadata_path': '/workspace/dysLex/models/mvp/reading_threshold.json'}`
- **writing**: `{'status': 'skipped_missing_artifacts', 'model_path': '/workspace/dysLex/models/mvp/writing_model.pkl', 'metadata_path': '/workspace/dysLex/models/mvp/writing_threshold.json'}`
- **typing**: `{'status': 'skipped_missing_artifacts', 'model_path': '/workspace/dysLex/models/mvp/typing_model.pkl', 'metadata_path': '/workspace/dysLex/models/mvp/typing_threshold.json'}`
- **fusion**: `{'status': 'skipped_missing_artifacts', 'model_path': '/workspace/dysLex/models/mvp/fusion_model.pkl', 'metadata_path': '/workspace/dysLex/models/mvp/fusion_threshold.json'}`

## Domain adaptation decision

The repository currently contains real-anchor rows only for reading and synthetic-only processed rows for writing and typing. Because trained model artifacts and sufficient real validation rows are not committed in this workspace, the minimum safe fix is to add domain-shift detection and inference-time validation rather than blindly retraining or fitting calibrators. When real validation artifacts are present, `python -m src.mvp.domain_audit` will run threshold search and save real-data threshold candidates.