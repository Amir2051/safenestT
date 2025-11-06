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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};