import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Edit, 
  Save, X, Loader2, ArrowRight, ExternalLink, Trash2
} from "lucide-react";
import { toast } from "sonner";

export default function EtherscanImporter({ caseData, onTransactionsImported }) {
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValues, setEditValues] = useState({});

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  }, []);

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file from Etherscan');
      return;
    }

    setImporting(true);
    
    try {
      const text = await file.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      
      const transactions = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.replace(/"/g, '').trim();
        });

        // Map Etherscan CSV fields to our format
        const tx = {
          hash: row['txhash'] || row['transaction hash'] || row['hash'] || '',
          from: row['from'] || '',
          to: row['to'] || '',
          value: parseFloat(row['value'] || row['value_in(eth)'] || row['quantity'] || 0),
          value_usd: parseFloat(row['historical $price/eth'] || row['value_usd'] || 0) * parseFloat(row['value'] || 0) || 0,
          timestamp: row['datetime'] || row['datetime (utc)'] || row['unixTimestamp'] || new Date().toISOString(),
          token: row['tokenname'] || row['token'] || 'ETH',
          status: row['status'] || 'Confirmed',
          gas_used: row['txnfee(eth)'] || row['gas'] || '',
          block: row['blockno'] || row['block'] || '',
          from_short: (row['from'] || '').slice(0, 8) + '...' + (row['from'] || '').slice(-6),
          to_short: (row['to'] || '').slice(0, 8) + '...' + (row['to'] || '').slice(-6)
        };

        if (tx.hash && (tx.from || tx.to)) {
          transactions.push(tx);
        }
      }

      if (transactions.length === 0) {
        toast.error('No valid transactions found in CSV');
      } else {
        setParsedTransactions(transactions);
        toast.success(`Parsed ${transactions.length} transactions`);
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse CSV file');
    }
    
    setImporting(false);
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const startEditing = (index) => {
    setEditingIndex(index);
    setEditValues(parsedTransactions[index]);
  };

  const saveEdit = () => {
    const updated = [...parsedTransactions];
    updated[editingIndex] = {
      ...editValues,
      from_short: editValues.from.slice(0, 8) + '...' + editValues.from.slice(-6),
      to_short: editValues.to.slice(0, 8) + '...' + editValues.to.slice(-6)
    };
    setParsedTransactions(updated);
    setEditingIndex(null);
    setEditValues({});
    toast.success('Transaction updated');
  };

  const deleteTransaction = (index) => {
    const updated = parsedTransactions.filter((_, i) => i !== index);
    setParsedTransactions(updated);
    toast.success('Transaction removed');
  };

  const confirmImport = () => {
    if (parsedTransactions.length === 0) {
      toast.error('No transactions to import');
      return;
    }
    onTransactionsImported(parsedTransactions);
    setParsedTransactions([]);
  };

  const openEtherscan = (hash) => {
    window.open(`https://etherscan.io/tx/${hash}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            Import from Etherscan CSV
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              dragActive 
                ? 'border-cyan-400 bg-cyan-500/10' 
                : 'border-gray-600 hover:border-cyan-500/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-cyan-400' : 'text-gray-500'}`} />
            <p className="text-white font-semibold mb-2">
              Drag & drop Etherscan CSV here
            </p>
            <p className="text-gray-400 text-sm mb-4">
              Export transactions from Etherscan and upload the CSV file
            </p>
            <label>
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileInput}
                disabled={importing}
              />
              <Button 
                className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                disabled={importing}
              >
                {importing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Browse Files</>
                )}
              </Button>
            </label>
          </div>

          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-400 text-sm font-semibold mb-2">How to export from Etherscan:</p>
            <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
              <li>Go to etherscan.io and search for the wallet address</li>
              <li>Click on "Txns" or "Token Transfers" tab</li>
              <li>Click "Download CSV Export" button</li>
              <li>Upload the downloaded CSV file here</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Parsed Transactions Preview */}
      {parsedTransactions.length > 0 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Parsed Transactions ({parsedTransactions.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setParsedTransactions([])}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={confirmImport}
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Import All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {parsedTransactions.map((tx, index) => (
                <div 
                  key={index}
                  className="p-4 bg-[#0f1419] rounded-lg border border-cyan-500/10 hover:border-cyan-500/30 transition-all"
                >
                  {editingIndex === index ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400">From Address</label>
                          <Input
                            value={editValues.from}
                            onChange={(e) => setEditValues({...editValues, from: e.target.value})}
                            className="bg-[#1a2332] border-cyan-500/30 text-white text-sm mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">To Address</label>
                          <Input
                            value={editValues.to}
                            onChange={(e) => setEditValues({...editValues, to: e.target.value})}
                            className="bg-[#1a2332] border-cyan-500/30 text-white text-sm mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Value</label>
                          <Input
                            type="number"
                            value={editValues.value}
                            onChange={(e) => setEditValues({...editValues, value: parseFloat(e.target.value)})}
                            className="bg-[#1a2332] border-cyan-500/30 text-white text-sm mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">USD Value</label>
                          <Input
                            type="number"
                            value={editValues.value_usd}
                            onChange={(e) => setEditValues({...editValues, value_usd: parseFloat(e.target.value)})}
                            className="bg-[#1a2332] border-cyan-500/30 text-white text-sm mt-1"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingIndex(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveEdit} className="bg-green-500/20 text-green-400">
                          <Save className="w-3 h-3 mr-1" />Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50 font-mono text-xs">
                            {tx.hash.slice(0, 10)}...
                          </Badge>
                          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                            {tx.token}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEtherscan(tx.hash)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-cyan-400"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(index)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-cyan-400"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteTransaction(index)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400 font-mono">{tx.from_short}</span>
                        <ArrowRight className="w-4 h-4 text-cyan-400" />
                        <span className="text-gray-400 font-mono">{tx.to_short}</span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-white font-semibold">
                          {tx.value} {tx.token}
                          {tx.value_usd > 0 && (
                            <span className="text-gray-400 font-normal ml-2">
                              (${tx.value_usd.toFixed(2)})
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(tx.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Imported Transactions */}
      {caseData.imported_transactions?.length > 0 && parsedTransactions.length === 0 && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-purple-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-purple-400" />
              Previously Imported ({caseData.imported_transactions.length} transactions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {caseData.imported_transactions.slice(0, 10).map((tx, index) => (
                <div 
                  key={index}
                  className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Badge className="bg-purple-500/20 text-purple-400 font-mono text-xs">
                      {tx.hash?.slice(0, 8)}...
                    </Badge>
                    <span className="text-sm text-gray-400">
                      {tx.from_short} → {tx.to_short}
                    </span>
                  </div>
                  <span className="text-white font-semibold text-sm">
                    {tx.value} {tx.token}
                  </span>
                </div>
              ))}
              {caseData.imported_transactions.length > 10 && (
                <p className="text-center text-gray-500 text-sm py-2">
                  +{caseData.imported_transactions.length - 10} more transactions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}