import React, { useState } from 'react';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [screen, setScreen] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState({ avatar: '', bio: 'Hey! I am using LiveChat 👋' });
  const [showProfile, setShowProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');

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
      setLoggedIn(true);
      // Load saved profile
      const saved = localStorage.getItem(`profile_${username}`);
      if (saved) setProfile(JSON.parse(saved));
    } else {
      setError(data.message);
    }
  };

  const handleJoinRoom = () => {
    if (room.trim().length >= 2) {
      setJoined(true);
    } else {
      setError('Room name must be at least 2 characters!');
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    const newProfile = { ...profile, avatar: avatarPreview || profile.avatar };
    setProfile(newProfile);
    localStorage.setItem(`profile_${username}`, JSON.stringify(newProfile));
    setShowProfile(false);
  };

  const styles = {
    container: {
      minHeight: '100vh', background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif",
    },
    box: {
      background: '#161b27', borderRadius: '16px', padding: '40px',
      width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      border: '1px solid #2a3147',
    },
    title: { color: '#00d4ff', fontSize: '28px', fontWeight: 700, textAlign: 'center', marginBottom: '8px' },
    subtitle: { color: '#6b7594', fontSize: '14px', textAlign: 'center', marginBottom: '24px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
    tab: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #2a3147', background: 'transparent', color: '#6b7594', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
    activeTab: { flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#00d4ff', color: '#000', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
    input: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #2a3147', background: '#1e2538', color: '#e8eaf0', fontSize: '14px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: '#00d4ff', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '16px', marginTop: '8px' },
    error: { color: '#ff6b6b', fontSize: '13px', textAlign: 'center', marginBottom: '12px' },
    success: { color: '#00d4ff', fontSize: '13px', textAlign: 'center', marginBottom: '12px' },
    avatarCircle: { width: '80px', height: '80px', borderRadius: '50%', background: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 700, color: '#000', margin: '0 auto 16px', overflow: 'hidden', cursor: 'pointer' },
    profileOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    profileBox: { background: '#161b27', borderRadius: '16px', padding: '32px', width: '360px', border: '1px solid #2a3147' },
  };

  if (loggedIn && joined) {
    return (
      <>
        {showProfile && (
          <div style={styles.profileOverlay}>
            <div style={styles.profileBox}>
              <h3 style={{ color: '#00d4ff', marginBottom: '20px' }}>Edit Profile</h3>
              <div style={styles.avatarCircle} onClick={() => document.getElementById('avatarInput').click()}>
                {avatarPreview || profile.avatar ? (
                  <img src={avatarPreview || profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  username[0]?.toUpperCase()
                )}
              </div>
              <input id="avatarInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <p style={{ color: '#6b7594', fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>Click avatar to change photo</p>
              <textarea
                style={{ ...styles.input, height: '80px', resize: 'none' }}
                placeholder="Your bio / status..."
                value={profile.bio}
                onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ ...styles.btn, flex: 1 }} onClick={saveProfile}>Save</button>
                <button style={{ ...styles.btn, flex: 1, background: '#2a3147', color: '#e8eaf0' }} onClick={() => setShowProfile(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        <Chat username={username} room={room} profile={profile} onEditProfile={() => setShowProfile(true)} />
      </>
    );
  }

  if (loggedIn && !joined) {
    return (
      <div style={styles.container}>
        <div style={styles.box}>
          <div style={styles.avatarCircle} onClick={() => setShowProfile(true)}>
            {profile.avatar ? (
              <img src={profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              username[0]?.toUpperCase()
            )}
          </div>
          <h1 style={styles.title}>💬 Live Chat</h1>
          <p style={{ color: '#00d4ff', textAlign: 'center', marginBottom: '8px' }}>Welcome, {username}! 👋</p>
          <p style={{ color: '#6b7594', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>{profile.bio}</p>
          <button style={{ ...styles.btn, background: 'transparent', border: '1px solid #2a3147', color: '#6b7594', marginBottom: '16px' }} onClick={() => setShowProfile(true)}>✏️ Edit Profile</button>
          {error && <p style={styles.error}>{error}</p>}
          <input style={styles.input} type="text" placeholder="Enter room name (min 2 chars)..." value={room} onChange={(e) => setRoom(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()} />
          <button style={styles.btn} onClick={handleJoinRoom}>Join Room →</button>

          {showProfile && (
            <div style={styles.profileOverlay}>
              <div style={styles.profileBox}>
                <h3 style={{ color: '#00d4ff', marginBottom: '20px' }}>Edit Profile</h3>
                <div style={styles.avatarCircle} onClick={() => document.getElementById('avatarInput2').click()}>
                  {avatarPreview || profile.avatar ? (
                    <img src={avatarPreview || profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : username[0]?.toUpperCase()}
                </div>
                <input id="avatarInput2" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                <p style={{ color: '#6b7594', fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>Click avatar to change photo</p>
                <textarea style={{ ...styles.input, height: '80px', resize: 'none' }} placeholder="Your bio / status..." value={profile.bio} onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{ ...styles.btn, flex: 1 }} onClick={saveProfile}>Save</button>
                  <button style={{ ...styles.btn, flex: 1, background: '#2a3147', color: '#e8eaf0' }} onClick={() => setShowProfile(false)}>Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h1 style={styles.title}>💬 Live Chat</h1>
        <p style={styles.subtitle}>Connect and chat in real-time</p>
        <div style={styles.tabs}>
          <button style={screen === 'login' ? styles.activeTab : styles.tab} onClick={() => setScreen('login')}>Login</button>
          <button style={screen === 'register' ? styles.activeTab : styles.tab} onClick={() => setScreen('register')}>Register</button>
        </div>
        {error && <p style={error.includes('Registered') ? styles.success : styles.error}>{error}</p>}
        <input style={styles.input} type="text" placeholder="Enter username..." value={username} onChange={(e) => setUsername(e.target.value)} />
        <input style={styles.input} type="password" placeholder="Enter password..." value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (screen === 'login' ? handleLogin() : handleRegister())} />
        <button style={styles.btn} onClick={screen === 'login' ? handleLogin : handleRegister}>
          {screen === 'login' ? 'Login →' : 'Register →'}
        </button>
      </div>
    </div>
  );
}

export default App;