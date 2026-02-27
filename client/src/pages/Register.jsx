import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios'; // Added axios import

const Register = () => {
    return (
        <div className="register-page flex-center fade-in" style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at top left, hsl(221 83% 15%), hsl(var(--background)))'
        }}>
            <div className="glass-card" style={{
                padding: '3rem 2.5rem',
                maxWidth: '440px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <h2 style={{ marginBottom: '1rem', color: 'white', fontSize: '1.5rem', fontWeight: '700' }}>Register</h2>
                <p style={{ marginBottom: '2rem', color: 'hsl(var(--foreground) / 0.6)' }}> Registration is automatically handled via Google Login for a seamless experience. </p>
                <Link to="/login" style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    background: 'hsl(var(--primary))',
                    color: 'white',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontWeight: '600'
                }}>Go to Login</Link>
            </div>
        </div>
    );
};

export default Register;
