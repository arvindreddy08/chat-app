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
    if (data.success) { setError('Registered! Please login.'); setScreen('login'); }
    else setError(data.message);
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
      const saved = localStorage.getItem(`profile_${username}`);
      if (saved) setProfile(JSON.parse(saved));
    } else setError(data.message);
  };

  const handleJoinRoom = () => {
    if (room.trim().length >= 2) setJoined(true);
    else setError('Room name must be at least 2 characters!');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const saveProfile = () => {
    const newProfile = { ...profile, avatar: avatarPreview || profile.avatar };
    setProfile(newProfile);
    localStorage.setItem(`profile_${username}`, JSON.stringify(newProfile));
    setShowProfile(false);
  };

  const s = {
    container: {
      minHeight: '-webkit-fill-available',
      background: 'linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', sans-serif", padding: '16px', boxSizing: 'border-box',
    },
    box: {
      background: '#161b27', borderRadius: '16px', padding: '32px 24px',
      width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      border: '1px solid #2a3147', boxSizing: 'border-box',
    },
    title: { color: '#00d4ff', fontSize: '26px', fontWeight: 700, textAlign: 'center', marginBottom: '6px' },
    subtitle: { color: '#6b7594', fontSize: '13px', textAlign: 'center', marginBottom: '20px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '20px' },
    tab: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #2a3147', background: 'transparent', color: '#6b7594', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
    activeTab: { flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#00d4ff', color: '#000', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
    input: { width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #2a3147', background: '#1e2538', color: '#e8eaf0', fontSize: '16px', outline: 'none', marginBottom: '12px', boxSizing: 'border-box', WebkitAppearance: 'none' },
    btn: { width: '100%', padding: '14px', borderRadius: '10px', border: 'none', background: '#00d4ff', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '16px', marginTop: '8px', touchAction: 'manipulation' },
    error: { color: '#ff6b6b', fontSize: '13px', textAlign: 'center', marginBottom: '12px' },
    success: { color: '#00d4ff', fontSize: '13px', textAlign: 'center', marginBottom: '12px' },
    avatarCircle: { width: '72px', height: '72px', borderRadius: '50%', background: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700, color: '#000', margin: '0 auto 16px', overflow: 'hidden', cursor: 'pointer' },
    profileOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999, padding: '0' },
    profileBox: { background: '#161b27', borderRadius: '20px 20px 0 0', padding: '24px', width: '100%', maxWidth: '500px', border: '1px solid #2a3147', maxHeight: '90vh', overflowY: 'auto' },
  };

  const ProfileModal = ({ inputId }) => (
    <div style={s.profileOverlay} onClick={(e) => e.target === e.currentTarget && setShowProfile(false)}>
      <div style={s.profileBox}>
        <h3 style={{ color: '#00d4ff', marginBottom: '20px', textAlign: 'center' }}>Edit Profile</h3>
        <div style={s.avatarCircle} onClick={() => document.getElementById(inputId).click()}>
          {avatarPreview || profile.avatar ? (
            <img src={avatarPreview || profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : username[0]?.toUpperCase()}
        </div>
        <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        <p style={{ color: '#6b7594', fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>Tap avatar to change photo</p>
        <textarea
          style={{ ...s.input, height: '80px', resize: 'none', fontSize: '14px' }}
          placeholder="Your bio / status..."
          value={profile.bio}
          onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
        />
        <button style={s.btn} onClick={saveProfile}>Save Profile</button>
        <button style={{ ...s.btn, background: '#2a3147', color: '#e8eaf0', marginTop: '8px' }} onClick={() => setShowProfile(false)}>Cancel</button>
      </div>
    </div>
  );

  if (loggedIn && joined) {
    return (
      <>
        {showProfile && <ProfileModal inputId="avatarInput3" />}
        <Chat username={username} room={room} profile={profile} onEditProfile={() => setShowProfile(true)} />
      </>
    );
  }

  if (loggedIn && !joined) {
    return (
      <div style={s.container}>
        {showProfile && <ProfileModal inputId="avatarInput2" />}
        <div style={s.box}>
          <div style={s.avatarCircle} onClick={() => setShowProfile(true)}>
            {profile.avatar ? <img src={profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : username[0]?.toUpperCase()}
          </div>
          <h1 style={s.title}>💬 Live Chat</h1>
          <p style={{ color: '#00d4ff', textAlign: 'center', marginBottom: '4px', fontSize: '15px' }}>Welcome, {username}! 👋</p>
          <p style={{ color: '#6b7594', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>{profile.bio}</p>
          <button style={{ ...s.btn, background: 'transparent', border: '1px solid #2a3147', color: '#6b7594', marginBottom: '16px' }} onClick={() => setShowProfile(true)}>✏️ Edit Profile</button>
          {error && <p style={s.error}>{error}</p>}
          <input style={s.input} type="text" placeholder="Enter room name..." value={room} onChange={(e) => setRoom(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()} />
          <button style={s.btn} onClick={handleJoinRoom}>Join Room →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.box}>
        <h1 style={s.title}>💬 Live Chat</h1>
        <p style={s.subtitle}>Connect and chat in real-time</p>
        <div style={s.tabs}>
          <button style={screen === 'login' ? s.activeTab : s.tab} onClick={() => setScreen('login')}>Login</button>
          <button style={screen === 'register' ? s.activeTab : s.tab} onClick={() => setScreen('register')}>Register</button>
        </div>
        {error && <p style={error.includes('Registered') ? s.success : s.error}>{error}</p>}
        <input style={s.input} type="text" placeholder="Enter username..." value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
        <input style={s.input} type="password" placeholder="Enter password..." value={password} onChange={(e) => setPassword(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (screen === 'login' ? handleLogin() : handleRegister())} />
        <button style={s.btn} onClick={screen === 'login' ? handleLogin : handleRegister}>
          {screen === 'login' ? 'Login →' : 'Register →'}
        </button>
      </div>
    </div>
  );
}

export default App;