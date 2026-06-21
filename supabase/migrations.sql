-- 1. Добавление колонок рейтинга и статуса в таблицу сотрудников (organization_employees)
ALTER TABLE organization_employees ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3, 1) DEFAULT 8.0;
ALTER TABLE organization_employees ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE organization_employees ADD COLUMN IF NOT EXISTS rating_sum INTEGER DEFAULT 40;
ALTER TABLE organization_employees ADD COLUMN IF NOT EXISTS absence_status VARCHAR(50) DEFAULT 'active';

-- 2. Добавление кодов и времени приёма в таблицу записей (organization_appointments)
ALTER TABLE organization_appointments ADD COLUMN IF NOT EXISTS start_code VARCHAR(50);
ALTER TABLE organization_appointments ADD COLUMN IF NOT EXISTS finish_code VARCHAR(50);
ALTER TABLE organization_appointments ADD COLUMN IF NOT EXISTS actual_start_time TIMESTAMPTZ;
ALTER TABLE organization_appointments ADD COLUMN IF NOT EXISTS actual_end_time TIMESTAMPTZ;
ALTER TABLE organization_appointments ADD COLUMN IF NOT EXISTS consultation_draft JSONB;


-- 3. Создание таблицы оценок врачей (doctor_ratings)
CREATE TABLE IF NOT EXISTS doctor_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID UNIQUE REFERENCES organization_appointments(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES organization_employees(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    rating_value INTEGER CHECK (rating_value >= 1 AND rating_value <= 10),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Создание таблицы отсутствия врачей (doctor_absences)
CREATE TABLE IF NOT EXISTS doctor_absences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES organization_employees(id) ON DELETE CASCADE,
    absence_type VARCHAR(50) CHECK (absence_type IN ('planned', 'emergency')),
    reason VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Создание таблицы переноса записей (appointment_transfers)
CREATE TABLE IF NOT EXISTS appointment_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES organization_appointments(id) ON DELETE CASCADE,
    previous_doctor_id UUID REFERENCES organization_employees(id) ON DELETE CASCADE,
    new_doctor_id UUID REFERENCES organization_employees(id) ON DELETE CASCADE,
    previous_date DATE,
    previous_time VARCHAR(50),
    new_date DATE,
    new_time VARCHAR(50),
    transfer_reason TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'declined')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Создание таблицы медицинских справок (medical_certificates)
CREATE TABLE IF NOT EXISTS medical_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES organization_employees(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    certificate_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Создание таблицы обращений в техподдержку (support_conversations)
CREATE TABLE IF NOT EXISTS support_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'in_work', 'resolved', 'closed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Создание таблицы сообщений обращений (support_messages)
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES support_conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) CHECK (sender_type IN ('org_admin', 'support')),
    sender_id UUID NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    message_text TEXT,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Создание таблицы уведомлений (notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- Может относиться к app_users, organization_employees или site_admins
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Создание таблицы графиков врачей (doctor_schedules)
CREATE TABLE IF NOT EXISTS doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID UNIQUE REFERENCES organization_employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    work_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
    work_start VARCHAR(5) DEFAULT '09:00',
    work_end VARCHAR(5) DEFAULT '18:00',
    lunch_start VARCHAR(5) DEFAULT '13:00',
    lunch_end VARCHAR(5) DEFAULT '14:00',
    slot_duration INTEGER DEFAULT 30,
    daily_schedules JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 11. Создание таблицы исключений из графика (schedule_exceptions)
CREATE TABLE IF NOT EXISTS schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES organization_employees(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_working BOOLEAN DEFAULT true,
    work_start VARCHAR(5),
    work_end VARCHAR(5),
    lunch_start VARCHAR(5),
    lunch_end VARCHAR(5),
    slot_duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 12. Создание таблицы записей визитов (visit_records)
CREATE TABLE IF NOT EXISTS visit_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID UNIQUE REFERENCES organization_appointments(id) ON DELETE CASCADE,
    patient_iin VARCHAR(12) NOT NULL,
    doctor_id UUID REFERENCES organization_employees(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    complaints TEXT,
    symptoms TEXT,
    diagnosis TEXT,
    treatment TEXT,
    recommendations TEXT,
    comment TEXT,
    files JSONB DEFAULT '[]',
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Добавление признака подтверждения пациентом
ALTER TABLE organization_appointments ADD COLUMN IF NOT EXISTS patient_confirmed BOOLEAN DEFAULT true;

-- 14. Добавление предпочтительного языка в таблицы пользователей
ALTER TABLE organization_users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'ru';
ALTER TABLE organization_employees ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'ru';

