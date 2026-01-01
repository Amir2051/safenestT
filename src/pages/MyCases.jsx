import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, AlertTriangle, Clock, CheckCircle, Loader2,
  Wallet, Calendar, DollarSign, Eye, Phone, Mail, User, Scale, ShieldCheck, Pencil, Save, X, Activity, FileStack, Plus, Search, Trash2, Filter
} from "lucide-react";
import { toast } from "sonner";
import CaseDetailDialog from "@/components/investigation/CaseDetailDialog";
import UserCaseDetail from "@/components/cases/UserCaseDetail.jsx";
import MasterCaseGenerator from "@/components/investigation/MasterCaseGenerator";
import AIPriorityBadge from "@/components/ai/AIPriorityBadge";
import { DialogTrigger } from "@/components/ui/dialog";

export default function MyCases() {
  const [user, setUser] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [editingCase, setEditingCase] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [caseToDelete, setCaseToDelete] = useState(null);
  const queryClient = useQueryClient();
  
  // Advanced Filters
  const [filters, setFilters] = useState({
    status: 'all',
    issueType: 'all',
    urgency: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'newest'
  });
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    base44.auth.me().then(userData => {
      console.log('👤 USER LOADED:', {
        email: userData?.email,
        role: userData?.role,
        is_admin: userData?.is_admin,
        job_title: userData?.job_title
      });
      setUser(userData);
    }).catch(err => {
      console.error('❌ User auth failed:', err);
    });
  }, []);

  useEffect(() => {
    if (!user || (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist')) return;
    const timer = setTimeout(() => {
        if (searchQuery.trim().length >= 1) performSearch();
        else if (searchQuery.trim().length === 0) setSearchResults(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
        const res = await base44.functions.invoke('adminCaseSearch', { query: searchQuery });
        if (res.data.cases) setSearchResults(res.data.cases);
    } catch (e) { console.error(e); }
    setIsSearching(false);
  };

  // Fetch MyCase - SINGLE SOURCE OF TRUTH
  const { data: myCases = [], isLoading: loadingMyCases, refetch: refetchCases } = useQuery({
    queryKey: ['my-cases', user?.email, user?.id],
    queryFn: async () => {
      console.log('🔍 FETCHING CASES:', { 
        user_email: user?.email, 
        user_id: user?.id,
        role: user?.role,
        is_admin: user?.is_admin,
        job_title: user?.job_title
      });

      // ADMIN: Fetch ALL cases globally with NO filters
      const isAdmin = user?.role === 'admin' || user?.is_admin || user?.job_title === 'Fraud Specialist';
      console.log('🔑 ADMIN CHECK:', isAdmin);

      if (isAdmin) {
          console.log('🚨 ADMIN MODE: Fetching ALL cases with service role...');
          const allCases = await base44.asServiceRole.entities.MyCase.list(null, 50000);
          console.log(`✅ ADMIN VIEW: ${allCases.length} TOTAL cases in database`);
          console.log(`📊 Sample Case IDs:`, allCases.slice(0, 10).map(c => ({
            id: c.id,
            number: c.case_number,
            status: c.status,
            created: c.created_date
          })));

          if (allCases.length < 50) {
            console.warn('⚠️ ADMIN LOW COUNT WARNING:', allCases.length, 'cases (expected ~80)');
          }

          return allCases;
      }

      // USER: Fetch ONLY their cases via RLS
      console.log('👤 USER MODE: Fetching user-specific cases...');
      const userCases = await base44.entities.MyCase.list('-created_date', 10000);
      console.log(`✅ USER (${user?.email}): ${userCases.length} cases visible via RLS`);

      // 🚨 CRITICAL: Zero-case detection and recovery
      if (userCases.length === 0) {
          console.warn('⚠️ ZERO CASES DETECTED - Running verification...');

          const response = await base44.functions.invoke('p0IncidentResponse', {
              action: 'verify_user_visibility',
              user_email: user?.email
          });

          const expected = response.data.total_cases_for_user;

          if (expected > 0) {
              console.error(`❌ P0 VISIBILITY FAILURE: User should see ${expected} cases but RLS returns 0!`);
              console.error('📋 Missing cases:', response.data.cases.map(c => c.case_number));

              toast.error(
                `CRITICAL: ${expected} of your cases are not visible. Admin has been notified.`,
                { 
                  duration: 10000,
                  description: 'Your cases exist but visibility is broken. Refreshing...'
                }
              );

              return response.data.cases;
          } else {
              console.log('✅ Verified: User has no cases submitted yet');
          }
      }

      return userCases;
    },
    enabled: !!user,
    refetchInterval: 3000,
    staleTime: 0
  });

  // Fetch My Reported Scams
  const { data: myScams = [], isLoading: loadingMyScams } = useQuery({
    queryKey: ['my-scams'],
    queryFn: async () => {
        if (!user) return [];

        // ADMIN: Fetch ALL scam reports
        const isAdmin = user?.role === 'admin' || user?.is_admin || user?.job_title === 'Fraud Specialist';
        if (isAdmin) {
            const allScams = await base44.asServiceRole.entities.ScamDatabase.list(null, 10000);
            console.log(`🔴 ADMIN: ${allScams.length} total scam reports`);
            return allScams;
        }

        // USER: Only their reports
        return base44.entities.ScamDatabase.filter({ created_by: user.email }, '-created_date', 1000);
    },
    enabled: !!user
  });

  const handleCaseUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['my-cases'] });
      queryClient.invalidateQueries({ queryKey: ['my-scams'] });
  };

  const confirmDelete = async () => {
    if (!caseToDelete) return;
    try {
      // MyCase or ScamDatabase?
      // Assuming MyCase for now as per instructions, but let's handle both if possible or just MyCase.
      // Instructions say "Delete Case action... My Case page".
      // Let's stick to MyCase entity.
      
      const entity = caseToDelete._entityName === 'ScamDatabase' ? base44.entities.ScamDatabase : base44.entities.MyCase;
      await entity.delete(caseToDelete.id);
      
      toast.success("Case deleted successfully");
      handleCaseUpdate();
    } catch (error) {
      toast.error("Failed to delete case: " + error.message);
    } finally {
      setCaseToDelete(null);
    }
  };

  // Normalize cases for display
  const normalizedCases = myCases.map(c => ({
      ...c,
      id: c.id,
      case_title: c.case_number ? `${c.case_number} - ${c.issue_type}` : c.client_name,
      status: c.status,
      amount: c.amount_lost,
      currency: c.cryptocurrency || 'USD',
      created_date: c.created_date,
      type: 'client',
      _entityName: 'MyCase',
      fraud_type: c.issue_type,
      description: c.description,
      blockchain: c.blockchain,
      scammer_wallet: c.scammer_wallet,
      admin_status: c.status
  }));

  const normalizedScams = myScams.map(s => ({
      ...s,
      id: s.id,
      case_title: `Report: ${s.identifier}`,
      status: s.status === 'active' ? 'Reported' : s.status,
      amount: s.total_stolen_usd,
      currency: 'USD',
      created_date: s.created_date,
      type: 'report',
      _entityName: 'ScamDatabase',
      fraud_type: 'scam_report',
      description: s.scam_description,
      blockchain: s.blockchain,
      scammer_wallet: s.scam_type === 'wallet' ? s.identifier : null,
      admin_status: s.status
  }));

  const baseCases = [...normalizedCases, ...normalizedScams];
  console.log('📦 BASE CASES:', {
    myCases_count: myCases.length,
    normalizedCases_count: normalizedCases.length,
    myScams_count: myScams.length,
    normalizedScams_count: normalizedScams.length,
    baseCases_count: baseCases.length
  });
  const activeList = (searchQuery && searchResults) ? searchResults.map(c => ({
      ...c,
      id: c.id,
      case_title: c.case_number ? `${c.case_number} - ${c.issue_type}` : c.client_name,
      status: c.status,
      amount: c.amount_lost,
      currency: c.cryptocurrency || 'USD',
      created_date: c.created_date,
      type: 'client',
      _entityName: 'MyCase',
      fraud_type: c.issue_type,
      description: c.description,
      blockchain: c.blockchain,
      scammer_wallet: c.scammer_wallet,
      admin_status: c.status
  })) : baseCases;

  // Apply filters and global search
  const filteredCases = activeList.filter(c => {
    // Global search filter
    if (globalSearch.trim()) {
      const search = globalSearch.toLowerCase();
      const matches = 
        c.client_name?.toLowerCase().includes(search) ||
        c.case_number?.toLowerCase().includes(search) ||
        c.case_title?.toLowerCase().includes(search) ||
        c.scammer_wallet?.toLowerCase().includes(search) ||
        c.description?.toLowerCase().includes(search);
      if (!matches) return false;
    }
    
    // Status filter
    if (filters.status !== 'all' && c.status?.toLowerCase() !== filters.status.toLowerCase()) {
      return false;
    }
    
    // Issue type filter
    if (filters.issueType !== 'all' && c.fraud_type !== filters.issueType && c.issue_type !== filters.issueType) {
      return false;
    }
    
    // Urgency filter
    if (filters.urgency !== 'all' && c.urgency?.toLowerCase() !== filters.urgency.toLowerCase()) {
      return false;
    }
    
    // Date range filter
    if (filters.dateFrom && c.created_date) {
      const caseDate = new Date(c.created_date);
      const fromDate = new Date(filters.dateFrom);
      if (caseDate < fromDate) return false;
    }
    if (filters.dateTo && c.created_date) {
      const caseDate = new Date(c.created_date);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      if (caseDate > toDate) return false;
    }
    
    return true;
  });

  // Apply sorting
  const allCases = [...filteredCases].sort((a, b) => {
    const dateA = a.created_date ? new Date(a.created_date) : new Date(0);
    const dateB = b.created_date ? new Date(b.created_date) : new Date(0);

    switch(filters.sortBy) {
      case 'newest':
        return dateB - dateA;
      case 'oldest':
        return dateA - dateB;
      case 'amount-high':
        return (b.amount || 0) - (a.amount || 0);
      case 'amount-low':
        return (a.amount || 0) - (b.amount || 0);
      case 'priority':
        return (b.priority_score || 0) - (a.priority_score || 0);
      default:
        return dateB - dateA;
    }
  });

  console.log('📊 FINAL COUNTS:', {
    activeList_count: activeList.length,
    filteredCases_count: filteredCases.length,
    allCases_count: allCases.length,
    filters: filters
  });

  const isLoading = loadingMyCases || loadingMyScams;

  // Using CaseDetailDialog instead

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const statusConfig = {
    // Standard statuses
    pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock, label: 'Pending' },
    'in review': { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50', icon: Eye, label: 'In Review' },
    'in progress': { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Activity, label: 'In Progress' },
    called: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: Phone, label: 'Called' },
    resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle, label: 'Resolved' },
    closed: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/50', icon: FileText, label: 'Closed' },
    
    // Legacy/Other
    new: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', icon: Clock, label: 'New' },
    reported: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock, label: 'Reported' },
    investigating: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: Eye, label: 'Investigating' },
    traced: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: Wallet, label: 'Traced' },
    recovering: { color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', icon: DollarSign, label: 'Recovering' },
    recovered: { color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle, label: 'Recovered' }
  };

  const adminStatusConfig = {
    Pending: { color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' },
    Contacted: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
    'In Progress': { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
    Resolved: { color: 'bg-green-500/20 text-green-400 border-green-500/50' }
  };

  const fraudTypeConfig = {
    crypto_theft: { color: 'text-red-400', label: '🔴 Crypto Theft' },
    phishing: { color: 'text-orange-400', label: '🟠 Phishing Attack' },
    fake_exchange: { color: 'text-yellow-400', label: '🟡 Fake Exchange' },
    rug_pull: { color: 'text-pink-400', label: '🩷 Rug Pull' },
    romance_scam: { color: 'text-purple-400', label: '🟣 Romance Scam' },
    investment_scam: { color: 'text-cyan-400', label: '🔵 Investment Scam' },
    scam_report: { color: 'text-yellow-400', label: '⚠️ Scam Report' },
    other: { color: 'text-gray-300', label: '⚪ Other' }
  };

  const stats = {
    total: allCases.length,
    pending: allCases.filter(c => c.status === 'Pending' || c.status === 'reported').length,
    inProgress: allCases.filter(c => c.status === 'In Progress' || c.status === 'investigating' || c.status === 'traced').length,
    resolved: allCases.filter(c => c.status === 'Resolved' || c.status === 'recovered').length,
    totalLost: allCases.reduce((sum, c) => sum + (c.amount || 0), 0)
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Debug Panel - Remove after fix */}
      {user && (
        <Card className="bg-red-500/10 border-red-500/30 mb-4">
          <CardContent className="p-4">
            <h3 className="text-red-400 font-bold mb-2">🔧 DEBUG PANEL</h3>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>user.role: {user.role || 'null'}</div>
              <div>user.is_admin: {String(user.is_admin)}</div>
              <div>user.job_title: {user.job_title || 'null'}</div>
              <div>isAdmin check: {String(user?.role === 'admin' || user?.is_admin || user?.job_title === 'Fraud Specialist')}</div>
              <div>myCases.length: {myCases.length}</div>
              <div>myScams.length: {myScams.length}</div>
              <div>baseCases.length: {baseCases.length}</div>
              <div>allCases.length: {allCases.length}</div>
              <div>isLoading: {String(isLoading)}</div>
              <div>Query enabled: {String(!!user)}</div>
            </div>
            <Button 
              onClick={async () => {
                console.log('🔍 MANUAL FETCH TEST');
                const test = await base44.asServiceRole.entities.MyCase.list(null, 50000);
                console.log('📊 DIRECT FETCH RESULT:', test.length, 'cases');
                alert(`Direct fetch returned ${test.length} cases`);
              }}
              className="mt-2 bg-red-500 hover:bg-red-600 text-xs"
              size="sm"
            >
              Test Direct Fetch
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-cyan-400" />
            My Cases
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-mono">
              {allCases.length} Total
            </Badge>
            {allCases.some(c => c.priority_score >= 80) && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">
                {allCases.filter(c => c.priority_score >= 80).length} Critical
              </Badge>
            )}
          </h1>
          <p className="text-gray-400 mt-1 mb-2">
            {user?.role === 'admin' || user?.is_admin 
              ? `Viewing ALL ${allCases.length} cases globally` 
              : `Showing all cases you've submitted`}
          </p>
          {(user?.role === 'admin' || user?.is_admin || user?.job_title === 'Fraud Specialist') && (
            <div className="flex gap-2 items-center mt-2">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input 
                        placeholder="Admin Search: Name, Email, Victim, Case ID..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-[#1a2332] border-cyan-500/30 text-white h-10 focus:border-cyan-500"
                    />
                    {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                        </div>
                    )}
                </div>
                <Button 
                    variant="outline" 
                    size="sm"
                    className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    onClick={async () => {
                        toast.info("Running permissions repair...");
                        try {
                            const res = await base44.functions.invoke('caseManagement', { action: 'recover_access' });
                            if (res.data.success) toast.success("Fixed: " + res.data.message);
                            else toast.error("Error: " + res.data.error);
                        } catch (e) { toast.error("Failed to run repair"); }
                    }}
                    title="Fix User Visibility Issues"
                >
                    <ShieldCheck className="w-4 h-4" />
                </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['my-cases'] });
              refetchCases();
              toast.success('Refreshing cases...');
            }}
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
          >
            <Activity className="w-4 h-4 mr-2" />
            Refresh Now
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                <FileStack className="w-5 h-5 mr-2" />
                Generate Master IC3 Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl bg-transparent border-none p-0 shadow-none">
              <MasterCaseGenerator />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Advanced Filters */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Global Search */}
            <div className="flex-1">
              <Label className="text-gray-300 text-sm mb-2 block">Search Cases</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name, case #, wallet, or description..."
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  className="pl-10 bg-[#0f1419] border-cyan-500/30 text-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({...filters, status: v})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in review">In Review</SelectItem>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Issue Type Filter */}
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Issue Type</Label>
              <Select value={filters.issueType} onValueChange={(v) => setFilters({...filters, issueType: v})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="crypto_theft">Crypto Theft</SelectItem>
                  <SelectItem value="phishing">Phishing</SelectItem>
                  <SelectItem value="investment_scam">Investment Scam</SelectItem>
                  <SelectItem value="romance_scam">Romance Scam</SelectItem>
                  <SelectItem value="rug_pull">Rug Pull</SelectItem>
                  <SelectItem value="fake_exchange">Fake Exchange</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Urgency Filter */}
            <div>
              <Label className="text-gray-300 text-sm mb-2 block">Urgency</Label>
              <Select value={filters.urgency} onValueChange={(v) => setFilters({...filters, urgency: v})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second Row: Date Range & Sort */}
          <div className="flex flex-col lg:flex-row gap-4 mt-4">
            <div className="flex gap-2 items-end">
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">From Date</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm mb-2 block">To Date</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                  className="bg-[#0f1419] border-cyan-500/30 text-white"
                />
              </div>
            </div>

            <div className="flex-1">
              <Label className="text-gray-300 text-sm mb-2 block">Sort By</Label>
              <Select value={filters.sortBy} onValueChange={(v) => setFilters({...filters, sortBy: v})}>
                <SelectTrigger className="bg-[#0f1419] border-cyan-500/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="amount-high">Highest Amount</SelectItem>
                  <SelectItem value="amount-low">Lowest Amount</SelectItem>
                  <SelectItem value="priority">Priority Score</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters */}
            {(globalSearch || filters.status !== 'all' || filters.issueType !== 'all' || 
              filters.urgency !== 'all' || filters.dateFrom || filters.dateTo) && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGlobalSearch("");
                    setFilters({
                      status: 'all',
                      issueType: 'all',
                      urgency: 'all',
                      dateFrom: '',
                      dateTo: '',
                      sortBy: 'newest'
                    });
                  }}
                  className="border-gray-500/30 text-gray-400 hover:bg-gray-500/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              </div>
            )}
          </div>

          {/* Filter Summary */}
          {allCases.length !== baseCases.length && (
            <div className="mt-4 pt-4 border-t border-cyan-500/10">
              <p className="text-sm text-cyan-400">
                Showing {allCases.length} of {baseCases.length} cases
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardContent className="p-4 text-center">
            <FileText className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-gray-400">Total Cases</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-orange-500/20">
          <CardContent className="p-4 text-center">
            <Clock className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-orange-400">{stats.pending}</p>
            <p className="text-sm text-gray-400">Pending</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-4 text-center">
            <Eye className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-400">{stats.inProgress}</p>
            <p className="text-sm text-gray-400">In Progress</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-400">{stats.resolved}</p>
            <p className="text-sm text-gray-400">Resolved</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-3xl font-bold text-red-400">${stats.totalLost.toLocaleString()}</p>
            <p className="text-sm text-gray-400">Total Lost</p>
          </CardContent>
        </Card>
      </div>

      {/* Cases List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Your Submitted Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading your cases...</p>
            </div>
          ) : allCases.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold text-lg">No cases found</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">
                {user?.role === 'admin' || user?.is_admin
                  ? 'No cases in the database yet'
                  : 'You haven\'t submitted any cases yet'}
              </p>
              {!(user?.role === 'admin' || user?.is_admin) && (
                <Button
                  onClick={() => {
                    console.log('🔄 Manual verification requested by user');
                    refetchCases();
                  }}
                  variant="outline"
                  className="border-cyan-500/30 text-cyan-400"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Check Again
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {allCases.map((caseItem) => {
                // Safe access to properties
                const status = statusConfig[caseItem.status.toLowerCase()] || statusConfig.reported;
                const fraudType = fraudTypeConfig[caseItem.fraud_type] || fraudTypeConfig.other;
                const StatusIcon = status.icon;

                return (
                  <div
                    key={caseItem.id}
                    className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedCase(caseItem)}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-white font-semibold truncate">
                            {caseItem.case_title || 'Untitled Case'}
                          </h3>
                          <Badge className={`${status.color} border text-xs`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {caseItem.status}
                          </Badge>
                          {caseItem.admin_status && caseItem.admin_status !== caseItem.status && (
                              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50 border text-xs">
                                {caseItem.admin_status}
                              </Badge>
                          )}
                          {caseItem.priority_score && (
                            <AIPriorityBadge score={caseItem.priority_score} size="sm" />
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <span className={`font-semibold ${fraudType.color}`}>
                            {fraudType.label}
                          </span>
                          <span className="text-gray-400 flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {(caseItem.amount || 0).toLocaleString()} {caseItem.currency || 'USD'}
                          </span>
                          <span className="text-gray-400 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {caseItem.created_date && caseItem.created_date !== 'Invalid Date' 
                              ? new Date(caseItem.created_date).toLocaleDateString() 
                              : 'Processing Date...'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {caseItem.scammer_wallet && (
                            <p className="text-gray-500 text-xs font-mono truncate">
                              Scammer: {caseItem.scammer_wallet}
                            </p>
                          )}
                          {user.role === 'admin' && (
                            <p className="text-purple-400 text-xs truncate flex items-center gap-1">
                              <User className="w-3 h-3" />
                              User: {[caseItem.client_email, caseItem.created_by_email, caseItem.created_by, caseItem.client_name, caseItem.created_by_name].find(e => e && typeof e === 'string' && !e.trim().toLowerCase().startsWith('service+') && !e.toLowerCase().includes('no-reply.base44.com') && !e.toLowerCase().includes('base44.com')) || 'Unknown'}
                            </p>
                          )}
                          {caseItem.law_enforcement_authorization?.authorized && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50 border text-xs">
                              <Scale className="w-3 h-3 mr-1" />
                              Law Enforcement Authorized
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {(user.role === 'admin' || user.is_admin) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCaseToDelete(caseItem);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCase(caseItem);
                          }}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Manage Case
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCase && (
        (user.role === 'admin' || user.is_admin || user.job_title === 'Fraud Specialist') ? (
          <CaseDetailDialog
            caseData={selectedCase}
            onClose={() => setSelectedCase(null)}
            onUpdate={handleCaseUpdate}
          />
        ) : (
          <UserCaseDetail 
            caseData={selectedCase}
            onClose={() => setSelectedCase(null)}
          />
        )
      )}

      <AlertDialog open={!!caseToDelete} onOpenChange={(open) => !open && setCaseToDelete(null)}>
        <AlertDialogContent className="bg-[#1a2332] border-cyan-500/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete the case 
              <span className="font-mono text-cyan-400 mx-1">
                {caseToDelete?.case_number || caseToDelete?.case_title}
              </span>
              and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent text-gray-400 border-gray-600 hover:bg-gray-800 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white border-none"
            >
              Delete Case
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}