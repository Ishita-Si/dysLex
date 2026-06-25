# Training-Inference Distribution Mismatch Audit

## Schema and preprocessing audit

### writing
- Feature order matches inference schema: `True`
- Missing from inference: `[]`
- Missing from training: `[]`
- Missing values in training: `{'stroke_irregularity': 0, 'letter_spacing_variance': 0, 'baseline_drift': 0, 'letter_reversal_count': 0, 'word_alignment_error': 0, 'pressure_variability': 0}`

### typing
- Feature order matches inference schema: `True`
- Missing from inference: `[]`
- Missing from training: `[]`
- Missing values in training: `{'mean_hold_time_ms': 0, 'mean_flight_time_ms': 0, 'pause_rate': 0, 'backspace_rate': 0, 'typing_speed_wpm': 0, 'latency_variability_ms': 0}`

### reading
- Feature order matches inference schema: `True`
- Missing from inference: `[]`
- Missing from training: `[]`
- Missing values in training: `{'fixation_duration_mean': 0, 'fixation_duration_std': 0, 'fixation_count': 0, 'saccade_length_mean': 0, 'saccade_velocity_mean': 0, 'regression_count': 0, 'reading_time_seconds': 0, 'blink_rate': 0}`

## Distribution shift findings

Flagged feature count: **12**

### reading / fixation_duration_mean
- Counts: synthetic=170, real_training=70, inference_proxy=3
- Synthetic summary: `{'mean': 264.134914, 'median': 263.292168, 'std': 57.012184, 'min': 34.337295, 'p05': 178.11656, 'p25': 229.337766, 'p75': 301.776039, 'p95': 359.471143, 'max': 439.506597}`
- Real-training summary: `{'mean': 263.149549, 'median': 269.373022, 'std': 50.575317, 'min': 163.380127, 'p05': 187.54112, 'p25': 219.413136, 'p75': 296.236554, 'p95': 343.116301, 'max': 402.790618}`
- Inference-proxy summary: `{'mean': 273.333333, 'median': 270.0, 'std': 53.124592, 'min': 210.0, 'p05': 216.0, 'p25': 240.0, 'p75': 305.0, 'p95': 333.0, 'max': 340.0}`
- KS synthetic vs real: `{'statistic': 0.068908, 'pvalue': 0.95767}`
- KS training vs inference proxy: `{'statistic': 0.254167, 'pvalue': 0.970821}`
- Shift flag: `False`

### reading / fixation_duration_std
- Counts: synthetic=170, real_training=70, inference_proxy=3
- Synthetic summary: `{'mean': 69.118625, 'median': 69.573915, 'std': 24.978674, 'min': 4.648953, 'p05': 26.556024, 'p25': 51.659437, 'p75': 88.123872, 'p95': 111.515571, 'max': 127.091146}`
- Real-training summary: `{'mean': 67.240228, 'median': 68.420191, 'std': 24.487575, 'min': 19.191308, 'p05': 30.133045, 'p25': 49.366503, 'p75': 84.871589, 'p95': 102.733256, 'max': 149.018837}`
- Inference-proxy summary: `{'mean': 80.666667, 'median': 76.0, 'std': 28.767265, 'min': 48.0, 'p05': 50.8, 'p25': 62.0, 'p75': 97.0, 'p95': 113.8, 'max': 118.0}`
- KS synthetic vs real: `{'statistic': 0.088235, 'pvalue': 0.798417}`
- KS training vs inference proxy: `{'statistic': 0.320833, 'pvalue': 0.835305}`
- Shift flag: `False`

### reading / fixation_count
- Counts: synthetic=170, real_training=70, inference_proxy=3
- Synthetic summary: `{'mean': 102.061743, 'median': 101.916394, 'std': 30.527769, 'min': 13.153911, 'p05': 50.900719, 'p25': 83.683494, 'p75': 121.832324, 'p95': 149.825759, 'max': 185.479384}`
- Real-training summary: `{'mean': 100.794034, 'median': 99.375083, 'std': 27.268984, 'min': 36.695525, 'p05': 60.309304, 'p25': 83.141639, 'p75': 123.440574, 'p95': 141.74157, 'max': 170.340213}`
- Inference-proxy summary: `{'mean': 110.333333, 'median': 108.0, 'std': 27.402352, 'min': 78.0, 'p05': 81.0, 'p25': 93.0, 'p75': 126.5, 'p95': 141.3, 'max': 145.0}`
- KS synthetic vs real: `{'statistic': 0.092437, 'pvalue': 0.751663}`
- KS training vs inference proxy: `{'statistic': 0.2625, 'pvalue': 0.961421}`
- Shift flag: `False`

### reading / saccade_length_mean
- Counts: synthetic=170, real_training=70, inference_proxy=3
- Synthetic summary: `{'mean': 6.38715, 'median': 6.48415, 'std': 1.882132, 'min': 2.271021, 'p05': 3.464753, 'p25': 4.864989, 'p75': 7.841162, 'p95': 9.406627, 'max': 11.253826}`
- Real-training summary: `{'mean': 6.623404, 'median': 6.295243, 'std': 2.02941, 'min': 2.249609, 'p05': 3.800011, 'p25': 5.417452, 'p75': 7.926464, 'p95': 10.313382, 'max': 12.238614}`
- Inference-proxy summary: `{'mean': 6.4, 'median': 6.2, 'std': 1.39523, 'min': 4.8, 'p05': 4.94, 'p25': 5.5, 'p75': 7.2, 'p95': 8.0, 'max': 8.2}`
- KS synthetic vs real: `{'statistic': 0.108403, 'pvalue': 0.563389}`
- KS training vs inference proxy: `{'statistic': 0.220833, 'pvalue': 0.993385}`
- Shift flag: `False`

### reading / saccade_velocity_mean
- Counts: synthetic=170, real_training=70, inference_proxy=3
- Synthetic summary: `{'mean': 27.861017, 'median': 27.360263, 'std': 7.646332, 'min': 9.101245, 'p05': 16.369243, 'p25': 22.26165, 'p75': 32.456593, 'p95': 40.639648, 'max': 51.399713}`
- Real-training summary: `{'mean': 28.744215, 'median': 29.657373, 'std': 7.566536, 'min': 9.960973, 'p05': 16.974368, 'p25': 23.7201, 'p75': 34.110015, 'p95': 41.982777, 'max': 43.207542}`
- Inference-proxy summary: `{'mean': 27.0, 'median': 27.0, 'std': 6.531973, 'min': 19.0, 'p05': 19.8, 'p25': 23.0, 'p75': 31.0, 'p95': 34.2, 'max': 35.0}`
- KS synthetic vs real: `{'statistic': 0.152941, 'pvalue': 0.175553}`
- KS training vs inference proxy: `{'statistic': 0.216667, 'pvalue': 0.994849}`
- Shift flag: `False`

### reading / regression_count
- Counts: synthetic=170, real_training=70, inference_proxy=3
- Synthetic summary: `{'mean': 8.5, 'median': 8.0, 'std': 3.401124, 'min': 1.0, 'p05': 4.0, 'p25': 6.0, 'p75': 11.0, 'p95': 14.0, 'max': 18.0}`
- Real-training summary: `{'mean': 8.485714, 'median': 9.0, 'std': 3.608493, 'min': 2.0, 'p05': 3.0, 'p25': 6.0, 'p75': 10.0, 'p95': 15.0, 'max': 16.0}`
- Inference-proxy summary: `{'mean': 10.0, 'median': 9.0, 'std': 5.354126, 'min': 4.0, 'p05': 4.5, 'p25': 6.5, 'p75': 13.0, 'p95': 16.2, 'max': 17.0}`
- KS synthetic vs real: `{'statistic': 0.071429, 'pvalue': 0.943905}`
- KS training vs inference proxy: `{'statistic': 0.320833, 'pvalue': 0.835305}`
- Shift flag: `False`

### reading / reading_time_seconds
- Counts: synthetic=170, real_training=70, inference_proxy=3
- Synthetic summary: `{'mean': 84.271299, 'median': 83.315175, 'std': 25.402967, 'min': 27.323559, 'p05': 44.176689, 'p25': 65.655956, 'p75': 99.78833, 'p95': 125.793329, 'max': 154.997847}`
- Real-training summary: `{'mean': 81.466712, 'median': 85.27648, 'std': 24.239643, 'min': 19.262292, 'p05': 39.084524, 'p25': 68.712963, 'p75': 96.721995, 'p95': 115.052397, 'max': 139.142269}`
- Inference-proxy summary: `{'mean': 95.333333, 'median': 92.0, 'std': 28.674418, 'min': 62.0, 'p05': 65.0, 'p25': 77.0, 'p75': 112.0, 'p95': 128.0, 'max': 132.0}`
- KS synthetic vs real: `{'statistic': 0.098319, 'pvalue': 0.682845}`
- KS training vs inference proxy: `{'statistic': 0.3125, 'pvalue': 0.860922}`
- Shift flag: `False`

### reading / blink_rate
- Counts: synthetic=170, real_training=70, inference_proxy=3
- Synthetic summary: `{'mean': 0.162733, 'median': 0.162361, 'std': 0.067325, 'min': 0.0, 'p05': 0.057124, 'p25': 0.109334, 'p75': 0.207674, 'p95': 0.263476, 'max': 0.363572}`
- Real-training summary: `{'mean': 0.166989, 'median': 0.171522, 'std': 0.056289, 'min': 0.061841, 'p05': 0.073617, 'p25': 0.126765, 'p75': 0.203354, 'p95': 0.259329, 'max': 0.287854}`
- Inference-proxy summary: `{'mean': 0.176667, 'median': 0.17, 'std': 0.057349, 'min': 0.11, 'p05': 0.116, 'p25': 0.14, 'p75': 0.21, 'p95': 0.242, 'max': 0.25}`
- KS synthetic vs real: `{'statistic': 0.106723, 'pvalue': 0.583164}`
- KS training vs inference proxy: `{'statistic': 0.2375, 'pvalue': 0.984786}`
- Shift flag: `False`

### writing / stroke_irregularity
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 0.469024, 'median': 0.473629, 'std': 0.174349, 'min': 0.0, 'p05': 0.174529, 'p25': 0.335363, 'p75': 0.603255, 'p95': 0.733415, 'max': 0.980765}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 0.5, 'median': 0.5, 'std': 0.228619, 'min': 0.22, 'p05': 0.248, 'p25': 0.36, 'p75': 0.64, 'p95': 0.752, 'max': 0.78}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.316667, 'pvalue': 0.848474}`
- Shift flag: `True`

### writing / letter_spacing_variance
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 0.440894, 'median': 0.439727, 'std': 0.178608, 'min': 0.02075, 'p05': 0.134613, 'p25': 0.317031, 'p75': 0.586234, 'p95': 0.723483, 'max': 0.818945}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 0.463333, 'median': 0.45, 'std': 0.220656, 'min': 0.2, 'p05': 0.225, 'p25': 0.325, 'p75': 0.595, 'p95': 0.711, 'max': 0.74}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.304167, 'pvalue': 0.883734}`
- Shift flag: `True`

### writing / baseline_drift
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 0.377688, 'median': 0.377246, 'std': 0.167601, 'min': 0.0, 'p05': 0.108841, 'p25': 0.264964, 'p75': 0.482577, 'p95': 0.671462, 'max': 0.847708}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 0.416667, 'median': 0.42, 'std': 0.216384, 'min': 0.15, 'p05': 0.177, 'p25': 0.285, 'p75': 0.55, 'p95': 0.654, 'max': 0.68}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.291667, 'pvalue': 0.91305}`
- Shift flag: `True`

### writing / letter_reversal_count
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 1.183333, 'median': 1.0, 'std': 1.2075, 'min': 0.0, 'p05': 0.0, 'p25': 0.0, 'p75': 2.0, 'p95': 4.0, 'max': 6.0}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 2.333333, 'median': 2.0, 'std': 2.054805, 'min': 0.0, 'p05': 0.2, 'p25': 1.0, 'p75': 3.5, 'p95': 4.7, 'max': 5.0}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.370833, 'pvalue': 0.684964}`
- Shift flag: `True`

### writing / word_alignment_error
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 0.325468, 'median': 0.31894, 'std': 0.153685, 'min': 0.0, 'p05': 0.061343, 'p25': 0.221631, 'p75': 0.44048, 'p95': 0.57702, 'max': 0.755068}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 0.373333, 'median': 0.36, 'std': 0.196186, 'min': 0.14, 'p05': 0.162, 'p25': 0.25, 'p75': 0.49, 'p95': 0.594, 'max': 0.62}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.3125, 'pvalue': 0.860922}`
- Shift flag: `True`

### writing / pressure_variability
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 0.406426, 'median': 0.401763, 'std': 0.167545, 'min': 0.0, 'p05': 0.134533, 'p25': 0.29068, 'p75': 0.519415, 'p95': 0.678837, 'max': 0.910046}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 0.48, 'median': 0.48, 'std': 0.195959, 'min': 0.24, 'p05': 0.264, 'p25': 0.36, 'p75': 0.6, 'p95': 0.696, 'max': 0.72}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.341667, 'pvalue': 0.763933}`
- Shift flag: `True`

### typing / mean_hold_time_ms
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 110.198093, 'median': 112.524709, 'std': 24.849927, 'min': 53.925879, 'p05': 67.810688, 'p25': 93.685362, 'p75': 124.569203, 'p95': 149.657441, 'max': 193.3077}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 117.333333, 'median': 118.0, 'std': 28.581268, 'min': 82.0, 'p05': 85.6, 'p25': 100.0, 'p75': 135.0, 'p95': 148.6, 'max': 152.0}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.291667, 'pvalue': 0.91305}`
- Shift flag: `True`

### typing / mean_flight_time_ms
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 149.938397, 'median': 150.231381, 'std': 38.221484, 'min': 49.945279, 'p05': 89.287707, 'p25': 123.67808, 'p75': 175.408947, 'p95': 215.271563, 'max': 247.53405}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 164.333333, 'median': 158.0, 'std': 51.227163, 'min': 105.0, 'p05': 110.3, 'p25': 131.5, 'p75': 194.0, 'p95': 222.8, 'max': 230.0}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.316667, 'pvalue': 0.848474}`
- Shift flag: `True`

### typing / pause_rate
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 0.182383, 'median': 0.176336, 'std': 0.086126, 'min': 0.0, 'p05': 0.023786, 'p25': 0.128786, 'p75': 0.247133, 'p95': 0.323882, 'max': 0.409923}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 0.21, 'median': 0.2, 'std': 0.118603, 'min': 0.07, 'p05': 0.083, 'p25': 0.135, 'p75': 0.28, 'p95': 0.344, 'max': 0.36}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.320833, 'pvalue': 0.835305}`
- Shift flag: `True`

### typing / backspace_rate
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 0.10915, 'median': 0.111663, 'std': 0.056877, 'min': 0.0, 'p05': 0.011827, 'p25': 0.06451, 'p75': 0.150723, 'p95': 0.197193, 'max': 0.25239}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 0.12, 'median': 0.11, 'std': 0.077889, 'min': 0.03, 'p05': 0.038, 'p25': 0.07, 'p75': 0.165, 'p95': 0.209, 'max': 0.22}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.308333, 'pvalue': 0.872668}`
- Shift flag: `True`

### typing / typing_speed_wpm
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 35.252005, 'median': 35.67733, 'std': 9.471229, 'min': 7.11342, 'p05': 19.405183, 'p25': 28.841179, 'p75': 41.79359, 'p95': 50.310293, 'max': 56.750231}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 34.333333, 'median': 33.0, 'std': 11.469767, 'min': 21.0, 'p05': 22.2, 'p25': 27.0, 'p75': 41.0, 'p95': 47.4, 'max': 49.0}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.270833, 'pvalue': 0.950192}`
- Shift flag: `True`

### typing / latency_variability_ms
- Counts: synthetic=240, real_training=0, inference_proxy=3
- Synthetic summary: `{'mean': 62.713639, 'median': 62.610561, 'std': 25.524848, 'min': 0.0, 'p05': 19.785331, 'p25': 46.762919, 'p75': 79.53661, 'p95': 105.86022, 'max': 140.241488}`
- Real-training summary: `{'mean': None, 'median': None, 'std': None, 'min': None, 'p05': None, 'p25': None, 'p75': None, 'p95': None, 'max': None}`
- Inference-proxy summary: `{'mean': 73.333333, 'median': 70.0, 'std': 35.188382, 'min': 32.0, 'p05': 35.8, 'p25': 51.0, 'p75': 94.0, 'p95': 113.2, 'max': 118.0}`
- KS synthetic vs real: `{'statistic': None, 'pvalue': None}`
- KS training vs inference proxy: `{'statistic': 0.320833, 'pvalue': 0.835305}`
- Shift flag: `True`

## Baseline reference

Baseline feature count: **23**

Plots are saved in `reports/figures/mvp/domain_audit/`.