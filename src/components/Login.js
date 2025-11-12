// frontend/src/components/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// frontend/src/components/Login.js

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { login } = useAuth();

    const onSubmit = async e => {
        e.preventDefault();
        setError('');
        const success = await login(username, password);
        if (success) {
            navigate('/'); // Navigate to dashboard on success
        } else {
            setError('Login failed. Check username and password.');
        }
    };

    return (
         <div className="auth-container"> {/* <-- New Container Class */}
            <h2>Login</h2>
            <form onSubmit={onSubmit}>
                <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                <input type="password" placeholder="Password (Your Decryption Key!)" value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="submit">Login</button>
              </form>
            {error && <p className="error-message">{error}</p>}
            <p style={{ marginTop: '20px', textAlign: 'center' }}>
                No account? <Link to="/register">Register</Link>
            </p>
        </div>
    );
};

export default Login;