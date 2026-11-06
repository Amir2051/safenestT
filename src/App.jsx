import './App.css'
import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import PrivacyAdvisor from './pages/PrivacyAdvisor';
import UserExport from './pages/UserExport';
import OperationsDashboard from './pages/platform/OperationsDashboard';
import CasesManagement from './pages/platform/CasesManagement';
import CaseImport from './pages/platform/CaseImport';
import InvestigationWorkspace from './pages/platform/InvestigationWorkspace';
import AuditLog from './pages/platform/AuditLog';
import GlobalSearchPage from './pages/platform/GlobalSearchPage';
import ReportsCenter from './pages/platform/ReportsCenter';
import WalletTrackerAdmin from './pages/WalletTrackerAdmin';
import FlowMapAdmin from './pages/FlowMapAdmin';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AdminGate, { RoleGate } from '@/components/admin/AdminGate';
import PublicLanding from './pages/PublicLanding';
import PublicLegalLayout from '@/components/shared/PublicLegalLayout';
import CookiePolicy from './pages/CookiePolicy';
import DataRightsDeletion from './pages/DataRightsDeletion';
import OAuthConsent from './pages/OAuthConsent';
import ClientAuthorizations from './pages/ClientAuthorizations';
import OrganizationOnboarding from './pages/OrganizationOnboarding';
import AccountTypeSetup from './pages/AccountTypeSetup';
import AuthPage from './pages/AuthPage';
import OrganizationsDirectory from './pages/OrganizationsDirectory';
import Team from './pages/Team';
import OrganizationSettings from './pages/OrganizationSettings';
import OrganizationVerifications from './pages/OrganizationVerifications';
import InvestigationProviders from './pages/InvestigationProviders';
import { getHomePath, isOrgMember, isPlatformAdmin } from '@/lib/organizationRoles';

// Personal-protection (consumer) pages. Hidden from organization staff, who
// get the investigation workspace instead; individual clients and platform
// admins still reach them.
const CONSUMER_PAGE_KEYS = new Set([
  'FamilyProtection', 'FamilyInvite', 'DeviceCare', 'DeviceSecurity', 'StorageOptimizer',
  'CreditMonitor', 'CreditCardMonitor', 'IdentityMonitor', 'Achievements', 'ElectraWallet',
  'MyPortfolio', 'InvestmentCheckout', 'AutoProtection', 'PrivacyGuard', 'PrivacyHub',
  'PrivacyScore', 'PrivacyAdvisor', 'BrokerRemoval', 'FootprintMap', 'ExposureScanner',
  'DarkWebMonitor', 'DarkWebMonitorHub', 'SignalWatch', 'Referrals', 'MediaDashboard',
  'MediaDirectorAI', 'MyCases', 'ReportScam', 'Dashboard',
]);

function ConsumerGate({ children }) {
  const { user } = useAuth();
  // Pending org members still use the client Dashboard while they wait for approval.
  const pending = user?.account_status === 'pending';
  if (user && isOrgMember(user) && !isPlatformAdmin(user) && !pending) {
    return <Navigate to={getHomePath(user)} replace />;
  }
  return children;
}

// After sign-in everyone arrives at "/" — send each role to its own home.
function RoleHome() {
  const { user } = useAuth();
  if (!user) return null;
  return <Navigate to={getHomePath(user)} replace />;
}

// Branded email/password login and pre-registration account-type selection.
function LoginRoute() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />;
}

// Pages rendered through the pagesConfig loop that must be admin-only.
const ADMIN_PAGE_KEYS = new Set([
  'AdminDashboard', 'AdminInvestigation',
  'AdminInvites', 'AdminReferralDashboard',
  'AdminReferrals', 'AdminReports', 'AdminSubscriptions', 'AdminSupport',
  'AdminUserApprovals',
  'Cases', 'InvestigationDashboard', 'InvestigatorDashboard',
]);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, user } = useAuth();

  // MCP OAuth consent page — must render outside the app layout and any auth
  // guard. The page resolves the signed-in session itself via /consent-info and
  // redirects to login when signed out, preserving the `ctx` handle. See
  // base44/mcp/config.json (consent_path defaults to /oauth/consent).
  if (typeof window !== 'undefined' && window.location.pathname === '/oauth/consent') {
    return <OAuthConsent />;
  }

  // Account-type selection is a full-screen flow before choosing a personal
  // or organization workspace.
  if (typeof window !== 'undefined' && window.location.pathname === '/AccountTypeSetup') {
    return <AccountTypeSetup />;
  }

  // Organization onboarding is a full-screen flow (no app shell) so the user
  // can set up their organization before entering the workspace.
  if (typeof window !== 'undefined' && window.location.pathname === '/OrganizationOnboarding') {
    return <OrganizationOnboarding />;
  }

  // New users choose an account type once. Existing personal workspaces are
  // valid homes even though they intentionally have no organization_name.
  // Organization members continue through the existing org onboarding flow.
  if (isAuthenticated && user && user.role !== 'admin' && !user.is_admin && !user.organization_name && !user.tenant_id) {
    return <Navigate to="/AccountTypeSetup" replace />;
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // 'auth_required' falls through to the public routes below so visitors
    // can still read the legal/policy pages linked from the landing footer.
  }

  // Unauthenticated visitors: render the public landing plus the legal/policy
  // pages (Terms, Privacy, Acceptable Use, Refund) in a lightweight public
  // shell. These pages contain real policy content that must be readable
  // without signing in. Any other path falls back to the landing page.
  if (!isAuthenticated && !isLoadingAuth && !isLoadingPublicSettings) {
    return (
      <Routes>
        <Route path="/auth/login" element={<LoginRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/" element={<PublicLanding />} />
        <Route path="/TermsAndConditions" element={<PublicLegalLayout><Pages.TermsAndConditions /></PublicLegalLayout>} />
        <Route path="/PrivacyPolicy" element={<PublicLegalLayout><Pages.PrivacyPolicy /></PublicLegalLayout>} />
        <Route path="/AcceptableUsePolicy" element={<PublicLegalLayout><Pages.AcceptableUsePolicy /></PublicLegalLayout>} />
        <Route path="/RefundPolicy" element={<PublicLegalLayout><Pages.RefundPolicy /></PublicLegalLayout>} />
        <Route path="/CookiePolicy" element={<PublicLegalLayout><CookiePolicy /></PublicLegalLayout>} />
        <Route path="/DataRightsDeletion" element={<PublicLegalLayout><DataRightsDeletion /></PublicLegalLayout>} />
        <Route path="/RightsCenter" element={<PublicLegalLayout><Pages.RightsCenter /></PublicLegalLayout>} />
        <Route path="/CookieIntel" element={<PublicLegalLayout><Pages.CookieIntel /></PublicLegalLayout>} />
        <Route path="/HelpCenter" element={<PublicLegalLayout><Pages.HelpCenter /></PublicLegalLayout>} />
        <Route path="*" element={<PublicLanding />} />
      </Routes>
    );
  }

  // Render the main app.
  // The outer LayoutWrapper already wraps <Routes>, so every route below is
  // already inside the single Layout (one sidebar, one mobile drawer). Do NOT
  // re-wrap individual route elements in <LayoutWrapper> — that renders a
  // second sidebar/drawer and a second stacked theme.
  return (
    <LayoutWrapper currentPageName={mainPageKey}>
      <Routes>
        <Route path="/auth/login" element={<LoginRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/signup" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />
        <Route path="/" element={<RoleHome />} />
        {/* Consolidated admin routes — legacy duplicate pages redirect to canonical locations */}
        <Route path="/AdminDashboard" element={<Navigate to="/OperationsDashboard" replace />} />
        <Route path="/AdminInvestigation" element={<Navigate to="/InvestigationWorkspace" replace />} />
        {Object.entries(Pages).map(([path, Page]) => {
          const Gate = ADMIN_PAGE_KEYS.has(path) ? AdminGate : CONSUMER_PAGE_KEYS.has(path) ? ConsumerGate : null;
          return (
            <Route
              key={path}
              path={`/${path}`}
              element={Gate ? <Gate><Page /></Gate> : <Page />}
            />
          );
        })}
        <Route path="/PrivacyAdvisor" element={<ConsumerGate><PrivacyAdvisor /></ConsumerGate>} />
        <Route path="/UserExport" element={<AdminGate><UserExport /></AdminGate>} />
        <Route path="/OperationsDashboard" element={<RoleGate allowInvestigator allowReadOnly><OperationsDashboard /></RoleGate>} />
        <Route path="/WalletTrackerAdmin" element={<AdminGate><WalletTrackerAdmin /></AdminGate>} />
        <Route path="/FlowMapAdmin" element={<AdminGate><FlowMapAdmin /></AdminGate>} />
        <Route path="/CasesManagement" element={<RoleGate allowInvestigator allowReadOnly><CasesManagement /></RoleGate>} />
        <Route path="/CaseImport" element={<RoleGate allowInvestigator><CaseImport /></RoleGate>} />
        <Route path="/InvestigationWorkspace" element={<RoleGate allowInvestigator allowReadOnly><InvestigationWorkspace /></RoleGate>} />
        <Route path="/AuditLog" element={<RoleGate allowInvestigator allowReadOnly><AuditLog /></RoleGate>} />
        <Route path="/GlobalSearch" element={<RoleGate allowInvestigator allowReadOnly><GlobalSearchPage /></RoleGate>} />
        <Route path="/ReportsCenter" element={<RoleGate allowInvestigator allowReadOnly><ReportsCenter /></RoleGate>} />
        <Route path="/Organizations" element={<ConsumerGate><OrganizationsDirectory /></ConsumerGate>} />
        <Route path="/ClientAuthorizations" element={<ClientAuthorizations />} />
        <Route path="/Team" element={<Team />} />
        <Route path="/OrganizationSettings" element={<OrganizationSettings />} />
        <Route path="/OrganizationVerifications" element={<AdminGate><OrganizationVerifications /></AdminGate>} />
        <Route path="/InvestigationProviders" element={<AdminGate><InvestigationProviders /></AdminGate>} />
        <Route path="/CookiePolicy" element={<CookiePolicy />} />
        <Route path="/DataRightsDeletion" element={<DataRightsDeletion />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </LayoutWrapper>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App