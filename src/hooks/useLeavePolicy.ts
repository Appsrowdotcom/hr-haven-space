import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { differenceInDays } from 'date-fns';

export type EmployeeCategory = 'trainee' | 'intern' | 'probation' | 'confirmed';
export type RequestType = 'planned' | 'unplanned' | 'emergency';

interface EmployeeEligibility {
  isEligibleForPaidLeave: boolean;
  employeeCategory: EmployeeCategory | null;
  monthsEmployed: number;
  dateOfJoining: string | null;
  ineligibilityReason?: string;
}

interface LeavePolicy {
  id: string;
  min_days_advance_planned: number;
  probation_months: number;
  leave_credit_start_month: number;
  allow_negative_balance: boolean;
  allow_advance_leave: boolean;
  emergency_default_unpaid: boolean;
  unplanned_default_unpaid: boolean;
}

interface LeaveRequestValidation {
  isValid: boolean;
  requestType: RequestType;
  isPaid: boolean;
  requiresHRApproval: boolean;
  autoUnpaidReason?: string;
  warnings: string[];
  errors: string[];
}

const DEFAULT_POLICY: LeavePolicy = {
  id: '',
  min_days_advance_planned: 2,
  probation_months: 3,
  leave_credit_start_month: 4,
  allow_negative_balance: false,
  allow_advance_leave: false,
  emergency_default_unpaid: true,
  unplanned_default_unpaid: true,
};

export function useLeavePolicy() {
  const { user, profile } = useAuth();
  const { company } = useCompany();
  const [policy, setPolicy] = useState<LeavePolicy>(DEFAULT_POLICY);
  const [eligibility, setEligibility] = useState<EmployeeEligibility>({
    isEligibleForPaidLeave: false,
    employeeCategory: null,
    monthsEmployed: 0,
    dateOfJoining: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch company leave policy
  const fetchPolicy = useCallback(async () => {
    if (!company?.id) return;

    const { data, error } = await supabase
      .from('leave_policies')
      .select('*')
      .eq('company_id', company.id)
      .maybeSingle();

    if (!error && data) {
      setPolicy(data as LeavePolicy);
    }
  }, [company?.id]);

  // Fetch employee eligibility
  const fetchEligibility = useCallback(async () => {
    if (!user?.id) return;

    // Get profile with employee category
    const { data: profileData } = await supabase
      .from('profiles')
      .select('employee_category')
      .eq('id', user.id)
      .single();

    // Get employee details for date of joining
    const { data: employeeData } = await supabase
      .from('employee_details')
      .select('date_of_joining')
      .eq('profile_id', user.id)
      .maybeSingle();

    const category = profileData?.employee_category as EmployeeCategory | null;
    const dateOfJoining = employeeData?.date_of_joining;

    let monthsEmployed = 0;
    if (dateOfJoining) {
      const joinDate = new Date(dateOfJoining);
      const today = new Date();
      monthsEmployed = (today.getFullYear() - joinDate.getFullYear()) * 12 +
        (today.getMonth() - joinDate.getMonth());
    }

    // Determine eligibility
    let isEligible = true;
    let reason: string | undefined;

    if (category === 'trainee' || category === 'intern') {
      isEligible = false;
      reason = `${category === 'trainee' ? 'Trainees' : 'Interns'} are not eligible for paid leave`;
    } else if (category === 'probation' && monthsEmployed < policy.probation_months) {
      isEligible = false;
      reason = `Probation employees in first ${policy.probation_months} months are not eligible for paid leave`;
    } else if (monthsEmployed < policy.leave_credit_start_month) {
      isEligible = false;
      reason = `Leave credits start from month ${policy.leave_credit_start_month}`;
    }

    setEligibility({
      isEligibleForPaidLeave: isEligible,
      employeeCategory: category,
      monthsEmployed,
      dateOfJoining,
      ineligibilityReason: reason,
    });
  }, [user?.id, policy.probation_months, policy.leave_credit_start_month]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchPolicy();
      await fetchEligibility();
      setIsLoading(false);
    };
    loadData();
  }, [fetchPolicy, fetchEligibility]);

  // Determine request type based on dates
  const determineRequestType = useCallback((startDate: string, isEmergency: boolean = false): RequestType => {
    if (isEmergency) return 'emergency';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const daysAdvance = differenceInDays(start, today);

    if (daysAdvance >= policy.min_days_advance_planned) {
      return 'planned';
    }
    return 'unplanned';
  }, [policy.min_days_advance_planned]);

  // Validate leave request
  const validateLeaveRequest = useCallback((
    startDate: string,
    endDate: string,
    leaveTypeId: string,
    totalDays: number,
    availableBalance: number,
    accruedBalance: number,
    leaveTypeIsPaid: boolean,
    isEmergency: boolean = false
  ): LeaveRequestValidation => {
    const warnings: string[] = [];
    const errors: string[] = [];
    let isPaid = leaveTypeIsPaid;
    let autoUnpaidReason: string | undefined;
    let requiresHRApproval = false;

    const requestType = determineRequestType(startDate, isEmergency);

    // Check employee eligibility
    if (!eligibility.isEligibleForPaidLeave && leaveTypeIsPaid) {
      isPaid = false;
      autoUnpaidReason = eligibility.ineligibilityReason;
      warnings.push(eligibility.ineligibilityReason || 'Not eligible for paid leave');
    }

    // Check request type rules
    if (requestType === 'emergency') {
      if (policy.emergency_default_unpaid) {
        isPaid = false;
        autoUnpaidReason = 'Emergency leave is unpaid by default';
        warnings.push('Emergency leave will be unpaid unless HR approves');
      }
      requiresHRApproval = true;
    } else if (requestType === 'unplanned') {
      if (policy.unplanned_default_unpaid) {
        isPaid = false;
        autoUnpaidReason = `Applied less than ${policy.min_days_advance_planned} days in advance`;
        warnings.push(`Unplanned leave will be unpaid (applied less than ${policy.min_days_advance_planned} days in advance)`);
      }
      requiresHRApproval = true;
    }

    // Check if more than 2 days - requires HR approval
    if (totalDays > 2) {
      requiresHRApproval = true;
      if (requestType === 'planned') {
        warnings.push('Leave requests over 2 days require HR approval');
      }
    }

    // Check balance - using accrued balance (what's actually earned so far)
    if (isPaid && leaveTypeIsPaid) {
      // Calculate how much they can use (accrued - already used)
      const usableBalance = accruedBalance - (availableBalance < 0 ? Math.abs(availableBalance) : (accruedBalance - availableBalance));
      
      if (availableBalance < totalDays) {
        // Not enough balance
        if (accruedBalance >= totalDays && policy.allow_advance_leave) {
          // They have accrued enough but used some - allow if advance leave is enabled
          warnings.push(`You are using advance leave. Accrued: ${accruedBalance} days, Available: ${availableBalance} days.`);
          requiresHRApproval = true;
        } else if (policy.allow_negative_balance) {
          warnings.push(`Insufficient balance (${availableBalance} days available). This will exceed your limit.`);
        } else if (!policy.allow_advance_leave && availableBalance < totalDays) {
          errors.push(`Insufficient leave balance. You have ${availableBalance} days available but requested ${totalDays} days. Pre-availing leaves is not allowed without HR/Admin approval.`);
        } else {
          errors.push(`Insufficient leave balance. You have ${availableBalance} days but requested ${totalDays} days.`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      requestType,
      isPaid,
      requiresHRApproval,
      autoUnpaidReason,
      warnings,
      errors,
    };
  }, [eligibility, policy, determineRequestType]);

  // Save or update company policy
  const savePolicy = useCallback(async (policyData: Partial<LeavePolicy>) => {
    if (!company?.id) return { success: false, error: 'No company' };

    const { data: existing } = await supabase
      .from('leave_policies')
      .select('id')
      .eq('company_id', company.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('leave_policies')
        .update(policyData)
        .eq('id', existing.id);
      
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase
        .from('leave_policies')
        .insert({ company_id: company.id, ...policyData });
      
      if (error) return { success: false, error: error.message };
    }

    await fetchPolicy();
    return { success: true };
  }, [company?.id, fetchPolicy]);

  return {
    policy,
    eligibility,
    isLoading,
    determineRequestType,
    validateLeaveRequest,
    savePolicy,
    refreshEligibility: fetchEligibility,
    refreshPolicy: fetchPolicy,
  };
}
