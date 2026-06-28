"""
Extract keystroke dynamic features from a timeline stream of keyboard events.
"""

from __future__ import annotations
import math
from typing import List, Dict, Any


def extract_typing_features(events: List[Dict[str, Any]]) -> Dict[str, float]:
    """Analyze a standardized stream of keystroke events to compute
    timing, pause variations, and error rates for the typing MVP model.
    """
    default_payload = {
        "mean_hold_time_ms": 0.0,
        "mean_flight_time_ms": 0.0,
        "pause_rate": 0.0,
        "backspace_rate": 0.0,
        "typing_speed_wpm": 0.0,
        "latency_variability_ms": 0.0,
    }

    if not events or len(events) < 2:
        return default_payload

    hold_times: List[float] = []
    flight_times: List[float] = []
    
    backspace_count = 0
    total_keypresses = 0
    
    active_presses: Dict[str, float] = {}
    last_up_time: float | None = None

    def _safe_ts(ev: Dict[str, Any]) -> float:
        try:
            ts_val = float(ev.get("ts", 0.0) or 0.0)
        except (TypeError, ValueError):
            return 0.0
        return ts_val if math.isfinite(ts_val) else 0.0

    events = sorted(events, key=_safe_ts)

    for ev in events:
        key = str(ev.get("key", ""))
        event_type = str(ev.get("type", "")).lower()
        ts = _safe_ts(ev)

        if not key or ts <= 0.0:
            continue

        if event_type == "down":
            if key in active_presses:
                continue
            total_keypresses += 1
            if key in ["Backspace", "Delete"]:
                backspace_count += 1
            active_presses[key] = ts
            if last_up_time is not None:
                flight_gap = ts - last_up_time
                if 0 < flight_gap < 5000:
                    flight_times.append(flight_gap)

        elif event_type == "up":
            if key in active_presses:
                hold_gap = ts - active_presses[key]
                if hold_gap >= 0:
                    hold_times.append(hold_gap)
                del active_presses[key]
            last_up_time = ts

    mean_hold_time_ms = sum(hold_times) / len(hold_times) if hold_times else 0.0
    mean_flight_time_ms = sum(flight_times) / len(flight_times) if flight_times else 0.0

    backspace_rate = float(backspace_count / total_keypresses) if total_keypresses > 0 else 0.0
    
    long_pauses = sum(1 for f in flight_times if f > 1000.0)
    pause_rate = float(long_pauses / len(flight_times)) if flight_times else 0.0

    timestamps = [t for t in (_safe_ts(ev) for ev in events) if t > 0.0]
    start_ts = min(timestamps) if timestamps else 0.0
    end_ts = max(timestamps) if timestamps else 0.0
    total_time_mins = ((end_ts - start_ts) / 1000.0) / 60.0
    chars_typed = total_keypresses - backspace_count
    typing_speed_wpm = (chars_typed / 5.0) / total_time_mins if total_time_mins > 0 else 0.0

    if len(flight_times) > 1:
        variance = sum((f - mean_flight_time_ms) ** 2 for f in flight_times) / len(flight_times)
        latency_variability_ms = math.sqrt(variance)
    else:
        latency_variability_ms = 0.0

    return {
        "mean_hold_time_ms": float(mean_hold_time_ms),
        "mean_flight_time_ms": float(mean_flight_time_ms),
        "pause_rate": float(pause_rate),
        "backspace_rate": float(backspace_rate),
        "typing_speed_wpm": float(typing_speed_wpm),
        "latency_variability_ms": float(latency_variability_ms),
    }