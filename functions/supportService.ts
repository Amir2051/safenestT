import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { endpoint, ...params } = await req.json();

        // 1. Start Chat (User)
        if (endpoint === 'start_chat') {
            const { subject, initial_messages } = params;
            
            // Create chat
            const chat = await base44.entities.SupportChat.create({
                user_id: user.email,
                user_name: user.full_name,
                status: 'waiting',
                subject: subject || 'New Support Request',
                last_message: initial_messages?.[initial_messages.length - 1]?.answer || 'Chat started',
                last_message_at: new Date().toISOString(),
                unread_count_admin: 1
            });

            // Save intake messages
            if (initial_messages && initial_messages.length > 0) {
                for (const msg of initial_messages) {
                    await base44.entities.SupportMessage.create({
                        chat_id: chat.id,
                        sender_id: 'system',
                        sender_role: 'system',
                        content: `**${msg.question}**\n${msg.answer}`,
                        read: false
                    });
                }
            }

            // Try to auto-assign
            // Find online admins
            try {
                const onlineAdmins = await base44.asServiceRole.entities.AdminStatus.filter({ is_online: true });
                if (onlineAdmins.length > 0) {
                    // Simple round robin or random for now
                    const admin = onlineAdmins[0];
                    await base44.asServiceRole.entities.SupportChat.update(chat.id, {
                        assigned_admin_id: admin.admin_id
                    });
                }
            } catch (e) {
                console.error("Auto-assign failed", e);
            }

            return Response.json({ chat });
        }

        // 2. Send Message
        if (endpoint === 'send_message') {
            const { chat_id, content, attachments } = params;
            
            if (!content && (!attachments || attachments.length === 0)) {
                return Response.json({ error: 'Empty message' }, { status: 400 });
            }

            const chat = await base44.entities.SupportChat.get(chat_id);
            if (!chat) return Response.json({ error: 'Chat not found' }, { status: 404 });

            const isUser = user.email === chat.user_id;
            const senderRole = isUser ? 'user' : 'admin';

            // Create message
            const message = await base44.entities.SupportMessage.create({
                chat_id,
                sender_id: user.email,
                sender_role: senderRole,
                content,
                attachments: attachments || [],
                read: false
            });

            // Update chat metadata
            const updates = {
                last_message: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
                last_message_at: new Date().toISOString()
            };

            if (isUser) {
                updates.unread_count_admin = (chat.unread_count_admin || 0) + 1;
                // If closed, reopen?
                if (chat.status === 'closed') updates.status = 'waiting';
            } else {
                updates.unread_count_user = (chat.unread_count_user || 0) + 1;
                if (chat.status === 'waiting') updates.status = 'active';
                
                // Auto-assign if admin replies and chat is unassigned
                if (!chat.assigned_admin_id) {
                    updates.assigned_admin_id = user.email;
                }
            }

            await base44.asServiceRole.entities.SupportChat.update(chat_id, updates);

            return Response.json({ message });
        }

        // 3. Admin Actions
        if (endpoint === 'set_admin_status') {
            if (user.role !== 'admin' && !user.is_admin) return Response.json({ error: 'Forbidden' }, { status: 403 });
            
            const { is_online } = params;
            
            // Check if status record exists
            const statuses = await base44.entities.AdminStatus.filter({ admin_id: user.email });
            
            if (statuses.length > 0) {
                await base44.entities.AdminStatus.update(statuses[0].id, {
                    is_online,
                    last_active: new Date().toISOString()
                });
            } else {
                await base44.entities.AdminStatus.create({
                    admin_id: user.email,
                    is_online,
                    last_active: new Date().toISOString()
                });
            }
            
            return Response.json({ success: true, is_online });
        }

        if (endpoint === 'assign_chat') {
            if (user.role !== 'admin' && !user.is_admin) return Response.json({ error: 'Forbidden' }, { status: 403 });
            const { chat_id } = params;

            const chat = await base44.entities.SupportChat.update(chat_id, {
                assigned_admin_id: user.email,
                status: 'active'
            });

            // Add system message
            await base44.entities.SupportMessage.create({
                chat_id,
                sender_id: 'system',
                sender_role: 'system',
                content: `Admin ${user.full_name} has joined the chat.`
            });

            return Response.json({ chat });
        }

        if (endpoint === 'close_chat') {
             const { chat_id } = params;
             const chat = await base44.entities.SupportChat.get(chat_id);
             
             // Allow user to close their own chat or admin
             if (chat.user_id !== user.email && user.role !== 'admin' && !user.is_admin) {
                 return Response.json({ error: 'Forbidden' }, { status: 403 });
             }

             await base44.entities.SupportChat.update(chat_id, {
                 status: 'closed'
             });

             await base44.entities.SupportMessage.create({
                 chat_id,
                 sender_id: 'system',
                 sender_role: 'system',
                 content: `Chat closed by ${user.full_name}.`
             });

             return Response.json({ success: true });
        }

        if (endpoint === 'mark_read') {
            const { chat_id } = params;
            const chat = await base44.entities.SupportChat.get(chat_id);
            if (!chat) return Response.json({ error: 'Chat not found' }, { status: 404 });

            const isUser = user.email === chat.user_id;
            
            if (isUser) {
                await base44.asServiceRole.entities.SupportChat.update(chat_id, { unread_count_user: 0 });
            } else {
                await base44.asServiceRole.entities.SupportChat.update(chat_id, { unread_count_admin: 0 });
            }
            
            return Response.json({ success: true });
        }

        return Response.json({ error: 'Unknown endpoint' }, { status: 400 });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});