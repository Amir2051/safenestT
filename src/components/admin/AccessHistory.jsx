import React from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History, CheckCircle, XCircle, Shield } from 'lucide-react';

export default function AccessHistory() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['admin-access-logs'],
    queryFn: () => base44.entities.AdminAccessLog.list('-timestamp', 50),
    refetchInterval: 30000
  });

  return (
    <Card className="bg-[#1a2332] border-cyan-500/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <History className="w-5 h-5 text-cyan-400" />
          Admin Access History
        </CardTitle>
        <CardDescription className="text-gray-400">
          Recent authorized entries and failed attempts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-y-auto pr-2">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-transparent">
                <TableHead className="text-gray-400">Admin</TableHead>
                <TableHead className="text-gray-400">Action</TableHead>
                <TableHead className="text-gray-400">Time</TableHead>
                <TableHead className="text-gray-400 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 py-8">Loading history...</TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500 py-8">No access logs found</TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-gray-800 hover:bg-[#0f1419]">
                    <TableCell className="text-white font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                          {log.admin_email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="truncate max-w-[150px]">{log.admin_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{log.action}</TableCell>
                    <TableCell className="text-gray-400 text-xs">
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {log.status === 'success' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" /> Success
                        </Badge>
                      ) : (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30">
                          <XCircle className="w-3 h-3 mr-1" /> Failed
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}