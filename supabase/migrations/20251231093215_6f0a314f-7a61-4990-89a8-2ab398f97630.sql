-- Drop the existing ALL policy and create separate policies for each operation
DROP POLICY IF EXISTS "HR/Admins can manage employee details" ON public.employee_details;

-- Create INSERT policy for HR/Admins
CREATE POLICY "HR/Admins can insert employee details"
ON public.employee_details
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = profile_id 
    AND p.company_id = get_user_company_id(auth.uid())
  )
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

-- Create UPDATE policy for HR/Admins
CREATE POLICY "HR/Admins can update employee details"
ON public.employee_details
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_details.profile_id 
    AND p.company_id = get_user_company_id(auth.uid())
  )
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);

-- Create DELETE policy for HR/Admins
CREATE POLICY "HR/Admins can delete employee details"
ON public.employee_details
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = employee_details.profile_id 
    AND p.company_id = get_user_company_id(auth.uid())
  )
  AND (is_company_admin(auth.uid()) OR has_role(auth.uid(), 'HR'))
);