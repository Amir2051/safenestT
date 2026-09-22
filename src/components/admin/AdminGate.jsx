import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

/**
 * Role-based access gate.
 *
 * - <AdminGate>: admin only (platform role "admin" or tenant owner/admin).
 * - <RoleGate allowInvestigator>: admin OR tenant investigator — used for the
 *   investigation platform pages so investigators keep working while regular
 *   users are blocked.
 *
 * Non-privileged users are redirected to the regular dashboard.
 */

function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}

function isPrivileged(user, { allowInvestigator = false } = {}) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const tr = user.tenant_role;
  if (allowInvestigator && tr === 'investigator') return true;
  return false;
}

export function RoleGate({ children, allowInvestigator = false }) {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth || !user) return <Loading />;
  if (!isPrivileged(user, { allowInvestigator })) return <Navigate to="/Dashboard" replace />;
  return <>{children}</>;
}

export default function AdminGate({ children }) {
  return <RoleGate>{children}</RoleGate>;
}