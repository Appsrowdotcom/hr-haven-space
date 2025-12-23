import { Link, useLocation } from 'react-router-dom';
import { PackageX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ModuleDisabled = () => {
  const location = useLocation();
  const moduleName = location.state?.module || 'This module';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <PackageX className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Module Not Available</h1>
        <p className="text-muted-foreground mb-6">
          The <span className="font-medium">{moduleName}</span> module is not enabled for your
          company. Please contact your administrator to enable this feature.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModuleDisabled;
