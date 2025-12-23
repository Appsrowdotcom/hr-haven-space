import { Link, useLocation } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Unauthorized = () => {
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access this page. Please contact your administrator if you
          believe this is an error.
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

export default Unauthorized;
