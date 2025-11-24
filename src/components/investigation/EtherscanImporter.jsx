import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Edit, 
  Save, X, Loader2, ArrowRight, ExternalLink, Trash2, DollarSign, Wallet
} from "lucide-react";
import { toast } from "sonner";

export default function EtherscanImporter({ caseData, onTransactionsImported }) {
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [importSummary, setImportSummary] = useState(null);
  const [parseError, setParseError] = useState(null);
  const fileInputRef = useRef(null);

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
    setParseError(null);
    setImportSummary(null);

    if (!file) {
      setParseError('No file selected');
      toast.error('No file selected');
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a CSV file from Etherscan');
      toast.error('Please upload a CSV file from Etherscan');
      return;
    }

    if (file.size === 0) {
      setParseError('The file is empty');
      toast.error('The file is empty');
      return;
    }

    setImporting(true);
    
    try {
      const text = await file.text();
      
      if (!text || text.trim().length === 0) {
        setParseError('CSV file is empty');
        toast.error('CSV file is empty');
        setImporting(false);
        return;
      }

      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        setParseError('CSV file has no data rows');
        toast.error('CSV file has no data rows');
        setImporting(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      
      const transactions = [];
      const walletAddresses = new Set();
      let totalInbound = 0;
      let totalOutbound = 0;
      const primaryWallet = caseData?.monitored_wallets?.[0]?.toLowerCase() || '';
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index]?.replace(/"/g, '').trim() || '';
        });

        // Map Etherscan CSV fields to our format (support multiple formats)
        const tx = {
          hash: row['txhash'] || row['transaction hash'] || row['hash'] || row['transactionhash'] || '',
          from: row['from'] || row['from address'] || '',
          to: row['to'] || row['to address'] || '',
          value: parseFloat(row['value'] || row['value_in(eth)'] || row['quantity'] || row['value in'] || 0) || 0,
          value_usd: 0,
          timestamp: row['datetime'] || row['datetime (utc)'] || row['date'] || row['timestamp'] || new Date().toISOString(),
          token: row['tokenname'] || row['token'] || row['tokensymbol'] || 'ETH',
          status: row['status'] || row['txreceipt_status'] || 'Confirmed',
          gas_used: row['txnfee(eth)'] || row['gas'] || row['gasused'] || '',
          block: row['blockno'] || row['block'] || row['blocknumber'] || '',
          method: row['method'] || '',
          from_short: '',
          to_short: ''
        };

        // Calculate USD value if historical price available
        const ethPrice = parseFloat(row['historical $price/eth'] || row['historicalprice'] || 0);
        if (ethPrice > 0) {
          tx.value_usd = tx.value * ethPrice;
        }

        // Generate short addresses
        tx.from_short = tx.from ? tx.from.slice(0, 8) + '...' + tx.from.slice(-6) : '';
        tx.to_short = tx.to ? tx.to.slice(0, 8) + '...' + tx.to.slice(-6) : '';

        if (tx.hash && (tx.from || tx.to)) {
          transactions.push(tx);
          
          // Track wallet addresses
          if (tx.from) walletAddresses.add(tx.from.toLowerCase());
          if (tx.to) walletAddresses.add(tx.to.toLowerCase());
          
          // Calculate inbound/outbound based on primary wallet
          if (primaryWallet) {
            if (tx.to.toLowerCase() === primaryWallet) {
              totalInbound += tx.value;
            } else if (tx.from.toLowerCase() === primaryWallet) {
              totalOutbound += tx.value;
            }
          }
        }
      }

      if (transactions.length === 0) {
        setParseError('No valid transactions found in CSV. Make sure the file contains transaction data with hash, from, and to columns.');
        toast.error('No valid transactions found in CSV');
        setImporting(false);
        return;
      }

      // Create summary
      const summary = {
        transactionCount: transactions.length,
        walletAddresses: Array.from(walletAddresses),
        totalInbound,
        totalOutbound,
        token: transactions[0]?.token || 'ETH',
        dateRange: {
          earliest: transactions.reduce((min, tx) => new Date(tx.timestamp) < new Date(min) ? tx.timestamp : min, transactions[0].timestamp),
          latest: transactions.reduce((max, tx) => new Date(tx.timestamp) > new Date(max) ? tx.timestamp : max, transactions[0].timestamp)
        }
      };

      setImportSummary(summary);
      setParsedTransactions(transactions);
      toast.success(`Parsed ${transactions.length} transactions successfully!`);
      
    } catch (error) {
      console.error('Parse error:', error);
      setParseError(`Failed to parse CSV: ${error.message}`);
      toast.error(`Failed to parse CSV: ${error.message}`);
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
    setImportSummary(null);
    toast.success(`Import completed successfully! ${parsedTransactions.length} transactions added to case.`);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileInput}
              disabled={importing}
            />
            <Button 
              onClick={triggerFileInput}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold"
              disabled={importing}
            >
              {importing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing CSV...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Import CSV / Etherscan Data</>
              )}
            </Button>
          </div>

          {/* Error Display */}
          {parseError && (
            <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-semibold">Import Error</p>
                <p className="text-gray-300 text-sm">{parseError}</p>
              </div>
            </div>
          )}

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

      {/* Import Summary */}
      {importSummary && (
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Import Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-[#0f1419] rounded-lg border border-cyan-500/20">
                <p className="text-xs text-gray-400 mb-1">Transactions</p>
                <p className="text-2xl font-bold text-cyan-400">{importSummary.transactionCount}</p>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg border border-purple-500/20">
                <p className="text-xs text-gray-400 mb-1">Wallets Found</p>
                <p className="text-2xl font-bold text-purple-400">{importSummary.walletAddresses.length}</p>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg border border-green-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowRight className="w-3 h-3 text-green-400 rotate-180" />
                  <p className="text-xs text-gray-400">Total Inbound</p>
                </div>
                <p className="text-xl font-bold text-green-400">{importSummary.totalInbound.toFixed(4)} {importSummary.token}</p>
              </div>
              <div className="p-3 bg-[#0f1419] rounded-lg border border-red-500/20">
                <div className="flex items-center gap-1 mb-1">
                  <ArrowRight className="w-3 h-3 text-red-400" />
                  <p className="text-xs text-gray-400">Total Outbound</p>
                </div>
                <p className="text-xl font-bold text-red-400">{importSummary.totalOutbound.toFixed(4)} {importSummary.token}</p>
              </div>
            </div>
            
            {importSummary.walletAddresses.length > 0 && (
              <div className="mt-4 p-3 bg-[#0f1419] rounded-lg border border-cyan-500/10">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <Wallet className="w-3 h-3" /> Wallet Addresses Detected
                </p>
                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                  {importSummary.walletAddresses.slice(0, 10).map((addr, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs">
                      {addr.slice(0, 8)}...{addr.slice(-6)}
                    </Badge>
                  ))}
                  {importSummary.walletAddresses.length > 10 && (
                    <Badge variant="outline" className="text-xs">
                      +{importSummary.walletAddresses.length - 10} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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