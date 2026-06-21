-- Data Staging Migration Script (clinic-os-full-rebuild)
-- This script migrates existing data from legacy tables into the new '_new' tables.
-- It is designed to be executed step-by-step and is verified in Stage 3 on staging.

-- 1. Migrate Specialties
INSERT INTO specialties_new (name_ru)
SELECT DISTINCT specialty 
FROM organization_employees 
WHERE specialty IS NOT NULL AND specialty <> ''
ON CONFLICT DO NOTHING;

-- 2. Migrate Organizations
INSERT INTO organizations_new (id, name, bin, city, address, status, created_at, updated_at)
SELECT id, organization_name, bin, city, address, COALESCE(status, 'active'), created_at, updated_at
FROM organizations
ON CONFLICT DO NOTHING;

-- 3. Migrate Profiles (from app_users, organization_employees, organization_users)
-- 3.1 Patient Profiles
INSERT INTO profiles_new (id, iin, full_name, birth_date, gender, phone, email, password_hash, role, status, preferred_language, created_at, updated_at)
SELECT id, iin, full_name, NULL, gender, phone, email, password_hash, 'patient', 'active', 'ru', created_at, updated_at
FROM app_users
ON CONFLICT (iin) DO NOTHING;

-- 3.2 Employee Profiles (Doctors, Nurses, Registrar, etc.)
INSERT INTO profiles_new (id, iin, full_name, birth_date, gender, phone, email, password_hash, role, status, preferred_language, created_at, updated_at)
SELECT
  id,
  iin,
  full_name,
  birth_date,
  'unknown',
  phone,
  email,
  password_hash,
  CASE
    WHEN role = 'employee' THEN 'doctor'::VARCHAR
    WHEN role IN ('chief', 'chief_doctor', 'deputy_chief_doctor', 'hr', 'nurse', 'registrar') THEN 'doctor'::VARCHAR
    WHEN role = 'organization_admin' THEN 'organization_admin'::VARCHAR
    WHEN role = 'support' THEN 'support'::VARCHAR
    ELSE 'doctor'::VARCHAR
  END,
  COALESCE(status, 'active'),
  COALESCE(preferred_language, 'ru'),
  created_at,
  updated_at
FROM organization_employees
ON CONFLICT (iin) DO NOTHING;

-- 3.3 Org Admin / Support Profiles
INSERT INTO profiles_new (id, iin, full_name, birth_date, gender, phone, email, password_hash, role, status, preferred_language, created_at, updated_at)
SELECT
  id,
  iin,
  full_name,
  NULL,
  'unknown',
  phone,
  email,
  password_hash,
  CASE
    WHEN role = 'support' THEN 'support'::VARCHAR
    WHEN role = 'organization_admin' THEN 'organization_admin'::VARCHAR
    ELSE 'organization_admin'::VARCHAR
  END,
  COALESCE(status, 'active'),
  COALESCE(preferred_language, 'ru'),
  created_at,
  updated_at
FROM organization_users
ON CONFLICT (iin) DO NOTHING;

-- 4. Migrate Organization Members (Links user profiles to organizations)
INSERT INTO organization_members_new (organization_id, profile_id, role, status, created_at, updated_at)
SELECT organization_id, id, 'doctor', status, created_at, updated_at
FROM organization_employees
WHERE id IN (SELECT id FROM profiles_new)
  AND organization_id IN (SELECT id FROM organizations_new)
ON CONFLICT DO NOTHING;

INSERT INTO organization_members_new (organization_id, profile_id, role, status, created_at, updated_at)
SELECT organization_id, id, 'organization_admin', status, created_at, updated_at
FROM organization_users
WHERE id IN (SELECT id FROM profiles_new)
  AND organization_id IN (SELECT id FROM organizations_new)
ON CONFLICT DO NOTHING;

-- 5. Migrate Doctor profiles
INSERT INTO doctors_new (id, member_id, specialty_id, room_id, status, created_at, updated_at)
SELECT
  e.id,
  m.id,
  s.id,
  NULL,
  CASE WHEN e.status = 'dismissed' THEN 'archived'::VARCHAR ELSE 'active'::VARCHAR END,
  e.created_at,
  e.updated_at
FROM organization_employees e
JOIN organization_members_new m ON m.profile_id = e.id AND m.organization_id = e.organization_id
LEFT JOIN specialties_new s ON s.name_ru = e.specialty
ON CONFLICT DO NOTHING;

-- 6. Migrate Doctor Schedules
INSERT INTO doctor_schedules_new (id, doctor_id, start_date, end_date, work_days, work_start, work_end, lunch_start, lunch_end, slot_duration, created_at, updated_at)
SELECT
  id,
  employee_id,
  start_date,
  end_date,
  work_days,
  work_start,
  work_end,
  lunch_start,
  lunch_end,
  slot_duration,
  created_at,
  updated_at
FROM doctor_schedules
WHERE employee_id IN (SELECT id FROM doctors_new)
ON CONFLICT DO NOTHING;

-- 7. Migrate Schedule Exceptions
INSERT INTO schedule_exceptions_new (id, doctor_id, exception_date, is_working, work_start, work_end, lunch_start, lunch_end, slot_duration, created_at)
SELECT id, employee_id, exception_date, is_working, work_start, work_end, lunch_start, lunch_end, slot_duration, created_at
FROM schedule_exceptions
WHERE employee_id IN (SELECT id FROM doctors_new)
ON CONFLICT DO NOTHING;

-- 8. Migrate Doctor Absences
INSERT INTO doctor_absences_new (id, doctor_id, absence_type, reason, start_date, end_date, comment, created_at)
SELECT id, employee_id, absence_type, reason, start_date, end_date, comment, created_at
FROM doctor_absences
WHERE employee_id IN (SELECT id FROM doctors_new)
ON CONFLICT DO NOTHING;

-- 9. Migrate Appointments
INSERT INTO appointments_new (id, patient_id, doctor_id, organization_id, department_id, room_id, date, time, reason, status, qr_token, reminder_sent, actual_start_time, actual_end_time, created_at, updated_at)
SELECT
  id,
  patient_id,
  employee_id,
  organization_id,
  NULL,
  NULL,
  date,
  time,
  reason,
  status,
  start_code,
  false,
  actual_start_time,
  actual_end_time,
  created_at,
  updated_at
FROM organization_appointments
WHERE employee_id IN (SELECT id FROM doctors_new)
  AND patient_id IN (SELECT id FROM profiles_new)
ON CONFLICT DO NOTHING;

-- 10. Migrate Appointment Transfers
INSERT INTO appointment_transfers_new (id, appointment_id, previous_doctor_id, new_doctor_id, previous_date, previous_time, new_date, new_time, transfer_reason, status, created_at)
SELECT
  id,
  appointment_id,
  previous_doctor_id,
  new_doctor_id,
  previous_date,
  previous_time,
  new_date,
  new_time,
  transfer_reason,
  status,
  created_at
FROM appointment_transfers
WHERE appointment_id IN (SELECT id FROM appointments_new)
ON CONFLICT DO NOTHING;

-- 11. Migrate Medical Certificates
INSERT INTO medical_certificates_new (id, patient_id, doctor_id, organization_id, title, certificate_type, file_url, valid_until, created_at)
SELECT id, patient_id, doctor_id, organization_id, title, certificate_type, file_url, valid_until, created_at
FROM medical_certificates
WHERE patient_id IN (SELECT id FROM profiles_new)
ON CONFLICT DO NOTHING;

-- 12. Migrate Notifications
INSERT INTO notifications_new (id, profile_id, title, message, link, is_read, created_at)
SELECT id, user_id, title, message, link, is_read, created_at
FROM notifications
WHERE user_id IN (SELECT id FROM profiles_new)
ON CONFLICT DO NOTHING;

-- 13. Migrate Support Conversations
INSERT INTO support_conversations_new (id, organization_id, subject, description, status, created_at, updated_at)
SELECT id, organization_id, subject, description, status, created_at, updated_at
FROM support_conversations
ON CONFLICT DO NOTHING;

-- 14. Migrate Support Messages
INSERT INTO support_messages_new (id, conversation_id, sender_id, message_text, attachment_url, is_read, created_at)
SELECT id, conversation_id, sender_id, message_text, attachment_url, is_read, created_at
FROM support_messages
WHERE sender_id IN (SELECT id FROM profiles_new)
ON CONFLICT DO NOTHING;
