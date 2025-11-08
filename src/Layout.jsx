import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Shield, LayoutDashboard, Lock, Bell, FileText, Bot, Settings, LogOut, Smartphone, Zap, CreditCard, Eye, HardDrive, Trophy, Users, Wifi } from "lucide-react";
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
} from "@/components/ui/sidebar";
import NotificationCenter from "./components/shared/NotificationCenter.jsx";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: LayoutDashboard,
  },
  {
    title: "VPN Protection",
    url: createPageUrl("VPNPage"),
    icon: Wifi,
  },
  {
    title: "Device Care",
    url: createPageUrl("DeviceCare"),
    icon: Smartphone,
  },
  {
    title: "Storage Optimizer",
    url: createPageUrl("StorageOptimizer"),
    icon: HardDrive,
  },
  {
    title: "Dark Web Monitor",
    url: createPageUrl("DarkWebMonitor"),
    icon: Eye,
  },
  {
    title: "Auto Protection",
    url: createPageUrl("AutoProtection"),
    icon: Zap,
  },
  {
    title: "Password Vault",
    url: createPageUrl("PasswordVault"),
    icon: Lock,
  },
  {
    title: "Alerts",
    url: createPageUrl("Alerts"),
    icon: Bell,
  },
  {
    title: "Reports",
    url: createPageUrl("Reports"),
    icon: FileText,
  },
  {
    title: "Achievements",
    url: createPageUrl("Achievements"),
    icon: Trophy,
  },
  {
    title: "Invite Friends",
    url: createPageUrl("Referrals"),
    icon: Users,
  },
  {
    title: "Mia AI Assistant",
    url: createPageUrl("MiaAssistant"),
    icon: Bot,
  },
  {
    title: "Settings",
    url: createPageUrl("Settings"),
    icon: Settings,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isPremium = user?.subscription_plan === 'basic' || user?.subscription_plan === 'elite';
  const isActive = user?.payment_status === 'active';

  return (
    <SidebarProvider>
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
      `}</style>
      <div className="min-h-screen flex w-full bg-[#0f1419]">
        <Sidebar className="border-r border-[#1a2332] bg-[#0f1419]">
          <SidebarHeader className="border-b border-[#1a2332] p-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-[#0f1419] animate-pulse" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-white">SafeNest</h2>
                <p className="text-xs text-cyan-400">AI-Powered Security</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                Security Center
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`rounded-xl mb-1 transition-all duration-200 ${
                            isActive 
                              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-600/20 text-cyan-400 shadow-lg shadow-cyan-500/10' 
                              : 'hover:bg-[#1a2332] text-gray-300'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.title}</span>
                            {isActive && (
                              <div className="ml-auto w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Upgrade CTA */}
            {(!isPremium || !isActive) && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <Link to={createPageUrl("Upgrade")}>
                    <div className="mx-2 p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-all cursor-pointer">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-semibold text-purple-400">Upgrade to Premium</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        From $9.99/month
                      </p>
                      <p className="text-xs text-purple-300">
                        ⚡ Limited: 20% off for first 100 users!
                      </p>
                    </div>
                  </Link>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {user?.risk_score !== undefined && (
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
                  Security Score
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <div className="px-3 py-4 bg-gradient-to-br from-[#1a2332] to-[#0f1419] rounded-xl border border-cyan-500/20 mx-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Your Score</span>
                      <span className={`text-2xl font-bold ${
                        user.risk_score >= 80 ? 'text-green-400' : 
                        user.risk_score >= 60 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {user.risk_score}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#0f1419] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          user.risk_score >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 
                          user.risk_score >= 60 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 
                          'bg-gradient-to-r from-red-500 to-orange-400'
                        }`}
                        style={{ width: `${user.risk_score}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">
                        {isPremium && isActive ? (
                          user.subscription_plan === 'elite' ? '✨ Elite' : '💎 Basic'
                        ) : '🆓 Free'}
                      </p>
                      {isPremium && isActive && user.renewal_date && (
                        <p className="text-xs text-gray-500">
                          Renews {new Date(user.renewal_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t border-[#1a2332] p-4">
            {user && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold text-sm">
                      {user.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{user.full_name || 'User'}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 p-2 hover:bg-[#1a2332] rounded-lg transition-colors flex-shrink-0"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col bg-[#0f1419]">
          <header className="bg-[#0f1419] border-b border-[#1a2332] px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4 lg:hidden">
              <SidebarTrigger className="hover:bg-[#1a2332] p-2 rounded-lg transition-colors text-white" />
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-cyan-400" />
                <h1 className="text-xl font-bold text-white">SafeNest</h1>
              </div>
            </div>
            
            {/* Notification Center */}
            <div className="ml-auto">
              <NotificationCenter />
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}