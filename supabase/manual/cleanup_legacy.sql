-- Cleanup Legacy Tables Script (clinic-os-full-rebuild)
-- WARNING: This script permanently drops old tables and should only be applied manually
-- after confirming that all data was migrated successfully and the system is fully operational.
-- Do NOT execute this automatically.

DROP TABLE IF EXISTS legacy_site_admins CASCADE;
DROP TABLE IF EXISTS legacy_doctor_ratings CASCADE;
DROP TABLE IF EXISTS legacy_doctor_absences CASCADE;
DROP TABLE IF EXISTS legacy_appointment_transfers CASCADE;
DROP TABLE IF EXISTS legacy_medical_certificates CASCADE;
DROP TABLE IF EXISTS legacy_certificates CASCADE;
DROP TABLE IF EXISTS legacy_support_messages CASCADE;
DROP TABLE IF EXISTS legacy_support_conversations CASCADE;
DROP TABLE IF EXISTS legacy_notifications CASCADE;
DROP TABLE IF EXISTS legacy_doctor_schedules CASCADE;
DROP TABLE IF EXISTS legacy_schedule_exceptions CASCADE;
DROP TABLE IF EXISTS legacy_visit_records CASCADE;
DROP TABLE IF EXISTS legacy_visit_documents CASCADE;
DROP TABLE IF EXISTS legacy_medical_cases CASCADE;
DROP TABLE IF EXISTS legacy_medical_case_records CASCADE;
DROP TABLE IF EXISTS legacy_health_metric_records CASCADE;
DROP TABLE IF EXISTS legacy_organization_appointments CASCADE;
DROP TABLE IF EXISTS legacy_organization_employees CASCADE;
DROP TABLE IF EXISTS legacy_organization_users CASCADE;
DROP TABLE IF EXISTS legacy_organizations CASCADE;
DROP TABLE IF EXISTS legacy_app_users CASCADE;
