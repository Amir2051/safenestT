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
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

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
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <LayoutWrapper currentPageName={mainPageKey}>
      <Routes>
        <Route path="/" element={<MainPage />} />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route key={path} path={`/${path}`} element={<Page />} />
        ))}
        <Route path="/PrivacyAdvisor" element={<LayoutWrapper currentPageName="PrivacyAdvisor"><PrivacyAdvisor /></LayoutWrapper>} />
        <Route path="/UserExport" element={<LayoutWrapper currentPageName="UserExport"><UserExport /></LayoutWrapper>} />
        <Route path="/OperationsDashboard" element={<LayoutWrapper currentPageName="OperationsDashboard"><OperationsDashboard /></LayoutWrapper>} />
        <Route path="/CasesManagement" element={<LayoutWrapper currentPageName="CasesManagement"><CasesManagement /></LayoutWrapper>} />
        <Route path="/CaseImport" element={<LayoutWrapper currentPageName="CaseImport"><CaseImport /></LayoutWrapper>} />
        <Route path="/InvestigationWorkspace" element={<LayoutWrapper currentPageName="InvestigationWorkspace"><InvestigationWorkspace /></LayoutWrapper>} />
        <Route path="/AuditLog" element={<LayoutWrapper currentPageName="AuditLog"><AuditLog /></LayoutWrapper>} />
        <Route path="/GlobalSearch" element={<LayoutWrapper currentPageName="GlobalSearch"><GlobalSearchPage /></LayoutWrapper>} />
        <Route path="/ReportsCenter" element={<LayoutWrapper currentPageName="ReportsCenter"><ReportsCenter /></LayoutWrapper>} />
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