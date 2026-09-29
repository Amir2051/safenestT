import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { getEffectiveRole } from '@/lib/organizationRoles';

/**
 * Role-based access gate.
 *
 * - <AdminGate>: platform admin OR organization admin (enterprise admin
 *   functionality). Organization admins manage their own tenant; the backend
 *   still enforces tenant isolation and platform-only actions server-side.
 * - <RoleGate allowInvestigator>: any role that can run investigations —
 *   PLATFORM_ADMIN, ORG_ADMIN, INVESTIGATOR, ANALYST, CASE_MANAGER. Used for
 *   the investigation platform pages (Operations, Cases, Workspace, Reports…)
 *   so enterprise members can run the full 6-phase pipeline. VIEWER, AUDITOR,
 *   and regular members are blocked from these pages.
 *
 * Non-privileged users are redirected to the regular dashboard. This is a
 * UI gate only — not a security boundary.
 */

function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
}

const INVESTIGATION_ROLES = ['ORG_ADMIN', 'INVESTIGATOR', 'ANALYST', 'CASE_MANAGER'];

function isPrivileged(user, { allowInvestigator = false } = {}) {
  if (!user) return false;
  const role = getEffectiveRole(user);
  if (role === 'PLATFORM_ADMIN') return true;
  if (role === 'ORG_ADMIN') return true; // enterprise admin functionality
  if (allowInvestigator && INVESTIGATION_ROLES.includes(role)) return true;
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