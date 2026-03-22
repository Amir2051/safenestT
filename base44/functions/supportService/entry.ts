import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { endpoint, ...data } = await req.json();

        switch (endpoint) {
            case 'start_chat':
                return await startChat(base44, user, data);
            case 'send_message':
                return await sendMessage(base44, user, data);
            case 'get_messages': // Not strictly needed if using list directly from frontend, but good for custom logic
                return await getMessages(base44, user, data);
            case 'assign_chat':
                return await assignChat(base44, user, data);
            case 'close_chat':
                return await closeChat(base44, user, data);
            case 'mark_read':
                return await markRead(base44, user, data);
            case 'set_admin_status':
                return await setAdminStatus(base44, user, data);
            default:
                return Response.json({ error: 'Invalid endpoint' }, { status: 400 });
        }
    } catch (error) {
        console.error("Support Service Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

async function startChat(base44, user, { subject, initial_messages }) {
    // 1. Create the Chat container
    const chat = await base44.asServiceRole.entities.SupportChat.create({
        user_id: user.email,
        user_name: user.full_name || user.email.split('@')[0],
        status: 'waiting',
        subject: subject || 'General Inquiry',
        last_message: initial_messages?.[0]?.content || 'Started a new chat',
        last_message_at: new Date().toISOString(),
        unread_count_admin: 1, // Start with 1 unread for admin
        unread_count_user: 0
    });

    // 2. Add initial message(s)
    if (initial_messages && initial_messages.length > 0) {
        for (const msg of initial_messages) {
            await base44.asServiceRole.entities.SupportMessage.create({
                chat_id: chat.id,
                sender_id: user.email,
                sender_role: 'user',
                content: msg.content,
                read: false,
                created_date: new Date().toISOString()
            });
        }
    } else {
        // Fallback if no initial message provided
        await base44.asServiceRole.entities.SupportMessage.create({
            chat_id: chat.id,
            sender_id: user.email,
            sender_role: 'user',
            content: 'I need assistance.',
            read: false,
            created_date: new Date().toISOString()
        });
    }

    // 3. Notify Admins (Placeholder for now, could be Notification entity)
    await base44.asServiceRole.entities.Notification.create({
        // Targeting a generic admin group or relying on admin dashboard polling
        // Since we don't have user groups, we might just rely on polling for now or notify specific admins if we had logic
        user_id: 'admin', // Placeholder or specific logic
        type: 'support_message',
        title: 'New Support Ticket',
        message: `${user.email}: ${subject}`,
        actionUrl: `/admin-support?chat=${chat.id}`
    }).catch(() => {}); // Ignore if 'admin' user doesn't exist

    return Response.json({ success: true, chat });
}

async function sendMessage(base44, user, { chat_id, content }) {
    if (!content || !content.trim()) {
        return Response.json({ error: 'Message content empty' }, { status: 400 });
    }

    const chat = await base44.asServiceRole.entities.SupportChat.get(chat_id);
    if (!chat) return Response.json({ error: 'Chat not found' }, { status: 404 });

    // Determine role
    const isAdmin = user.role === 'admin' || user.is_admin;
    const senderRole = isAdmin ? 'admin' : 'user';

    // Verify access
    if (!isAdmin && chat.user_id !== user.email) {
        return Response.json({ error: 'Unauthorized access to chat' }, { status: 403 });
    }

    // Create Message
    const message = await base44.asServiceRole.entities.SupportMessage.create({
        chat_id: chat_id,
        sender_id: user.email,
        sender_role: senderRole,
        content: content,
        read: false,
        created_date: new Date().toISOString()
    });

    // Update Chat Metadata
    const updates = {
        last_message: content,
        last_message_at: new Date().toISOString(),
        status: isAdmin ? 'active' : 'waiting' // If admin replies, active. If user replies, waiting.
    };

    if (senderRole === 'user') {
        updates.unread_count_admin = (chat.unread_count_admin || 0) + 1;
    } else {
        updates.unread_count_user = (chat.unread_count_user || 0) + 1;
        // If admin replies, assign to them if not already
        if (!chat.assigned_admin_id) {
            updates.assigned_admin_id = user.email;
        }
    }

    await base44.asServiceRole.entities.SupportChat.update(chat_id, updates);

    // Notification Logic
    if (senderRole === 'admin') {
        // Notify User
        await base44.asServiceRole.entities.Notification.create({
            user_id: chat.user_id,
            type: 'support_message',
            title: 'Support Replied',
            message: `New message in "${chat.subject}"`,
            actionUrl: `/support?chat=${chat.id}`
        });
    }

    return Response.json({ success: true, message });
}

async function markRead(base44, user, { chat_id }) {
    const chat = await base44.asServiceRole.entities.SupportChat.get(chat_id);
    if (!chat) return Response.json({ error: 'Chat not found' }, { status: 404 });

    const isAdmin = user.role === 'admin' || user.is_admin;

    if (isAdmin) {
        if (chat.unread_count_admin > 0) {
            await base44.asServiceRole.entities.SupportChat.update(chat_id, { unread_count_admin: 0 });
        }
    } else {
        if (chat.unread_count_user > 0) {
            await base44.asServiceRole.entities.SupportChat.update(chat_id, { unread_count_user: 0 });
        }
    }

    // Mark individual messages as read (optional, can be heavy if many messages)
    // For now, simpler to just rely on chat-level counts for UI badges
    
    return Response.json({ success: true });
}

async function assignChat(base44, user, { chat_id }) {
    const isAdmin = user.role === 'admin' || user.is_admin;
    if (!isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 403 });

    await base44.asServiceRole.entities.SupportChat.update(chat_id, {
        assigned_admin_id: user.email,
        status: 'active'
    });

    // Add system message
    await base44.asServiceRole.entities.SupportMessage.create({
        chat_id: chat_id,
        sender_id: 'system',
        sender_role: 'system',
        content: `${user.full_name || 'Agent'} joined the chat.`,
        created_date: new Date().toISOString()
    });

    const chat = await base44.asServiceRole.entities.SupportChat.get(chat_id);
    return Response.json({ success: true, chat });
}

async function closeChat(base44, user, { chat_id }) {
    const chat = await base44.asServiceRole.entities.SupportChat.get(chat_id);
    const isAdmin = user.role === 'admin' || user.is_admin;

    if (!isAdmin && chat.user_id !== user.email) return Response.json({ error: 'Unauthorized' }, { status: 403 });

    await base44.asServiceRole.entities.SupportChat.update(chat_id, {
        status: 'closed'
    });

    // Add system message
    await base44.asServiceRole.entities.SupportMessage.create({
        chat_id: chat_id,
        sender_id: 'system',
        sender_role: 'system',
        content: `Chat closed by ${isAdmin ? 'support' : 'user'}.`,
        created_date: new Date().toISOString()
    });

    return Response.json({ success: true });
}

async function setAdminStatus(base44, user, { is_online }) {
    const isAdmin = user.role === 'admin' || user.is_admin;
    if (!isAdmin) return Response.json({ error: 'Unauthorized' }, { status: 403 });

    // Check if status exists
    const status = await base44.asServiceRole.entities.AdminStatus.filter({ admin_id: user.email });
    
    if (status.length > 0) {
        await base44.asServiceRole.entities.AdminStatus.update(status[0].id, {
            is_online,
            last_active: new Date().toISOString()
        });
    } else {
        await base44.asServiceRole.entities.AdminStatus.create({
            admin_id: user.email,
            is_online,
            last_active: new Date().toISOString()
        });
    }

    return Response.json({ success: true });
}