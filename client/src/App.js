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
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) { setError('Registered! Please login.'); setScreen('login'); }
    else setError(data.message);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    const res = await fetch('https://chat-app-ymm4.onrender.com/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    },
    box: {
      background: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '24px', padding: '36px 28px',
      width: '100%', maxWidth: '400px',
      boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.3)',
    },
    title: { color: '#fff', fontSize: '28px', fontWeight: 800, textAlign: 'center', marginBottom: '6px', textShadow: '0 2px 10px rgba(0,0,0,0.2)' },
    subtitle: { color: 'rgba(255,255,255,0.8)', fontSize: '14px', textAlign: 'center', marginBottom: '24px' },
    tabs: { display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '4px' },
    tab: { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 },
    activeTab: { flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 700, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
    input: { width: '100%', padding: '14px 18px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '16px', outline: 'none', marginBottom: '12px', backdropFilter: 'blur(10px)', WebkitAppearance: 'none' },
    btn: { width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '16px', marginTop: '8px', boxShadow: '0 4px 15px rgba(240,147,251,0.5)', touchAction: 'manipulation' },
    btnBlue: { width: '100%', padding: '14px', borderRadius: '14px', border: 'none', background: 'linear-gradient(135deg, #4facfe, #00f2fe)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '16px', marginTop: '8px', boxShadow: '0 4px 15px rgba(79,172,254,0.5)', touchAction: 'manipulation' },
    error: { color: '#ff6b6b', fontSize: '13px', textAlign: 'center', marginBottom: '12px', background: 'rgba(255,107,107,0.15)', padding: '8px', borderRadius: '8px' },
    success: { color: '#00f2fe', fontSize: '13px', textAlign: 'center', marginBottom: '12px', background: 'rgba(0,242,254,0.15)', padding: '8px', borderRadius: '8px' },
    avatarCircle: { width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #f093fb, #f5576c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 800, color: '#fff', margin: '0 auto 16px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 8px 25px rgba(240,147,251,0.5)' },
    profileOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999 },
    profileBox: { background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '24px 24px 0 0', padding: '28px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.3)' },
  };

  const ProfileModal = ({ inputId }) => (
    <div style={s.profileOverlay} onClick={(e) => e.target === e.currentTarget && setShowProfile(false)}>
      <div style={s.profileBox}>
        <h3 style={{ color: '#fff', marginBottom: '20px', textAlign: 'center', fontSize: '20px', fontWeight: 800 }}>✨ Edit Profile</h3>
        <div style={s.avatarCircle} onClick={() => document.getElementById(inputId).click()}>
          {avatarPreview || profile.avatar ? (
            <img src={avatarPreview || profile.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : username[0]?.toUpperCase()}
        </div>
        <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', textAlign: 'center', marginBottom: '16px' }}>Tap avatar to change photo</p>
        <textarea style={{ ...s.input, height: '80px', resize: 'none', fontSize: '14px' }}
          placeholder="Your bio / status..." value={profile.bio}
          onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))} />
        <button style={s.btn} onClick={saveProfile}>💾 Save Profile</button>
        <button style={{ ...s.btn, background: 'rgba(255,255,255,0.2)', boxShadow: 'none', marginTop: '8px' }} onClick={() => setShowProfile(false)}>Cancel</button>
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
          <p style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginBottom: '4px', fontSize: '16px', fontWeight: 600 }}>Welcome, {username}! 👋</p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>{profile.bio}</p>
          <button style={{ ...s.btn, background: 'rgba(255,255,255,0.15)', boxShadow: 'none', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => setShowProfile(true)}>✏️ Edit Profile</button>
          {error && <p style={s.error}>{error}</p>}
          <input style={s.input} type="text" placeholder="✨ Enter room name..." value={room}
            onChange={(e) => setRoom(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()} />
          <button style={s.btnBlue} onClick={handleJoinRoom}>🚀 Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.box}>
        <div style={{ fontSize: '48px', textAlign: 'center', marginBottom: '8px' }}>💬</div>
        <h1 style={s.title}>Live Chat</h1>
        <p style={s.subtitle}>Connect and chat in real-time ✨</p>
        <div style={s.tabs}>
          <button style={screen === 'login' ? s.activeTab : s.tab} onClick={() => setScreen('login')}>🔑 Login</button>
          <button style={screen === 'register' ? s.activeTab : s.tab} onClick={() => setScreen('register')}>🌟 Register</button>
        </div>
        {error && <p style={error.includes('Registered') ? s.success : s.error}>{error}</p>}
        <input style={{ ...s.input, '::placeholder': { color: 'rgba(255,255,255,0.5)' } }}
          type="text" placeholder="👤 Enter username..." value={username}
          onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
        <input style={s.input} type="password" placeholder="🔒 Enter password..." value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && (screen === 'login' ? handleLogin() : handleRegister())} />
        <button style={screen === 'login' ? s.btn : s.btnBlue} onClick={screen === 'login' ? handleLogin : handleRegister}>
          {screen === 'login' ? '🚀 Login' : '🌟 Register'}
        </button>
      </div>
    </div>
  );
}

export default App;