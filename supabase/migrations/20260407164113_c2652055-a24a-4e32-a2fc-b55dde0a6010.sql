-- Allow authenticated users to update weekly rollups
CREATE POLICY "Authenticated users can update weekly_rollups"
ON public.weekly_rollups
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete weekly rollups
CREATE POLICY "Authenticated users can delete weekly_rollups"
ON public.weekly_rollups
FOR DELETE
TO authenticated
USING (true);