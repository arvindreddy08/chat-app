import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('https://chat-app-ymm4.onrender.com');

const ALL_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👏','😍','🤔','😎','💯','🙏','✨','😊','🥰','😅','🤣','😭','😤','🤯','🥳','😇','🤝'];
const BUBBLE_COLORS = ['#00d4ff','#ff6b6b','#a29bfe','#55efc4','#fdcb6e','#fd79a8','#74b9ff'];

function getAvatar(username) {
  const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'];
  const idx = username.charCodeAt(0) % colors.length;
  return { color: colors[idx], letter: username[0].toUpperCase() };
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
  const [bubbleColor, setBubbleColor] = useState(BUBBLE_COLORS[0]);
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

  const showNotification = (title, body) => {
    if (Notification.permission === 'granted' && document.hidden) {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  };

  useEffect(() => {
    if ('Notification' in window) Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (profile) socket.emit('share_profile', { username, room, avatar: profile.avatar, bio: profile.bio });
  }, [username, room, profile]);

  useEffect(() => {
    const playSound = () => {
      if (!soundEnabledRef.current || mutedRef.current.includes(room)) return;
      try {
        if (!audioCtx.current) audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.current.createOscillator();
        const gainNode = audioCtx.current.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.current.destination);
        oscillator.frequency.setValueAtTime(880, audioCtx.current.currentTime);
        oscillator.frequency.setValueAtTime(660, audioCtx.current.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.current.currentTime + 0.3);
        oscillator.start(audioCtx.current.currentTime);
        oscillator.stop(audioCtx.current.currentTime + 0.3);
      } catch (e) {}
    };

    socket.emit('join_room', { username, room });

    socket.on('message_history', (history) => {
      const formatted = history.map(m => ({
        _id: m._id, username: m.username, message: m.message,
        time: new Date(m.createdAt).toLocaleTimeString(), date: m.createdAt,
        reactions: m.reactions || {}, fileUrl: m.fileUrl, fileType: m.fileType,
        fileName: m.fileName, replyTo: m.replyTo || null, edited: m.edited || false, readBy: m.readBy || [],
      }));
      setMessages(formatted);
    });

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, { ...data, date: data.date || new Date().toISOString() }]);
      if (data.username !== username && data.username !== 'System') {
        playSound();
        showNotification(`${data.username}`, data.message || '📎 File');
        if (data.message && data.message.includes(`@${username}`)) {
          setNotifications(prev => [...prev, `${data.username} mentioned you!`]);
          setTimeout(() => setNotifications(prev => prev.slice(1)), 4000);
        }
      }
      if (data._id) socket.emit('mark_read', { messageId: data._id, room });
    });

    socket.on('room_users', (data) => setUsers(data));
    socket.on('user_profile', ({ username: u, avatar, bio }) => {
      setUserProfiles(prev => ({ ...prev, [u]: { avatar, bio } }));
    });
    socket.on('user_typing', (data) => {
      setTyping(`${data.username} is typing...`);
      setTimeout(() => setTyping(''), 2000);
    });
    socket.on('update_reactions', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    });
    socket.on('private_msg', (data) => {
      setPrivateInbox(prev => [...prev, data]);
      playSound();
      showNotification(`Private: ${data.from}`, data.message);
    });
    socket.on('message_edited', ({ messageId, newMessage }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, message: newMessage, edited: true } : m));
    });
    socket.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, message: '🗑️ Deleted', deleted: true } : m));
    });
    socket.on('message_read', ({ messageId, readerUsername }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, readBy: [...(m.readBy || []), readerUsername] } : m));
    });

    return () => {
      ['message_history','receive_message','room_users','user_typing','update_reactions',
       'private_msg','message_edited','message_deleted','message_read','user_profile'].forEach(e => socket.off(e));
    };
  }, [username, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send_message', { message, room, replyTo: replyTo ? { _id: replyTo._id, username: replyTo.username, message: replyTo.message } : null });
      setMessage(''); setReplyTo(null); setShowEmojiPicker(false);
    }
  };

  const sendPrivate = () => {
    if (privateMsg.trim() && privateTo.trim()) {
      socket.emit('private_message', { toUsername: privateTo, message: privateMsg });
      setPrivateMsg('');
    }
  };

  const addReaction = (messageId, emoji) => socket.emit('add_reaction', { messageId, emoji, room });
  const handleTyping = (e) => { setMessage(e.target.value); socket.emit('typing', { room }); };
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => socket.emit('send_file', { room, fileName: file.name, fileType: file.type, fileData: reader.result });
    reader.readAsDataURL(file);
  };
  const submitEdit = () => {
    if (editText.trim() && editingMsg) {
      socket.emit('edit_message', { messageId: editingMsg, newMessage: editText, room });
      setEditingMsg(null); setEditText('');
    }
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
    bg: darkMode ? '#0f1117' : '#f0f4f8',
    sidebar: darkMode ? '#161b27' : '#ffffff',
    chat: darkMode ? '#1a1f2e' : '#f8faff',
    bubble_me: bubbleColor,
    bubble_other: darkMode ? '#232b3e' : '#ffffff',
    text: darkMode ? '#e8eaf0' : '#1a1a2e',
    text_muted: darkMode ? '#6b7594' : '#888',
    border: darkMode ? '#2a3147' : '#e0e8f0',
    input_bg: darkMode ? '#1e2538' : '#ffffff',
    accent: '#00d4ff',
  };

  const renderAvatar = (uname, size = 30) => {
    const prof = uname === username ? profile : userProfiles[uname];
    const av = getAvatar(uname);
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: av.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.43, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
        {prof?.avatar ? <img src={prof.avatar} alt={uname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : av.letter}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: '-webkit-fill-available', background: theme.bg, fontFamily: "'Segoe UI', sans-serif", color: theme.text, overflow: 'hidden', position: 'relative' }}>

      {/* NOTIFICATION */}
      {notifications.map((n, i) => (
        <div key={i} style={{ position: 'fixed', top: '16px', right: '16px', background: theme.accent, color: '#000', padding: '10px 16px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', zIndex: 9999 }}>🔔 {n}</div>
      ))}

      {/* MOBILE OVERLAY */}
      {showSidebar && (
        <div onClick={() => setShowSidebar(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 98 }} />
      )}

      {/* SIDEBAR */}
      <div style={{
        width: '280px', background: theme.sidebar, borderRight: `1px solid ${theme.border}`,
        display: 'flex', flexDirection: 'column', padding: '16px', gap: '8px', overflowY: 'auto',
        position: window.innerWidth < 768 ? 'fixed' : 'relative',
        left: window.innerWidth < 768 ? (showSidebar ? '0' : '-280px') : '0',
        top: 0, bottom: 0, zIndex: 99,
        transition: 'left 0.3s ease',
        boxShadow: showSidebar ? '4px 0 20px rgba(0,0,0,0.3)' : 'none',
      }}>
        {/* My Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: theme.input_bg, borderRadius: '10px', marginBottom: '8px', cursor: 'pointer' }} onClick={() => { onEditProfile(); setShowSidebar(false); }}>
          {renderAvatar(username, 36)}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '14px' }}>{username}</div>
            <div style={{ fontSize: '11px', color: theme.text_muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.bio || 'Tap to edit profile'}</div>
          </div>
          <span>✏️</span>
        </div>

        <div style={{ color: theme.accent, fontSize: '16px', fontWeight: 700 }}>Room: {room}</div>

        {/* Toggles */}
        {[
          { label: darkMode ? '🌙 Dark' : '☀️ Light', val: darkMode, set: setDarkMode },
          { label: soundEnabled ? '🔔 Sound' : '🔕 Sound', val: soundEnabled, set: setSoundEnabled },
          { label: isMuted ? '🔇 Muted' : '🔈 Active', val: !isMuted, set: toggleMute, toggle: true },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '13px' }}>{item.label}</span>
            <button style={{ width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', position: 'relative', background: item.val ? theme.accent : '#ccc', transition: 'background 0.3s' }}
              onClick={() => item.toggle ? toggleMute() : item.set(!item.val)}>
              <span style={{ position: 'absolute', top: '3px', left: item.val ? '20px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.3s' }} />
            </button>
          </div>
        ))}

        {/* Bubble Color */}
        <div>
          <div style={{ color: theme.text_muted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: '8px 0 4px' }}>My Bubble Color</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {BUBBLE_COLORS.map(c => (
              <div key={c} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, cursor: 'pointer', border: c === bubbleColor ? '2px solid white' : '2px solid transparent' }} onClick={() => setBubbleColor(c)} />
            ))}
          </div>
        </div>

        {/* Online Users */}
        <div style={{ color: theme.text_muted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: '8px 0 4px' }}>Online Users ({users.length})</div>
        {users.map((user, i) => {
          const name = typeof user === 'string' ? user : user.username;
          const prof = userProfiles[name];
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px' }}>
              {renderAvatar(name, 30)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>{name}</div>
                {prof?.bio && <div style={{ fontSize: '10px', color: theme.text_muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prof.bio}</div>}
              </div>
              <button style={{ padding: '2px 8px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', cursor: 'pointer', fontSize: '11px', color: theme.text_muted }} onClick={() => insertMention(name)}>@</button>
            </div>
          );
        })}

        <button style={{ padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}
          onClick={() => { setShowPrivate(!showPrivate); setShowSidebar(false); }}>
          💬 Private Msg {privateInbox.length > 0 && `(${privateInbox.length})`}
        </button>
      </div>

      {/* MAIN CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: theme.chat, minWidth: 0 }}>
        {/* TOP BAR */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '10px', background: theme.sidebar }}>
          {/* Hamburger for mobile */}
          <button style={{ width: '36px', height: '36px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowSidebar(!showSidebar)}>☰</button>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{showPrivate ? '💬 Private' : `# ${room}`}</span>
          <div style={{ flex: 1 }} />
          <button style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setShowSearch(!showSearch)}>🔍</button>
        </div>

        {showSearch && (
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${theme.border}` }}>
            <input style={{ width: '100%', padding: '8px 16px', borderRadius: '20px', border: `1px solid ${theme.border}`, background: theme.input_bg, color: theme.text, fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
              placeholder="Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        )}

        {showPrivate ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px', overflow: 'hidden' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {privateInbox.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.self ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: m.self ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.self ? bubbleColor : theme.bubble_other, color: m.self ? '#000' : theme.text, border: m.self ? 'none' : `1px solid ${theme.border}` }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: theme.accent, marginBottom: '4px' }}>{m.self ? 'You' : m.from}</div>
                    <p style={{ fontSize: '14px', margin: 0, wordBreak: 'break-word' }}>{m.message}</p>
                    <div style={{ fontSize: '10px', color: theme.text_muted, marginTop: '4px', textAlign: 'right' }}>{m.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input style={{ width: '90px', padding: '10px', borderRadius: '20px', border: `1px solid ${theme.border}`, background: theme.input_bg, color: theme.text, fontSize: '14px', outline: 'none', flexShrink: 0 }} placeholder="To..." value={privateTo} onChange={e => setPrivateTo(e.target.value)} />
              <input style={{ flex: 1, padding: '10px 16px', borderRadius: '20px', border: `1px solid ${theme.border}`, background: theme.input_bg, color: theme.text, fontSize: '14px', outline: 'none' }} placeholder="Message..." value={privateMsg} onChange={e => setPrivateMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendPrivate()} />
              <button style={{ padding: '10px 16px', borderRadius: '20px', border: 'none', background: theme.accent, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '14px', flexShrink: 0 }} onClick={sendPrivate}>Send</button>
            </div>
          </div>
        ) : (
          <>
            {/* MESSAGES */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', WebkitOverflowScrolling: 'touch' }}>
              {groupedMessages.map((item, i) => {
                if (item.type === 'separator') return (
                  <div key={i} style={{ textAlign: 'center', color: theme.text_muted, fontSize: '11px', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: theme.border }} /><span>{item.date}</span><div style={{ flex: 1, height: '1px', background: theme.border }} />
                  </div>
                );
                const msg = item;
                if (msg.username === 'System') return <div key={i} style={{ textAlign: 'center', color: theme.text_muted, fontSize: '12px', padding: '4px 0' }}>{msg.message}</div>;
                const isMe = msg.username === username;
                const isRead = msg.readBy && msg.readBy.length > 0;
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px' }}>
                    {!isMe && renderAvatar(msg.username, 28)}
                    <div style={{ maxWidth: '75%' }}>
                      {msg.replyTo && (
                        <div style={{ background: theme.input_bg, borderRadius: '6px', padding: '4px 8px', marginBottom: '4px', fontSize: '11px', borderLeft: `3px solid ${theme.accent}`, color: theme.text_muted }}>
                          ↩️ <b>{msg.replyTo.username}:</b> {msg.replyTo.message?.slice(0, 40)}
                        </div>
                      )}
                      <div style={{ padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: msg.deleted ? theme.bubble_other : isMe ? bubbleColor : theme.bubble_other, color: isMe && !msg.deleted ? '#000' : theme.text, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: isMe ? 'none' : `1px solid ${theme.border}` }}>
                        {!isMe && <div style={{ fontSize: '11px', fontWeight: 700, color: theme.accent, marginBottom: '4px' }}>{msg.username}</div>}
                        {editingMsg === msg._id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input style={{ flex: 1, padding: '4px 8px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: theme.input_bg, color: theme.text, fontSize: '13px', outline: 'none' }} value={editText} onChange={e => setEditText(e.target.value)} onKeyPress={e => e.key === 'Enter' && submitEdit()} autoFocus />
                            <button style={{ padding: '4px 8px', borderRadius: '8px', border: 'none', background: theme.accent, color: '#000', cursor: 'pointer' }} onClick={submitEdit}>✓</button>
                            <button style={{ padding: '4px 8px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text_muted, cursor: 'pointer' }} onClick={() => setEditingMsg(null)}>✕</button>
                          </div>
                        ) : msg.fileUrl ? (
                          msg.fileType?.startsWith('image/') ? (
                            <img src={msg.fileUrl} alt={msg.fileName} style={{ maxWidth: '200px', borderRadius: '8px', display: 'block' }} />
                          ) : (
                            <a href={msg.fileUrl} download={msg.fileName} style={{ color: theme.accent }}>📎 {msg.fileName}</a>
                          )
                        ) : (
                          <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.4, wordBreak: 'break-word' }}>{msg.message}</p>
                        )}
                        <div style={{ fontSize: '10px', color: theme.text_muted, marginTop: '4px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' }}>
                          {msg.edited && <span>(edited)</span>}
                          <span>{msg.time}</span>
                          {isMe && <span>{isRead ? '✓✓' : '✓'}</span>}
                        </div>
                        {msg._id && !msg.deleted && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                            {['👍','❤️','😂','😮','😢','🔥'].map(emoji => (
                              <button key={emoji} style={{ padding: '2px 6px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: 'transparent', cursor: 'pointer', fontSize: '13px', color: theme.text }} onClick={() => addReaction(msg._id, emoji)}>
                                {emoji} {msg.reactions?.[emoji]?.length || ''}
                              </button>
                            ))}
                          </div>
                        )}
                        {!msg.deleted && (
                          <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            <button style={{ padding: '2px 8px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', cursor: 'pointer', fontSize: '11px', color: theme.text_muted }} onClick={() => setReplyTo(msg)}>↩️</button>
                            {isMe && <button style={{ padding: '2px 8px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', cursor: 'pointer', fontSize: '11px', color: theme.text_muted }} onClick={() => { setEditingMsg(msg._id); setEditText(msg.message); }}>✏️</button>}
                            {isMe && <button style={{ padding: '2px 8px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', cursor: 'pointer', fontSize: '11px', color: theme.text_muted }} onClick={() => handleDelete(msg._id)}>🗑️</button>}
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

            {typing && <div style={{ fontSize: '12px', color: theme.text_muted, padding: '0 16px 4px' }}>{typing}</div>}

            {/* INPUT AREA */}
            <div style={{ padding: '8px 12px', borderTop: `1px solid ${theme.border}`, background: theme.sidebar, display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}>
              {replyTo && (
                <div style={{ background: theme.input_bg, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: theme.text_muted, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${theme.accent}` }}>
                  <span>↩️ <b>{replyTo.username}:</b> {replyTo.message?.slice(0, 30)}</span>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text_muted, fontSize: '16px' }} onClick={() => setReplyTo(null)}>✕</button>
                </div>
              )}
              {showEmojiPicker && (
                <div style={{ background: theme.sidebar, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                  {ALL_EMOJIS.map(emoji => (
                    <span key={emoji} style={{ fontSize: '22px', cursor: 'pointer' }} onClick={() => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); }}>{emoji}</span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <button style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                <button style={{ width: '36px', height: '36px', borderRadius: '50%', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} onClick={() => fileInputRef.current.click()}>📎</button>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                <input
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: `1px solid ${theme.border}`, background: theme.input_bg, color: theme.text, fontSize: '16px', outline: 'none', WebkitAppearance: 'none' }}
                  placeholder={isMuted ? '🔇 Muted...' : 'Message...'}
                  value={message}
                  onChange={handleTyping}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: theme.accent, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, touchAction: 'manipulation' }} onClick={sendMessage}>➤</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Chat;