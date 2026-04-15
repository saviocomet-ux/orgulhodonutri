CREATE POLICY "admin_can_insert_invite_codes"
ON public.invite_codes
FOR INSERT
WITH CHECK (
  auth.email() = 'saviox2008@gmail.com'
);

CREATE POLICY "admin_can_delete_invite_codes"
ON public.invite_codes
FOR DELETE
USING (
  auth.email() = 'saviox2008@gmail.com'
);
