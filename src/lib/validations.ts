import { z } from 'zod';

// User invite validation schema
export const userInviteSchema = z.object({
  email: z.string()
    .trim()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  full_name: z.string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, hyphens and apostrophes'),
  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  department_id: z.string().uuid().optional().or(z.literal('')).or(z.null()),
});

// Role creation/edit validation
export const roleSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Role name can only contain letters, spaces, hyphens and apostrophes'),
  description: z.string()
    .trim()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

// Leave request validation
export const leaveRequestSchema = z.object({
  leave_type_id: z.string().uuid('Please select a leave type'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  reason: z.string()
    .trim()
    .max(1000, 'Reason must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
}).refine(data => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: 'End date must be after or equal to start date',
  path: ['end_date'],
});

// Leave type config validation
export const leaveTypeSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters'),
  description: z.string()
    .trim()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
  days_per_year: z.number()
    .min(0, 'Days per year cannot be negative')
    .max(365, 'Days per year cannot exceed 365'),
  is_paid: z.boolean(),
  is_carry_forward: z.boolean(),
  max_carry_forward_days: z.number()
    .min(0, 'Max carry forward days cannot be negative')
    .max(365, 'Max carry forward days cannot exceed 365')
    .optional(),
  is_active: z.boolean(),
});

// Attendance notes validation
export const attendanceNotesSchema = z.string()
  .trim()
  .max(500, 'Notes must be less than 500 characters')
  .optional()
  .or(z.literal(''));

// Department validation
export const departmentSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Department name must be at least 2 characters')
    .max(100, 'Department name must be less than 100 characters'),
  description: z.string()
    .trim()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

// Company settings validation
export const companySettingsSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters'),
  legal_name: z.string()
    .trim()
    .max(200, 'Legal name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  industry: z.string()
    .trim()
    .max(100, 'Industry must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  size: z.string()
    .max(50, 'Size must be less than 50 characters')
    .optional()
    .or(z.literal('')),
});

// Helper function to get first error message from Zod validation
export const getValidationError = (result: z.SafeParseReturnType<unknown, unknown>): string | null => {
  if (result.success) return null;
  return result.error.issues[0]?.message || 'Validation failed';
};
