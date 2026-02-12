import { useEffect, useState } from 'react';
import { Plus, Trash2, Shield } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuperAdmin {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
}

export default function SuperAdminsPage() {
  const [admins, setAdmins] = useState<SuperAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('super_admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching super admins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleToggleStatus = async (admin: SuperAdmin) => {
    try {
      const { error } = await supabase
        .from('super_admins')
        .update({ is_active: !admin.is_active })
        .eq('id', admin.id);

      if (error) throw error;
      toast.success(`Admin ${admin.is_active ? 'deactivated' : 'activated'} successfully`);
      fetchAdmins();
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error('Failed to update admin status');
    }
  };

  const handleDelete = async (adminId: string) => {
    if (!confirm('Are you sure you want to remove this super admin?')) return;

    try {
      const { error } = await supabase
        .from('super_admins')
        .delete()
        .eq('id', adminId);

      if (error) throw error;
      toast.success('Super admin removed successfully');
      fetchAdmins();
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast.error('Failed to remove admin');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Super Admins</h1>
          <p className="text-muted-foreground">Manage platform administrators</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Super Admin</DialogTitle>
              <DialogDescription>
                Add a new platform administrator. They must have an existing account.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                toast.info('To add a super admin, insert directly into the super_admins table with the user_id');
                setIsDialogOpen(false);
              }}>
                Add Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Super Admins</CardTitle>
          <CardDescription>
            {admins.length} platform administrator{admins.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Added</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No super admins found
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{admin.full_name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{admin.email}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={admin.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleStatus(admin)}
                      >
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(admin.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
