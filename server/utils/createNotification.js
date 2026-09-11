const { supabaseAdmin } = require('../middleware/supabaseClient');

async function createNotification({ user_id, message, type = 'general' }) {
  if (!user_id || !message) {
    console.error('[createNotification] Missing user_id or message');
    return { success: false };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id,
        message,
        type,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('[createNotification] Supabase error:', error);
      return { success: false, error };
    }

    console.log('[createNotification] Notification created for user:', user_id);
    return { success: true, data };
  } catch (err) {
    console.error('[createNotification] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

async function createNotificationForAllAdmins({ message, type = 'general' }) {
  try {
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'admin');

    if (adminError) {
      console.error('[createNotificationForAllAdmins] Error fetching admins:', adminError);
      return { success: false };
    }

    if (!admins || admins.length === 0) {
      console.warn('[createNotificationForAllAdmins] No admin profiles found in database');
      return { success: false, error: 'No admins found' };
    }

    console.log(`[createNotificationForAllAdmins] Sending notification to ${admins.length} admin(s)`);

    const results = await Promise.all(
      admins.map(admin =>
        createNotification({ user_id: admin.id, message, type })
      )
    );

    return { success: true, results, admins };
  } catch (err) {
    console.error('[createNotificationForAllAdmins] Unexpected error:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { createNotification, createNotificationForAllAdmins };
