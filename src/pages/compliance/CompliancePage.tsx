import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ComplianceRequirements, ComplianceDocuments, ComplianceAudits } from '@/components/compliance';
import { PermissionGate } from '@/components/guards/PermissionGate';
import { ShieldCheck, FileText, ClipboardList } from 'lucide-react';

export default function CompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compliance Management</h1>
        <p className="text-muted-foreground">Manage compliance requirements, documents, and audits</p>
      </div>

      <Tabs defaultValue="requirements" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="requirements" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Requirements
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <PermissionGate permission="compliance.manage">
            <TabsTrigger value="audits" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Audits
            </TabsTrigger>
          </PermissionGate>
        </TabsList>

        <TabsContent value="requirements">
          <ComplianceRequirements />
        </TabsContent>

        <TabsContent value="documents">
          <ComplianceDocuments />
        </TabsContent>

        <TabsContent value="audits">
          <PermissionGate permission="compliance.manage" fallback={<div className="text-muted-foreground py-8 text-center">You don't have permission to view audits.</div>}>
            <ComplianceAudits />
          </PermissionGate>
        </TabsContent>
      </Tabs>
    </div>
  );
}
