-- Fix RLS policies for employee_onboarding table
DROP POLICY IF EXISTS "HR/Admins can manage employee onboarding" ON public.employee_onboarding;

CREATE POLICY "HR/Admins can insert employee onboarding"
ON public.employee_onboarding
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_onboarding.profile_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can update employee onboarding"
ON public.employee_onboarding
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_onboarding.profile_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_onboarding.profile_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can delete employee onboarding"
ON public.employee_onboarding
FOR DELETE
USING (
  (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_onboarding.profile_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

-- Fix RLS policies for employee_onboarding_items table
DROP POLICY IF EXISTS "HR/Admins can manage onboarding items" ON public.employee_onboarding_items;

CREATE POLICY "HR/Admins can insert onboarding items"
ON public.employee_onboarding_items
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM employee_onboarding eo
    JOIN profiles p ON p.id = eo.profile_id
    WHERE eo.id = employee_onboarding_items.onboarding_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can update onboarding items"
ON public.employee_onboarding_items
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM employee_onboarding eo
    JOIN profiles p ON p.id = eo.profile_id
    WHERE eo.id = employee_onboarding_items.onboarding_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM employee_onboarding eo
    JOIN profiles p ON p.id = eo.profile_id
    WHERE eo.id = employee_onboarding_items.onboarding_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can delete onboarding items"
ON public.employee_onboarding_items
FOR DELETE
USING (
  (EXISTS (
    SELECT 1 FROM employee_onboarding eo
    JOIN profiles p ON p.id = eo.profile_id
    WHERE eo.id = employee_onboarding_items.onboarding_id
    AND p.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

-- Fix RLS policies for onboarding_templates table
DROP POLICY IF EXISTS "HR/Admins can manage onboarding templates" ON public.onboarding_templates;

CREATE POLICY "HR/Admins can insert onboarding templates"
ON public.onboarding_templates
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can update onboarding templates"
ON public.onboarding_templates
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can delete onboarding templates"
ON public.onboarding_templates
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

-- Fix RLS policies for onboarding_template_items table
DROP POLICY IF EXISTS "HR/Admins can manage onboarding template items" ON public.onboarding_template_items;

CREATE POLICY "HR/Admins can insert onboarding template items"
ON public.onboarding_template_items
FOR INSERT
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM onboarding_templates t
    WHERE t.id = onboarding_template_items.template_id
    AND t.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can update onboarding template items"
ON public.onboarding_template_items
FOR UPDATE
USING (
  (EXISTS (
    SELECT 1 FROM onboarding_templates t
    WHERE t.id = onboarding_template_items.template_id
    AND t.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM onboarding_templates t
    WHERE t.id = onboarding_template_items.template_id
    AND t.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

CREATE POLICY "HR/Admins can delete onboarding template items"
ON public.onboarding_template_items
FOR DELETE
USING (
  (EXISTS (
    SELECT 1 FROM onboarding_templates t
    WHERE t.id = onboarding_template_items.template_id
    AND t.company_id = get_user_company_id(auth.uid())
  ))
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);