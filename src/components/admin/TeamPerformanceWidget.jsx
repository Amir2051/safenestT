import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TrendingUp, Clock, CheckCircle, AlertCircle, User } from "lucide-react";

export default function TeamPerformanceWidget({ specialists }) {
  if (!specialists || specialists.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No performance data available yet.
      </div>
    );
  }

  // Calculate team averages
  const teamAvgResolution = specialists.reduce((acc, curr) => acc + parseFloat(curr.avgResolutionHours), 0) / specialists.length;
  const topPerformer = [...specialists].sort((a, b) => b.resolved - a.resolved)[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1a2332] border-cyan-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Team Avg Resolution</p>
              <p className="text-2xl font-bold text-white">{teamAvgResolution.toFixed(1)}h</p>
            </div>
            <Clock className="w-8 h-8 text-cyan-400" />
          </CardContent>
        </Card>
        
        <Card className="bg-[#1a2332] border-green-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Top Performer</p>
              <p className="text-lg font-bold text-green-400 truncate max-w-[120px]" title={topPerformer?.email}>
                {topPerformer?.email?.split('@')[0] || 'N/A'}
              </p>
              <p className="text-xs text-gray-500">{topPerformer?.resolved || 0} cases resolved</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </CardContent>
        </Card>

        <Card className="bg-[#1a2332] border-blue-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs">Total Active Cases</p>
              <p className="text-2xl font-bold text-blue-400">
                {specialists.reduce((acc, curr) => acc + curr.active, 0)}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-blue-400" />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1a2332] border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Agent Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-transparent">
                <TableHead className="text-gray-400">Agent</TableHead>
                <TableHead className="text-gray-400 text-center">Active</TableHead>
                <TableHead className="text-gray-400 text-center">Resolved</TableHead>
                <TableHead className="text-gray-400 text-center">Avg Time</TableHead>
                <TableHead className="text-gray-400 text-right">Performance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {specialists.map((agent, idx) => (
                <TableRow key={idx} className="border-gray-700 hover:bg-[#0f1419]">
                  <TableCell className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 bg-gray-700">
                      <AvatarFallback className="bg-cyan-900 text-cyan-200">
                        {agent.email.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm text-white font-medium">{agent.email}</span>
                      <span className="text-xs text-gray-500">Investigator</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                      {agent.active}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="border-green-500/30 text-green-400">
                      {agent.resolved}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-gray-300">
                    {agent.avgResolutionHours}h
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                          style={{ 
                            width: `${Math.min(100, (agent.resolved / (agent.total || 1)) * 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">
                        {Math.round((agent.resolved / (agent.total || 1)) * 100)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}