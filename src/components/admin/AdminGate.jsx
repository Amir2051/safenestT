import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

/**
 * Role-based access gate.
 *
 * - <AdminGate>: admin only (platform role "admin" or tenant owner/admin).
 * - <RoleGate allowInvestigator>: admin OR tenant investigator — used for the
 *   investigation platform pages so investigators keep working while regular
 *   users are blocked.
 *
 * Non-privileged users see an "Access Restricted" panel instead of the page.
 */

function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}

function Denied() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="max-w-sm">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/40">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-white font-bold text-xl mb-2">Access Restricted</h2>
        <p className="text-gray-400 text-sm">
          This area is limited to authorized staff. If you believe this is an error, contact your administrator.
        </p>
      </div>
    </div>
  );
}

function isPrivileged(user, { allowInvestigator = false } = {}) {
  if (!user) return false;
  if (user.role === 'admin' || user.is_admin) return true;
  const tr = user.tenant_role;
  if (tr === 'owner' || tr === 'admin') return true;
  if (allowInvestigator && tr === 'investigator') return true;
  return false;
}

export function RoleGate({ children, allowInvestigator = false }) {
  const { user, isLoadingAuth } = useAuth();
  if (isLoadingAuth || !user) return <Loading />;
  if (!isPrivileged(user, { allowInvestigator })) return <Denied />;
  return <>{children}</>;
}

export default function AdminGate({ children }) {
  return <RoleGate>{children}</RoleGate>;
}