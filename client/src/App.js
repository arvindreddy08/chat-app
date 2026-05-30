import React, { useState, useEffect } from 'react';
import Chat from './components/Chat';
import './App.css';

const PARTICLES = Array.from({length: 15}, (_, i) => ({
  id: i,
  size: Math.random() * 8 + 4,
  left: Math.random() * 100,
  duration: Math.random() * 15 + 10,
  delay: Math.random() * 10,
  color: ['#f093fb','#4facfe','#43e97b','#fa709a','#667eea','#f5576c'][Math.floor(Math.random()*6)],
}));

function App() {
  const [screen, setScreen] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [room, setRoom] = useState('');
  const [joined, setJoined] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({ avatar: '', bio: 'Hey! I am using LiveChat 👋' });
  const [showProfile, setShowProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');

  const handleRegister = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    const res = await fetch('https://chat-app-ymm4.onrender.com/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) { setError('✅ Registered! Please login.'); setScreen('login'); }
    else setError(data.message);
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    const res = await fetch('https://chat-app-ymm4.onrender.com/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    setLoading(false);
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
    const file = e.target.files[0]; if (!file) return;
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
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', position: 'relative', overflow: 'hidden' },
    box: { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', borderRadius: '28px', padding: '40px 32px', width: '100%', maxWidth: '420px', boxShadow: '0 30px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.15)', position: 'relative', zIndex: 1 },
    logo: { textAlign: 'center', fontSize: '56px', marginBottom: '8px' },
    title: { color: '#fff', fontSize: '32px', fontWeight: 900, textAlign: 'center', marginBottom: '6px', background: 'linear-gradient(135deg, #f093fb, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
    subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: '14px', textAlign: 'center', marginBottom: '28px' },
    tabs: { display: 'flex', gap: '6px', marginBottom: '24px', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', padding: '5px' },
    tab: { flex: 1, padding: '11px', borderRadius: '12px', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '14px', fontWeight: 700, transition: 'all 0.2s' },
    activeTab: { flex: 1, padding: '11px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, rgba(240,147,251,0.4), rgba(79,172,254,0.4))', color: '#fff', cursor: 'pointer', fontSize: '14px', fontWeight: 800, boxShadow: '0 4px 15px rgba(240,147,251,0.3)' },
    input: { width: '100%', padding: '15px 20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '16px', outline: 'none', marginBottom: '14px', WebkitAppearance: 'none' },
    btn: { width: '100%', padding: '16px', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 900, cursor: 'pointer', fontSize: '17px', marginTop: '8px', boxShadow: '0 6px 25px rgba(240,147,251,0.5)', letterSpacing: '0.5px', touchAction: 'manipulation' },
    btnSecondary: { width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', fontWeight: 700, cursor: 'pointer', fontSize: '15px', marginTop: '8px', touchAction: 'manipulation' },
    error: { fontSize: '13px', textAlign: 'center', marginBottom: '14px', padding: '10px 16px', borderRadius: '12px' },
    avatarWrap: { width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, #f093fb, #f5576c, #4facfe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '34px', fontWeight: 900, color: '#fff', margin: '0 auto 20px', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 8px 30px rgba(240,147,251,0.6)', border: '3px solid rgba(255,255,255,0.3)' },
    profileOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(15px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9999 },
    profileBox: { background: 'rgba(20,10,50,0.95)', backdropFilter: 'blur(30px)', borderRadius: '28px 28px 0 0', padding: '32px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.15)', borderBottom: 'none' },
  };

  const ProfileModal = ({ inputId }) => (
    <div style={s.profileOverlay} onClick={(e) => e.target === e.currentTarget && setShowProfile(false)}>
      <div style={s.profileBox} className="login-box">
        <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', margin: '0 auto 24px' }} />
        <h3 style={{ color: '#fff', marginBottom: '24px', textAlign: 'center', fontSize: '22px', fontWeight: 900, background: 'linear-gradient(135deg, #f093fb, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>✨ Edit Profile</h3>
        <div style={s.avatarWrap} onClick={() => document.getElementById(inputId).click()}>
          {avatarPreview || profile.avatar ? <img src={avatarPreview || profile.avatar} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : username[0]?.toUpperCase()}
        </div>
        <input id={inputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', textAlign: 'center', marginBottom: '20px' }}>Tap avatar to change photo 📸</p>
        <textarea className="input-field" style={{ ...s.input, height: '90px', resize: 'none', fontSize: '15px' }}
          placeholder="✍️ Your bio / status..." value={profile.bio}
          onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))} />
        <button className="btn-primary" style={s.btn} onClick={saveProfile}>💾 Save Profile</button>
        <button style={s.btnSecondary} onClick={() => setShowProfile(false)}>Cancel</button>
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
      <div style={s.page}>
        {PARTICLES.map(p => <div key={p.id} className="particle" style={{ width: p.size, height: p.size, left: `${p.left}%`, background: p.color, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />)}
        {showProfile && <ProfileModal inputId="avatarInput2" />}
        <div style={s.box} className="login-box">
          <div style={s.avatarWrap} onClick={() => setShowProfile(true)}>
            {profile.avatar ? <img src={profile.avatar} alt="av" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : username[0]?.toUpperCase()}
          </div>
          <h1 style={s.title}>Welcome Back!</h1>
          <p style={{ ...s.subtitle, marginBottom: '8px' }}>{username} 👋</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center', marginBottom: '24px' }}>{profile.bio}</p>
          <button style={s.btnSecondary} onClick={() => setShowProfile(true)}>✏️ Edit Profile</button>
          {error && <p style={{ ...s.error, color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', marginTop: '12px' }}>{error}</p>}
          <div style={{ marginTop: '16px' }}>
            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>🏠 ROOM NAME</label>
            <input className="input-field" style={s.input} type="text" placeholder="Enter room name..." value={room}
              onChange={(e) => setRoom(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()} />
          </div>
          <button className="btn-primary" style={s.btn} onClick={handleJoinRoom}>🚀 Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {PARTICLES.map(p => <div key={p.id} className="particle" style={{ width: p.size, height: p.size, left: `${p.left}%`, background: p.color, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />)}
      <div style={s.box} className="login-box">
        <div style={s.logo} className="float-emoji">💬</div>
        <h1 style={s.title}>Live Chat</h1>
        <p style={s.subtitle}>Connect • Chat • Vibe ✨</p>
        <div style={s.tabs}>
          <button style={screen === 'login' ? s.activeTab : s.tab} onClick={() => { setScreen('login'); setError(''); }}>🔑 Login</button>
          <button style={screen === 'register' ? s.activeTab : s.tab} onClick={() => { setScreen('register'); setError(''); }}>🌟 Register</button>
        </div>
        {error && <p style={{ ...s.error, color: error.includes('✅') ? '#43e97b' : '#ff6b6b', background: error.includes('✅') ? 'rgba(67,233,123,0.1)' : 'rgba(255,107,107,0.1)', border: `1px solid ${error.includes('✅') ? 'rgba(67,233,123,0.3)' : 'rgba(255,107,107,0.3)'}` }}>{error}</p>}
        <div>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>👤 USERNAME</label>
          <input className="input-field" style={s.input} type="text" placeholder="Enter your username..." value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
        </div>
        <div>
          <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>🔒 PASSWORD</label>
          <input className="input-field" style={s.input} type="password" placeholder="Enter your password..." value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (screen === 'login' ? handleLogin() : handleRegister())} />
        </div>
        <button className="btn-primary" style={{ ...s.btn, opacity: loading ? 0.7 : 1 }} onClick={screen === 'login' ? handleLogin : handleRegister} disabled={loading}>
          {loading ? '⏳ Please wait...' : screen === 'login' ? '🚀 Login' : '🌟 Create Account'}
        </button>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>
          {screen === 'login' ? "Don't have an account? " : "Already have an account? "}
          <span style={{ color: '#f093fb', cursor: 'pointer', fontWeight: 700 }} onClick={() => { setScreen(screen === 'login' ? 'register' : 'login'); setError(''); }}>
            {screen === 'login' ? 'Register →' : 'Login →'}
          </span>
        </p>
      </div>
    </div>
  );
}

export default App;