-- Create function to handle new user signup
-- This creates the company, profile, assigns Company Admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id uuid;
  _company_name text;
  _full_name text;
  _admin_role_id uuid;
BEGIN
  -- Extract metadata
  _company_name := COALESCE(NEW.raw_user_meta_data ->> 'company_name', 'My Company');
  _full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');

  -- Create a new company for this user
  INSERT INTO public.companies (name)
  VALUES (_company_name)
  RETURNING id INTO _company_id;

  -- Create the user profile linked to the company
  INSERT INTO public.profiles (id, email, full_name, company_id, status, activated_at)
  VALUES (NEW.id, NEW.email, _full_name, _company_id, 'active', now());

  -- Create default "Company Admin" role for this company
  INSERT INTO public.roles (name, description, company_id, is_system_role, is_active)
  VALUES ('Company Admin', 'Full access to all company features', _company_id, true, true)
  RETURNING id INTO _admin_role_id;

  -- Assign the Company Admin role to the new user
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (NEW.id, _admin_role_id);

  -- Enable default modules for the company (HR_CORE and ADMIN)
  INSERT INTO public.company_modules (company_id, module, is_enabled, enabled_by, enabled_at)
  VALUES 
    (_company_id, 'HR_CORE', true, NEW.id, now()),
    (_company_id, 'ADMIN', true, NEW.id, now());

  -- Create default company branding
  INSERT INTO public.company_branding (company_id)
  VALUES (_company_id);

  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();