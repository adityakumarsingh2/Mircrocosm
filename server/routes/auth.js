const express = require('express');
const router = express.Router();
const passport = require('passport');

// Auth with Google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback',
    (req, res, next) => {
        // Dynamically determine frontend URL based on request host
        const host = req.get('host'); // e.g., 'localhost:5000' or '127.0.0.1:5000'
        const frontendUrl = host ? `http://${host.replace(':5000', ':5173')}` : 'http://localhost:5173';

        passport.authenticate('google', (err, user, info) => {
            if (err) {
                console.error('Passport Auth Error:', err);
                return res.redirect(`${frontendUrl}/login?error=auth_failed`);
            }
            if (!user) {
                console.warn('Passport Auth Failure:', info);
                return res.redirect(`${frontendUrl}/login?error=no_user`);
            }
            req.logIn(user, (err) => {
                if (err) {
                    console.error('Session Login Error:', err);
                    return res.redirect(`${frontendUrl}/login?error=session_error`);
                }
                console.log('User authenticated successfully:', user.username);
                return res.redirect(`${frontendUrl}/`);
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
