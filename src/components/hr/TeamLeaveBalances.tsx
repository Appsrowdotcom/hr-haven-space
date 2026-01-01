import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Users } from "lucide-react";

interface TeamBalance {
  id: string;
  profile_id: string;
  full_name: string | null;
  email: string | null;
  department_id: string | null;
  department_name?: string | null;
  leave_type_id: string;
  leave_type_name: string | null;
  year: number;
  total_days: number;
  used_days: number;
  remaining_days: number | null;
  carry_forward_days: number;
  accrued_days: number | null;
  is_paid: boolean | null;
}

interface LeaveType {
  id: string;
  name: string;
}

const TeamLeaveBalances: React.FC = () => {
  const { company } = useCompany();
  const [balances, setBalances] = useState<TeamBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      if (!company?.id) return;
      setIsLoading(true);

      // Fetch leave types and team balances in parallel
      const [typesResult, balancesResult] = await Promise.all([
        supabase
          .from("leave_types")
          .select("id, name")
          .eq("company_id", company.id)
          .eq("is_active", true),
        supabase
          .from("leave_balance_summary")
          .select("*")
          .eq("company_id", company.id)
          .eq("year", selectedYear)
          .order("full_name", { ascending: true }),
      ]);

      if (typesResult.error) {
        console.error("Error fetching leave types:", typesResult.error);
      } else {
        setLeaveTypes(typesResult.data || []);
      }

      if (balancesResult.error) {
        console.error("Error fetching team balances:", balancesResult.error);
      } else {
        setBalances((balancesResult.data || []) as TeamBalance[]);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [company?.id, selectedYear]);

  // Filter balances
  const filteredBalances = balances.filter((balance) => {
    const matchesSearch =
      !searchQuery ||
      balance.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      balance.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      balance.department_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLeaveType = selectedLeaveType === "all" || balance.leave_type_id === selectedLeaveType;

    return matchesSearch && matchesLeaveType;
  });

  // Group balances by employee for summary view
  const employeesSummary = filteredBalances.reduce(
    (acc, balance) => {
      if (!acc[balance.profile_id]) {
        acc[balance.profile_id] = {
          profile_id: balance.profile_id,
          full_name: balance.full_name,
          email: balance.email,
          department_name: balance.department_name,
          balances: [],
        };
      }
      acc[balance.profile_id].balances.push(balance);
      return acc;
    },
    {} as Record<string, { profile_id: string; full_name: string; email: string; department_name: string | null; balances: TeamBalance[] }>,
  );

  const years = [new Date().getFullYear(), new Date().getFullYear() - 1];

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
          Team Leave Balances
        </CardTitle>
        <CardDescription>View leave balances for all employees in your organization</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or department..."
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
              {leaveTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredBalances.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No leave balances found</p>
            <p className="text-sm">Try adjusting your filters or initialize balances for employees</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Leave Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Used</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.map((balance) => {
                  const remaining = Number(balance.remaining_days) || (Number(balance.total_days) - Number(balance.used_days));
                  const usagePercent = balance.total_days > 0 ? (Number(balance.used_days) / Number(balance.total_days)) * 100 : 0;

                  return (
                    <TableRow key={balance.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{balance.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{balance.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{balance.department_name || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{balance.leave_type_name}</span>
                          {balance.is_paid ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                              Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600 border-gray-200 text-xs">
                              Unpaid
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{Number(balance.total_days).toFixed(1)}</TableCell>
                      <TableCell className="text-right">{Number(balance.used_days).toFixed(1)}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={remaining <= 0 ? "text-destructive" : remaining <= 2 ? "text-amber-600" : "text-green-600"}>
                          {remaining.toFixed(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {usagePercent >= 100 ? (
                          <Badge variant="destructive">Exhausted</Badge>
                        ) : usagePercent >= 75 ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Low</Badge>
                        ) : (
                          <Badge className="bg-green-500/10 text-green-600 border-green-200">Available</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{Object.keys(employeesSummary).length}</p>
            <p className="text-sm text-muted-foreground">Employees</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{filteredBalances.length}</p>
            <p className="text-sm text-muted-foreground">Balance Records</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {filteredBalances.reduce((sum, b) => sum + Number(b.remaining_days || 0), 0).toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground">Total Remaining Days</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {filteredBalances.reduce((sum, b) => sum + Number(b.used_days || 0), 0).toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground">Total Used Days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamLeaveBalances;
