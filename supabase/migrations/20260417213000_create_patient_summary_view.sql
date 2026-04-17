
-- Drop and Recreate for updates
DROP VIEW IF EXISTS public.patient_summary;

CREATE VIEW public.patient_summary WITH (security_invoker = true) AS
SELECT 
    np.id as link_id,
    np.nutritionist_id,
    np.patient_id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.meta_agua,
    (
        SELECT count(*) 
        FROM public.meals m 
        WHERE m.user_id = np.patient_id 
        AND m.created_at >= CURRENT_DATE 
        AND m.created_at < CURRENT_DATE + INTERVAL '1 day'
    ) as meals_today_count,
    (
        SELECT COALESCE(sum(wl.amount_ml), 0) 
        FROM public.water_logs wl 
        WHERE wl.user_id = np.patient_id 
        AND wl.created_at >= CURRENT_DATE 
        AND wl.created_at < CURRENT_DATE + INTERVAL '1 day'
    ) as water_today_amount,
    (
        SELECT count(*) 
        FROM public.questionnaire_assignments qa 
        WHERE qa.patient_id = np.patient_id 
        AND qa.status = 'pending'
    ) as pending_questions_count,
    (
        SELECT count(*) 
        FROM public.questionnaire_assignments qa 
        WHERE qa.patient_id = np.patient_id 
        AND qa.status = 'completed'
    ) as completed_questions_count,
    np.linked_at
FROM 
    public.nutritionist_patients np
JOIN 
    public.profiles p ON p.user_id = np.patient_id;

GRANT SELECT ON public.patient_summary TO authenticated;
GRANT SELECT ON public.patient_summary TO anon;
GRANT SELECT ON public.patient_summary TO service_role;
