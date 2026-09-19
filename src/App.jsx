import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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

// Pages rendered through the pagesConfig loop that must be admin-only.
const ADMIN_PAGE_KEYS = new Set([
  'AdminDashboard', 'AdminInvestigation',
  'AdminInvites', 'AdminMonitoringDashboard', 'AdminReferralDashboard',
  'AdminReferrals', 'AdminReports', 'AdminSubscriptions', 'AdminSupport',
  'AdminUserApprovals', 'AdminVPNServers',
  'AdminDeedFraud', 'Cases', 'InvestigationDashboard', 'InvestigatorDashboard',
]);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // MCP OAuth consent page — must render outside the app layout and any auth
  // guard. The page resolves the signed-in session itself via /consent-info and
  // redirects to login when signed out, preserving the `ctx` handle. See
  // base44/mcp/config.json (consent_path defaults to /oauth/consent).
  if (typeof window !== 'undefined' && window.location.pathname === '/oauth/consent') {
    return <OAuthConsent />;
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
        <Route path="/" element={<MainPage />} />
        {Object.entries(Pages).map(([path, Page]) => {
          const Gate = ADMIN_PAGE_KEYS.has(path) ? AdminGate : null;
          return (
            <Route
              key={path}
              path={`/${path}`}
              element={Gate ? <Gate><Page /></Gate> : <Page />}
            />
          );
        })}
        <Route path="/PrivacyAdvisor" element={<PrivacyAdvisor />} />
        <Route path="/UserExport" element={<AdminGate><UserExport /></AdminGate>} />
        <Route path="/OperationsDashboard" element={<RoleGate allowInvestigator><OperationsDashboard /></RoleGate>} />
        <Route path="/WalletTrackerAdmin" element={<AdminGate><WalletTrackerAdmin /></AdminGate>} />
        <Route path="/FlowMapAdmin" element={<AdminGate><FlowMapAdmin /></AdminGate>} />
        <Route path="/CasesManagement" element={<RoleGate allowInvestigator><CasesManagement /></RoleGate>} />
        <Route path="/CaseImport" element={<RoleGate allowInvestigator><CaseImport /></RoleGate>} />
        <Route path="/InvestigationWorkspace" element={<RoleGate allowInvestigator><InvestigationWorkspace /></RoleGate>} />
        <Route path="/AuditLog" element={<RoleGate allowInvestigator><AuditLog /></RoleGate>} />
        <Route path="/GlobalSearch" element={<RoleGate allowInvestigator><GlobalSearchPage /></RoleGate>} />
        <Route path="/ReportsCenter" element={<RoleGate allowInvestigator><ReportsCenter /></RoleGate>} />
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