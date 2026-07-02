-- Rename old department values to new names (for any existing data)
UPDATE department_mits SET department = 'Operations' WHERE department = 'Ops';
UPDATE department_mits SET department = 'Workshops'  WHERE department = 'L1';
UPDATE department_mits SET department = 'Marketing'  WHERE department = 'L2';
UPDATE department_mits SET department = 'RevOps'     WHERE department = 'CS';

UPDATE weekly_rollups SET department = 'Operations' WHERE department = 'Ops';
UPDATE weekly_rollups SET department = 'Workshops'  WHERE department = 'L1';
UPDATE weekly_rollups SET department = 'Marketing'  WHERE department = 'L2';
UPDATE weekly_rollups SET department = 'RevOps'     WHERE department = 'CS';

-- Update the department check constraint on department_mits
ALTER TABLE department_mits DROP CONSTRAINT IF EXISTS department_mits_department_check;
ALTER TABLE department_mits ADD CONSTRAINT department_mits_department_check
  CHECK (department IN ('Operations', 'Workshops', 'L3', 'Sales', 'Marketing', 'Events', 'RevOps', 'Growth'));
