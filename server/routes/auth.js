const express = require('express');
const router = express.Router();
const passport = require('passport');

// Auth with Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    (req, res, next) => {
        // Determine frontend URL for redirect after login.
        // FRONTEND_URL must be set in production (e.g., via Render environment variable).
        // For local dev, fallback to dynamic port swap.
        const frontendUrl = process.env.FRONTEND_URL || (() => {
            const host = req.get('host');
            if (!host) return 'http://localhost:5173';
            // Local dev: if backend is localhost:5000, frontend is localhost:5173
            return host.includes('localhost') 
                ? `http://${host.replace(':5000', ':5173')}`
                : `http://${host}`; // fallback (shouldn't happen in prod)
        })();

        console.log('[Auth] Google callback triggered, will redirect to:', frontendUrl);

        passport.authenticate('google', (err, user, info) => {
            if (err) {
                console.error('[Auth] Passport Error:', err);
                return res.redirect(`${frontendUrl}/login?error=auth_failed`);
            }
            if (!user) {
                console.warn('[Auth] Passport returned no user:', info);
                return res.redirect(`${frontendUrl}/login?error=no_user`);
            }
            req.logIn(user, (err) => {
                if (err) {
                    console.error('[Auth] Session Login Error:', err);
                    return res.redirect(`${frontendUrl}/login?error=session_error`);
                }
                console.log('[Auth] User authenticated & session created:', user.username);
                // CRITICAL: save session before redirecting
                req.session.save((saveErr) => {
                    if (saveErr) {
                        console.error('[Auth] Session save error:', saveErr);
                    }
                    return res.redirect(`${frontendUrl}/`);
                });
            });
        })(req, res, next);
    }
);

// Get current user
router.get('/current_user', (req, res) => {
    res.json({ user: req.user || null });
});

// Logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Logout failed' });
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('Session destruction error:', err);
                return res.status(500).json({ message: 'Session destruction failed' });
            }
            res.clearCookie('collabpaint.sid');
            res.json({ success: true });
        });
    });
});

module.exports = router;
