-- Fix security definer views by setting security_invoker = true
-- This ensures views respect the calling user's RLS policies

ALTER VIEW public.leave_balance_summary SET (security_invoker = true);
ALTER VIEW public.leave_request_details SET (security_invoker = true);
ALTER VIEW public.pending_manager_approvals SET (security_invoker = true);
ALTER VIEW public.pending_hr_approvals SET (security_invoker = true);
ALTER VIEW public.leave_type_summary SET (security_invoker = true);