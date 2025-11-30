import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Shield, History, AlertTriangle, CheckCircle, XCircle, RefreshCw, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export default function AdminSecurityPanel() {
    const [currentKey, setCurrentKey] = useState("");
    const [newKey, setNewKey] = useState("");
    const [confirmKey, setConfirmKey] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    // Fetch Access History
    const { data: logs = [], isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
        queryKey: ['admin-access-logs'],
        queryFn: () => base44.entities.AdminAccessLog.list('-timestamp', 50)
    });

    const handleKeyUpdate = async (e) => {
        e.preventDefault();
        if (newKey !== confirmKey) {
            toast.error("New keys do not match");
            return;
        }
        if (newKey.length < 6) {
            toast.error("Key must be at least 6 characters");
            return;
        }

        setIsUpdating(true);
        try {
            const response = await base44.functions.invoke('adminAuth', {
                action: 'update',
                key: currentKey,
                newKey: newKey
            });

            if (response.data.success) {
                toast.success("Master Key Updated Successfully");
                setCurrentKey("");
                setNewKey("");
                setConfirmKey("");
                // Force logout/re-auth would be good here but tricky without context
            } else {
                toast.error(response.data.error || "Failed to update key");
            }
        } catch (error) {
            toast.error("Failed to update key");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-gray-900/50 border-cyan-500/20">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-cyan-400" />
                        Admin Security Center
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                        Manage master access keys and review security logs
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="history" className="w-full">
                        <TabsList className="bg-black/40 border border-cyan-500/20 w-full justify-start">
                            <TabsTrigger value="history" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
                                <History className="w-4 h-4 mr-2" />
                                Access History
                            </TabsTrigger>
                            <TabsTrigger value="keys" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                                <Key className="w-4 h-4 mr-2" />
                                Master Key Management
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="history" className="mt-4">
                            <div className="rounded-lg border border-gray-800 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-gray-900">
                                        <TableRow>
                                            <TableHead className="text-gray-400">Timestamp</TableHead>
                                            <TableHead className="text-gray-400">Admin</TableHead>
                                            <TableHead className="text-gray-400">Action</TableHead>
                                            <TableHead className="text-gray-400">Status</TableHead>
                                            <TableHead className="text-gray-400">Details</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingLogs ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : logs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                                    No logs available
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            logs.map((log) => (
                                                <TableRow key={log.id} className="border-gray-800 hover:bg-gray-800/50">
                                                    <TableCell className="text-gray-300 text-xs font-mono">
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="text-gray-300 text-sm">
                                                        {log.admin_email}
                                                    </TableCell>
                                                    <TableCell className="text-gray-300 text-sm">
                                                        <span className="capitalize">{log.action.replace('_', ' ')}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {log.status === 'success' ? (
                                                            <span className="flex items-center gap-1 text-green-400 text-xs bg-green-950/30 px-2 py-1 rounded border border-green-900/50 w-fit">
                                                                <CheckCircle className="w-3 h-3" /> Success
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 text-red-400 text-xs bg-red-950/30 px-2 py-1 rounded border border-red-900/50 w-fit">
                                                                <XCircle className="w-3 h-3" /> Failed
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-gray-400 text-xs truncate max-w-[200px]">
                                                        {log.details}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="keys" className="mt-4">
                            <div className="bg-red-950/10 border border-red-500/20 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5" />
                                    Rotate Master Key
                                </h3>
                                <form onSubmit={handleKeyUpdate} className="space-y-4 max-w-md">
                                    <div>
                                        <label className="text-xs text-gray-400 mb-1 block">Current Master Key</label>
                                        <Input
                                            type="password"
                                            value={currentKey}
                                            onChange={(e) => setCurrentKey(e.target.value)}
                                            className="bg-black/50 border-gray-700 text-white font-mono"
                                            placeholder="Enter current key"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">New Master Key</label>
                                            <Input
                                                type="password"
                                                value={newKey}
                                                onChange={(e) => setNewKey(e.target.value)}
                                                className="bg-black/50 border-gray-700 text-white font-mono"
                                                placeholder="New key"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">Confirm New Key</label>
                                            <Input
                                                type="password"
                                                value={confirmKey}
                                                onChange={(e) => setConfirmKey(e.target.value)}
                                                className="bg-black/50 border-gray-700 text-white font-mono"
                                                placeholder="Confirm new key"
                                            />
                                        </div>
                                    </div>
                                    <Button 
                                        type="submit" 
                                        disabled={isUpdating || !currentKey || !newKey}
                                        className="w-full bg-red-600 hover:bg-red-700"
                                    >
                                        {isUpdating ? (
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        ) : (
                                            <Save className="w-4 h-4 mr-2" />
                                        )}
                                        Update Master Key
                                    </Button>
                                </form>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}