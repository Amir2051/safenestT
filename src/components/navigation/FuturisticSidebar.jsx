import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, LayoutDashboard, Lock, Bell, Bot, Settings, LogOut,
  Users, Wifi, Activity, ShieldCheck, Mail, Server,
  ChevronRight, Power, AlertTriangle, Globe, Smartphone, UserCheck, Command,
  Wallet, Search, Building2, CreditCard, FileText, Brain,
  Megaphone, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const navigationItems = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: LayoutDashboard,
    url: createPageUrl('Dashboard'),
    glow: 'cyan'
  },
  {
    id: 'verified-hub',
    title: 'Verified Investments',
    icon: Building2,
    url: createPageUrl('VerifiedHub'),
    glow: 'blue',
    badge: 'HUB'
  },

  {
    id: 'messages',
    title: 'AI Assistant',
    icon: Bot,
    url: createPageUrl('MiaAssistant'),
    glow: 'purple',
    badge: 'AI'
  },

  {
    id: 'vault',
    title: 'Password Vault',
    icon: Lock,
    url: createPageUrl('PasswordVault'),
    glow: 'blue'
  },

  {
    id: 'electra',
    title: 'Electra Wallet',
    icon: Wallet,
    url: createPageUrl('ElectraWallet'),
    glow: 'purple',
    badge: 'NEW'
  },
  {
    id: 'crypto',
    title: 'Crypto Protection',
    icon: Wallet,
    url: createPageUrl('CryptoProtection'),
    glow: 'purple'
  },
  {
    id: 'device-care',
    title: 'Device Protection',
    icon: Smartphone,
    url: createPageUrl('DeviceCare'),
    glow: 'green',
    badge: 'SCAN'
  },
  {
    id: 'web-vpn',
    title: 'Web VPN',
    icon: Globe,
    url: createPageUrl('WebVPN'),
    glow: 'cyan'
  },
  {
    id: 'vpn',
    title: 'VPN Protection',
    icon: Wifi,
    url: createPageUrl('VPNPage'),
    glow: 'emerald'
  },
  {
    id: 'alerts',
    title: 'Security Alerts',
    icon: Bell,
    url: createPageUrl('Alerts'),
    glow: 'red',
    badge: 'LIVE'
  },
  {
    id: 'reported-scams',
    title: 'Reported Scams',
    icon: AlertTriangle,
    url: createPageUrl('ReportedScams'),
    glow: 'red'
  },
  {
    id: 'my-cases',
    title: 'My Cases',
    icon: FileText,
    url: createPageUrl('MyCases'),
    glow: 'cyan'
  },
  {
    id: 'invitations',
    title: 'Referrals',
    icon: Users,
    url: createPageUrl('Referrals'),
    glow: 'pink'
  },
  {
    id: 'subscription',
    title: 'My Subscription',
    icon: CreditCard,
    url: createPageUrl('Subscription'),
    glow: 'purple',
    badge: 'PREMIUM'
  },
  {
    id: 'activity',
    title: 'Activity Log',
    icon: Activity,
    url: createPageUrl('Activity'),
    glow: 'green'
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    url: createPageUrl('Settings'),
    glow: 'gray'
  },
];

const mediaNavItems = [
   { 
     id: 'media-command', 
     title: "Media Command", 
     icon: Megaphone, 
     url: createPageUrl('MediaDashboard'), 
     glow: "pink" 
   },
   { 
     id: 'media-ai', 
     title: "Media AI Agent", 
     icon: Sparkles, 
     url: createPageUrl('MediaDirectorAI'), 
     glow: "purple", 
     badge: 'AI' 
   },
];

const adminItems = [
  {
    id: 'admin-verified-companies',
    title: 'Verified Investment Hub',
    icon: Building2,
    url: createPageUrl('AdminVerifiedCompanies'),
    glow: 'blue',
    badge: 'ADMIN'
  },
  {
    id: 'admin-investment-monitor',
    title: 'Investment Monitor',
    icon: Activity,
    url: createPageUrl('AdminInvestmentMonitor'),
    glow: 'emerald',
    badge: 'ADMIN'
  },
  {
    id: 'investigation-portal',
    title: 'Investigation Portal',
    icon: Search,
    url: createPageUrl('InvestigationDashboard'),
    glow: 'red',
    badge: 'ADMIN'
  },
  {
    id: 'intel-center',
    title: 'Intelligence Center',
    icon: Brain,
    url: createPageUrl('IntelligenceCenter'),
    glow: 'purple',
    badge: 'ADMIN'
  },
  {
    id: 'le-access',
    title: 'LEO Portal Access',
    icon: Lock,
    url: createPageUrl('LawEnforcementAccess'),
    glow: 'blue',
    badge: 'LEO'
  },
  {
    id: 'admin-dashboard',
    title: 'Admin Dashboard',
    icon: Command,
    url: createPageUrl('AdminDashboard'),
    glow: 'cyan',
    badge: 'ADMIN'
  },
  {
    id: 'admin-approvals',
    title: 'User Approvals',
    icon: UserCheck,
    url: createPageUrl('AdminUserApprovals'),
    glow: 'purple',
    badge: 'ADMIN'
  },
  {
    id: 'admin-invites',
    title: 'Invite Manager',
    icon: Mail,
    url: createPageUrl('AdminInvites'),
    glow: 'red',
    badge: 'ADMIN'
  },
  {
    id: 'admin-vpn',
    title: 'VPN Servers',
    icon: Server,
    url: createPageUrl('AdminVPNServers'),
    glow: 'orange',
    badge: 'ADMIN'
  },
  {
    id: 'admin-subscriptions',
    title: 'Subscriptions',
    icon: CreditCard,
    url: createPageUrl('AdminSubscriptions'),
    glow: 'emerald',
    badge: 'ADMIN'
  }
];

const glowColors = {
  cyan: 'shadow-cyan-500/50 border-cyan-500/50',
  purple: 'shadow-purple-500/50 border-purple-500/50',
  blue: 'shadow-blue-500/50 border-blue-500/50',
  pink: 'shadow-pink-500/50 border-pink-500/50',
  green: 'shadow-green-500/50 border-green-500/50',
  red: 'shadow-red-500/50 border-red-500/50',
  emerald: 'shadow-emerald-500/50 border-emerald-500/50',
  gray: 'shadow-gray-500/50 border-gray-500/50',
  orange: 'shadow-orange-500/50 border-orange-500/50'
};

const NavItem = ({ item, activeItem, onNavClick }) => {
    const isActive = activeItem === item.id;
    const Icon = item.icon;
    const glow = glowColors[item.glow] || glowColors.cyan;
    
    return (
      <motion.div
        key={item.id}
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="relative"
      >
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-purple-500 rounded-r-full ${glow}`}
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
        
        <button
          onClick={() => onNavClick(item)}
          className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg transition-all duration-300 group touch-manipulation ${
            isActive
              ? `bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 ${glow}`
              : 'bg-gray-900/30 border border-gray-700/30 hover:border-cyan-500/30 hover:bg-gray-800/50'
          }`}
        >
          <div className={`relative ${isActive ? 'animate-pulse-glow' : ''}`}>
            <Icon className={`w-5 h-5 ${
              isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-cyan-400'
            } transition-colors`} />
            {isActive && (
              <div className="absolute inset-0 blur-md bg-cyan-400 opacity-50" />
            )}
          </div>
          
          <span className={`flex-1 text-left text-sm font-medium tracking-wide ${
            isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
          } transition-colors leading-relaxed`}>
            {item.label || item.title}
          </span>
          
          {item.badge && (
            <Badge className={`text-[9px] px-1.5 py-0.5 ${
              item.badge === 'ADMIN'
                ? 'bg-red-500/20 text-red-400 border-red-500/50'
                : item.badge === 'AI'
                ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                : item.badge === 'SCAN'
                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                : item.badge === 'NEW'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                : item.badge === 'LEO'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                : item.badge === 'HUB'
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
            } border`}>
              {item.badge}
            </Badge>
          )}
          
          {isActive && (
            <ChevronRight className="w-4 h-4 text-cyan-400 animate-pulse" />
          )}
        </button>
      </motion.div>
    );
};

export default function FuturisticSidebar({ user, onLogout, onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeItem, setActiveItem] = useState('dashboard');
  const [securityStatus, setSecurityStatus] = useState('optimal');
  const [lastLogin, setLastLogin] = useState(null);

  useEffect(() => {
    const allItems = [...navigationItems, ...adminItems, ...mediaNavItems];
    
    const current = allItems.find(item => location.pathname === item.url);
    if (current) {
      setActiveItem(current.id);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      setLastLogin(user.last_login || user.created_date);
      
      const score = user.risk_score || 0;
      if (score >= 90) setSecurityStatus('optimal');
      else if (score >= 70) setSecurityStatus('good');
      else if (score >= 50) setSecurityStatus('warning');
      else setSecurityStatus('critical');
    }
  }, [user]);

  const handleNavClick = (item) => {
    setActiveItem(item.id);
    navigate(item.url);
    if (onNavigate) {
      onNavigate();
    }
  };

  const statusConfig = {
    optimal: { color: 'text-green-400', glow: 'shadow-green-500/50', label: 'Optimal' },
    good: { color: 'text-blue-400', glow: 'shadow-blue-500/50', label: 'Good' },
    warning: { color: 'text-yellow-400', glow: 'shadow-yellow-500/50', label: 'Warning' },
    critical: { color: 'text-red-400', glow: 'shadow-red-500/50', label: 'Critical' }
  };

  const status = statusConfig[securityStatus] || statusConfig.optimal;

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative w-72 h-full min-h-screen bg-black/95 backdrop-blur-xl border-r border-cyan-500/20 flex flex-col"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/20 via-transparent to-purple-950/20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-radial from-cyan-500/10 to-transparent blur-2xl pointer-events-none animate-pulse" />
      
      <div className="relative z-10 flex flex-col h-full min-h-screen p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 rounded-full blur-md opacity-75 animate-spin-slow" />
            <div className="relative w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/50 mx-auto">
              <span className="text-white font-bold text-2xl">
                {user?.full_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <h3 className="text-white font-bold text-lg tracking-wide">
              {user?.full_name || 'User'}
            </h3>
            <p className="text-cyan-400 text-xs font-mono tracking-wider mt-1">
              {user?.role === 'admin' || user?.is_admin ? '// ADMIN ACCESS //' : '// SECURED //'}
            </p>
            {user?.job_title && user?.job_title !== 'None' && (
                <Badge className="mt-1 bg-pink-500/20 text-pink-400 border-pink-500/50 text-[10px]">
                    {user.job_title}
                </Badge>
            )}
          </div>
        </motion.div>

        <div className="flex-1 overflow-y-auto space-y-2 scrollbar-custom pb-4" style={{ minHeight: '300px', maxHeight: 'calc(100vh - 400px)' }}>
          <AnimatePresence>
            {navigationItems.map((item) => (
              <NavItem 
                key={item.id} 
                item={item} 
                activeItem={activeItem} 
                onNavClick={handleNavClick} 
              />
            ))}

            {/* Media Director Navigation - Show if user is admin (with title) OR if user is not admin but has title */}
            {(user?.job_title === 'Media Director' || (user?.role === 'admin' && user?.job_title === 'Media Director')) && (
              <div className="space-y-2 pt-4 border-t border-gray-800/50">
                <div className="px-4 mb-2">
                  <span className="text-xs font-bold text-pink-500 uppercase tracking-widest">Media Director</span>
                </div>
                {mediaNavItems.map((item) => (
                  <NavItem 
                    key={item.id} 
                    item={item} 
                    activeItem={activeItem} 
                    onNavClick={handleNavClick} 
                  />
                ))}
              </div>
            )}

            {/* Admin Navigation */}
            {(user?.role === 'admin' || user?.is_admin) && (
              <div className="space-y-2 pt-4 border-t border-gray-800/50">
                <div className="px-4 mb-2">
                  <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Admin Zone</span>
                </div>
                {adminItems.map((item) => (
                  <NavItem 
                    key={item.id} 
                    item={item} 
                    activeItem={activeItem} 
                    onNavClick={handleNavClick} 
                  />
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 space-y-4"
        >
          <div className="p-4 bg-gray-900/50 backdrop-blur-md border border-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wider">System Status</span>
              <div className={`w-2 h-2 rounded-full ${status.color} ${status.glow} shadow-lg animate-pulse`} />
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${status.color}`} />
              <span className={`text-sm font-bold ${status.color}`}>{status.label}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              <p className="text-[10px] text-gray-500 font-mono">
                Last: {lastLogin ? new Date(lastLogin).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full bg-red-950/30 border-red-500/50 text-red-400 hover:bg-red-950/50 hover:border-red-500 transition-all"
            onClick={() => {
              toast.info('Emergency mode: Coming soon');
              if (onNavigate) onNavigate();
            }}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Emergency Mode
          </Button>

          <Button
            onClick={() => {
              onLogout();
              if (onNavigate) onNavigate();
            }}
            className="w-full bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 text-gray-300 hover:text-white hover:border-cyan-500/50 transition-all"
          >
            <Power className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </motion.div>
      </div>

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-gradient-to-b from-transparent via-cyan-500 to-transparent animate-scan-line" />
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 8px currentColor); }
          50% { opacity: 0.6; filter: drop-shadow(0 0 12px currentColor); }
        }
        
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        
        .animate-scan-line {
          animation: scan-line 4s linear infinite;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .scrollbar-custom::-webkit-scrollbar {
          width: 6px;
        }
        
        .scrollbar-custom::-webkit-scrollbar-track {
          background: rgba(15, 20, 25, 0.5);
          border-radius: 10px;
        }
        
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3);
          border-radius: 10px;
        }
        
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.5);
        }
        
        .scrollbar-custom {
          scrollbar-width: thin;
          scrollbar-color: rgba(6, 182, 212, 0.3) rgba(15, 20, 25, 0.5);
        }
      `}</style>
    </motion.div>
  );
}