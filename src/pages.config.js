import Dashboard from './pages/Dashboard';
import PasswordVault from './pages/PasswordVault';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "PasswordVault": PasswordVault,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};