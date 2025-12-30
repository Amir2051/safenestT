import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Eye, Plus, X, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function CustomReportBuilder({ cases = [] }) {
  const [reportName, setReportName] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [selectedFields, setSelectedFields] = useState({
    caseNumber: true,
    clientName: true,
    fraudType: true,
    status: true,
    amountLost: true,
    recoveryAmount: false,
    investigator: false,
    createdDate: true,
    blockchain: false,
    scammerWallet: false,
    priority: false
  });
  const [filters, setFilters] = useState({
    status: "all",
    fraudType: "all",
    minAmount: "",
    maxAmount: ""
  });
  const [groupBy, setGroupBy] = useState("none");

  const availableFields = [
    { key: "caseNumber", label: "Case Number" },
    { key: "clientName", label: "Client Name" },
    { key: "fraudType", label: "Fraud Type" },
    { key: "status", label: "Status" },
    { key: "amountLost", label: "Amount Lost" },
    { key: "recoveryAmount", label: "Recovery Amount" },
    { key: "investigator", label: "Assigned Investigator" },
    { key: "createdDate", label: "Created Date" },
    { key: "blockchain", label: "Blockchain" },
    { key: "scammerWallet", label: "Scammer Wallet" },
    { key: "priority", label: "Priority" }
  ];

  const filterCases = () => {
    let filtered = [...cases];

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(c => new Date(c.created_date) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(c => new Date(c.created_date) <= new Date(dateRange.end));
    }

    // Status filter
    if (filters.status !== "all") {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    // Fraud type filter
    if (filters.fraudType !== "all") {
      filtered = filtered.filter(c => (c.issue_type || c.fraud_type) === filters.fraudType);
    }

    // Amount filters
    if (filters.minAmount) {
      filtered = filtered.filter(c => (c.amount_lost || c.amount_stolen_usd || 0) >= parseFloat(filters.minAmount));
    }
    if (filters.maxAmount) {
      filtered = filtered.filter(c => (c.amount_lost || c.amount_stolen_usd || 0) <= parseFloat(filters.maxAmount));
    }

    return filtered;
  };

  const generateReport = () => {
    const filtered = filterCases();
    
    if (!filtered.length) {
      toast.error("No cases match your filters");
      return;
    }

    // Build CSV content
    const headers = availableFields
      .filter(f => selectedFields[f.key])
      .map(f => f.label);

    const rows = filtered.map(c => {
      const row = [];
      if (selectedFields.caseNumber) row.push(c.case_number || 'N/A');
      if (selectedFields.clientName) row.push(c.client_name || c.victim_name || 'N/A');
      if (selectedFields.fraudType) row.push(c.issue_type || c.fraud_type || 'N/A');
      if (selectedFields.status) row.push(c.status || 'N/A');
      if (selectedFields.amountLost) row.push(c.amount_lost || c.amount_stolen_usd || 0);
      if (selectedFields.recoveryAmount) row.push(c.recovery_amount || 0);
      if (selectedFields.investigator) row.push(c.assigned_to || 'Unassigned');
      if (selectedFields.createdDate) row.push(new Date(c.created_date).toLocaleDateString());
      if (selectedFields.blockchain) row.push(c.blockchain || 'N/A');
      if (selectedFields.scammerWallet) row.push(c.scammer_wallet || 'N/A');
      if (selectedFields.priority) row.push(c.priority || c.case_priority || 'medium');
      return row;
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportName || 'custom_report'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast.success(`Report generated: ${filtered.length} cases`);
  };

  const previewReport = () => {
    const filtered = filterCases();
    toast.info(`Preview: ${filtered.length} cases match your criteria`);
  };

  return (
    <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-cyan-400" />
          Custom Report Builder
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Settings */}
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <h3 className="text-white font-semibold mb-4">Report Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Report Name</Label>
                  <Input
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    placeholder="Q4 Fraud Analysis"
                    className="bg-[#1a2332] border-cyan-500/30 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 mb-2 block">Start Date</Label>
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">End Date</Label>
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="bg-[#1a2332] border-cyan-500/30 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Field Selection */}
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <h3 className="text-white font-semibold mb-4">Select Fields</h3>
              <div className="grid grid-cols-2 gap-3">
                {availableFields.map(field => (
                  <div key={field.key} className="flex items-center gap-2">
                    <Checkbox
                      id={field.key}
                      checked={selectedFields[field.key]}
                      onCheckedChange={(checked) => 
                        setSelectedFields({ ...selectedFields, [field.key]: checked })
                      }
                    />
                    <Label htmlFor={field.key} className="text-gray-300 text-sm cursor-pointer">
                      {field.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <h3 className="text-white font-semibold mb-4">Filters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300 mb-2 block">Status</Label>
                  <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                    <SelectTrigger className="bg-[#1a2332] border-cyan-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="investigating">Investigating</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Fraud Type</Label>
                  <Select value={filters.fraudType} onValueChange={(v) => setFilters({ ...filters, fraudType: v })}>
                    <SelectTrigger className="bg-[#1a2332] border-cyan-500/30 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="crypto_theft">Crypto Theft</SelectItem>
                      <SelectItem value="phishing">Phishing</SelectItem>
                      <SelectItem value="investment_scam">Investment Scam</SelectItem>
                      <SelectItem value="romance_scam">Romance Scam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Min Amount ($)</Label>
                  <Input
                    type="number"
                    value={filters.minAmount}
                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                    placeholder="0"
                    className="bg-[#1a2332] border-cyan-500/30 text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300 mb-2 block">Max Amount ($)</Label>
                  <Input
                    type="number"
                    value={filters.maxAmount}
                    onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                    placeholder="∞"
                    className="bg-[#1a2332] border-cyan-500/30 text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions & Summary */}
          <div className="space-y-4">
            <div className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/20">
              <h3 className="text-white font-semibold mb-4">Summary</h3>
              <div className="space-y-2">
                <p className="text-xs text-gray-300">
                  Total Cases: <span className="text-cyan-400">{cases.length}</span>
                </p>
                <p className="text-xs text-gray-300">
                  Matching Filters: <span className="text-cyan-400">{filterCases().length}</span>
                </p>
                <p className="text-xs text-gray-300">
                  Selected Fields: <span className="text-cyan-400">
                    {Object.values(selectedFields).filter(Boolean).length}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                onClick={generateReport}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>

              <Button
                onClick={previewReport}
                variant="outline"
                className="w-full border-cyan-500/30 text-cyan-400"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-300">
                💡 <strong>Tip:</strong> Reports are generated in CSV format and can be opened in Excel or Google Sheets.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}