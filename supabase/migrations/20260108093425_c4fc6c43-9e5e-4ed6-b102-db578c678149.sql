-- Compliance Requirements table - main compliance items
CREATE TABLE public.compliance_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'not_applicable')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'monthly', 'quarterly', 'annually')),
  next_due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance Documents table - documents attached to requirements
CREATE TABLE public.compliance_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.compliance_requirements(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL DEFAULT 'policy',
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  version TEXT DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE,
  expiry_date DATE,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance Audits table
CREATE TABLE public.compliance_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audit_type TEXT NOT NULL DEFAULT 'internal' CHECK (audit_type IN ('internal', 'external', 'regulatory')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  auditor_name TEXT,
  auditor_organization TEXT,
  findings TEXT,
  recommendations TEXT,
  score INTEGER,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance Audit Items
CREATE TABLE public.compliance_audit_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.compliance_audits(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES public.compliance_requirements(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'fail', 'partial', 'not_applicable')),
  notes TEXT,
  evidence_url TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for compliance_requirements
CREATE POLICY "Users can view compliance requirements in their company"
  ON public.compliance_requirements FOR SELECT
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users with manage permission can insert requirements"
  ON public.compliance_requirements FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users with manage permission can update requirements"
  ON public.compliance_requirements FOR UPDATE
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users with manage permission can delete requirements"
  ON public.compliance_requirements FOR DELETE
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for compliance_documents
CREATE POLICY "Users can view compliance documents in their company"
  ON public.compliance_documents FOR SELECT
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users with manage permission can insert documents"
  ON public.compliance_documents FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users with manage permission can update documents"
  ON public.compliance_documents FOR UPDATE
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users with manage permission can delete documents"
  ON public.compliance_documents FOR DELETE
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for compliance_audits
CREATE POLICY "Users can view audits in their company"
  ON public.compliance_audits FOR SELECT
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users with manage permission can insert audits"
  ON public.compliance_audits FOR INSERT
  WITH CHECK (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users with manage permission can update audits"
  ON public.compliance_audits FOR UPDATE
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users with manage permission can delete audits"
  ON public.compliance_audits FOR DELETE
  USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for compliance_audit_items
CREATE POLICY "Users can view audit items via audit access"
  ON public.compliance_audit_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.compliance_audits a
    WHERE a.id = audit_id
    AND a.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users with manage permission can insert audit items"
  ON public.compliance_audit_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.compliance_audits a
    WHERE a.id = audit_id
    AND a.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users with manage permission can update audit items"
  ON public.compliance_audit_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.compliance_audits a
    WHERE a.id = audit_id
    AND a.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ));

CREATE POLICY "Users with manage permission can delete audit items"
  ON public.compliance_audit_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.compliance_audits a
    WHERE a.id = audit_id
    AND a.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  ));

-- Triggers for updated_at
CREATE TRIGGER update_compliance_requirements_updated_at
  BEFORE UPDATE ON public.compliance_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_documents_updated_at
  BEFORE UPDATE ON public.compliance_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_audits_updated_at
  BEFORE UPDATE ON public.compliance_audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();