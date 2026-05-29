import React, { useState } from 'react';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [screen, setScreen] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [room, setRoom] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) return;
    const res = await fetch('https://chat-app-ymm4.onrender.com/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      setError('Registered! Please login.');
      setScreen('login');
    } else {
      setError(data.message);
    }
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    const res = await fetch('https://chat-app-ymm4.onrender.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('username', data.username);
      setLoggedIn(true);
    } else {
      setError(data.message);
    }
  };

  const joinRoom = () => {
    if (room.trim()) setLoggedIn(true);
  };

  if (loggedIn && room) {
    return <Chat username={username} room={room} />;
  }

  if (loggedIn && !room) {
    return (
      <div className="join-container">
        <div className="join-box">
          <h1>💬 Live Chat</h1>
          <p style={{color:'#00d4ff'}}>Welcome, {username}! 👋</p>
          <input
            type="text"
            placeholder="Enter room name..."
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-container">
      <div className="join-box">
        <h1>💬 Live Chat</h1>
        <div className="tab-buttons">
          <button
            className={screen === 'login' ? 'active-tab' : 'tab'}
            onClick={() => setScreen('login')}
          >Login</button>
          <button
            className={screen === 'register' ? 'active-tab' : 'tab'}
            onClick={() => setScreen('register')}
          >Register</button>
        </div>
        {error && <p style={{color: '#ff6b6b', fontSize: '13px'}}>{error}</p>}
        <input
          type="text"
          placeholder="Enter username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Enter password..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button onClick={screen === 'login' ? handleLogin : handleRegister}>
          {screen === 'login' ? 'Login' : 'Register'}
        </button>
      </div>
    </div>
  );
}

export default App;