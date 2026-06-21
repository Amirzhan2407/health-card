# Legacy Feature Documentation: AI Assistant

This document describes the AI Assistant feature integration with the Groq / Llama API.

---

## 1. System Prompt Instructions

The AI advisor operates with a strict system instruction defining its scope:
- Help users analyze symptoms.
- Suggest basic home remedies and OTC (Over-the-Counter) non-prescription medications.
- Clarify drug dosages based on common safety thresholds:
  - **Paracetamol**: max 500mg per dose, 2-4 times a day, minimum 4-6h intervals, max 3000mg/day.
  - **Ibuprofen**: 200-400mg per dose, 2-3 times a day, post-meal.
  - **Activated Charcoal**: 1 tablet per 10kg weight.
  - **Smecta**: 1 sachet, 2-3 times a day.
- Prevent prescribing or making definitive diagnoses.
- Enforce language constraints: respond strictly in Russian or Kazakh.

---

## 2. API Schema

- **Provider**: Groq API
- **Model**: `llama-3.3-70b-versatile`
- **Temperature**: `0.3`
- **Request Body**:
  ```json
  {
    "model": "llama-3.3-70b-versatile",
    "temperature": 0.3,
    "messages": [
      {
        "role": "system",
        "content": "<SYSTEM_PROMPT>"
      },
      ...
    ]
  }
  ```
- **Authentication**: `Bearer ${process.env.GROQ_API_KEY}` (or `AI_API_KEY`).
