-- Revenue Categories table
CREATE TABLE public.revenue_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Revenue Entries table
CREATE TABLE public.revenue_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.revenue_categories(id) ON DELETE RESTRICT,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  revenue_date DATE NOT NULL,
  client_name TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Revenue Collections table
CREATE TABLE public.revenue_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revenue_entry_id UUID NOT NULL REFERENCES public.revenue_entries(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(15,2) NOT NULL,
  collection_date DATE NOT NULL,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.revenue_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_collections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for revenue_categories
CREATE POLICY "Users can view revenue categories of their company" 
ON public.revenue_categories FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert revenue categories" 
ON public.revenue_categories FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update revenue categories" 
ON public.revenue_categories FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete revenue categories" 
ON public.revenue_categories FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for revenue_entries
CREATE POLICY "Users can view revenue entries of their company" 
ON public.revenue_entries FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert revenue entries" 
ON public.revenue_entries FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update revenue entries" 
ON public.revenue_entries FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete revenue entries" 
ON public.revenue_entries FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for revenue_collections
CREATE POLICY "Users can view collections of their company" 
ON public.revenue_collections FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert collections" 
ON public.revenue_collections FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update collections" 
ON public.revenue_collections FOR UPDATE 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete collections" 
ON public.revenue_collections FOR DELETE 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Create indexes
CREATE INDEX idx_revenue_entries_company ON public.revenue_entries(company_id);
CREATE INDEX idx_revenue_entries_category ON public.revenue_entries(category_id);
CREATE INDEX idx_revenue_entries_date ON public.revenue_entries(revenue_date);
CREATE INDEX idx_revenue_collections_entry ON public.revenue_collections(revenue_entry_id);
CREATE INDEX idx_revenue_collections_company ON public.revenue_collections(company_id);

-- Add update triggers
CREATE TRIGGER update_revenue_categories_updated_at
BEFORE UPDATE ON public.revenue_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_revenue_entries_updated_at
BEFORE UPDATE ON public.revenue_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert revenue permissions with category
INSERT INTO public.permissions (code, name, description, module, category, is_sensitive) VALUES
  ('revenue.view', 'View Revenue', 'View revenue data', 'REVENUE', 'Revenue Access', false),
  ('revenue.view_own', 'View Own Revenue', 'View personal revenue entries', 'REVENUE', 'Revenue Access', false),
  ('revenue.create', 'Create Revenue', 'Add revenue entries', 'REVENUE', 'Revenue Management', false),
  ('revenue.add_collection', 'Add Collection', 'Record collections', 'REVENUE', 'Revenue Management', false),
  ('revenue.manage_categories', 'Manage Categories', 'Configure revenue categories', 'REVENUE', 'Revenue Settings', false)
ON CONFLICT (code) DO NOTHING;