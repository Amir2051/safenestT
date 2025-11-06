import Dashboard from './pages/Dashboard';
import PasswordVault from './pages/PasswordVault';
import Alerts from './pages/Alerts';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "PasswordVault": PasswordVault,
    "Alerts": Alerts,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};