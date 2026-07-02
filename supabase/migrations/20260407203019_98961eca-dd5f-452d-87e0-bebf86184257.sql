ALTER TABLE department_mits DROP CONSTRAINT IF EXISTS department_mits_current_status_check;

UPDATE department_mits SET current_status = 'in_progress' WHERE current_status = 'green';
UPDATE department_mits SET current_status = 'not_started' WHERE current_status = 'yellow';
UPDATE department_mits SET current_status = 'at_risk' WHERE current_status = 'red';

ALTER TABLE department_mits ADD CONSTRAINT department_mits_current_status_check
  CHECK (current_status IN ('not_started', 'in_progress', 'at_risk', 'blocked', 'complete'));

ALTER TABLE department_mits ALTER COLUMN current_status SET DEFAULT 'not_started';

ALTER TABLE monthly_milestones DROP CONSTRAINT IF EXISTS monthly_milestones_status_check;
ALTER TABLE monthly_milestones ADD CONSTRAINT monthly_milestones_status_check
  CHECK (status IN ('not_started', 'in_progress', 'at_risk', 'blocked', 'complete'));