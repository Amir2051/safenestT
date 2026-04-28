import React, { useState, useEffect } from 'react';
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, CheckCircle, AlertTriangle, Gift, Flame, Trophy, MessageSquare, Shield } from 'lucide-react';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');

  // Browser Notification Permission State (safe — Notification may not exist in all contexts)
  const [permission, setPermission] = useState(() => {
    try { return typeof Notification !== 'undefined' ? Notification.permission : 'denied'; } catch { return 'denied'; }
  });

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(setPermission).catch(() => {});
    }
    
    loadNotifications();
    
    // DISABLED: No auto-polling
    // Listen for local events only
    const handleNewNotification = () => loadNotifications();
    window.addEventListener('notificationAdded', handleNewNotification);
    
    return () => {
        window.removeEventListener('notificationAdded', handleNewNotification);
    };
  }, []);

  const triggerBrowserNotification = async (notif) => {
    try {
        const user = await base44.auth.me();
        // Check if chat notifications are enabled in settings (default true)
        if (user.chat_notifications_enabled === false && notif.type === 'support_message') return;
        
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
            new Notification(notif.title, {
                body: notif.message,
                icon: '/icon.png', // Assuming a default icon exists
                tag: notif.id
            });
        }
    } catch (e) {
        console.error("Push notification failed", e);
    }
  };

  const loadNotifications = async () => {
    // Combine local notifications (legacy/demo) with backend notifications
    const local = JSON.parse(localStorage.getItem('inAppNotifications') || '[]');
    
    try {
        const backend = await base44.entities.Notification.list('-created_date', 50);
        
        // Detect new unread backend notifications to trigger push
        const currentIds = new Set(notifications.map(n => n.id));
        backend.forEach(n => {
            if (!currentIds.has(n.id) && !n.read) {
                triggerBrowserNotification(n);
            }
        });

        // Merge and deduplicate
        const all = [...backend, ...local].sort((a, b) => 
            new Date(b.created_date || b.timestamp).getTime() - new Date(a.created_date || a.timestamp).getTime()
        );
        
        setNotifications(all);
        setUnreadCount(all.filter(n => !n.read).length);
    } catch (e) {
        // Fallback to local only if backend fails
        setNotifications(local);
        setUnreadCount(local.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (notificationId) => {
    // Check if it's a backend notification (has created_date) or local
    const notif = notifications.find(n => n.id === notificationId);
    if (!notif) return;

    if (notif.created_date) {
        // Backend
        await base44.entities.Notification.update(notificationId, { read: true });
    } else {
        // Local
        const local = JSON.parse(localStorage.getItem('inAppNotifications') || '[]');
        const updated = local.map(n => n.id === notificationId ? { ...n, read: true } : n);
        localStorage.setItem('inAppNotifications', JSON.stringify(updated));
    }
    loadNotifications();
  };

  const markAllAsRead = async () => {
    // Update backend
    const unreadBackend = notifications.filter(n => n.created_date && !n.read);
    await Promise.all(unreadBackend.map(n => base44.entities.Notification.update(n.id, { read: true })));

    // Update local
    const local = JSON.parse(localStorage.getItem('inAppNotifications') || '[]');
    const updatedLocal = local.map(n => ({ ...n, read: true }));
    localStorage.setItem('inAppNotifications', JSON.stringify(updatedLocal));
    
    loadNotifications();
  };

  const clearAll = async () => {
    if (confirm('Clear all notifications?')) {
      // Delete backend
      const backendIds = notifications.filter(n => n.created_date).map(n => n.id);
      await Promise.all(backendIds.map(id => base44.entities.Notification.delete(id)));

      // Clear local
      localStorage.setItem('inAppNotifications', '[]');
      loadNotifications();
    }
  };

  const getFilteredNotifications = () => {
    let filtered = [...notifications];
    
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read);
    } else if (filter !== 'all') {
      filtered = filtered.filter(n => n.type === filter);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      breach: <AlertTriangle className="w-5 h-5 text-red-400" />,
      achievement: <Trophy className="w-5 h-5 text-yellow-400" />,
      security: <Shield className="w-5 h-5 text-cyan-400" />,
      streak: <Flame className="w-5 h-5 text-orange-400" />,
      premium: <Gift className="w-5 h-5 text-purple-400" />,
      support_message: <MessageSquare className="w-5 h-5 text-blue-400" />,
      system: <Bell className="w-5 h-5 text-gray-400" />
    };
    return icons[type] || icons.system;
  };

  const getTimeAgo = (dateStr) => {
    const timestamp = typeof dateStr === 'string' ? new Date(dateStr).getTime() : dateStr;
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const filtered = getFilteredNotifications();

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-[#1a2332] rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <Card className="absolute right-0 top-12 w-96 max-w-[90vw] bg-[#1a2332] border-cyan-500/20 z-50 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between">
              <h3 className="text-white font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={markAllAsRead}
                    className="text-xs text-cyan-400 hover:bg-cyan-500/10"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="p-2 border-b border-cyan-500/10 flex gap-2 overflow-x-auto">
              {['all', 'unread', 'breach', 'achievement'].map(f => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "ghost"}
                  onClick={() => setFilter(f)}
                  className={`text-xs capitalize ${
                    filter === f ? 'bg-cyan-500 text-white' : 'text-gray-400'
                  }`}
                >
                  {f}
                </Button>
              ))}
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-cyan-500/10">
                  {filtered.map(notification => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        markAsRead(notification.id);
                        if (notification.actionUrl) {
                          window.location.href = notification.actionUrl;
                        }
                      }}
                      className={`p-4 cursor-pointer transition-colors ${
                        notification.read ? 'bg-transparent' : 'bg-cyan-500/5'
                      } hover:bg-[#0f1419]`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          notification.type === 'breach' ? 'bg-red-500/20' :
                          notification.type === 'achievement' ? 'bg-yellow-500/20' :
                          notification.type === 'premium' ? 'bg-purple-500/20' :
                          'bg-cyan-500/20'
                        }`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-white font-semibold text-sm">{notification.title}</h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-cyan-400 rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-gray-400 text-xs mb-2">{notification.message}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-xs">{getTimeAgo(notification.timestamp)}</span>
                            {notification.priority === 'high' && (
                              <Badge className="bg-red-500/20 text-red-400 text-xs">High Priority</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-4 border-t border-cyan-500/20 flex justify-between items-center">
                <span className="text-xs text-gray-400">{filtered.length} notification{filtered.length !== 1 ? 's' : ''}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearAll}
                  className="text-xs text-red-400 hover:bg-red-500/10"
                >
                  Clear All
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}