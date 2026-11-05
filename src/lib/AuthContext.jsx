import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { orgAccess } from '@/lib/orgAccess';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      let currentUser = await base44.auth.me();
      // Pick up any organization invite addressed to this email (server-side;
      // grants the role the org admin chose). Cheap no-op when there is none.
      if (currentUser && currentUser.role !== 'admin' && !currentUser.tenant_id) {
        try {
          const res = await orgAccess('acceptInvite');
          if (res?.accepted > 0) currentUser = await base44.auth.me();
        } catch (e) { console.warn('Invite check failed:', e?.message); }
      }
      // Personal workspaces also have a TenantMembership (owner), but that is
      // not an organization role. Only merge membership state for users who
      // have an organization profile/role. When a personal user has requested
      // to join an org, prefer that pending org membership over their personal
      // workspace membership until the org approves them.
      let merged = currentUser;
      try {
        if (currentUser && currentUser.role !== 'admin' && !currentUser.is_admin && (currentUser.organization_name || currentUser.organization_role)) {
          const memberships = await base44.entities.TenantMembership.filter({ user_id: currentUser.id });
          let mem = (memberships || []).find((m) => m.tenant_id === currentUser.tenant_id);
          if (currentUser.account_status === 'pending' && currentUser.organization_name) {
            const pendingOrgMemberships = (memberships || [])
              .filter((m) => m.tenant_id !== currentUser.tenant_id && ['pending_verification', 'pending_role_assignment', 'invited'].includes(m.status))
              .sort((a, b) => new Date(b.requested_at || b.created_date || 0) - new Date(a.requested_at || a.created_date || 0));
            if (pendingOrgMemberships.length) mem = pendingOrgMemberships[0];
          }
          if (mem) {
            merged = { ...currentUser, membership_status: mem.status };
            if (mem.status === 'active') {
              merged.organization_role = mem.organization_role || currentUser.organization_role || 'VIEWER';
              merged.account_status = 'active';
            } else if (mem.status === 'pending_verification' || mem.status === 'pending_role_assignment' || mem.status === 'invited') {
              merged.organization_role = 'VIEWER'; // read-only while pending
              merged.account_status = 'pending';
            } else if (mem.status === 'revoked') {
              merged.organization_role = 'VIEWER';
              merged.account_status = 'pending';
              merged.membership_revoked = true;
            }
          }
        }
      } catch (e) { /* keep currentUser as-is */ }
      setUser(merged);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};