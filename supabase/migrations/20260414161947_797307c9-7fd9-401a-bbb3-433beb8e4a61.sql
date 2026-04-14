
DROP POLICY "Anyone can view meal plan PDFs" ON storage.objects;

CREATE POLICY "Authenticated users can view meal plan PDFs" ON storage.objects FOR SELECT
USING (bucket_id = 'meal-plans' AND auth.uid() IS NOT NULL);
