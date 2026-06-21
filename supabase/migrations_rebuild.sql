-- 1. Create table for private files metadata
CREATE TABLE IF NOT EXISTS private_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket VARCHAR(255) NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size INTEGER,
    owner_id UUID,
    related_record_id UUID,
    uploaded_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Prevent double booking with a partial unique index on active appointments
-- Active statuses are: scheduled, confirmed, transfer_pending, in_progress, waiting_finish_confirmation, completed
DROP INDEX IF EXISTS idx_unique_active_appointment;
CREATE UNIQUE INDEX idx_unique_active_appointment 
ON organization_appointments(employee_id, date, time) 
WHERE status IN ('scheduled', 'confirmed', 'transfer_pending', 'in_progress', 'waiting_finish_confirmation', 'completed');

-- 3. Enforce valid roles constraint in database
ALTER TABLE organization_users DROP CONSTRAINT IF EXISTS organization_users_role_check;
ALTER TABLE organization_users ADD CONSTRAINT organization_users_role_check 
CHECK (role IN ('patient', 'doctor', 'organization_admin', 'support'));

ALTER TABLE organization_employees DROP CONSTRAINT IF EXISTS organization_employees_role_check;
ALTER TABLE organization_employees ADD CONSTRAINT organization_employees_role_check 
CHECK (role IN ('patient', 'doctor', 'organization_admin', 'support'));
