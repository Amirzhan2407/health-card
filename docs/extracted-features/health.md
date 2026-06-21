# Legacy Feature Documentation: Health Monitoring

This document describes the metric tracking, calculations, and SVG charts rendering logic.

---

## 1. Metrics Tracked

The system records:
- **Height** (рост) in cm.
- **Weight** (вес) in kg.
- **BMI** (ИМТ) - calculated automatically as:
  $$\text{BMI} = \frac{\text{Weight (kg)}}{(\text{Height (m)})^2}$$
- **Blood Pressure** (sys/dia) in mmHg.
- **Pulse** (пульс) in bpm.
- **Blood Sugar** (сахар) in mmol/L.
- **Temperature** (температура) in °C.
- **Oxygen Saturation** (сатурация) in %.
- **Vision** (left/right).
- **Fluorography** (text/date).

---

## 2. Calculation Logic & Charting

- **BMI Interpretation**:
  - $< 18.5$: Underweight (дефицит массы)
  - $18.5 - 24.9$: Normal (норма)
  - $25.0 - 29.9$: Overweight (избыточный вес)
  - $\ge 30$: Obesity (ожирение)
- **Charts Rendering**:
  - Legacy charts are rendered using basic React/inline SVG blocks plotting date vs. value. We will replace this with a clean, unified chart library (like Chart.js or Recharts) or keep lightweight styled SVG graphs for maximum performance and vanilla React layout, drawing real database points directly.
