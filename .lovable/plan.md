
# Responsiveness Improvement Plan - Page by Page

We'll fix all 27 pages one at a time. Here's the full order and the common issues I've identified, starting with **Page 1: Dashboard**.

## Order of Pages

| # | Page | Key Issues |
|---|------|------------|
| 1 | Dashboard | Grid cards stack fine, but inner `container mx-auto` adds unnecessary padding on small screens |
| 2 | Auth (Login/Signup) | Already responsive (centered card with `px-4`) |
| 3 | Forgot Password | Likely same pattern as Auth - quick check |
| 4 | Reset Password | Same pattern |
| 5 | Profile Page | Form grids with `grid-cols-2` need `grid-cols-1` on mobile |
| 6 | Employee Directory | Dialog with `grid-cols-2` needs mobile stacking, dialog `max-w-2xl` may be too wide |
| 7 | Onboarding | Header with flex `justify-between` may overflow on mobile with multiple buttons |
| 8 | Attendance | Tables need horizontal scroll; `grid-cols-4` stats need mobile stacking; TabsList with 7 tabs overflows |
| 9 | Leave Management | Complex page - tables, dialogs, many tabs that overflow on mobile |
| 10 | Payroll | `grid-cols-5` TabsList overflows on mobile |
| 11 | Expenses | Similar table/tab pattern |
| 12 | Revenue | Dashboard widgets layout |
| 13 | Compliance | Tab-based layout |
| 14 | Company Settings | Form-heavy page |
| 15 | User Management | Table with many columns, invite dialog |
| 16 | Roles & Permissions | Complex grid layouts |
| 17 | Modules | Grid-based |
| 18-20 | Static pages (Unauthorized, ModuleDisabled, NotFound) | Quick fixes |
| 21-27 | Super Admin pages | Tables and forms |

## Common Responsive Patterns to Apply

1. **Tables**: Wrap in `overflow-x-auto` div, hide less-important columns on mobile with `hidden sm:table-cell`
2. **Tab Lists**: Use `flex-wrap` or `overflow-x-auto` for tabs that overflow
3. **Form Grids**: Change `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`
4. **Page Headers**: Stack title and action buttons vertically on mobile with `flex-col sm:flex-row`
5. **Dialogs**: Add `max-h-[85vh] overflow-y-auto` and reduce max-width on mobile
6. **Stat Card Grids**: Change `grid-cols-4` to `grid-cols-2 md:grid-cols-4`

## Starting with Page 1: Dashboard

### Changes for `src/pages/Dashboard.tsx`:
- Remove redundant `min-h-screen bg-muted/30` wrapper (already inside AppLayout)
- Remove commented-out header block (dead code)
- Remove `container mx-auto` from main - the layout already provides padding
- Heading size: `text-2xl` to `text-xl sm:text-2xl` for smaller screens

### Changes for `src/components/hr/HRDashboardWidgets.tsx`:
- Stats grid: change `grid gap-4 md:grid-cols-2 lg:grid-cols-4` to `grid gap-4 grid-cols-2 lg:grid-cols-4` so cards show 2-up on mobile instead of stacking fully
- Recent Leave Requests header: stack "Recent Leave Requests" title and "View All" button on mobile with `flex-col sm:flex-row gap-2`
- Leave request rows: make the flex layout wrap-friendly for narrow screens

After implementing Page 1, I'll ask you to verify it on mobile before moving to Page 2.
