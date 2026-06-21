# Legacy Feature Documentation: Localization

This document describes the structure of strings translation dictionary.

---

## 1. Supported Languages

- **Russian (`ru`)**
- **Kazakh (`kk`)**

---

## 2. Main Translation Keys

Translations cover the following categories:
- **Login screen**: NCALayer checks, passwords, placeholders.
- **Nav Menu**: Home, Certificates, Book appointment, Visits, Notifications, Health card, Health monitoring, AI assistant.
- **Appointment booking**: selecting departments, specialties, doctors, date/time slots, booking confirmations, QR tickets.
- **Errors**: ECP validation failures, DB connection alerts, invalid times.

We will merge existing translations from `frontend/src/i18n/translations.js` into our clean localization context provider.
