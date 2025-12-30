import React, { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

export default function MessageNotifications({ user }) {
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: async () => {
      if (!user) return 0;
      
      // Fetch all user's cases
      const cases = await base44.entities.MyCase.filter({
        $or: [
          { user_id: user.id },
          { created_by: user.email },
          { client_email: user.email }
        ]
      });

      // Count unread messages
      let count = 0;
      cases.forEach(c => {
        const notes = c.case_notes || [];
        const unread = notes.filter(n => 
          !n.read && 
          n.type === 'response' && 
          n.author === 'investigator'
        );
        count += unread.length;
      });

      return count;
    },
    enabled: !!user,
    refetchInterval: 10000 // Check every 10 seconds
  });

  const { data: prevCount } = useQuery({
    queryKey: ['prev-unread-count'],
    queryFn: () => unreadCount,
    enabled: false
  });

  useEffect(() => {
    if (unreadCount > (prevCount || 0)) {
      const newMessages = unreadCount - (prevCount || 0);
      
      // Show toast notification
      toast.info(`${newMessages} new message${newMessages > 1 ? 's' : ''} from investigator`, {
        icon: <MessageSquare className="w-4 h-4" />,
        duration: 5000
      });

      // Browser notification if permitted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('SafeNestT - New Message', {
          body: `You have ${newMessages} new message${newMessages > 1 ? 's' : ''} from your investigator`,
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      }
    }
  }, [unreadCount, prevCount]);

  return null; // This is a notification-only component
}