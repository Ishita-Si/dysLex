"""
src/processing/writing_features.py
====================================
Extract handwriting behavior features from a canvas-drawn image.

Input
-----
A base64-encoded PNG string from the browser canvas element.

Output
------
A dict with exactly the 6 features the writing MVP model expects:
    stroke_irregularity
    letter_spacing_variance
    baseline_drift
    letter_reversal_count
    word_alignment_error
    pressure_variability

Prototype note
--------------
Features are derived from OpenCV contour and connected-component
analysis on a binary canvas image. The dataset (Gambo) provides
labelled reference images for testing but is not used at runtime.
"""

from __future__ import annotations

import base64
import math
from typing import Dict, List

import cv2
import numpy as np


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MIN_COMPONENT_AREA = 20       # ignore noise blobs smaller than this
FLIP_SIMILARITY_THRESHOLD = 0.85  # cosine similarity for reversal detection


# ---------------------------------------------------------------------------
# Public function
# ---------------------------------------------------------------------------

def extract_writing_features(image_b64: str) -> Dict[str, float]:
    """Extract 6 writing behavior features from a base64 canvas image.

    Parameters
    ----------
    image_b64:
        Base64-encoded PNG string. Accepts both raw base64 and
        data URI format (data:image/png;base64,...).

    Returns
    -------
    Dict[str, float]
        Exactly the 6 features expected by _predict("writing", payload).
        Returns safe defaults if the image cannot be decoded or is empty.
    """

    default = {
        "stroke_irregularity": 0.0,
        "letter_spacing_variance": 0.0,
        "baseline_drift": 0.0,
        "letter_reversal_count": 0.0,
        "word_alignment_error": 0.0,
        "pressure_variability": 0.0,
    }

    # ------------------------------------------------------------------
    # 1. Decode base64 image
    # ------------------------------------------------------------------

    try:
        # Strip data URI prefix if present
        if "," in image_b64:
            image_b64 = image_b64.split(",", 1)[1]

        image_bytes = base64.b64decode(image_b64)
        image_array = np.frombuffer(image_bytes, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_GRAYSCALE)

        if image is None:
            return default

    except Exception:
        return default

    # ------------------------------------------------------------------
    # 2. Binarise — white strokes on black background
    #    (canvas default) or black strokes on white (scanned)
    # ------------------------------------------------------------------

    # Detect whether background is dark or light
    mean_brightness = float(np.mean(image))
    if mean_brightness < 127:
        # Dark background — white strokes (canvas default)
        _, binary = cv2.threshold(image, 30, 255, cv2.THRESH_BINARY)
    else:
        # Light background — dark strokes (scanned)
        _, binary = cv2.threshold(image, 200, 255, cv2.THRESH_BINARY_INV)

    if np.sum(binary) == 0:
        return default

    # ------------------------------------------------------------------
    # 3. Connected components — each blob is a letter/stroke
    # ------------------------------------------------------------------

    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(
        binary, connectivity=8
    )

    # Filter out background (label 0) and tiny noise blobs
    components = [
        {
            "label": i,
            "x": int(stats[i, cv2.CC_STAT_LEFT]),
            "y": int(stats[i, cv2.CC_STAT_TOP]),
            "w": int(stats[i, cv2.CC_STAT_WIDTH]),
            "h": int(stats[i, cv2.CC_STAT_HEIGHT]),
            "area": int(stats[i, cv2.CC_STAT_AREA]),
            "cx": float(centroids[i, 0]),
            "cy": float(centroids[i, 1]),
        }
        for i in range(1, num_labels)
        if stats[i, cv2.CC_STAT_AREA] >= MIN_COMPONENT_AREA
    ]

    if not components:
        return default

    # Sort components left to right
    components.sort(key=lambda c: c["x"])

    # ------------------------------------------------------------------
    # 4. Stroke irregularity
    #    Perimeter² / (4π × area) — circle = 1.0, irregular > 1.0
    #    Normalised to 0-1 range for model compatibility
    # ------------------------------------------------------------------

    contours, _ = cv2.findContours(
        binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    irregularity_scores: List[float] = []
    for contour in contours:
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, closed=True)
        if area > MIN_COMPONENT_AREA and perimeter > 0:
            circularity = (perimeter ** 2) / (4 * math.pi * area)
            # Normalise: circularity of 1 = perfect circle, cap at 5
            normalised = min((circularity - 1.0) / 4.0, 1.0)
            irregularity_scores.append(max(0.0, normalised))

    stroke_irregularity = (
        sum(irregularity_scores) / len(irregularity_scores)
        if irregularity_scores else 0.0
    )

    # ------------------------------------------------------------------
    # 5. Letter spacing variance
    #    Variance of horizontal gaps between consecutive components
    # ------------------------------------------------------------------

    if len(components) >= 2:
        gaps: List[float] = []
        for i in range(len(components) - 1):
            right_edge = components[i]["x"] + components[i]["w"]
            left_edge = components[i + 1]["x"]
            gap = float(left_edge - right_edge)
            gaps.append(gap)

        mean_gap = sum(gaps) / len(gaps)
        letter_spacing_variance = (
            sum((g - mean_gap) ** 2 for g in gaps) / len(gaps)
        )
        # Normalise by image width
        letter_spacing_variance = min(
            letter_spacing_variance / (image.shape[1] ** 2), 1.0
        )
    else:
        letter_spacing_variance = 0.0

    # ------------------------------------------------------------------
    # 6. Baseline drift
    #    Variance of vertical centroid positions across components
    # ------------------------------------------------------------------

    cy_values = [c["cy"] for c in components]
    if len(cy_values) >= 2:
        mean_cy = sum(cy_values) / len(cy_values)
        baseline_variance = sum((cy - mean_cy) ** 2 for cy in cy_values) / len(cy_values)
        # Normalise by image height
        baseline_drift = min(math.sqrt(baseline_variance) / image.shape[0], 1.0)
    else:
        baseline_drift = 0.0

    # ------------------------------------------------------------------
    # 7. Letter reversal count
    #    Compare each component to its horizontal mirror using
    #    normalised cross-correlation
    # ------------------------------------------------------------------

    reversal_count = 0
    for comp in components:
        x, y, w, h = comp["x"], comp["y"], comp["w"], comp["h"]
        roi = binary[y:y + h, x:x + w]
        if roi.size == 0:
            continue
        flipped = cv2.flip(roi, 1)  # horizontal flip

        # Resize to same shape for correlation
        roi_flat = roi.flatten().astype(np.float32)
        flip_flat = flipped.flatten().astype(np.float32)

        if np.linalg.norm(roi_flat) == 0:
            continue

        similarity = float(np.dot(roi_flat, flip_flat) / (
            np.linalg.norm(roi_flat) * np.linalg.norm(flip_flat)
        ))

        if similarity >= FLIP_SIMILARITY_THRESHOLD:
            reversal_count += 1

    # ------------------------------------------------------------------
    # 8. Word alignment error
    #    Variance of top-edge (y) positions across components
    # ------------------------------------------------------------------

    y_tops = [float(c["y"]) for c in components]
    if len(y_tops) >= 2:
        mean_y = sum(y_tops) / len(y_tops)
        alignment_variance = sum((y - mean_y) ** 2 for y in y_tops) / len(y_tops)
        word_alignment_error = min(
            math.sqrt(alignment_variance) / image.shape[0], 1.0
        )
    else:
        word_alignment_error = 0.0

    # ------------------------------------------------------------------
    # 9. Pressure variability
    #    Std dev of non-zero pixel intensities — proxy for pen pressure
    # ------------------------------------------------------------------

    stroke_pixels = image[binary > 0].astype(np.float32)
    if len(stroke_pixels) >= 2:
        mean_intensity = float(np.mean(stroke_pixels))
        pressure_variability = float(np.std(stroke_pixels)) / 255.0
    else:
        pressure_variability = 0.0

    return {
        "stroke_irregularity": round(float(stroke_irregularity), 4),
        "letter_spacing_variance": round(float(letter_spacing_variance), 4),
        "baseline_drift": round(float(baseline_drift), 4),
        "letter_reversal_count": round(float(reversal_count), 4),
        "word_alignment_error": round(float(word_alignment_error), 4),
        "pressure_variability": round(float(pressure_variability), 4),
    }