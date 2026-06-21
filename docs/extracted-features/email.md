# Legacy Feature Documentation: Email Service

This document describes the Nodemailer-based email dispatch service.

---

## 1. SMTP Credentials

Email delivery utilizes external environment variables:
- `SMTP_HOST`: Host address of the provider (e.g. smtp.gmail.com).
- `SMTP_PORT`: Connection port (e.g. 465 or 587).
- `SMTP_USER`: Account username.
- `SMTP_PASS`: Account password.

---

## 2. Notification Dispatch Triggers

The system dispatches formatted HTML emails upon:
1. **Access Dispatch**: When a new organization administrator is created, sending their temporary login credentials.
2. **Password Reset**: Verification links and temporary code dispatches.
3. **Appointment Booked**: Patient confirmation, showing slot time, doctor name, and organization address.
4. **Appointment Transferred**: Offering a transfer slot or notification of completed transfers.
5. **Appointment Cancelled**: Notifying patient or doctor about slot cancellation.
6. **Support Message Alert**: Alerting org admin when support replies to their ticket.
