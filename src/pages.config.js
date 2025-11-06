import Dashboard from './pages/Dashboard';
import PasswordVault from './pages/PasswordVault';
import Alerts from './pages/Alerts';
import MiaAssistant from './pages/MiaAssistant';
import Reports from './pages/Reports';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "PasswordVault": PasswordVault,
    "Alerts": Alerts,
    "MiaAssistant": MiaAssistant,
    "Reports": Reports,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};