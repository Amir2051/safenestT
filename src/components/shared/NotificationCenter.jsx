import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, CheckCircle, AlertTriangle, Gift, Flame, Trophy } from 'lucide-react';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadNotifications();
    
    // Listen for new notifications
    const handleNewNotification = () => {
      loadNotifications();
    };
    
    window.addEventListener('notificationAdded', handleNewNotification);
    return () => window.removeEventListener('notificationAdded', handleNewNotification);
  }, []);

  const loadNotifications = () => {
    const stored = JSON.parse(localStorage.getItem('inAppNotifications') || '[]');
    setNotifications(stored);
    setUnreadCount(stored.filter(n => !n.read).length);
  };

  const markAsRead = (notificationId) => {
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem('inAppNotifications', JSON.stringify(updated));
    setUnreadCount(updated.filter(n => !n.read).length);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('inAppNotifications', JSON.stringify(updated));
    setUnreadCount(0);
  };

  const clearAll = () => {
    if (confirm('Clear all notifications?')) {
      setNotifications([]);
      localStorage.setItem('inAppNotifications', '[]');
      setUnreadCount(0);
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
      system: <Bell className="w-5 h-5 text-gray-400" />
    };
    return icons[type] || icons.system;
  };

  const getTimeAgo = (timestamp) => {
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