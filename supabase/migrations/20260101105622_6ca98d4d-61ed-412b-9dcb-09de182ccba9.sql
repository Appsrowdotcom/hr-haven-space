-- Drop existing policy
DROP POLICY IF EXISTS "HR/Admins can manage leave types" ON public.leave_types;

-- Create new policy that checks for permissions, not just hardcoded roles
CREATE POLICY "Users with leave permissions can manage leave types"
ON public.leave_types
FOR ALL
USING (
  (company_id = get_user_company_id(auth.uid())) 
  AND (
    is_company_admin(auth.uid()) 
    OR has_role(auth.uid(), 'HR'::text)
    OR has_permission(auth.uid(), 'leave.manage_types'::text)
    OR has_permission(auth.uid(), 'leave.manage_balance'::text)
  )
)
WITH CHECK (
  (company_id = get_user_company_id(auth.uid())) 
  AND (
    is_company_admin(auth.uid()) 
    OR has_role(auth.uid(), 'HR'::text)
    OR has_permission(auth.uid(), 'leave.manage_types'::text)
    OR has_permission(auth.uid(), 'leave.manage_balance'::text)
  )
);