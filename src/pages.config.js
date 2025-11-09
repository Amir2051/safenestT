import Dashboard from './pages/Dashboard';
import PasswordVault from './pages/PasswordVault';
import Alerts from './pages/Alerts';
import MiaAssistant from './pages/MiaAssistant';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import DeviceCare from './pages/DeviceCare';
import AutoProtection from './pages/AutoProtection';
import Upgrade from './pages/Upgrade';
import PaymentSuccess from './pages/PaymentSuccess';
import DarkWebMonitor from './pages/DarkWebMonitor';
import StorageOptimizer from './pages/StorageOptimizer';
import Onboarding from './pages/Onboarding';
import Achievements from './pages/Achievements';
import Referrals from './pages/Referrals';
import VPNPage from './pages/VPNPage';
import Activity from './pages/Activity';
import SecurityDashboard from './pages/SecurityDashboard';
import CreditCardMonitor from './pages/CreditCardMonitor';
import ReferralLanding from './pages/ReferralLanding';
import AdminReferrals from './pages/AdminReferrals';
import VPNAnalytics from './pages/VPNAnalytics';
import TitleProtection from './pages/TitleProtection';
import ViewAlerts from './pages/ViewAlerts';
import AdminMonitoringDashboard from './pages/AdminMonitoringDashboard';
import LegalSupport from './pages/LegalSupport';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "PasswordVault": PasswordVault,
    "Alerts": Alerts,
    "MiaAssistant": MiaAssistant,
    "Reports": Reports,
    "Settings": Settings,
    "DeviceCare": DeviceCare,
    "AutoProtection": AutoProtection,
    "Upgrade": Upgrade,
    "PaymentSuccess": PaymentSuccess,
    "DarkWebMonitor": DarkWebMonitor,
    "StorageOptimizer": StorageOptimizer,
    "Onboarding": Onboarding,
    "Achievements": Achievements,
    "Referrals": Referrals,
    "VPNPage": VPNPage,
    "Activity": Activity,
    "SecurityDashboard": SecurityDashboard,
    "CreditCardMonitor": CreditCardMonitor,
    "ReferralLanding": ReferralLanding,
    "AdminReferrals": AdminReferrals,
    "VPNAnalytics": VPNAnalytics,
    "TitleProtection": TitleProtection,
    "ViewAlerts": ViewAlerts,
    "AdminMonitoringDashboard": AdminMonitoringDashboard,
    "LegalSupport": LegalSupport,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};