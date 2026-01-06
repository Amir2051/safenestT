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
    staleTime: 30000, // 30 seconds
    refetchInterval: false // DISABLED: No auto-polling
  });

  // FIXED: Use ref instead of query to track previous count
  const prevCountRef = React.useRef(unreadCount);

  useEffect(() => {
    // FIXED: Only show notification if count actually increased AND we have a valid previous value
    if (unreadCount > 0 && prevCountRef.current !== undefined && unreadCount > prevCountRef.current) {
      const newMessages = unreadCount - prevCountRef.current;
      
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
    
    // Update ref
    prevCountRef.current = unreadCount;
  }, [unreadCount]); // FIXED: Only depend on unreadCount

  return null; // This is a notification-only component
}