import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('https://chat-app-ymm4.onrender.com');

const ALL_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👏','😍','🤔','😎','💯','🙏','✨','😊','🥰','😅','🤣','😭','😤','🤯','🥳','😇','🤝'];
const BUBBLE_COLORS = [
  { bg: 'linear-gradient(135deg, #667eea, #764ba2)', shadow: 'rgba(102,126,234,0.4)', name: '💜 Purple' },
  { bg: 'linear-gradient(135deg, #f093fb, #f5576c)', shadow: 'rgba(240,147,251,0.4)', name: '🌸 Pink' },
  { bg: 'linear-gradient(135deg, #4facfe, #00f2fe)', shadow: 'rgba(79,172,254,0.4)', name: '💙 Blue' },
  { bg: 'linear-gradient(135deg, #43e97b, #38f9d7)', shadow: 'rgba(67,233,123,0.4)', name: '💚 Green' },
  { bg: 'linear-gradient(135deg, #fa709a, #fee140)', shadow: 'rgba(250,112,154,0.4)', name: '🌅 Sunset' },
  { bg: 'linear-gradient(135deg, #a18cd1, #fbc2eb)', shadow: 'rgba(161,140,209,0.4)', name: '🪻 Lavender' },
  { bg: 'linear-gradient(135deg, #ff9a9e, #fecfef)', shadow: 'rgba(255,154,158,0.4)', name: '🌷 Rose' },
];

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
  'linear-gradient(135deg, #f6d365, #fda085)',
  'linear-gradient(135deg, #d4fc79, #96e6a1)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
];

function getAvatar(username) {
  const idx = username.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return { gradient: AVATAR_GRADIENTS[idx], letter: username[0].toUpperCase() };
}

function formatDateSeparator(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

function Chat({ username, room, profile, onEditProfile }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [typing, setTyping] = useState('');
  const [privateMsg, setPrivateMsg] = useState('');
  const [privateTo, setPrivateTo] = useState('');
  const [privateInbox, setPrivateInbox] = useState([]);
  const [showPrivate, setShowPrivate] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [editText, setEditText] = useState('');
  const [mutedRooms, setMutedRooms] = useState([]);
  const [bubbleIdx, setBubbleIdx] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioCtx = useRef(null);
  const soundRef = useRef(soundEnabled);
  const mutedRef = useRef(mutedRooms);

  useEffect(() => { soundRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { mutedRef.current = mutedRooms; }, [mutedRooms]);

  const isMuted = mutedRooms.includes(room);
  const bubble = BUBBLE_COLORS[bubbleIdx];

  const showNotif = (title, body) => {
    if (Notification.permission === 'granted' && document.hidden) new Notification(title, { body });
  };

  useEffect(() => { if ('Notification' in window) Notification.requestPermission(); }, []);
  useEffect(() => {
    if (profile) socket.emit('share_profile', { username, room, avatar: profile.avatar, bio: profile.bio });
  }, [username, room, profile]);

  useEffect(() => {
    const playSound = () => {
      if (!soundRef.current || mutedRef.current.includes(room)) return;
      try {
        if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.current.createOscillator();
        const g = audioCtx.current.createGain();
        o.connect(g); g.connect(audioCtx.current.destination);
        o.frequency.setValueAtTime(880, audioCtx.current.currentTime);
        o.frequency.setValueAtTime(660, audioCtx.current.currentTime + 0.1);
        g.gain.setValueAtTime(0.3, audioCtx.current.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.3);
        o.start(); o.stop(audioCtx.current.currentTime + 0.3);
      } catch(e) {}
    };

    socket.emit('join_room', { username, room });
    socket.on('message_history', (history) => setMessages(history.map(m => ({ _id: m._id, username: m.username, message: m.message, time: new Date(m.createdAt).toLocaleTimeString(), date: m.createdAt, reactions: m.reactions || {}, fileUrl: m.fileUrl, fileType: m.fileType, fileName: m.fileName, replyTo: m.replyTo || null, edited: m.edited || false, readBy: m.readBy || [] }))));
    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, { ...data, date: data.date || new Date().toISOString() }]);
      if (data.username !== username && data.username !== 'System') {
        playSound(); showNotif(data.username, data.message || '📎 File');
        if (data.message?.includes(`@${username}`)) { setNotifications(prev => [...prev, `${data.username} mentioned you! 🔔`]); setTimeout(() => setNotifications(prev => prev.slice(1)), 4000); }
      }
      if (data._id) socket.emit('mark_read', { messageId: data._id, room });
    });
    socket.on('room_users', setUsers);
    socket.on('user_profile', ({ username: u, avatar, bio }) => setUserProfiles(prev => ({ ...prev, [u]: { avatar, bio } })));
    socket.on('user_typing', (data) => { setTyping(`${data.username} is typing...`); setTimeout(() => setTyping(''), 2000); });
    socket.on('update_reactions', ({ messageId, reactions }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m)));
    socket.on('private_msg', (data) => { setPrivateInbox(prev => [...prev, data]); playSound(); showNotif(`💌 ${data.from}`, data.message); });
    socket.on('message_edited', ({ messageId, newMessage }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, message: newMessage, edited: true } : m)));
    socket.on('message_deleted', ({ messageId }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, message: '🗑️ Deleted', deleted: true } : m)));
    socket.on('message_read', ({ messageId, readerUsername }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, readBy: [...(m.readBy || []), readerUsername] } : m)));
    return () => ['message_history','receive_message','room_users','user_typing','update_reactions','private_msg','message_edited','message_deleted','message_read','user_profile'].forEach(e => socket.off(e));
  }, [username, room]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = () => {
    if (message.trim()) { socket.emit('send_message', { message, room, replyTo: replyTo ? { _id: replyTo._id, username: replyTo.username, message: replyTo.message } : null }); setMessage(''); setReplyTo(null); setShowEmojiPicker(false); }
  };
  const sendPrivate = () => { if (privateMsg.trim() && privateTo.trim()) { socket.emit('private_message', { toUsername: privateTo, message: privateMsg }); setPrivateMsg(''); } };
  const addReaction = (messageId, emoji) => socket.emit('add_reaction', { messageId, emoji, room });
  const handleTyping = (e) => { setMessage(e.target.value); socket.emit('typing', { room }); };
  const handleFileUpload = (e) => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => socket.emit('send_file', { room, fileName: file.name, fileType: file.type, fileData: reader.result }); reader.readAsDataURL(file); };
  const submitEdit = () => { if (editText.trim() && editingMsg) { socket.emit('edit_message', { messageId: editingMsg, newMessage: editText, room }); setEditingMsg(null); setEditText(''); } };
  const handleDelete = (id) => socket.emit('delete_message', { messageId: id, room });
  const toggleMute = () => setMutedRooms(prev => prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room]);
  const insertMention = (name) => { setMessage(prev => prev + `@${name} `); setShowSidebar(false); };

  const filtered = messages.filter(m => searchQuery ? m.message?.toLowerCase().includes(searchQuery.toLowerCase()) : true);
  const grouped = [];
  let lastDate = null;
  filtered.forEach(msg => {
    const d = msg.date ? formatDateSeparator(msg.date) : null;
    if (d && d !== lastDate) { grouped.push({ type: 'sep', date: d }); lastDate = d; }
    grouped.push({ type: 'msg', ...msg });
  });

  const theme = {
    bg: darkMode ? 'linear-gradient(135deg, #0a0015 0%, #0d1b4b 40%, #0a1a3e 100%)' : 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    sidebar: darkMode ? 'rgba(10,0,30,0.7)' : 'rgba(255,255,255,0.7)',
    chatBg: darkMode ? 'rgba(5,0,20,0.5)' : 'rgba(255,255,255,0.4)',
    text: '#fff',
    textMuted: 'rgba(255,255,255,0.45)',
    border: 'rgba(255,255,255,0.08)',
    inputBg: 'rgba(255,255,255,0.08)',
    otherBubble: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)',
  };

  const renderAvatar = (uname, size=32) => {
    const prof = uname === username ? profile : userProfiles[uname];
    const av = getAvatar(uname);
    return <div style={{ width: size, height: size, borderRadius: '50%', background: av.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size*0.4, fontWeight: 900, color: '#fff', flexShrink: 0, overflow: 'hidden', boxShadow: `0 3px 12px ${av.gradient.includes('f093') ? 'rgba(240,147,251,0.4)' : 'rgba(79,172,254,0.4)'}` }}>
      {prof?.avatar ? <img src={prof.avatar} alt={uname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : av.letter}
    </div>;
  };

  const glass = { background: theme.sidebar, backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)', borderRight: `1px solid ${theme.border}` };
  const inp = { padding: '10px 16px', borderRadius: '20px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: '#fff', fontSize: '14px', outline: 'none', backdropFilter: 'blur(10px)' };

  return (
    <div style={{ display: 'flex', height: '-webkit-fill-available', background: theme.bg, fontFamily: "'Segoe UI', sans-serif", color: theme.text, overflow: 'hidden', position: 'relative' }}>

      {notifications.map((n,i) => <div key={i} style={{ position: 'fixed', top: '20px', right: '20px', background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: '#fff', padding: '14px 22px', borderRadius: '18px', fontWeight: 800, fontSize: '14px', zIndex: 9999, boxShadow: '0 10px 30px rgba(240,147,251,0.5)', animation: 'slideUp 0.3s ease' }}>{n}</div>)}

      {showSidebar && <div onClick={() => setShowSidebar(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 98, backdropFilter: 'blur(6px)' }} />}

      {/* SIDEBAR */}
      <div style={{ width: '272px', ...glass, display: 'flex', flexDirection: 'column', padding: '16px', gap: '10px', overflowY: 'auto', position: window.innerWidth < 768 ? 'fixed' : 'relative', left: window.innerWidth < 768 ? (showSidebar ? '0' : '-272px') : '0', top: 0, bottom: 0, zIndex: 99, transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)' }}>

        {/* Profile Card */}
        <div style={{ background: 'linear-gradient(135deg, rgba(240,147,251,0.15), rgba(79,172,254,0.15))', borderRadius: '18px', padding: '14px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }} onClick={() => { onEditProfile(); setShowSidebar(false); }}>
          {renderAvatar(username, 42)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: '15px', color: '#fff' }}>{username}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.bio || 'Tap to edit'}</div>
          </div>
          <span style={{ fontSize: '16px', opacity: 0.7 }}>✏️</span>
        </div>

        {/* Room Badge */}
        <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '14px', padding: '10px 16px', textAlign: 'center', fontWeight: 900, fontSize: '15px', color: '#fff', boxShadow: '0 6px 20px rgba(102,126,234,0.4)', letterSpacing: '0.3px' }}>
          🏠 {room}
        </div>

        {/* Toggles */}
        {[
          { icon: darkMode ? '🌙' : '☀️', label: darkMode ? 'Dark Mode' : 'Light Mode', val: darkMode, fn: () => setDarkMode(!darkMode), color: '#667eea' },
          { icon: soundEnabled ? '🔔' : '🔕', label: soundEnabled ? 'Sound On' : 'Sound Off', val: soundEnabled, fn: () => setSoundEnabled(!soundEnabled), color: '#43e97b' },
          { icon: isMuted ? '🔇' : '🔈', label: isMuted ? 'Room Muted' : 'Room Active', val: !isMuted, fn: toggleMute, color: '#f093fb' },
        ].map((item,i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>{item.icon}</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{item.label}</span>
            </div>
            <div style={{ width: '46px', height: '26px', borderRadius: '13px', background: item.val ? item.color : 'rgba(255,255,255,0.15)', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', boxShadow: item.val ? `0 3px 12px ${item.color}60` : 'none' }} onClick={item.fn}>
              <div style={{ position: 'absolute', top: '3px', left: item.val ? '23px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.3s', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
            </div>
          </div>
        ))}

        {/* Bubble Color Picker */}
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '14px', padding: '12px' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>🎨 My Bubble</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {BUBBLE_COLORS.map((c,idx) => (
              <div key={idx} title={c.name} style={{ width: '26px', height: '26px', borderRadius: '50%', background: c.bg, cursor: 'pointer', border: idx === bubbleIdx ? '3px solid white' : '2px solid transparent', boxShadow: idx === bubbleIdx ? `0 3px 12px ${c.shadow}` : 'none', transition: 'all 0.2s', transform: idx === bubbleIdx ? 'scale(1.15)' : 'scale(1)' }} onClick={() => setBubbleIdx(idx)} />
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '4px' }}>👥 Online — {users.length}</div>
        {users.map((user,i) => {
          const name = typeof user === 'string' ? user : user.username;
          const prof = userProfiles[name];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {renderAvatar(name, 30)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{name}</div>
                {prof?.bio && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prof.bio}</div>}
              </div>
              <button style={{ padding: '3px 10px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }} onClick={() => insertMention(name)}>@</button>
            </div>
          );
        })}

        <button style={{ padding: '11px 16px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}
          onClick={() => { setShowPrivate(!showPrivate); setShowSidebar(false); }}>
          <span>💬 Private Messages</span>
          {privateInbox.length > 0 && <span style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)', borderRadius: '10px', padding: '2px 8px', color: '#fff', fontSize: '11px', fontWeight: 800 }}>{privateInbox.length}</span>}
        </button>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme.chatBg, backdropFilter: 'blur(20px)', minWidth: 0 }}>

        {/* TOP BAR */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px', ...glass }}>
          <button style={{ width: '38px', height: '38px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(102,126,234,0.4)' }} onClick={() => setShowSidebar(!showSidebar)}>☰</button>
          <div>
            <div style={{ fontWeight: 900, fontSize: '16px', background: 'linear-gradient(135deg, #f093fb, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{showPrivate ? '💬 Private Messages' : `✨ # ${room}`}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{users.length} online</div>
          </div>
          <div style={{ flex: 1 }} />
          <button style={{ width: '38px', height: '38px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowSearch(!showSearch)}>🔍</button>
        </div>

        {showSearch && (
          <div style={{ padding: '10px 18px', borderBottom: `1px solid ${theme.border}`, background: 'rgba(0,0,0,0.2)' }}>
            <input style={{ ...inp, width: '100%', boxSizing: 'border-box', fontSize: '14px' }} placeholder="🔍 Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        )}

        {showPrivate ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {privateInbox.map((m,i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.self ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: m.self ? '20px 20px 4px 20px' : '20px 20px 20px 4px', background: m.self ? bubble.bg : theme.otherBubble, color: '#fff', boxShadow: m.self ? `0 6px 20px ${bubble.shadow}` : '0 2px 10px rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: '5px' }}>{m.self ? 'You' : m.from}</div>
                    <p style={{ fontSize: '14px', margin: 0, wordBreak: 'break-word' }}>{m.message}</p>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '5px', textAlign: 'right' }}>{m.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={{ ...inp, width: '90px', flexShrink: 0 }} placeholder="To..." value={privateTo} onChange={e => setPrivateTo(e.target.value)} />
              <input style={{ ...inp, flex: 1 }} placeholder="Message..." value={privateMsg} onChange={e => setPrivateMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendPrivate()} />
              <button style={{ padding: '10px 18px', borderRadius: '20px', border: 'none', background: bubble.bg, color: '#fff', fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 15px ${bubble.shadow}` }} onClick={sendPrivate}>Send</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px', WebkitOverflowScrolling: 'touch' }}>
              {grouped.map((item,i) => {
                if (item.type === 'sep') return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1))' }} />
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.06)', padding: '4px 14px', borderRadius: '20px', fontWeight: 700, border: `1px solid ${theme.border}` }}>{item.date}</span>
                    <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)' }} />
                  </div>
                );
                const msg = item;
                if (msg.username === 'System') return (
                  <div key={i} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '12px', padding: '6px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: '20px', margin: '4px auto', maxWidth: '80%', fontStyle: 'italic' }}>{msg.message}</div>
                );
                const isMe = msg.username === username;
                const isRead = msg.readBy && msg.readBy.length > 0;
                return (
                  <div key={i} className="msg-bubble" style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }}>
                    {!isMe && renderAvatar(msg.username, 30)}
                    <div style={{ maxWidth: '72%' }}>
                      {msg.replyTo && (
                        <div style={{ background: 'rgba(240,147,251,0.1)', borderRadius: '10px', padding: '5px 12px', marginBottom: '5px', fontSize: '11px', borderLeft: '3px solid #f093fb', color: 'rgba(255,255,255,0.5)' }}>
                          ↩️ <b style={{ color: '#f093fb' }}>{msg.replyTo.username}:</b> {msg.replyTo.message?.slice(0,40)}
                        </div>
                      )}
                      <div style={{ padding: '12px 16px', borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px', background: msg.deleted ? 'rgba(255,255,255,0.05)' : isMe ? bubble.bg : theme.otherBubble, color: '#fff', boxShadow: isMe ? `0 6px 25px ${bubble.shadow}` : '0 3px 15px rgba(0,0,0,0.2)', backdropFilter: 'blur(10px)', border: `1px solid ${isMe ? 'transparent' : theme.border}` }}>
                        {!isMe && <div style={{ fontSize: '11px', fontWeight: 900, background: 'linear-gradient(135deg, #f093fb, #4facfe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '5px' }}>{msg.username}</div>}
                        {editingMsg === msg._id ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input style={{ ...inp, flex: 1, padding: '6px 12px', fontSize: '13px' }} value={editText} onChange={e => setEditText(e.target.value)} onKeyPress={e => e.key === 'Enter' && submitEdit()} autoFocus />
                            <button style={{ padding: '6px 10px', borderRadius: '10px', border: 'none', background: '#43e97b', color: '#fff', cursor: 'pointer', fontWeight: 800 }} onClick={submitEdit}>✓</button>
                            <button style={{ padding: '6px 10px', borderRadius: '10px', border: `1px solid ${theme.border}`, background: 'transparent', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }} onClick={() => setEditingMsg(null)}>✕</button>
                          </div>
                        ) : msg.fileUrl ? (
                          msg.fileType?.startsWith('image/') ? <img src={msg.fileUrl} alt="" style={{ maxWidth: '200px', borderRadius: '12px', display: 'block' }} /> : <a href={msg.fileUrl} download={msg.fileName} style={{ color: '#4facfe' }}>📎 {msg.fileName}</a>
                        ) : <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.5, wordBreak: 'break-word' }}>{msg.message}</p>}
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '6px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '5px' }}>
                          {msg.edited && <span style={{ fontSize: '9px', opacity: 0.6 }}>(edited)</span>}
                          <span>{msg.time}</span>
                          {isMe && <span style={{ color: isRead ? '#43e97b' : 'rgba(255,255,255,0.3)', fontSize: '12px' }}>{isRead ? '✓✓' : '✓'}</span>}
                        </div>
                        {msg._id && !msg.deleted && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                            {['👍','❤️','😂','😮','😢','🔥'].map(emoji => (
                              <button key={emoji} style={{ padding: '3px 8px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', cursor: 'pointer', fontSize: '13px', color: '#fff', transition: 'all 0.15s' }} onClick={() => addReaction(msg._id, emoji)}>
                                {emoji}{msg.reactions?.[emoji]?.length ? ` ${msg.reactions[emoji].length}` : ''}
                              </button>
                            ))}
                          </div>
                        )}
                        {!msg.deleted && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                            <button style={{ padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }} onClick={() => setReplyTo(msg)}>↩️</button>
                            {isMe && <button style={{ padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.07)', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }} onClick={() => { setEditingMsg(msg._id); setEditText(msg.message); }}>✏️</button>}
                            {isMe && <button style={{ padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(255,107,107,0.2)', background: 'rgba(255,107,107,0.08)', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,107,107,0.7)', fontWeight: 600 }} onClick={() => handleDelete(msg._id)}>🗑️</button>}
                          </div>
                        )}
                      </div>
                    </div>
                    {isMe && renderAvatar(msg.username, 30)}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {typing && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', padding: '0 18px 6px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ animation: 'pulse 1s infinite' }}>●●●</span> {typing}</div>}

            <div style={{ padding: '12px 14px', borderTop: `1px solid ${theme.border}`, ...glass, display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              {replyTo && (
                <div style={{ background: 'rgba(240,147,251,0.1)', borderRadius: '12px', padding: '8px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #f093fb' }}>
                  <span>↩️ Replying to <b style={{ color: '#f093fb' }}>{replyTo.username}</b>: {replyTo.message?.slice(0,35)}</span>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '18px', lineHeight: 1 }} onClick={() => setReplyTo(null)}>×</button>
                </div>
              )}
              {showEmojiPicker && (
                <div style={{ background: 'rgba(10,0,30,0.95)', backdropFilter: 'blur(20px)', border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '130px', overflowY: 'auto' }}>
                  {ALL_EMOJIS.map(emoji => <span key={emoji} style={{ fontSize: '22px', cursor: 'pointer', transition: 'transform 0.1s' }} onClick={() => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); }}>{emoji}</span>)}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button style={{ width: '40px', height: '40px', borderRadius: '14px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: '#fff', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                <button style={{ width: '40px', height: '40px', borderRadius: '14px', border: `1px solid ${theme.border}`, background: theme.inputBg, color: '#fff', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => fileInputRef.current.click()}>📎</button>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                <input style={{ ...inp, flex: 1, fontSize: '16px', padding: '12px 18px' }} placeholder={isMuted ? '🔇 Room muted...' : '✨ Type a message...'} value={message} onChange={handleTyping} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
                <button style={{ width: '48px', height: '48px', borderRadius: '50%', border: 'none', background: bubble.bg, color: '#fff', fontWeight: 900, cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 6px 20px ${bubble.shadow}`, touchAction: 'manipulation', transition: 'transform 0.15s' }} onClick={sendMessage}>➤</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Chat;