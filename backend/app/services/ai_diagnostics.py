"""
AI-powered solar system diagnostics.
Analyzes production vs expected output + weather to identify issues:
  - Soiling (gradual performance degradation)
  - Shading (sudden drops correlated with time of day)
  - Equipment failure (inverter/panel faults)
  - Clipping (output capped at inverter limit)
  - Weather impact (clouds/temp effects)
"""
from typing import List, Dict, Any, Optional
from datetime import date, timedelta


class DiagnosticResult:
    def __init__(self, issue: str, severity: str, confidence: float, description: str, recommendation: str):
        self.issue = issue          # soiling | shading | equipment | clipping | weather | ok
        self.severity = severity    # low | medium | high | critical
        self.confidence = confidence  # 0.0 - 1.0
        self.description = description
        self.recommendation = recommendation


def analyze_performance(
    production_records: List[Dict],  # [{date, energy_kwh, peak_power_kw}]
    capacity_kw: float,
    current_weather: Optional[Dict],
    forecast: Optional[List[Dict]] = None,
    current_power_kw: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Run heuristic + statistical diagnostics. Returns list of issues found.
    In Pro tier this is called with live data; Free tier uses daily aggregates.
    """
    issues = []

    if not production_records or capacity_kw <= 0:
        return issues

    kwh_values = [r["energy_kwh"] for r in production_records if r["energy_kwh"] is not None]
    if len(kwh_values) < 3:
        return issues

    # --- Theoretical max: assume 4.5 peak sun hours average ---
    theoretical_daily_kwh = capacity_kw * 4.5
    recent_avg = sum(kwh_values[-7:]) / len(kwh_values[-7:]) if kwh_values else 0
    overall_avg = sum(kwh_values) / len(kwh_values)

    # Adjust expected by cloud cover if available
    cloud_factor = 1.0
    if current_weather:
        cloud_factor = 1.0 - (current_weather.get("cloud_cover_pct", 0) / 100) * 0.75
    expected_kwh = theoretical_daily_kwh * cloud_factor

    performance_ratio = recent_avg / expected_kwh if expected_kwh > 0 else 1.0

    # ---- SOILING DETECTION ----
    # Gradual decline over 7-30 days without weather correlation
    if len(kwh_values) >= 14:
        first_half = sum(kwh_values[:len(kwh_values)//2]) / (len(kwh_values)//2)
        second_half = sum(kwh_values[len(kwh_values)//2:]) / (len(kwh_values) - len(kwh_values)//2)
        decline_pct = (first_half - second_half) / first_half * 100 if first_half > 0 else 0
        if decline_pct > 10:
            confidence = min(0.95, 0.5 + decline_pct / 50)
            issues.append(_format_issue(DiagnosticResult(
                issue="soiling",
                severity="medium" if decline_pct < 20 else "high",
                confidence=round(confidence, 2),
                description=f"Production has declined {decline_pct:.1f}% over the past {len(kwh_values)} days. "
                            "This pattern is consistent with panel soiling (dust, bird droppings, or debris).",
                recommendation="Inspect and clean solar panels. Schedule a maintenance visit. "
                               "Consider installing a panel cleaning system for ongoing maintenance.",
            )))

    # ---- EQUIPMENT / INVERTER FAILURE ----
    # Days with near-zero production when neighbors are producing
    zero_days = sum(1 for v in kwh_values[-14:] if v < capacity_kw * 0.5)
    if zero_days >= 2:
        confidence = min(0.9, 0.4 + zero_days * 0.1)
        issues.append(_format_issue(DiagnosticResult(
            issue="equipment",
            severity="high" if zero_days >= 5 else "medium",
            confidence=round(confidence, 2),
            description=f"Detected {zero_days} days in the past 14 days with unusually low production "
                        "not explained by weather. This may indicate an inverter fault, MPPT issue, or panel disconnection.",
            recommendation="Check inverter status LEDs and error codes. Review inverter event log. "
                           "Contact your installer or manufacturer support.",
        )))

    # ---- SHADING DETECTION ----
    # Low performance ratio during expected clear-sky days
    if performance_ratio < 0.55 and cloud_factor > 0.8:
        issues.append(_format_issue(DiagnosticResult(
            issue="shading",
            severity="medium",
            confidence=0.65,
            description=f"System is producing {performance_ratio*100:.0f}% of expected output during low-cloud conditions. "
                        "Partial shading from trees, structures, or neighboring buildings may be reducing output.",
            recommendation="Review the installation for new shading obstructions. "
                           "Check for overgrown trees or new construction near the array. "
                           "Consider microinverters or DC optimizers if shading is unavoidable.",
        )))

    # ---- CLIPPING DETECTION ----
    # Peak power repeatedly hitting inverter limit
    peak_values = [r.get("peak_power_kw") for r in production_records if r.get("peak_power_kw")]
    if peak_values and capacity_kw > 0:
        clipping_days = sum(1 for p in peak_values[-14:] if p >= capacity_kw * 0.97)
        if clipping_days >= 5:
            issues.append(_format_issue(DiagnosticResult(
                issue="clipping",
                severity="low",
                confidence=0.75,
                description=f"Peak power has been hitting the inverter limit on {clipping_days} of the last 14 days. "
                            "Energy is being clipped (lost) because the array is oversized for the inverter.",
                recommendation="Consider upgrading the inverter to a higher rated output, or consult your installer "
                               "about the inverter-to-panel ratio (DC:AC ratio).",
            )))

    # ---- REAL-TIME CURRENT POWER CHECK (Pro) ----
    if current_power_kw is not None and cloud_factor > 0.7:
        expected_now_kw = capacity_kw * cloud_factor * 0.5  # ~50% of peak capacity during daylight
        if current_power_kw < expected_now_kw * 0.3:
            issues.append(_format_issue(DiagnosticResult(
                issue="equipment",
                severity="critical",
                confidence=0.85,
                description=f"Real-time power output ({current_power_kw:.2f} kW) is critically low "
                            f"against expected ({expected_now_kw:.2f} kW) in current weather. "
                            "System may be offline or severely underperforming.",
                recommendation="Immediately check inverter and disconnect switches. "
                               "Verify AC/DC breakers are closed. Contact your installer urgently.",
            )))

    # ---- WEATHER IMPACT (informational) ----
    if current_weather:
        clouds = current_weather.get("cloud_cover_pct", 0)
        if clouds > 70:
            issues.append(_format_issue(DiagnosticResult(
                issue="weather",
                severity="low",
                confidence=1.0,
                description=f"Current cloud cover is {clouds:.0f}%. Reduced production is expected due to overcast conditions.",
                recommendation="No action needed. Production will recover when skies clear.",
            )))

    if not issues:
        issues.append(_format_issue(DiagnosticResult(
            issue="ok",
            severity="none",
            confidence=1.0,
            description="System is performing within expected parameters. No issues detected.",
            recommendation="Continue regular monitoring and scheduled maintenance.",
        )))

    return issues


def _format_issue(d: DiagnosticResult) -> Dict[str, Any]:
    return {
        "issue": d.issue,
        "severity": d.severity,
        "confidence": d.confidence,
        "description": d.description,
        "recommendation": d.recommendation,
    }
