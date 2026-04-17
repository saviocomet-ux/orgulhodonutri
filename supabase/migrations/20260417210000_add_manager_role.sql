
-- Add 'manager' role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager' AFTER 'admin';

-- Update the handle_new_user function to support assigning the manager role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  initial_role public.app_role := 'patient';
BEGIN
  -- Assign manager role to a specific email if needed
  IF NEW.email = 'saviox2008@gmail.com' THEN
    initial_role := 'manager';
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, initial_role);
  
  RETURN NEW;
END;
$$;

-- Manual update for existing manager user if they are already in user_roles
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'saviox2008@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Update existing role to manager
    UPDATE public.user_roles 
    SET role = 'manager' 
    WHERE user_id = v_user_id;
    
    -- If they don't have a role yet, insert it
    IF NOT FOUND THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'manager');
    END IF;
  END IF;
END $$;
