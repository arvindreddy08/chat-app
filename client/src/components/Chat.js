import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('https://chat-app-ymm4.onrender.com');

const ALL_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👏','😍','🤔','😎','💯','🙏','✨','😊','🥰','😅','🤣','😭','😤','🤯','🥳','😇','🤝'];
const BUBBLE_COLORS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #ffecd2, #fcb69f)',
];
const BUBBLE_LABELS = ['Purple','Pink','Blue','Green','Sunset','Lavender','Peach'];

function getAvatar(username) {
  const gradients = [
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
    'linear-gradient(135deg, #ffecd2, #fcb69f)',
    'linear-gradient(135deg, #84fab0, #8fd3f4)',
    'linear-gradient(135deg, #d4fc79, #96e6a1)',
    'linear-gradient(135deg, #f6d365, #fda085)',
  ];
  const idx = username.charCodeAt(0) % gradients.length;
  return { gradient: gradients[idx], letter: username[0].toUpperCase() };
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
  const [bubbleColorIdx, setBubbleColorIdx] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioCtx = useRef(null);
  const soundEnabledRef = useRef(soundEnabled);
  const mutedRef = useRef(mutedRooms);

  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { mutedRef.current = mutedRooms; }, [mutedRooms]);

  const isMuted = mutedRooms.includes(room);
  const bubbleColor = BUBBLE_COLORS[bubbleColorIdx];

  const showNotif = (title, body) => {
    if (Notification.permission === 'granted' && document.hidden) new Notification(title, { body });
  };

  useEffect(() => { if ('Notification' in window) Notification.requestPermission(); }, []);
  useEffect(() => {
    if (profile) socket.emit('share_profile', { username, room, avatar: profile.avatar, bio: profile.bio });
  }, [username, room, profile]);

  useEffect(() => {
    const playSound = () => {
      if (!soundEnabledRef.current || mutedRef.current.includes(room)) return;
      try {
        if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.current.createOscillator();
        const g = audioCtx.current.createGain();
        o.connect(g); g.connect(audioCtx.current.destination);
        o.frequency.setValueAtTime(880, audioCtx.current.currentTime);
        o.frequency.setValueAtTime(660, audioCtx.current.currentTime + 0.1);
        g.gain.setValueAtTime(0.3, audioCtx.current.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.3);
        o.start(audioCtx.current.currentTime);
        o.stop(audioCtx.current.currentTime + 0.3);
      } catch (e) {}
    };

    socket.emit('join_room', { username, room });

    socket.on('message_history', (history) => {
      setMessages(history.map(m => ({
        _id: m._id, username: m.username, message: m.message,
        time: new Date(m.createdAt).toLocaleTimeString(), date: m.createdAt,
        reactions: m.reactions || {}, fileUrl: m.fileUrl, fileType: m.fileType,
        fileName: m.fileName, replyTo: m.replyTo || null, edited: m.edited || false, readBy: m.readBy || [],
      })));
    });

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, { ...data, date: data.date || new Date().toISOString() }]);
      if (data.username !== username && data.username !== 'System') {
        playSound();
        showNotif(data.username, data.message || '📎 File');
        if (data.message?.includes(`@${username}`)) {
          setNotifications(prev => [...prev, `${data.username} mentioned you! 🔔`]);
          setTimeout(() => setNotifications(prev => prev.slice(1)), 4000);
        }
      }
      if (data._id) socket.emit('mark_read', { messageId: data._id, room });
    });

    socket.on('room_users', setUsers);
    socket.on('user_profile', ({ username: u, avatar, bio }) => setUserProfiles(prev => ({ ...prev, [u]: { avatar, bio } })));
    socket.on('user_typing', (data) => { setTyping(`${data.username} is typing...`); setTimeout(() => setTyping(''), 2000); });
    socket.on('update_reactions', ({ messageId, reactions }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m)));
    socket.on('private_msg', (data) => { setPrivateInbox(prev => [...prev, data]); playSound(); showNotif(`Private: ${data.from}`, data.message); });
    socket.on('message_edited', ({ messageId, newMessage }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, message: newMessage, edited: true } : m)));
    socket.on('message_deleted', ({ messageId }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, message: '🗑️ Deleted', deleted: true } : m)));
    socket.on('message_read', ({ messageId, readerUsername }) => setMessages(prev => prev.map(m => m._id === messageId ? { ...m, readBy: [...(m.readBy || []), readerUsername] } : m)));

    return () => ['message_history','receive_message','room_users','user_typing','update_reactions','private_msg','message_edited','message_deleted','message_read','user_profile'].forEach(e => socket.off(e));
  }, [username, room]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send_message', { message, room, replyTo: replyTo ? { _id: replyTo._id, username: replyTo.username, message: replyTo.message } : null });
      setMessage(''); setReplyTo(null); setShowEmojiPicker(false);
    }
  };
  const sendPrivate = () => {
    if (privateMsg.trim() && privateTo.trim()) { socket.emit('private_message', { toUsername: privateTo, message: privateMsg }); setPrivateMsg(''); }
  };
  const addReaction = (messageId, emoji) => socket.emit('add_reaction', { messageId, emoji, room });
  const handleTyping = (e) => { setMessage(e.target.value); socket.emit('typing', { room }); };
  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => socket.emit('send_file', { room, fileName: file.name, fileType: file.type, fileData: reader.result });
    reader.readAsDataURL(file);
  };
  const submitEdit = () => {
    if (editText.trim() && editingMsg) { socket.emit('edit_message', { messageId: editingMsg, newMessage: editText, room }); setEditingMsg(null); setEditText(''); }
  };
  const handleDelete = (messageId) => socket.emit('delete_message', { messageId, room });
  const toggleMute = () => setMutedRooms(prev => prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room]);
  const insertMention = (name) => { setMessage(prev => prev + `@${name} `); setShowSidebar(false); };

  const filteredMessages = messages.filter(m => searchQuery ? m.message?.toLowerCase().includes(searchQuery.toLowerCase()) : true);
  const groupedMessages = [];
  let lastDate = null;
  filteredMessages.forEach(msg => {
    const msgDate = msg.date ? formatDateSeparator(msg.date) : null;
    if (msgDate && msgDate !== lastDate) { groupedMessages.push({ type: 'separator', date: msgDate }); lastDate = msgDate; }
    groupedMessages.push({ type: 'message', ...msg });
  });

  const theme = {
    bg: darkMode ? 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' : 'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
    sidebar: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)',
    chat: darkMode ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.3)',
    text: darkMode ? '#fff' : '#1a1a2e',
    text_muted: darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
    border: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
    input_bg: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)',
    bubble_other: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)',
    accent: '#f093fb',
  };

  const renderAvatar = (uname, size = 30) => {
    const prof = uname === username ? profile : userProfiles[uname];
    const av = getAvatar(uname);
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: av.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.43, fontWeight: 800, color: '#fff', flexShrink: 0, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
        {prof?.avatar ? <img src={prof.avatar} alt={uname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : av.letter}
      </div>
    );
  };

  const glassStyle = { background: theme.sidebar, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${theme.border}` };
  const inputStyle = { padding: '10px 14px', borderRadius: '20px', border: `1px solid ${theme.border}`, background: theme.input_bg, color: theme.text, fontSize: '14px', outline: 'none', backdropFilter: 'blur(10px)' };
  const iconBtnStyle = { width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${theme.border}`, background: theme.input_bg, color: theme.text, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
  const actionBtnStyle = { padding: '2px 8px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', cursor: 'pointer', fontSize: '11px', color: theme.text_muted };

  return (
    <div style={{ display: 'flex', height: '-webkit-fill-available', background: theme.bg, fontFamily: "'Segoe UI', sans-serif", color: theme.text, overflow: 'hidden', position: 'relative' }}>

      {/* NOTIFICATIONS */}
      {notifications.map((n, i) => (
        <div key={i} style={{ position: 'fixed', top: '16px', right: '16px', background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: '#fff', padding: '12px 20px', borderRadius: '16px', fontWeight: 700, fontSize: '13px', zIndex: 9999, boxShadow: '0 8px 25px rgba(240,147,251,0.5)' }}>{n}</div>
      ))}

      {/* MOBILE OVERLAY */}
      {showSidebar && <div onClick={() => setShowSidebar(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98, backdropFilter: 'blur(4px)' }} />}

      {/* SIDEBAR */}
      <div style={{
        width: '270px', ...glassStyle, display: 'flex', flexDirection: 'column', padding: '16px', gap: '8px', overflowY: 'auto',
        position: window.innerWidth < 768 ? 'fixed' : 'relative',
        left: window.innerWidth < 768 ? (showSidebar ? '0' : '-270px') : '0',
        top: 0, bottom: 0, zIndex: 99, transition: 'left 0.3s ease',
      }}>
        {/* My Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '14px', cursor: 'pointer', border: `1px solid ${theme.border}` }}
          onClick={() => { onEditProfile(); setShowSidebar(false); }}>
          {renderAvatar(username, 38)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '14px', color: theme.text }}>{username}</div>
            <div style={{ fontSize: '11px', color: theme.text_muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.bio || 'Tap to edit'}</div>
          </div>
          <span style={{ fontSize: '14px' }}>✏️</span>
        </div>

        {/* Room badge */}
        <div style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '12px', padding: '8px 14px', textAlign: 'center', fontWeight: 800, fontSize: '14px', color: '#fff', boxShadow: '0 4px 15px rgba(102,126,234,0.4)' }}>
          🏠 {room}
        </div>

        {/* Toggles */}
        {[
          { label: darkMode ? '🌙 Dark Mode' : '☀️ Light Mode', val: darkMode, fn: () => setDarkMode(!darkMode) },
          { label: soundEnabled ? '🔔 Sound On' : '🔕 Sound Off', val: soundEnabled, fn: () => setSoundEnabled(!soundEnabled) },
          { label: isMuted ? '🔇 Room Muted' : '🔈 Room Active', val: !isMuted, fn: toggleMute },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 2px' }}>
            <span style={{ fontSize: '13px', color: theme.text }}>{item.label}</span>
            <div style={{ width: '44px', height: '24px', borderRadius: '12px', background: item.val ? 'linear-gradient(135deg, #43e97b, #38f9d7)' : 'rgba(255,255,255,0.2)', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', boxShadow: item.val ? '0 2px 10px rgba(67,233,123,0.4)' : 'none' }} onClick={item.fn}>
              <div style={{ position: 'absolute', top: '3px', left: item.val ? '22px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: '#fff', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
        ))}

        {/* Bubble Color */}
        <div>
          <div style={{ color: theme.text_muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '6px 0 8px' }}>🎨 My Bubble</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {BUBBLE_COLORS.map((c, idx) => (
              <div key={idx} title={BUBBLE_LABELS[idx]} style={{ width: '24px', height: '24px', borderRadius: '50%', background: c, cursor: 'pointer', border: idx === bubbleColorIdx ? '3px solid white' : '2px solid transparent', boxShadow: idx === bubbleColorIdx ? '0 2px 10px rgba(255,255,255,0.5)' : 'none', transition: 'all 0.2s' }} onClick={() => setBubbleColorIdx(idx)} />
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div style={{ color: theme.text_muted, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: '6px 0 4px' }}>👥 Online ({users.length})</div>
        {users.map((user, i) => {
          const name = typeof user === 'string' ? user : user.username;
          const prof = userProfiles[name];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)' }}>
              {renderAvatar(name, 28)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: theme.text }}>{name}</div>
                {prof?.bio && <div style={{ fontSize: '10px', color: theme.text_muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prof.bio}</div>}
              </div>
              <button style={{ ...actionBtnStyle, background: 'linear-gradient(135deg, #667eea, #764ba2)', color: '#fff', border: 'none', borderRadius: '8px', padding: '2px 8px' }} onClick={() => insertMention(name)}>@</button>
            </div>
          );
        })}

        <button style={{ padding: '10px 14px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: 'rgba(255,255,255,0.1)', color: theme.text, cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginTop: '4px' }}
          onClick={() => { setShowPrivate(!showPrivate); setShowSidebar(false); }}>
          💬 Private Msg {privateInbox.length > 0 && <span style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)', borderRadius: '10px', padding: '1px 6px', color: '#fff', fontSize: '11px', marginLeft: '4px' }}>{privateInbox.length}</span>}
        </button>
      </div>

      {/* MAIN CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme.chat, minWidth: 0, backdropFilter: 'blur(10px)' }}>
        {/* TOP BAR */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '10px', ...glassStyle }}>
          <button style={{ ...iconBtnStyle, background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', color: '#fff' }} onClick={() => setShowSidebar(!showSidebar)}>☰</button>
          <span style={{ fontWeight: 800, fontSize: '16px', background: 'linear-gradient(135deg, #f093fb, #f5576c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {showPrivate ? '💬 Private Messages' : `✨ # ${room}`}
          </span>
          <div style={{ flex: 1 }} />
          <button style={iconBtnStyle} onClick={() => setShowSearch(!showSearch)}>🔍</button>
        </div>

        {showSearch && (
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${theme.border}` }}>
            <input style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} placeholder="🔍 Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        )}

        {showPrivate ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {privateInbox.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.self ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: m.self ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.self ? bubbleColor : theme.bubble_other, color: '#fff', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginBottom: '4px' }}>{m.self ? 'You' : m.from}</div>
                    <p style={{ fontSize: '14px', margin: 0, wordBreak: 'break-word' }}>{m.message}</p>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '4px', textAlign: 'right' }}>{m.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={{ ...inputStyle, width: '90px', flexShrink: 0 }} placeholder="To..." value={privateTo} onChange={e => setPrivateTo(e.target.value)} />
              <input style={{ ...inputStyle, flex: 1 }} placeholder="Message..." value={privateMsg} onChange={e => setPrivateMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendPrivate()} />
              <button style={{ padding: '10px 16px', borderRadius: '20px', border: 'none', background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(240,147,251,0.4)' }} onClick={sendPrivate}>Send</button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', WebkitOverflowScrolling: 'touch' }}>
              {groupedMessages.map((item, i) => {
                if (item.type === 'separator') return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: theme.border }} />
                    <span style={{ fontSize: '11px', color: theme.text_muted, background: 'rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: '10px' }}>{item.date}</span>
                    <div style={{ flex: 1, height: '1px', background: theme.border }} />
                  </div>
                );
                const msg = item;
                if (msg.username === 'System') return (
                  <div key={i} style={{ textAlign: 'center', color: theme.text_muted, fontSize: '12px', padding: '4px 0', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }}>{msg.message}</div>
                );
                const isMe = msg.username === username;
                const isRead = msg.readBy && msg.readBy.length > 0;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px' }}>
                    {!isMe && renderAvatar(msg.username, 28)}
                    <div style={{ maxWidth: '75%' }}>
                      {msg.replyTo && (
                        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px 10px', marginBottom: '4px', fontSize: '11px', borderLeft: '3px solid #f093fb', color: theme.text_muted }}>
                          ↩️ <b>{msg.replyTo.username}:</b> {msg.replyTo.message?.slice(0, 40)}
                        </div>
                      )}
                      <div style={{ padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: msg.deleted ? 'rgba(255,255,255,0.05)' : isMe ? bubbleColor : theme.bubble_other, color: '#fff', boxShadow: isMe ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)' }}>
                        {!isMe && <div style={{ fontSize: '11px', fontWeight: 800, background: 'linear-gradient(135deg, #f093fb, #f5576c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: '4px' }}>{msg.username}</div>}
                        {editingMsg === msg._id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input style={{ ...inputStyle, flex: 1, padding: '4px 8px', fontSize: '13px' }} value={editText} onChange={e => setEditText(e.target.value)} onKeyPress={e => e.key === 'Enter' && submitEdit()} autoFocus />
                            <button style={{ padding: '4px 8px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #43e97b, #38f9d7)', color: '#fff', cursor: 'pointer' }} onClick={submitEdit}>✓</button>
                            <button style={{ padding: '4px 8px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text_muted, cursor: 'pointer' }} onClick={() => setEditingMsg(null)}>✕</button>
                          </div>
                        ) : msg.fileUrl ? (
                          msg.fileType?.startsWith('image/') ? (
                            <img src={msg.fileUrl} alt={msg.fileName} style={{ maxWidth: '200px', borderRadius: '10px', display: 'block' }} />
                          ) : (
                            <a href={msg.fileUrl} download={msg.fileName} style={{ color: '#f093fb' }}>📎 {msg.fileName}</a>
                          )
                        ) : (
                          <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.message}</p>
                        )}
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                          {msg.edited && <span>(edited)</span>}
                          <span>{msg.time}</span>
                          {isMe && <span style={{ color: isRead ? '#43e97b' : 'rgba(255,255,255,0.4)' }}>{isRead ? '✓✓' : '✓'}</span>}
                        </div>
                        {msg._id && !msg.deleted && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {['👍','❤️','😂','😮','😢','🔥'].map(emoji => (
                              <button key={emoji} style={{ padding: '2px 6px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', fontSize: '12px', color: '#fff' }} onClick={() => addReaction(msg._id, emoji)}>
                                {emoji} {msg.reactions?.[emoji]?.length || ''}
                              </button>
                            ))}
                          </div>
                        )}
                        {!msg.deleted && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            <button style={{ ...actionBtnStyle, color: 'rgba(255,255,255,0.6)' }} onClick={() => setReplyTo(msg)}>↩️</button>
                            {isMe && <button style={{ ...actionBtnStyle, color: 'rgba(255,255,255,0.6)' }} onClick={() => { setEditingMsg(msg._id); setEditText(msg.message); }}>✏️</button>}
                            {isMe && <button style={{ ...actionBtnStyle, color: 'rgba(255,107,107,0.8)' }} onClick={() => handleDelete(msg._id)}>🗑️</button>}
                          </div>
                        )}
                      </div>
                    </div>
                    {isMe && renderAvatar(msg.username, 28)}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {typing && <div style={{ fontSize: '12px', color: theme.text_muted, padding: '0 16px 4px', fontStyle: 'italic' }}>{typing}</div>}

            <div style={{ padding: '10px 12px', borderTop: `1px solid ${theme.border}`, ...glassStyle, display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
              {replyTo && (
                <div style={{ background: 'rgba(240,147,251,0.15)', borderRadius: '10px', padding: '6px 12px', fontSize: '12px', color: theme.text_muted, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '3px solid #f093fb' }}>
                  <span>↩️ Replying to <b style={{ color: '#f093fb' }}>{replyTo.username}</b>: {replyTo.message?.slice(0, 30)}</span>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text_muted, fontSize: '16px' }} onClick={() => setReplyTo(null)}>✕</button>
                </div>
              )}
              {showEmojiPicker && (
                <div style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', border: `1px solid ${theme.border}`, borderRadius: '14px', padding: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                  {ALL_EMOJIS.map(emoji => (
                    <span key={emoji} style={{ fontSize: '22px', cursor: 'pointer' }} onClick={() => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); }}>{emoji}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button style={iconBtnStyle} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                <button style={iconBtnStyle} onClick={() => fileInputRef.current.click()}>📎</button>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                <input
                  style={{ ...inputStyle, flex: 1, fontSize: '16px' }}
                  placeholder={isMuted ? '🔇 Room muted...' : '✨ Message...'}
                  value={message} onChange={handleTyping}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #f093fb, #f5576c)', color: '#fff', fontWeight: 800, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 15px rgba(240,147,251,0.5)', touchAction: 'manipulation' }} onClick={sendMessage}>➤</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Chat;