import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
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
  Wallet, Calendar, DollarSign, Eye, Phone, Mail, User, Scale, ShieldCheck, Pencil, Save, X, Activity, FileStack, Plus, Search, Trash2, Filter, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import CaseDetailDialog from "@/components/investigation/CaseDetailDialog";
import NewCaseModal from "@/components/cases/NewCaseModal";
import CaseImportExport from "@/components/cases/CaseImportExport";
import UserCaseDetail from "@/components/cases/UserCaseDetail.jsx";
import MasterCaseGenerator from "@/components/investigation/MasterCaseGenerator";
import MergeCasesDialog from "@/components/investigation/MergeCasesDialog";
import AIPriorityBadge from "@/components/ai/AIPriorityBadge";
import { DialogTrigger } from "@/components/ui/dialog";
import { MY_CASES, GLOBAL_CASES } from "@/data/myCasesData";

export default function MyCases() {
  const [user, setUser] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [editingCase, setEditingCase] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [caseToDelete, setCaseToDelete] = useState(null);
  const [selectedCasesForMerge, setSelectedCasesForMerge] = useState([]);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [adminGlobal, setAdminGlobal] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const queryClient = useQueryClient();

  const pullY = useMotionValue(0);
  const pullProgress = useTransform(pullY, [0, 100], [0, 1]);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const isPulling = useRef(false);

  const [filters, setFilters] = useState({
    status: 'all',
    issueType: 'all',
    urgency: 'all',
    dateFrom: '',
    dateTo: '',
    sortBy: 'newest'
  });

  useEffect(() => {
    base44.auth.me().then(userData => setUser(userData)).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.is_admin || user?.role === 'admin') setAdminGlobal(true);
  }, [user]);

  const { data: myCases = [], isLoading: loadingMyCases, refetch: refetchCases } = useQuery({
    queryKey: ['my-cases', user?.id],
    queryFn: async () => {
      const cases = await base44.entities.MyCase.list('-created_date', 10000);
      return cases;
    },
    enabled: !!user,
    staleTime: 10000,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
    initialData: MY_CASES
  });

  const { data: clientCases = [] } = useQuery({
    queryKey: ['client-cases', user?.id],
    queryFn: async () => base44.entities.ClientCase.list('-created_date', 10000).catch(() => []),
    enabled: !!user,
    staleTime: 10000,
    refetchInterval: false,
    retry: false,
    initialData: []
  });

  const allRawCases = useMemo(() => {
    const seenIds = new Set();
    const merged = [...myCases, ...clientCases.map(c => ({ ...c, _sourceEntity: 'ClientCase' }))];
    return merged.filter(c => {
      const key = c.case_number || c.id;
      if (seenIds.has(key)) return false;
      seenIds.add(key);
      return true;
    });
  }, [myCases, clientCases]);

  const displayCases = useMemo(() => {
    const source = adminGlobal ? [...allRawCases, ...GLOBAL_CASES] : allRawCases;
    return source.filter(c => {
      const q = (globalSearch || "").toLowerCase();
      if (!q) return true;
      return (c.case_number||"").toLowerCase().includes(q) || (c.title || c.case_number || "").toLowerCase().includes(q) || (c.client_email||"").toLowerCase().includes(q);
    }).sort((a,b) => new Date(b.created_date) - new Date(a.created_date));
  }, [allRawCases, globalSearch, adminGlobal]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchCases();
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success('Cases refreshed!');
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
      pullY.set(0);
    }
  };

  const handleTouchStart = (e) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling.current) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0 && diff < 120) pullY.set(diff);
  };

  const handleTouchEnd = () => {
    if (pullY.get() > 80 && !isRefreshing) handleRefresh(); else animate(pullY, 0, { type: 'spring', stiffness: 300, damping: 30 });
    isPulling.current = false;
  };

  useEffect(() => {
    if (!user || (user.role !== 'admin' && !user.is_admin && user.job_title !== 'Fraud Specialist')) return;
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 1) performSearch(); else if (searchQuery.trim().length === 0) setSearchResults(null);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const performSearch = async () => {
    setIsSearching(true);
    try {
      const res = await base44.functions.invoke('adminCaseSearch', { query: searchQuery });
      if (res.data?.cases) setSearchResults(res.data.cases);
    } catch (e) { console.error(e); }
    setIsSearching(false);
  };

  const confirmDelete = async () => {
    if (!caseToDelete) return;
    try {
      const entity = caseToDelete._entityName === 'ScamDatabase' ? base44.entities.ScamDatabase : caseToDelete._entityName === 'ClientCase' ? base44.entities.ClientCase : base44.entities.MyCase;
      await entity.delete(caseToDelete.id);
      toast.success("Case deleted successfully");
      handleCaseUpdate();
    } catch (error) {
      toast.error("Failed to delete case: " + error.message);
    } finally {
      setCaseToDelete(null);
    }
  };

  const handleCaseUpdate = async () => {
    queryClient.invalidateQueries({ queryKey: ['my-cases'] });
    queryClient.invalidateQueries({ queryKey: ['client-cases'] });
    const { data: fresh } = await refetchCases();
    if (selectedCase && fresh) {
      const updated = fresh.find(c => c.id === selectedCase.id);
      if (updated) setSelectedCase({ ...updated, case_title: updated.case_number ? `${updated.case_number} - ${updated.issue_type}` : updated.client_name, amount: updated.amount_lost, currency: updated.cryptocurrency || 'USD', type: 'client', _entityName: 'MyCase', fraud_type: updated.issue_type, admin_status: updated.status });
    }
  };

  const normalizedCases = allRawCases.map(c => ({
      ...c,
      id: c.id,
      case_title: c.case_number ? `${c.case_number} - ${c.issue_type}` : c.client_name,
      status: c.status,
      amount: c.amount_lost,
      currency: c.cryptocurrency || 'USD',
      created_date: c.created_date,
      type: 'client',
      _entityName: c._sourceEntity || 'MyCase',
      fraud_type: c.issue_type,
      description: c.description,
      blockchain: c.blockchain,
      scammer_wallet: c.scammer_wallet,
  }));

  const isAdmin = user?.role === 'admin' || user?.is_admin;

  const handleImported = () => {
    queryClient.invalidateQueries({ queryKey: ['my-cases'] });
    queryClient.invalidateQueries({ queryKey: ['client-cases'] });
    refetchCases();
  };

  const shownCases = searchResults || displayCases;
  const activeCount = displayCases.filter(c => !['resolved','closed','recovered'].includes((c.status||'').toLowerCase())).length;

  return (
    <div className="min-h-screen bg-[#000000] text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">My Cases</h1>
            <p className="text-gray-400">Manage your incidents, submissions, and investigations.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <CaseImportExport
              cases={displayCases}
              isAdmin={isAdmin}
              onImported={handleImported}
            />
            <Button onClick={() => setShowMergeDialog(true)} variant="outline" className="border-white/20 text-white">Merge Cases</Button>
            <NewCaseModal />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-white/10 bg-white/5"><CardContent className="p-4"><p className="text-xs text-gray-400">Total Cases</p><p className="text-xl font-semibold text-white">{displayCases.length}</p></CardContent></Card>
          <Card className="border-white/10 bg-white/5"><CardContent className="p-4"><p className="text-xs text-gray-400">Active</p><p className="text-xl font-semibold text-white">{activeCount}</p></CardContent></Card>
          <Card className="border-white/10 bg-white/5"><CardContent className="p-4"><p className="text-xs text-gray-400">In Progress</p><p className="text-xl font-semibold text-white">{displayCases.filter(c => (c.status||'').toLowerCase()==='in progress').length}</p></CardContent></Card>
          <Card className="border-white/10 bg-white/5"><CardContent className="p-4"><p className="text-xs text-gray-400">Resolved</p><p className="text-xl font-semibold text-white">{displayCases.filter(c => (c.status||'').toLowerCase()==='resolved').length}</p></CardContent></Card>
        </div>

        <Card className="border-white/10 bg-white/5">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3">
            <Input placeholder="Search cases, emails, wallets..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} className="bg-[#0f1419] border-white/10 text-white" />
            <div className="flex gap-2">
              <Select value={adminGlobal ? '1' : '0'} onValueChange={v => setAdminGlobal(v === '1')}>
                <SelectTrigger className="w-[180px] bg-[#0f1419] border-white/10 text-white"><SelectValue placeholder="Scope" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">My Cases</SelectItem>
                  <SelectItem value="1">Admin: All</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleRefresh} variant="outline" className="border-white/20 text-white"><RefreshCw className="w-4 h-4 mr-2" /> Refresh</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-white">Case Inventory</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {shownCases.length === 0 && <p className="text-center text-gray-500 py-10">No cases found.</p>}
              {shownCases.map(c => (
                <div key={c.id} className="p-4 bg-[#0f1419] rounded-lg border border-white/10 flex items-center justify-between" onClick={() => setSelectedCase(c)}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-cyan-400 text-sm font-bold">{c.case_number}</span>
                      <Badge variant="outline" className="text-xs border-white/10 text-gray-300">{c.status}</Badge>
                    </div>
                    <h4 className="text-white font-medium">{c.title || c.case_title}</h4>
                    <p className="text-xs text-gray-400 mt-1">{(c.client_email || c.client_name || '')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">${(c.amount_lost || c.amount || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{c.currency || 'USD'}</p>
                    <Button size="sm" variant="ghost" className="mt-2 text-cyan-400 h-6 p-0">Open</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedCase && (
        <CaseDetailDialog caseData={selectedCase} onClose={() => setSelectedCase(null)} onUpdate={() => setSelectedCase(null)} />
      )}
    </div>
  );
}