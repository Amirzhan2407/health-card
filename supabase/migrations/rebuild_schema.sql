-- Rebuild Schema Migration Script (clinic-os-full-rebuild)
-- This script creates the new schema tables with the suffix '_new' to avoid conflicts.
-- These tables will be renamed during the final production validation phase (Stage 26).

-- 1. specialties_new
CREATE TABLE IF NOT EXISTS specialties_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ru VARCHAR(255) NOT NULL,
    name_kk VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. profiles_new
CREATE TABLE IF NOT EXISTS profiles_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iin VARCHAR(12) UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    birth_date DATE,
    gender VARCHAR(50) DEFAULT 'unknown' CHECK (gender IN ('male', 'female', 'unknown')),
    phone VARCHAR(50),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN ('patient', 'doctor', 'organization_admin', 'support')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    preferred_language VARCHAR(5) DEFAULT 'ru' CHECK (preferred_language IN ('ru', 'kk', 'en')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. organizations_new
CREATE TABLE IF NOT EXISTS organizations_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    bin VARCHAR(12) NOT NULL UNIQUE,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. organization_applications_new
CREATE TABLE IF NOT EXISTS organization_applications_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(255) NOT NULL,
    bin VARCHAR(12) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    admin_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. organization_members_new
CREATE TABLE IF NOT EXISTS organization_members_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations_new(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles_new(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('doctor', 'organization_admin')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (organization_id, profile_id)
);

-- 6. departments_new
CREATE TABLE IF NOT EXISTS departments_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations_new(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. rooms_new
CREATE TABLE IF NOT EXISTS rooms_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments_new(id) ON DELETE CASCADE,
    number VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. doctors_new
CREATE TABLE IF NOT EXISTS doctors_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES organization_members_new(id) ON DELETE CASCADE,
    specialty_id UUID REFERENCES specialties_new(id) ON DELETE SET NULL,
    room_id UUID REFERENCES rooms_new(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. doctor_schedules_new
CREATE TABLE IF NOT EXISTS doctor_schedules_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors_new(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    work_days INTEGER[] NOT NULL,
    work_start VARCHAR(5) DEFAULT '09:00',
    work_end VARCHAR(5) DEFAULT '18:00',
    lunch_start VARCHAR(5) DEFAULT '13:00',
    lunch_end VARCHAR(5) DEFAULT '14:00',
    slot_duration INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. schedule_exceptions_new
CREATE TABLE IF NOT EXISTS schedule_exceptions_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors_new(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_working BOOLEAN DEFAULT false,
    work_start VARCHAR(5),
    work_end VARCHAR(5),
    lunch_start VARCHAR(5),
    lunch_end VARCHAR(5),
    slot_duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. doctor_absences_new
CREATE TABLE IF NOT EXISTS doctor_absences_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors_new(id) ON DELETE CASCADE,
    absence_type VARCHAR(50) CHECK (absence_type IN ('planned', 'emergency')),
    reason VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. appointments_new
CREATE TABLE IF NOT EXISTS appointments_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES profiles_new(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors_new(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations_new(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments_new(id) ON DELETE SET NULL,
    room_id UUID REFERENCES rooms_new(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    time VARCHAR(5) NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'transfer_pending', 'transferred',
        'cancelled_by_patient', 'cancelled_by_organization', 'in_progress',
        'waiting_finish_confirmation', 'completed', 'no_show'
    )),
    qr_token VARCHAR(255),
    reminder_sent BOOLEAN DEFAULT false,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Prevent double booking via partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_appointment_new
ON appointments_new(doctor_id, date, time)
WHERE status IN ('scheduled', 'confirmed', 'transfer_pending', 'in_progress', 'waiting_finish_confirmation', 'completed');

-- 13. appointment_transfers_new
CREATE TABLE IF NOT EXISTS appointment_transfers_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments_new(id) ON DELETE CASCADE,
    previous_doctor_id UUID REFERENCES doctors_new(id) ON DELETE CASCADE,
    new_doctor_id UUID REFERENCES doctors_new(id) ON DELETE CASCADE,
    previous_date DATE,
    previous_time VARCHAR(5),
    new_date DATE,
    new_time VARCHAR(5),
    transfer_reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 14. appointment_start_codes_new
CREATE TABLE IF NOT EXISTS appointment_start_codes_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments_new(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    is_used BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 15. appointment_finish_codes_new
CREATE TABLE IF NOT EXISTS appointment_finish_codes_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments_new(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    is_used BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 16. visit_records_new
CREATE TABLE IF NOT EXISTS visit_records_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID UNIQUE REFERENCES appointments_new(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES profiles_new(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors_new(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations_new(id) ON DELETE CASCADE,
    complaints TEXT,
    symptoms TEXT,
    preliminary_diagnosis TEXT,
    final_diagnosis TEXT,
    treatment TEXT,
    recommendations TEXT,
    comment TEXT,
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 17. visit_documents_new
CREATE TABLE IF NOT EXISTS visit_documents_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_record_id UUID REFERENCES visit_records_new(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 18. medical_certificates_new
CREATE TABLE IF NOT EXISTS medical_certificates_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES profiles_new(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors_new(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations_new(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    certificate_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 19. health_metrics_new
CREATE TABLE IF NOT EXISTS health_metrics_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES profiles_new(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
        'height', 'weight', 'bmi', 'blood_pressure_sys', 'blood_pressure_dia',
        'pulse', 'blood_sugar', 'temperature', 'oxygen_saturation',
        'vision_left', 'vision_right', 'fluorography'
    )),
    value NUMERIC NOT NULL,
    unit VARCHAR(20),
    measured_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 20. notifications_new
CREATE TABLE IF NOT EXISTS notifications_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles_new(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 21. support_conversations_new
CREATE TABLE IF NOT EXISTS support_conversations_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations_new(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_work', 'resolved', 'closed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 22. support_messages_new
CREATE TABLE IF NOT EXISTS support_messages_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES support_conversations_new(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles_new(id) ON DELETE CASCADE,
    message_text TEXT,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 23. ai_history_new
CREATE TABLE IF NOT EXISTS ai_history_new (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES profiles_new(id) ON DELETE CASCADE,
    mode VARCHAR(50) NOT NULL CHECK (mode IN ('medical', 'pharmacy')),
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
