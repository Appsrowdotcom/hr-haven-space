-- Add foreign key constraint from profiles.department_id to departments.id
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_department_id_fkey
FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;