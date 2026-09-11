const { supabasePublic, supabaseAdmin } = require('./supabaseClient');

async function verifyToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: "Access token required" });
        }

        const token = authHeader.split(' ')[1];

        // Use public client to verify the token (auth operation, not a DB query)
        const { data: { user }, error } = await supabasePublic.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ success: false, error: "Invalid or expired session token" });
        }

        // Use admin client to fetch full profile including role — bypasses RLS
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(401).json({ success: false, error: "User profile not found" });
        }

        req.user = profile;
        next();
    } catch (err) {
        return res.status(500).json({ success: false, error: "Server authentication error: " + err.message });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, error: "Access denied. Insufficient permissions." });
        }
        next();
    };
}

module.exports = { verifyToken, requireRole };
