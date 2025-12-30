import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, DollarSign, AlertTriangle, Clock } from "lucide-react";

export default function TrendAnalysisDashboard({ cases = [] }) {
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [fraudTypeDistribution, setFraudTypeDistribution] = useState([]);
  const [recoveryRates, setRecoveryRates] = useState([]);
  const [statusTrends, setStatusTrends] = useState([]);

  useEffect(() => {
    if (!cases.length) return;

    // Monthly trend analysis
    const monthlyData = {};
    cases.forEach(c => {
      const date = new Date(c.created_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          cases: 0,
          totalLoss: 0,
          recovered: 0
        };
      }
      
      monthlyData[monthKey].cases += 1;
      monthlyData[monthKey].totalLoss += c.amount_lost || c.amount_stolen_usd || 0;
      monthlyData[monthKey].recovered += c.recovery_amount || 0;
    });

    const sortedMonthly = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    setMonthlyTrends(sortedMonthly);

    // Fraud type distribution
    const fraudTypes = {};
    cases.forEach(c => {
      const type = c.issue_type || c.fraud_type || 'unknown';
      if (!fraudTypes[type]) {
        fraudTypes[type] = { name: type, value: 0, loss: 0 };
      }
      fraudTypes[type].value += 1;
      fraudTypes[type].loss += c.amount_lost || c.amount_stolen_usd || 0;
    });
    setFraudTypeDistribution(Object.values(fraudTypes));

    // Recovery rates by fraud type
    const recoveryByType = {};
    cases.forEach(c => {
      const type = c.issue_type || c.fraud_type || 'unknown';
      if (!recoveryByType[type]) {
        recoveryByType[type] = {
          type,
          totalLoss: 0,
          recovered: 0,
          recoveryRate: 0
        };
      }
      recoveryByType[type].totalLoss += c.amount_lost || c.amount_stolen_usd || 0;
      recoveryByType[type].recovered += c.recovery_amount || 0;
    });

    Object.values(recoveryByType).forEach(r => {
      r.recoveryRate = r.totalLoss > 0 ? ((r.recovered / r.totalLoss) * 100).toFixed(1) : 0;
    });
    setRecoveryRates(Object.values(recoveryByType));

    // Status trends over time
    const statusByMonth = {};
    cases.forEach(c => {
      const date = new Date(c.created_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!statusByMonth[monthKey]) {
        statusByMonth[monthKey] = {
          month: monthKey,
          pending: 0,
          investigating: 0,
          resolved: 0,
          closed: 0
        };
      }
      
      const status = c.status.toLowerCase();
      if (status.includes('pending') || status === 'new') {
        statusByMonth[monthKey].pending += 1;
      } else if (status.includes('investigat') || status.includes('progress')) {
        statusByMonth[monthKey].investigating += 1;
      } else if (status.includes('resolved') || status.includes('recovered')) {
        statusByMonth[monthKey].resolved += 1;
      } else {
        statusByMonth[monthKey].closed += 1;
      }
    });

    setStatusTrends(Object.values(statusByMonth).sort((a, b) => a.month.localeCompare(b.month)));
  }, [cases]);

  const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

  return (
    <div className="space-y-6">
      {/* Monthly Case Trends */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Monthly Case Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #06b6d4' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="cases"
                stroke="#06b6d4"
                fillOpacity={1}
                fill="url(#colorCases)"
                name="Cases"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Type Distribution */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Fraud Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fraudTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fraudTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #06b6d4' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recovery Rates */}
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Recovery Rates by Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={recoveryRates}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="type" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #06b6d4' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="recoveryRate" fill="#10b981" name="Recovery %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Trends */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Case Status Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={statusTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #06b6d4' }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
              <Line type="monotone" dataKey="pending" stroke="#f59e0b" name="Pending" />
              <Line type="monotone" dataKey="investigating" stroke="#06b6d4" name="Investigating" />
              <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" />
              <Line type="monotone" dataKey="closed" stroke="#6b7280" name="Closed" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Financial Impact Timeline */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-red-400" />
            Financial Impact Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="month" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #06b6d4' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => `$${value.toLocaleString()}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="totalLoss"
                stroke="#ef4444"
                fillOpacity={1}
                fill="url(#colorLoss)"
                name="Total Loss"
              />
              <Area
                type="monotone"
                dataKey="recovered"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorRecovered)"
                name="Recovered"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}