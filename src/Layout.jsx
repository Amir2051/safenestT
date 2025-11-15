
import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, LayoutDashboard, Lock, Bell, FileText, Bot, Settings, LogOut, Smartphone, Zap, CreditCard, Eye, HardDrive, Trophy, Users, Wifi, Activity, ShieldCheck, ShieldAlert, BarChart3, Home, Server, Scale, CheckSquare, Radio, ChevronDown, ChevronRight, Globe } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import NotificationCenter from "./components/shared/NotificationCenter.jsx";
import ReferralCodeHandler from "./components/shared/ReferralCodeHandler.jsx";

// Compressed navigation structure with hierarchy
const navigationStructure = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    children: [
      { title: 'Overview', url: createPageUrl('Dashboard'), icon: LayoutDashboard },
      { title: 'Security Dashboard', url: createPageUrl('SecurityDashboard'), icon: ShieldCheck, badge: 'OWASP', highlight: true },
      { title: 'Activity Log', url: createPageUrl('Activity'), icon: Activity },
      { title: 'Reports', url: createPageUrl('Reports'), icon: FileText }
    ]
  },
  {
    id: 'ai',
    title: 'AI Assistants',
    icon: Bot,
    badge: 'AI',
    children: [
      { title: 'Lex (Legal AI)', url: createPageUrl('LegalAssistant'), icon: Scale, badge: 'AI', highlight: true, comingSoon: true },
      { title: 'Mia (Security AI)', url: createPageUrl('MiaAssistant'), icon: Bot }
    ]
  },
  {
    id: 'legal',
    title: 'Legal & Property',
    icon: Home,
    comingSoon: true,
    badge: 'SOON',
    children: [
      { title: 'Title Protection', url: createPageUrl('TitleProtection'), icon: Home, badge: 'SOON', comingSoon: true },
      { title: 'Legal Support', url: createPageUrl('LegalSupport'), icon: Scale, badge: 'SOON', comingSoon: true },
      { title: 'Collaboration', url: createPageUrl('Collaboration'), icon: Users, badge: 'SOON', comingSoon: true },
      { title: 'Attorney Tasks', url: createPageUrl('AttorneyTasks'), icon: CheckSquare, badge: 'SOON', comingSoon: true }
    ]
  },
  {
    id: 'identity',
    title: 'Identity & Privacy',
    icon: Shield,
    children: [
      { title: 'Identity Monitor', url: createPageUrl('IdentityMonitor'), icon: Shield, badge: 'VAULT', highlight: true },
      { title: 'Signal Watch', url: createPageUrl('SignalWatch'), icon: Radio, badge: 'BETA', highlight: true },
      { title: 'Advanced Security', url: createPageUrl('AdvancedSecurity'), icon: ShieldAlert, badge: 'PEGASUS', highlight: true },
      { title: 'Dark Web Monitor', url: createPageUrl('DarkWebMonitor'), icon: Eye },
      { title: 'Credit Monitor', url: createPageUrl('CreditMonitor'), icon: CreditCard },
      { title: 'Family Protection', url: createPageUrl('FamilyProtection'), icon: Users, badge: 'NEW', highlight: true }
    ]
  },
  {
    id: 'device',
    title: 'Device Protection',
    icon: Smartphone,
    children: [
      { title: 'VPN Protection', url: createPageUrl('VPNPage'), icon: Wifi },
      { title: 'VPN Devices', url: createPageUrl('VPNDevices'), icon: Smartphone, badge: 'LIVE', highlight: true },
      { title: 'Web VPN', url: createPageUrl('WebVPN'), icon: Globe, badge: 'BETA', highlight: true },
      { title: 'VPN Analytics', url: createPageUrl('VPNAnalytics'), icon: BarChart3 },
      { title: 'Device Care', url: createPageUrl('DeviceCare'), icon: Smartphone },
      { title: 'Storage Optimizer', url: createPageUrl('StorageOptimizer'), icon: HardDrive },
      { title: 'Auto Protection', url: createPageUrl('AutoProtection'), icon: Zap }
    ]
  },
  {
    id: 'security',
    title: 'Security Tools',
    icon: Lock,
    children: [
      { title: 'Password Vault', url: createPageUrl('PasswordVault'), icon: Lock },
      { title: 'Alerts', url: createPageUrl('Alerts'), icon: Bell, badge: 'LIVE', highlight: true }
    ]
  },
  {
    id: 'community',
    title: 'Community',
    icon: Users,
    children: [
      { title: 'Invite Friends', url: createPageUrl('Referrals'), icon: Users },
      { title: 'Achievements', url: createPageUrl('Achievements'), icon: Trophy }
    ]
  }
];

const adminNavigationStructure = [
  {
    id: 'admin',
    title: 'Admin',
    icon: Server,
    badge: 'ADMIN',
    adminOnly: true,
    children: [
      { title: 'VPN Servers', url: createPageUrl('AdminVPNServers'), icon: Server, badge: 'LIVE', adminOnly: true, highlight: true },
      { title: 'Monitoring Engine', url: createPageUrl('AdminMonitoringDashboard'), icon: Server, badge: 'ADMIN', adminOnly: true },
      { title: 'Referral Analytics', url: createPageUrl('AdminReferralDashboard'), icon: BarChart3, badge: 'ADMIN', adminOnly: true }
    ]
  }
];

// Settings (no submenu, always visible at bottom)
const settingsItem = {
  title: 'Settings',
  url: createPageUrl('Settings'),
  icon: Settings
};

function LayoutContent({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [expandedMenus, setExpandedMenus] = React.useState({});
  const { setOpenMobile, isMobile } = useSidebar();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Auto-expand menu if current page is in it
  React.useEffect(() => {
    const allMenus = user?.is_admin 
      ? [...navigationStructure, ...adminNavigationStructure]
      : navigationStructure;

    const newExpanded = {};
    allMenus.forEach(menu => {
      if (menu.children) {
        const hasActivePage = menu.children.some(child => child.url === location.pathname);
        if (hasActivePage) {
          newExpanded[menu.id] = true;
        }
      }
    });
    setExpandedMenus(prev => ({ ...prev, ...newExpanded }));
  }, [location.pathname, user]);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleMenuClick = (e, url, item) => {
    e.preventDefault();
    
    if (item.comingSoon) {
      toast.info('🚧 Coming Soon! This feature is currently under development.', {
        description: 'We\'re working hard to bring you this functionality. Stay tuned!',
        duration: 4000
      });
      return;
    }
    
    if (isMobile) {
      setOpenMobile(false);
    }
    setTimeout(() => {
      navigate(url);
    }, 100);
  };

  const toggleMenu = (menuId, menu) => {
    if (menu.comingSoon) {
      toast.info('🚧 Coming Soon! This section is currently under development.', {
        description: 'We\'re working hard to bring you these features. Stay tuned!',
        duration: 4000
      });
      return;
    }
    
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const isPremium = user?.subscription_plan === 'basic' || user?.subscription_plan === 'elite';
  const isActive = user?.payment_status === 'active';

  const allNavigationItems = user?.is_admin
    ? [...navigationStructure, ...adminNavigationStructure]
    : navigationStructure;

  return (
    <>
      <ReferralCodeHandler />
      
      <style>{`
        :root {
          --background: 222 12% 8%;
          --foreground: 210 40% 98%;
          --card: 222 12% 10%;
          --card-foreground: 210 40% 98%;
          --primary: 177 70% 55%;
          --primary-foreground: 222 12% 8%;
          --secondary: 217 91% 60%;
          --secondary-foreground: 210 40% 98%;
          --accent: 217 91% 60%;
          --accent-foreground: 210 40% 98%;
          --border: 217 33% 17%;
          --input: 217 33% 17%;
          --ring: 177 70% 55%;
        }
        
        [data-sidebar] {
          background: #1a1a2e !important;
          opacity: 1 !important;
          box-shadow: 2px 0 10px rgba(0, 0, 0, 0.2) !important;
        }
        
        [data-sidebar] * {
          opacity: 1 !important;
          filter: none !important;
        }
        
        [data-sidebar]::-webkit-scrollbar {
          width: 6px;
        }
        
        [data-sidebar]::-webkit-scrollbar-track {
          background: #16213e;
        }
        
        [data-sidebar]::-webkit-scrollbar-thumb {
          background: #0f3460;
          border-radius: 3px;
        }
        
        [data-sidebar]::-webkit-scrollbar-thumb:hover {
          background: #667eea;
        }

        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.6);
          }
        }

        .badge-highlight {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .menu-item-coming-soon {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .menu-item-coming-soon:hover {
          opacity: 0.7;
        }
      `}</style>
      <div className="min-h-screen flex w-full bg-[#0f1419]">
        <Sidebar className="border-r-2 border-[#0f3460] bg-[#1a1a2e] shadow-xl">
          <SidebarHeader className="border-b-2 border-[#0f3460] p-6 bg-[#16213e]">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-[#16213e] animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-white">SafeNest</h2>
                <p className="text-xs text-cyan-400 font-medium">OWASP Protected</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3 bg-[#1a1a2e]">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-3">
                Security Center
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {allNavigationItems.map((item) => {
                    const isExpanded = expandedMenus[item.id];
                    const hasActiveChild = item.children?.some(child => child.url === location.pathname);
                    
                    return (
                      <SidebarMenuItem key={item.id}>
                        {item.children ? (
                          <div>
                            <button
                              onClick={() => toggleMenu(item.id, item)}
                              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl mb-1 transition-all duration-300 ${
                                item.comingSoon 
                                  ? 'menu-item-coming-soon bg-gray-500/10 text-gray-400'
                                  : hasActiveChild
                                  ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-purple-500/30'
                                  : 'bg-transparent text-gray-200 hover:bg-[#0f3460] hover:text-white hover:scale-105'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon className={`w-5 h-5 ${
                                  item.comingSoon 
                                    ? 'text-gray-500'
                                    : hasActiveChild ? 'text-white' : 'text-gray-300'
                                }`} />
                                <span className="font-semibold text-[15px]">{item.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.badge && (
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                    item.comingSoon
                                      ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                      : item.adminOnly 
                                      ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                      : item.badge === "AI"
                                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                      : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                                  }`}>
                                    {item.badge}
                                  </span>
                                )}
                                {!item.comingSoon && (
                                  isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )
                                )}
                              </div>
                            </button>
                            
                            {isExpanded && !item.comingSoon && (
                              <div className="ml-4 mt-1 space-y-1">
                                {item.children.map((child) => {
                                  const isActive = location.pathname === child.url;
                                  return (
                                    <SidebarMenuButton
                                      key={child.title}
                                      asChild
                                      className={`rounded-lg transition-all duration-300 ${
                                        child.comingSoon
                                          ? 'menu-item-coming-soon bg-gray-500/10 text-gray-400'
                                          : isActive
                                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                                          : child.highlight
                                          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-white hover:from-green-500/20 hover:to-emerald-500/20 border border-green-500/30'
                                          : 'bg-transparent text-gray-300 hover:bg-[#0f3460]/50 hover:text-white'
                                      }`}
                                    >
                                      <Link
                                        to={child.comingSoon ? '#' : child.url}
                                        onClick={(e) => handleMenuClick(e, child.url, child)}
                                        className="flex items-center gap-3 px-3 py-2 w-full"
                                      >
                                        <child.icon className={`w-4 h-4 ${
                                          child.comingSoon 
                                            ? 'text-gray-500'
                                            : isActive ? 'text-white' : child.highlight ? 'text-green-400' : 'text-gray-400'
                                        }`} />
                                        <span className="text-sm font-medium flex-1">{child.title}</span>
                                        {child.badge && (
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                            child.comingSoon
                                              ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                              : child.highlight
                                              ? 'bg-green-500/20 text-green-400 border border-green-500/50 badge-highlight'
                                              : child.adminOnly
                                              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                              : child.badge === "AI"
                                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                              : child.badge === "NEW"
                                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                                              : child.badge === "LIVE"
                                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 animate-pulse'
                                              : child.badge === "AUTO"
                                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                              : child.badge === "VAULT"
                                              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                                              : child.badge === "BETA"
                                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50'
                                              : child.badge === "PEGASUS"
                                              ? 'bg-red-500/20 text-red-400 border border-red-500/50 badge-highlight'
                                              : child.badge === "ADMIN"
                                              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                                              : 'bg-purple-500/20 text-purple-400'
                                          }`}>
                                            {child.badge}
                                          </span>
                                        )}
                                        {isActive && !child.comingSoon && (
                                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        )}
                                      </Link>
                                    </SidebarMenuButton>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </SidebarMenuItem>
                    );
                  })}
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      className={`rounded-xl mb-1.5 transition-all duration-300 ${
                        location.pathname === settingsItem.url
                          ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-purple-500/30 scale-105'
                          : 'bg-transparent text-gray-200 hover:bg-[#0f3460] hover:text-white hover:scale-105 hover:shadow-md'
                      }`}
                    >
                      <Link
                        to={settingsItem.url}
                        onClick={(e) => handleMenuClick(e, settingsItem.url, settingsItem)}
                        className="flex items-center gap-3 px-4 py-3 w-full"
                      >
                        <settingsItem.icon className={`w-5 h-5 ${
                          location.pathname === settingsItem.url ? 'text-white' : 'text-gray-300'
                        }`} />
                        <span className="font-semibold text-[15px] flex-1">{settingsItem.title}</span>
                        {location.pathname === settingsItem.url && (
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupContent>
                <div className="mx-2 my-4 p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border-2 border-green-500/30 badge-highlight">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-5 h-5 text-green-400 animate-pulse" />
                    <span className="text-sm font-bold text-green-300">Live OWASP Protection</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Coverage</span>
                      <span className="text-green-400 font-bold">100%</span>
                    </div>
                    <div className="w-full h-2 bg-[#0f1419] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 w-full animate-pulse" />
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2">
                      <span className="text-gray-400">Threats Blocked</span>
                      <span className="text-green-400 font-bold">0 Today</span>
                    </div>
                  </div>
                  <Link to={createPageUrl("SecurityDashboard")}>
                    <button className="w-full mt-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-semibold py-2 rounded-lg transition-all border border-green-500/50">
                      View Security Dashboard
                    </button>
                  </Link>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {(!isPremium || !isActive) && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <Link 
                    to={createPageUrl("Upgrade")}
                    onClick={(e) => handleMenuClick(e, createPageUrl("Upgrade"), {})}
                  >
                    <div className="mx-2 my-4 p-5 bg-gradient-to-br from-purple-600/30 to-pink-600/30 rounded-xl border-2 border-purple-500/50 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/30 transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-5 h-5 text-purple-300" />
                        <span className="text-sm font-bold text-purple-200">Upgrade to Premium</span>
                      </div>
                      <p className="text-xs text-gray-300 font-medium mb-2">
                        From $9.99/month
                      </p>
                      <p className="text-xs text-purple-200 font-semibold">
                        ⚡ Limited: 20% off for first 100 users!
                      </p>
                    </div>
                  </Link>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {user?.risk_score !== undefined && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-3">
                  Security Score
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-4 py-5 bg-[#16213e] rounded-xl border-2 border-[#0f3460] mx-2 shadow-md">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-200">Your Score</span>
                      <span className={`text-3xl font-bold ${
                        user.risk_score >= 80 ? 'text-green-400' : 
                        user.risk_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {user.risk_score}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-[#0f1419] rounded-full overflow-hidden border border-[#0f3460]">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          user.risk_score >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 
                          user.risk_score >= 60 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 
                          'bg-gradient-to-r from-red-500 to-orange-400'
                        }`}
                        style={{ width: `${user.risk_score}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs font-semibold text-gray-300">
                        {isPremium && isActive ? (
                          user.subscription_plan === 'elite' ? '✨ Elite' : '💎 Basic'
                        ) : '🆓 Free'}
                      </p>
                      {isPremium && isActive && user.renewal_date && (
                        <p className="text-xs text-gray-400 font-medium">
                          Renews {new Date(user.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t-2 border-[#0f3460] p-4 bg-[#16213e]">
            {user && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md shadow-cyan-500/30">
                    <span className="text-white font-bold text-base">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{user.full_name || 'User'}</p>
                    <p className="text-xs text-gray-300 truncate font-medium">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-2.5 hover:bg-[#0f3460] rounded-lg transition-all flex-shrink-0 hover:scale-110"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-gray-300 hover:text-white" />
                </button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-[#0f1419]">
          <header className="bg-[#0f1419] border-b-2 border-[#1a2332] px-6 py-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-4 lg:hidden">
              <SidebarTrigger className="hover:bg-[#1a2332] p-2 rounded-lg transition-colors text-white hover:scale-110" />
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-cyan-400" />
                <h1 className="text-xl font-bold text-white">SafeNest</h1>
              </div>
            </div>
            
            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/30">
                <ShieldCheck className="w-4 h-4 text-green-400" />
                <span className="text-xs font-bold text-green-400">OWASP Protected</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 rounded-full border border-purple-500/30">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-purple-400">100% Coverage</span>
              </div>
            </div>

            <div className="ml-auto">
              <NotificationCenter />
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default function Layout({ children, currentPageName }) {
  return (
    <SidebarProvider>
      <LayoutContent children={children} currentPageName={currentPageName} />
    </SidebarProvider>
  );
}
