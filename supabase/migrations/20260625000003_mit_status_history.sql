CREATE TABLE IF NOT EXISTS mit_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_mit_id uuid NOT NULL REFERENCES department_mits(id) ON DELETE CASCADE,
  status text NOT NULL,
  week_number integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mit_status_history_unique_week UNIQUE (department_mit_id, week_number)
);

ALTER TABLE mit_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_select" ON mit_status_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert" ON mit_status_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON mit_status_history FOR UPDATE TO authenticated USING (true);

ALTER TABLE blockers ADD COLUMN IF NOT EXISTS owner text;
