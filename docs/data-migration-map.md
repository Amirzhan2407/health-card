# Data Migration Map - Clinic OS (Final Version)

This document outlines the detailed mapping from the legacy database schema to the new unified database schema of Clinic OS.

---

## 1. Table and Column Mappings

### 1.1 Users & Profiles
- **Legacy Table**: `app_users` (Patients)
- **Legacy Table**: `organization_users` (Org Admins, Support, Chief)
- **Legacy Table**: `organization_employees` (Doctors, Nurses, HR)
- **New Table**: `profiles_new` -> `profiles` (Unified system users)

| New Column (`profiles`) | Source Column / Expression | Source Table | Type / Conversion |
| :--- | :--- | :--- | :--- |
| `id` | `id` | All | UUID (Preserve original UUID) |
| `iin` | `iin` | All | VARCHAR(12) (Format checks) |
| `full_name` | `full_name` | All | VARCHAR(255) |
| `gender` | `gender` | `app_users` | VARCHAR(50) ('male', 'female', 'unknown') |
| `birth_date` | `birth_date` | `organization_employees` | DATE |
| `phone` | `phone` | All | VARCHAR(50) |
| `email` | `email` | All | VARCHAR(255) |
| `password_hash` | `password_hash` | `organization_users`/`employees` | scrypt hash (`salt:hash`) |
| `role` | Mapping function | All | `'patient'`, `'doctor'`, `'organization_admin'`, `'support'` |
| `status` | `status` | All | `'active'`, `'blocked'` |
| `preferred_language` | `preferred_language` | All | VARCHAR(5) (default `'ru'`) |

---

### 1.2 Organizations
- **Legacy Table**: `organizations`
- **New Table**: `organizations_new` -> `organizations`

| New Column | Source Column | Type / Conversion |
| :--- | :--- | :--- |
| `id` | `id` | UUID (Preserve) |
| `name` | `organization_name` | VARCHAR(255) |
| `bin` | `bin` | VARCHAR(12) |
| `city` | `city` | VARCHAR(100) |
| `address` | `address` | TEXT |
| `status` | `status` | VARCHAR(50) (default `'active'`) |

---

### 1.3 Memberships (Organization Members)
- **Legacy Source**: `organization_users` & `organization_employees`
- **New Table**: `organization_members_new` -> `organization_members`

| New Column | Source Column / Expression | Type / Conversion |
| :--- | :--- | :--- |
| `id` | Generate new UUID | UUID |
| `organization_id` | `organization_id` | UUID |
| `profile_id` | `id` (references user profile) | UUID |
| `role` | Mapping function | `'doctor'`, `'organization_admin'` |
| `status` | `status` | `'active'`, `'blocked'`, `'archived'` |

---

### 1.4 Doctors & Specialties
- **Legacy Source**: `organization_employees` where role matches `'doctor'`
- **New Table**: `doctors_new` -> `doctors`

| New Column | Source Column / Expression | Type / Conversion |
| :--- | :--- | :--- |
| `id` | `id` (Preserve original employee ID as doctor ID for appointments references) | UUID |
| `member_id` | Link to new record in `organization_members` | UUID |
| `specialty_id` | Match specialty name to `specialties` ID | UUID |
| `room_id` | Match cabinet name to `rooms` ID | UUID |
| `status` | `absence_status` / `status` | `'active'`, `'archived'` |

---

### 1.5 Appointments
- **Legacy Table**: `organization_appointments`
- **New Table**: `appointments_new` -> `appointments`

| New Column | Source Column | Type / Conversion |
| :--- | :--- | :--- |
| `id` | `id` | UUID (Preserve) |
| `patient_id` | `patient_id` (from app_users) | UUID |
| `doctor_id` | `employee_id` (from organization_employees) | UUID |
| `organization_id` | `organization_id` | UUID |
| `date` | `date` | DATE |
| `time` | `time` | VARCHAR(5) |
| `reason` | `reason` | TEXT |
| `status` | `status` | VARCHAR(50) (Mapped according to strict transitions) |
| `qr_token` | `start_code` | VARCHAR(255) |
| `actual_start_time` | `actual_start_time` | TIMESTAMPTZ |
| `actual_end_time` | `actual_end_time` | TIMESTAMPTZ |

---

### 1.6 Medical Certificates
- **Legacy Table**: `medical_certificates` / `certificates`
- **New Table**: `medical_certificates_new` -> `medical_certificates`

| New Column | Source Column | Type / Conversion |
| :--- | :--- | :--- |
| `id` | `id` | UUID (Preserve) |
| `patient_id` | `patient_id` | UUID |
| `doctor_id` | `doctor_id` | UUID |
| `organization_id` | `organization_id` | UUID |
| `title` | `title` | VARCHAR(255) |
| `certificate_type` | `certificate_type` | VARCHAR(100) |
| `file_url` | `file_url` | TEXT |
| `valid_until` | `valid_until` | DATE |

---

### 1.7 Health Metrics
- **Legacy Table**: `health_metric_records`
- **New Table**: `health_metrics_new` -> `health_metrics`

| New Column | Source Column / Expression | Type / Conversion |
| :--- | :--- | :--- |
| `id` | `id` | UUID |
| `patient_id` | `patient_id` | UUID |
| `metric_type` | Mapping from legacy format | `'height'`, `'weight'`, `'bmi'`, etc. |
| `value` | `value` | NUMERIC |
| `unit` | `unit` | VARCHAR(20) |
| `measured_at` | `created_at` | TIMESTAMPTZ |

---

## 2. Role Conversions

Legacy roles will be translated as follows:

| Legacy Role (`role` or `position`) | Translated New Role (`profiles.role`) | Action / Note |
| :--- | :--- | :--- |
| `'chief'`, `'chief_doctor'`, `'deputy_chief_doctor'` | `'organization_admin'` | Convert to Org Admin profile |
| `'hr'`, `'nurse'`, `'registrar'`, `'employee'` | `'doctor'` | Map employees to Doctor role if clinical, or archive if unneeded |
| `'doctor'` | `'doctor'` | Keep doctor profile |
| `'super_admin'` | `'support'` | Convert super admin profiles to Support |
| `'support'` | `'support'` | Keep support profile |
| `'patient'` | `'patient'` | Keep patient profile |

---

## 3. Duplicate and Edge Case Handling

1. **Duplicate IIN**:
   - IIN must be unique. If an IIN is present in both `app_users` and `organization_employees` (e.g. a doctor is also registered as a patient):
     - We will merge the profiles into a single `profiles` row.
     - Set the highest access role or create multiple organization membership entries.
     - We will log the merging actions in a diagnostic summary.
2. **Missing Email or Login**:
   - If an employee does not have an email, generate a login-based address: `${login}@clinic-os.local`.
   - If a login is missing, generate one from the email username: `email.split('@')[0]`.
3. **Invalid UUIDs**:
   - Any records containing invalid or null foreign keys will be isolated and excluded from migrations, keeping foreign key integrity intact.

---

## 4. Rollback Procedure

To roll back the database migration:
1. Delete all tables created in the migration script.
2. Rename `legacy_app_users`, `legacy_organizations`, `legacy_organization_users`, `legacy_organization_employees`, etc., back to their original names.
3. Re-enable original constraints and RLS policies.
4. Git Rollback: Switch back to the backup branch:
   ```bash
   git switch backup-before-full-rebuild
   ```
5. Deployment Rollback: Trigger a build of the previous commit in Vercel and Render dashboards.
