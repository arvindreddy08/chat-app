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

function Chat({ username, room }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [notifications, setNotifications] = useState([]);
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

  const requestNotificationPermission = () => {
    if ('Notification' in window) Notification.requestPermission();
  };

  useEffect(() => { requestNotificationPermission(); }, []);

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
        _id: m._id,
        username: m.username,
        message: m.message,
        time: new Date(m.createdAt).toLocaleTimeString(),
        date: m.createdAt,
        reactions: m.reactions || {},
        fileUrl: m.fileUrl,
        fileType: m.fileType,
        fileName: m.fileName,
        replyTo: m.replyTo || null,
        edited: m.edited || false,
        readBy: m.readBy || [],
      }));
      setMessages(formatted);
    });

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, { ...data, date: data.date || new Date().toISOString() }]);
      if (data.username !== username && data.username !== 'System') {
        playSound();
        showNotification(`New message from ${data.username}`, data.message || '📎 File');
        // Handle @mentions
        if (data.message && data.message.includes(`@${username}`)) {
          setNotifications(prev => [...prev, `${data.username} mentioned you!`]);
          setTimeout(() => setNotifications(prev => prev.slice(1)), 4000);
        }
      }
      // Mark as read
      if (data._id) socket.emit('mark_read', { messageId: data._id, room });
    });

    socket.on('room_users', (data) => setUsers(data));

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
      showNotification(`Private message from ${data.from}`, data.message);
    });

    socket.on('message_edited', ({ messageId, newMessage }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, message: newMessage, edited: true } : m));
    });

    socket.on('message_deleted', ({ messageId }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, message: '🗑️ Message deleted', deleted: true } : m));
    });

    socket.on('message_read', ({ messageId, readerUsername }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, readBy: [...(m.readBy || []), readerUsername] } : m));
    });

    return () => {
      socket.off('message_history');
      socket.off('receive_message');
      socket.off('room_users');
      socket.off('user_typing');
      socket.off('update_reactions');
      socket.off('private_msg');
      socket.off('message_edited');
      socket.off('message_deleted');
      socket.off('message_read');
    };
  }, [username, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send_message', { message, room, replyTo: replyTo ? { _id: replyTo._id, username: replyTo.username, message: replyTo.message } : null });
      setMessage('');
      setReplyTo(null);
      setShowEmojiPicker(false);
    }
  };

  const sendPrivate = () => {
    if (privateMsg.trim() && privateTo.trim()) {
      socket.emit('private_message', { toUsername: privateTo, message: privateMsg });
      setPrivateMsg('');
    }
  };

  const addReaction = (messageId, emoji) => {
    socket.emit('add_reaction', { messageId, emoji, room });
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit('typing', { room });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit('send_file', { room, fileName: file.name, fileType: file.type, fileData: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleEdit = (msg) => {
    setEditingMsg(msg._id);
    setEditText(msg.message);
  };

  const submitEdit = () => {
    if (editText.trim() && editingMsg) {
      socket.emit('edit_message', { messageId: editingMsg, newMessage: editText, room });
      setEditingMsg(null);
      setEditText('');
    }
  };

  const handleDelete = (messageId) => {
    socket.emit('delete_message', { messageId, room });
  };

  const toggleMute = () => {
    setMutedRooms(prev => prev.includes(room) ? prev.filter(r => r !== room) : [...prev, room]);
  };

  const insertMention = (name) => {
    setMessage(prev => prev + `@${name} `);
  };

  const filteredMessages = messages.filter(m =>
    searchQuery ? m.message?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  // Group messages by date
  const groupedMessages = [];
  let lastDate = null;
  filteredMessages.forEach(msg => {
    const msgDate = msg.date ? formatDateSeparator(msg.date) : null;
    if (msgDate && msgDate !== lastDate) {
      groupedMessages.push({ type: 'separator', date: msgDate });
      lastDate = msgDate;
    }
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

  const s = {
    container: { display: 'flex', height: '100vh', background: theme.bg, fontFamily: "'Segoe UI', sans-serif", color: theme.text, overflow: 'hidden' },
    sidebar: { width: '260px', background: theme.sidebar, borderRight: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', padding: '16px', gap: '8px', overflowY: 'auto' },
    roomTitle: { color: theme.accent, fontSize: '18px', fontWeight: 700, marginBottom: '4px' },
    sectionTitle: { color: theme.text_muted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: '8px 0 4px' },
    userItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer' },
    avatar: (u) => ({ width: '30px', height: '30px', borderRadius: '50%', background: getAvatar(u).color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0 }),
    onlineDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#2ecc71', flexShrink: 0 },
    sidebarBtn: { padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' },
    toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' },
    toggle: { width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s' },
    chatBox: { flex: 1, display: 'flex', flexDirection: 'column', background: theme.chat, minWidth: 0 },
    topBar: { padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '10px', background: theme.sidebar },
    messages: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' },
    systemMsg: { textAlign: 'center', color: theme.text_muted, fontSize: '12px', padding: '4px 0' },
    dateSep: { textAlign: 'center', color: theme.text_muted, fontSize: '11px', padding: '8px 0', display: 'flex', alignItems: 'center', gap: '8px' },
    dateLine: { flex: 1, height: '1px', background: theme.border },
    msgWrapper: (isMe) => ({ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '6px' }),
    bubble: (isMe, deleted) => ({ maxWidth: '65%', padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: deleted ? theme.bubble_other : isMe ? theme.bubble_me : theme.bubble_other, color: isMe && !deleted ? '#000' : theme.text, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: isMe ? 'none' : `1px solid ${theme.border}` }),
    msgUsername: { fontSize: '11px', fontWeight: 700, color: theme.accent, marginBottom: '4px' },
    msgText: { fontSize: '14px', lineHeight: 1.4, wordBreak: 'break-word' },
    msgTime: { fontSize: '10px', color: theme.text_muted, marginTop: '4px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' },
    reactions: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' },
    reactionBtn: { padding: '2px 6px', borderRadius: '12px', border: `1px solid ${theme.border}`, background: 'transparent', cursor: 'pointer', fontSize: '13px', color: theme.text },
    inputArea: { padding: '12px 16px', borderTop: `1px solid ${theme.border}`, background: theme.sidebar, display: 'flex', flexDirection: 'column', gap: '8px' },
    inputRow: { display: 'flex', gap: '8px', alignItems: 'center' },
    input: { flex: 1, padding: '10px 16px', borderRadius: '24px', border: `1px solid ${theme.border}`, background: theme.input_bg, color: theme.text, fontSize: '14px', outline: 'none' },
    iconBtn: { width: '38px', height: '38px', borderRadius: '50%', border: `1px solid ${theme.border}`, background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    sendBtn: { padding: '10px 20px', borderRadius: '24px', border: 'none', background: theme.accent, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '14px' },
    replyBar: { background: theme.input_bg, borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: theme.text_muted, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: `3px solid ${theme.accent}` },
    replyPreview: { background: theme.input_bg, borderRadius: '6px', padding: '6px 10px', marginBottom: '4px', fontSize: '12px', borderLeft: `3px solid ${theme.accent}`, color: theme.text_muted },
    actionBtns: { display: 'flex', gap: '4px', marginTop: '4px' },
    actionBtn: { padding: '2px 8px', borderRadius: '8px', border: `1px solid ${theme.border}`, background: 'transparent', cursor: 'pointer', fontSize: '11px', color: theme.text_muted },
    notification: { position: 'fixed', top: '16px', right: '16px', background: theme.accent, color: '#000', padding: '10px 16px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' },
    colorDot: (c) => ({ width: '20px', height: '20px', borderRadius: '50%', background: c, cursor: 'pointer', border: c === bubbleColor ? '2px solid white' : '2px solid transparent' }),
  };

  return (
    <div style={s.container}>
      {/* NOTIFICATIONS */}
      {notifications.map((n, i) => <div key={i} style={s.notification}>🔔 {n}</div>)}

      {/* SIDEBAR */}
      <div style={s.sidebar}>
        <div style={s.roomTitle}>Room: {room}</div>

        <div style={s.toggleRow}>
          <span style={{ fontSize: '13px' }}>{darkMode ? '🌙 Dark' : '☀️ Light'}</span>
          <button style={{ ...s.toggle, background: darkMode ? theme.accent : '#ccc' }} onClick={() => setDarkMode(!darkMode)}>
            <span style={{ position: 'absolute', top: '3px', left: darkMode ? '20px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.3s' }} />
          </button>
        </div>

        <div style={s.toggleRow}>
          <span style={{ fontSize: '13px' }}>{soundEnabled ? '🔔 Sound' : '🔕 Muted'}</span>
          <button style={{ ...s.toggle, background: soundEnabled ? theme.accent : '#ccc' }} onClick={() => setSoundEnabled(!soundEnabled)}>
            <span style={{ position: 'absolute', top: '3px', left: soundEnabled ? '20px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.3s' }} />
          </button>
        </div>

        <div style={s.toggleRow}>
          <span style={{ fontSize: '13px' }}>{isMuted ? '🔇 Room Muted' : '🔈 Room Active'}</span>
          <button style={{ ...s.toggle, background: isMuted ? '#ccc' : theme.accent }} onClick={toggleMute}>
            <span style={{ position: 'absolute', top: '3px', left: isMuted ? '3px' : '20px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.3s' }} />
          </button>
        </div>

        {/* Bubble Color Picker */}
        <div>
          <div style={s.sectionTitle}>My Bubble Color</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {BUBBLE_COLORS.map(c => <div key={c} style={s.colorDot(c)} onClick={() => setBubbleColor(c)} />)}
          </div>
        </div>

        <div style={s.sectionTitle}>Online Users</div>
        {users.map((user, i) => {
          const name = typeof user === 'string' ? user : user.username;
          const av = getAvatar(name);
          return (
            <div key={i} style={s.userItem}>
              <div style={s.avatar(name)}>{av.letter}</div>
              <div style={s.onlineDot} />
              <span style={{ fontSize: '14px', flex: 1 }}>{name}</span>
              <button style={{ ...s.actionBtn, fontSize: '10px' }} onClick={() => insertMention(name)}>@</button>
            </div>
          );
        })}

        <button style={s.sidebarBtn} onClick={() => { setShowPrivate(!showPrivate); setPrivateTo(''); }}>
          💬 Private Msg {privateInbox.length > 0 && `(${privateInbox.length})`}
        </button>
      </div>

      {/* CHAT AREA */}
      <div style={s.chatBox}>
        <div style={s.topBar}>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>{showPrivate ? '💬 Private' : `# ${room}`}</span>
          <div style={{ flex: 1 }} />
          <button style={s.iconBtn} onClick={() => setShowSearch(!showSearch)}>🔍</button>
        </div>

        {showSearch && (
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${theme.border}` }}>
            <input style={{ ...s.input, width: '100%' }} placeholder="Search messages..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        )}

        {showPrivate ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {privateInbox.map((m, i) => (
                <div key={i} style={s.msgWrapper(m.self)}>
                  <div style={s.bubble(m.self)}>
                    <div style={s.msgUsername}>{m.self ? 'You' : m.from}</div>
                    <p style={s.msgText}>{m.message}</p>
                    <div style={s.msgTime}>{m.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={s.inputRow}>
              <input style={{ ...s.input, width: '100px', flex: 'none' }} placeholder="To..." value={privateTo} onChange={e => setPrivateTo(e.target.value)} />
              <input style={s.input} placeholder="Private message..." value={privateMsg} onChange={e => setPrivateMsg(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendPrivate()} />
              <button style={s.sendBtn} onClick={sendPrivate}>Send</button>
            </div>
          </div>
        ) : (
          <>
            <div style={s.messages}>
              {groupedMessages.map((item, i) => {
                if (item.type === 'separator') {
                  return (
                    <div key={i} style={s.dateSep}>
                      <div style={s.dateLine} />
                      <span>{item.date}</span>
                      <div style={s.dateLine} />
                    </div>
                  );
                }
                const msg = item;
                if (msg.username === 'System') return <div key={i} style={s.systemMsg}>{msg.message}</div>;
                const isMe = msg.username === username;
                const av = getAvatar(msg.username);
                const isRead = msg.readBy && msg.readBy.length > 0;
                return (
                  <div key={i} style={s.msgWrapper(isMe)}>
                    {!isMe && <div style={s.avatar(msg.username)}>{av.letter}</div>}
                    <div style={{ maxWidth: '65%' }}>
                      {msg.replyTo && (
                        <div style={s.replyPreview}>
                          ↩️ <b>{msg.replyTo.username}:</b> {msg.replyTo.message?.slice(0, 50)}
                        </div>
                      )}
                      <div style={s.bubble(isMe, msg.deleted)}>
                        {!isMe && <div style={s.msgUsername}>{msg.username}</div>}
                        {editingMsg === msg._id ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input style={{ ...s.input, padding: '4px 8px', fontSize: '13px' }} value={editText} onChange={e => setEditText(e.target.value)} onKeyPress={e => e.key === 'Enter' && submitEdit()} autoFocus />
                            <button style={s.sendBtn} onClick={submitEdit}>✓</button>
                            <button style={s.actionBtn} onClick={() => setEditingMsg(null)}>✕</button>
                          </div>
                        ) : (
                          <>
                            {msg.fileUrl ? (
                              msg.fileType?.startsWith('image/') ? (
                                <img src={msg.fileUrl} alt={msg.fileName} style={{ maxWidth: '200px', borderRadius: '8px' }} />
                              ) : (
                                <a href={msg.fileUrl} download={msg.fileName} style={{ color: theme.accent }}>📎 {msg.fileName}</a>
                              )
                            ) : (
                              <p style={s.msgText}>{msg.message}</p>
                            )}
                          </>
                        )}
                        <div style={s.msgTime}>
                          {msg.edited && <span style={{ fontSize: '9px' }}>(edited)</span>}
                          <span>{msg.time}</span>
                          {isMe && <span>{isRead ? '✓✓' : '✓'}</span>}
                        </div>
                        {msg._id && !msg.deleted && (
                          <div style={s.reactions}>
                            {['👍','❤️','😂','😮','😢','🔥'].map(emoji => (
                              <button key={emoji} style={s.reactionBtn} onClick={() => addReaction(msg._id, emoji)}>
                                {emoji} {msg.reactions?.[emoji]?.length || ''}
                              </button>
                            ))}
                          </div>
                        )}
                        {!msg.deleted && (
                          <div style={s.actionBtns}>
                            <button style={s.actionBtn} onClick={() => setReplyTo(msg)}>↩️ Reply</button>
                            {isMe && <button style={s.actionBtn} onClick={() => handleEdit(msg)}>✏️ Edit</button>}
                            {isMe && <button style={s.actionBtn} onClick={() => handleDelete(msg._id)}>🗑️ Delete</button>}
                          </div>
                        )}
                      </div>
                    </div>
                    {isMe && <div style={s.avatar(msg.username)}>{av.letter}</div>}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {typing && <div style={{ fontSize: '12px', color: theme.text_muted, padding: '0 16px' }}>{typing}</div>}

            <div style={s.inputArea}>
              {replyTo && (
                <div style={s.replyBar}>
                  <span>↩️ Replying to <b>{replyTo.username}</b>: {replyTo.message?.slice(0, 40)}</span>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.text_muted }} onClick={() => setReplyTo(null)}>✕</button>
                </div>
              )}
              {showEmojiPicker && (
                <div style={{ background: theme.sidebar, border: `1px solid ${theme.border}`, borderRadius: '12px', padding: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '320px' }}>
                  {ALL_EMOJIS.map(emoji => (
                    <span key={emoji} style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); }}>{emoji}</span>
                  ))}
                </div>
              )}
              <div style={s.inputRow}>
                <button style={s.iconBtn} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                <button style={s.iconBtn} onClick={() => fileInputRef.current.click()}>📎</button>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                <input
                  style={s.input}
                  placeholder={isMuted ? '🔇 Room muted...' : 'Type a message... (@mention)'}
                  value={message}
                  onChange={handleTyping}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button style={s.sendBtn} onClick={sendMessage}>Send</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Chat;