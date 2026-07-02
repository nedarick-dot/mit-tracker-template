DELETE FROM monthly_milestones;
ALTER TABLE monthly_milestones DROP CONSTRAINT IF EXISTS monthly_milestones_month_check;
ALTER TABLE monthly_milestones ADD CONSTRAINT monthly_milestones_month_check CHECK (month IN ('July', 'August', 'September'));
