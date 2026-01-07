import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Search, Users, Pencil, Plus, Minus, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BalanceRecord {
  id: string;
  profile_id: string;
  full_name: string | null;
  email: string | null;
  department_id: string | null;
  leave_type_id: string;
  leave_type_name: string | null;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number | null;
  carry_forward_days: number;
  accrued_days: number | null;
  is_paid: boolean | null;
  is_monthly_quota: boolean | null;
}

interface LeaveType {
  id: string;
  name: string;
  is_monthly_quota?: boolean;
}

interface AdjustmentLog {
  id: string;
  profile_id: string;
  leave_type_id: string;
  adjustment_type: string;
  adjustment_days: number;
  previous_balance: number;
  new_balance: number;
  reason: string;
  adjusted_by: string;
  created_at: string;
  adjusted_by_name?: string;
}

const ManageLeaveBalances: React.FC = () => {
  const { user } = useAuth();
  const { company } = useCompany();
  const [balances, setBalances] = useState<BalanceRecord[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Adjustment dialog state
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<BalanceRecord | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "deduct" | "set">("add");
  const [adjustmentDays, setAdjustmentDays] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!company?.id) return;
      setIsLoading(true);

      const [typesResult, balancesResult] = await Promise.all([
        supabase
          .from("leave_types")
          .select("id, name, is_monthly_quota")
          .eq("company_id", company.id)
          .eq("is_active", true),
        supabase
          .from("leave_balance_summary")
          .select("*")
          .eq("company_id", company.id)
          .eq("year", selectedYear)
          .order("full_name", { ascending: true }),
      ]);

      if (!typesResult.error) setLeaveTypes(typesResult.data || []);
      if (!balancesResult.error) setBalances((balancesResult.data || []) as BalanceRecord[]);
      setIsLoading(false);
    };
    fetchData();
  }, [company?.id, selectedYear]);

  const filteredBalances = balances
    .filter((b) => !b.is_monthly_quota) // Only show annual leave types for balance management
    .filter((b) => {
      const matchesSearch =
        !searchQuery ||
        b.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedLeaveType === "all" || b.leave_type_id === selectedLeaveType;
      return matchesSearch && matchesType;
    });

  const years = [new Date().getFullYear(), new Date().getFullYear() - 1];

  const openAdjustDialog = (balance: BalanceRecord) => {
    setSelectedBalance(balance);
    setAdjustmentType("add");
    setAdjustmentDays(0);
    setAdjustmentReason("");
    setAdjustDialogOpen(true);
  };

  const handleAdjustBalance = async () => {
    if (!selectedBalance || !user?.id || adjustmentDays === 0) return;
    if (!adjustmentReason.trim()) {
      toast.error("Please provide a reason for this adjustment");
      return;
    }

    setIsSaving(true);
    try {
      const previousBalance = Number(selectedBalance.total_days);
      let newBalance: number;

      switch (adjustmentType) {
        case "add":
          newBalance = previousBalance + adjustmentDays;
          break;
        case "deduct":
          newBalance = Math.max(0, previousBalance - adjustmentDays);
          break;
        case "set":
          newBalance = adjustmentDays;
          break;
        default:
          newBalance = previousBalance;
      }

      // Update the leave balance
      const { error: updateError } = await supabase
        .from("leave_balances")
        .update({ total_days: newBalance })
        .eq("id", selectedBalance.id);

      if (updateError) throw updateError;

      toast.success(
        `Balance adjusted: ${previousBalance} → ${newBalance} days`
      );
      setAdjustDialogOpen(false);

      // Refresh balances
      const { data: refreshed } = await supabase
        .from("leave_balance_summary")
        .select("*")
        .eq("company_id", company?.id)
        .eq("year", selectedYear)
        .order("full_name", { ascending: true });

      if (refreshed) setBalances(refreshed as BalanceRecord[]);
    } catch (error: any) {
      toast.error(error.message || "Failed to adjust balance");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Manage Leave Balances
        </CardTitle>
        <CardDescription>
          View and adjust employee leave balances. Click on any row to adjust the balance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Leave Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leave Types</SelectItem>
              {leaveTypes
                .filter((t) => !t.is_monthly_quota)
                .map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Balances Table */}
        {filteredBalances.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.map((b) => (
                  <TableRow key={b.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <p className="font-medium">{b.full_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{b.email}</p>
                    </TableCell>
                    <TableCell>{b.leave_type_name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {Number(b.total_days).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(b.used_days).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={Number(b.remaining_days || 0) > 0 ? "default" : "secondary"}
                      >
                        {Number(b.remaining_days || 0).toFixed(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAdjustDialog(b)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No leave balances found</p>
            <p className="text-sm mt-1">Try adjusting your filters or initialize balances first</p>
          </div>
        )}

        {/* Adjustment Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Leave Balance</DialogTitle>
              <DialogDescription>
                Modify the leave balance for {selectedBalance?.full_name}
              </DialogDescription>
            </DialogHeader>
            {selectedBalance && (
              <div className="space-y-4 py-4">
                {/* Current Balance Info */}
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">
                        {Number(selectedBalance.total_days).toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Total Days</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {Number(selectedBalance.used_days).toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Used</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        {Number(selectedBalance.remaining_days || 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                    </div>
                  </div>
                  <p className="text-center mt-2 text-sm text-muted-foreground">
                    {selectedBalance.leave_type_name} • {selectedYear}
                  </p>
                </div>

                {/* Adjustment Type */}
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant={adjustmentType === "add" ? "default" : "outline"}
                      onClick={() => setAdjustmentType("add")}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                    <Button
                      type="button"
                      variant={adjustmentType === "deduct" ? "default" : "outline"}
                      onClick={() => setAdjustmentType("deduct")}
                      className="w-full"
                    >
                      <Minus className="h-4 w-4 mr-1" />
                      Deduct
                    </Button>
                    <Button
                      type="button"
                      variant={adjustmentType === "set" ? "default" : "outline"}
                      onClick={() => setAdjustmentType("set")}
                      className="w-full"
                    >
                      Set To
                    </Button>
                  </div>
                </div>

                {/* Days Input */}
                <div className="space-y-2">
                  <Label>
                    {adjustmentType === "set"
                      ? "New Balance (Days)"
                      : "Number of Days"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={adjustmentDays}
                    onChange={(e) =>
                      setAdjustmentDays(parseFloat(e.target.value) || 0)
                    }
                  />
                  {adjustmentType !== "set" && adjustmentDays > 0 && (
                    <p className="text-sm text-muted-foreground">
                      New balance will be:{" "}
                      <strong>
                        {adjustmentType === "add"
                          ? (Number(selectedBalance.total_days) + adjustmentDays).toFixed(1)
                          : Math.max(0, Number(selectedBalance.total_days) - adjustmentDays).toFixed(1)}
                      </strong>{" "}
                      days
                    </p>
                  )}
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label>Reason *</Label>
                  <Textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="E.g., Carry forward from previous year, Correction, Bonus leave granted..."
                    rows={3}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setAdjustDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdjustBalance}
                    disabled={
                      isSaving || adjustmentDays === 0 || !adjustmentReason.trim()
                    }
                    className="flex-1"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Apply Adjustment
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default ManageLeaveBalances;
