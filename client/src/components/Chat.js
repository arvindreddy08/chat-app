import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('https://chat-app-ymm4.onrender.com');

const ALL_EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👏','😍','🤔','😎','💯','🙏','✨','😊','🥰','😅','🤣','😭','😤','🤯','🥳','😇','🤝'];

function getAvatar(username) {
  const colors = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE','#85C1E9'];
  const idx = username.charCodeAt(0) % colors.length;
  return { color: colors[idx], letter: username[0].toUpperCase() };
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
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioCtx = useRef(null);

  const playSound = () => {
    if (!soundEnabled) return;
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

  useEffect(() => {
    socket.emit('join_room', { username, room });

    socket.on('message_history', (history) => {
      const formatted = history.map(m => ({
        _id: m._id,
        username: m.username,
        message: m.message,
        time: new Date(m.createdAt).toLocaleTimeString(),
        reactions: m.reactions || {},
        fileUrl: m.fileUrl,
        fileType: m.fileType,
        fileName: m.fileName,
      }));
      setMessages(formatted);
    });

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
      if (data.username !== username && data.username !== 'System') playSound();
    });

    socket.on('room_users', (data) => setUsers(data));

    socket.on('user_typing', (data) => {
      setTyping(`${data.username} is typing...`);
      setTimeout(() => setTyping(''), 2000);
    });

    socket.on('update_reactions', ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, reactions } : m
      ));
    });

    socket.on('private_msg', (data) => {
      setPrivateInbox(prev => [...prev, data]);
      playSound();
    });

    return () => {
      socket.off('message_history');
      socket.off('receive_message');
      socket.off('room_users');
      socket.off('user_typing');
      socket.off('update_reactions');
      socket.off('private_msg');
    };
  }, [username, room]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit('send_message', { message, room });
      setMessage('');
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
      socket.emit('send_file', {
        room,
        fileName: file.name,
        fileType: file.type,
        fileData: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const filteredMessages = messages.filter(m =>
    searchQuery ? m.message?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const theme = {
    bg: darkMode ? '#0f1117' : '#f0f4f8',
    sidebar: darkMode ? '#161b27' : '#ffffff',
    chat: darkMode ? '#1a1f2e' : '#f8faff',
    bubble_me: darkMode ? '#00d4ff' : '#0088cc',
    bubble_other: darkMode ? '#232b3e' : '#ffffff',
    text: darkMode ? '#e8eaf0' : '#1a1a2e',
    text_muted: darkMode ? '#6b7594' : '#888',
    border: darkMode ? '#2a3147' : '#e0e8f0',
    input_bg: darkMode ? '#1e2538' : '#ffffff',
    accent: '#00d4ff',
  };

  const styles = {
    container: {
      display: 'flex', height: '100vh', background: theme.bg,
      fontFamily: "'Segoe UI', sans-serif", color: theme.text, overflow: 'hidden',
    },
    sidebar: {
      width: '260px', background: theme.sidebar, borderRight: `1px solid ${theme.border}`,
      display: 'flex', flexDirection: 'column', padding: '16px', gap: '8px',
    },
    roomTitle: { color: theme.accent, fontSize: '18px', fontWeight: 700, marginBottom: '4px' },
    sectionTitle: { color: theme.text_muted, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', margin: '8px 0 4px' },
    userItem: {
      display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px',
      borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s',
    },
    avatar: (username) => ({
      width: '30px', height: '30px', borderRadius: '50%',
      background: getAvatar(username).color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '13px', fontWeight: 700, color: '#fff', flexShrink: 0,
    }),
    onlineDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#2ecc71', flexShrink: 0 },
    sidebarBtn: {
      padding: '8px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`,
      background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: '13px',
      display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px',
    },
    toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' },
    toggle: {
      width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
      position: 'relative', transition: 'background 0.3s',
    },
    chatBox: { flex: 1, display: 'flex', flexDirection: 'column', background: theme.chat },
    topBar: {
      padding: '12px 16px', borderBottom: `1px solid ${theme.border}`,
      display: 'flex', alignItems: 'center', gap: '10px', background: theme.sidebar,
    },
    searchInput: {
      flex: 1, padding: '6px 12px', borderRadius: '20px', border: `1px solid ${theme.border}`,
      background: theme.input_bg, color: theme.text, fontSize: '13px', outline: 'none',
    },
    messages: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' },
    systemMsg: { textAlign: 'center', color: theme.text_muted, fontSize: '12px', padding: '4px 0' },
    msgWrapper: (isMe) => ({ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px' }),
    bubble: (isMe) => ({
      maxWidth: '65%', padding: '10px 14px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
      background: isMe ? theme.bubble_me : theme.bubble_other,
      color: isMe ? '#000' : theme.text, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      border: isMe ? 'none' : `1px solid ${theme.border}`,
    }),
    msgUsername: { fontSize: '11px', fontWeight: 700, color: theme.accent, marginBottom: '4px' },
    msgText: { fontSize: '14px', lineHeight: 1.4, wordBreak: 'break-word' },
    msgTime: { fontSize: '10px', color: theme.text_muted, marginTop: '4px', textAlign: 'right' },
    reactions: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' },
    reactionBtn: {
      padding: '2px 6px', borderRadius: '12px', border: `1px solid ${theme.border}`,
      background: 'transparent', cursor: 'pointer', fontSize: '13px', color: theme.text,
    },
    inputArea: {
      padding: '12px 16px', borderTop: `1px solid ${theme.border}`,
      background: theme.sidebar, display: 'flex', flexDirection: 'column', gap: '8px',
    },
    emojiPicker: {
      background: theme.sidebar, border: `1px solid ${theme.border}`, borderRadius: '12px',
      padding: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '320px',
    },
    inputRow: { display: 'flex', gap: '8px', alignItems: 'center' },
    input: {
      flex: 1, padding: '10px 16px', borderRadius: '24px', border: `1px solid ${theme.border}`,
      background: theme.input_bg, color: theme.text, fontSize: '14px', outline: 'none',
    },
    iconBtn: {
      width: '38px', height: '38px', borderRadius: '50%', border: `1px solid ${theme.border}`,
      background: 'transparent', color: theme.text, cursor: 'pointer', fontSize: '16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
    sendBtn: {
      padding: '10px 20px', borderRadius: '24px', border: 'none',
      background: theme.accent, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '14px',
    },
    typingIndicator: { fontSize: '12px', color: theme.text_muted, padding: '0 4px' },
    fileImg: { maxWidth: '200px', borderRadius: '8px', marginTop: '6px' },
    fileLink: { color: theme.accent, fontSize: '13px', marginTop: '6px', display: 'block' },
    privatePanel: { flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' },
  };

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <div style={styles.roomTitle}>Room: {room}</div>

        <div style={styles.toggleRow}>
          <span style={{ fontSize: '13px' }}>{darkMode ? '🌙 Dark' : '☀️ Light'}</span>
          <button
            style={{ ...styles.toggle, background: darkMode ? theme.accent : '#ccc' }}
            onClick={() => setDarkMode(!darkMode)}
          >
            <span style={{
              position: 'absolute', top: '3px', left: darkMode ? '20px' : '3px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.3s'
            }} />
          </button>
        </div>

        <div style={styles.toggleRow}>
          <span style={{ fontSize: '13px' }}>{soundEnabled ? '🔔 Sound On' : '🔕 Sound Off'}</span>
          <button
            style={{ ...styles.toggle, background: soundEnabled ? theme.accent : '#ccc' }}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            <span style={{
              position: 'absolute', top: '3px', left: soundEnabled ? '20px' : '3px',
              width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.3s'
            }} />
          </button>
        </div>

        <div style={styles.sectionTitle}>Online Users</div>
        {users.map((user, i) => {
          const name = typeof user === 'string' ? user : user.username;
          const av = getAvatar(name);
          return (
            <div key={i} style={styles.userItem} onClick={() => { setPrivateTo(name); setShowPrivate(true); }}>
              <div style={styles.avatar(name)}>{av.letter}</div>
              <div style={styles.onlineDot} />
              <span style={{ fontSize: '14px' }}>{name}</span>
            </div>
          );
        })}

        <button style={styles.sidebarBtn} onClick={() => setShowPrivate(!showPrivate)}>
          💬 Private Msg {privateInbox.length > 0 && `(${privateInbox.length})`}
        </button>
      </div>

      <div style={styles.chatBox}>
        <div style={styles.topBar}>
          <span style={{ fontWeight: 600, fontSize: '15px' }}>
            {showPrivate ? '💬 Private Messages' : `# ${room}`}
          </span>
          <div style={{ flex: 1 }} />
          <button style={styles.iconBtn} onClick={() => setShowSearch(!showSearch)}>🔍</button>
        </div>

        {showSearch && (
          <div style={{ padding: '8px 16px', borderBottom: `1px solid ${theme.border}` }}>
            <input
              style={styles.searchInput}
              placeholder="Search messages..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {showPrivate ? (
          <div style={styles.privatePanel}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {privateInbox.map((m, i) => (
                <div key={i} style={styles.msgWrapper(m.self)}>
                  <div style={styles.bubble(m.self)}>
                    <div style={styles.msgUsername}>{m.self ? 'You' : m.from}</div>
                    <p style={styles.msgText}>{m.message}</p>
                    <div style={styles.msgTime}>{m.time}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.inputRow}>
              <input
                style={{ ...styles.input, width: '100px', flex: 'none' }}
                placeholder="To..."
                value={privateTo}
                onChange={e => setPrivateTo(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Private message..."
                value={privateMsg}
                onChange={e => setPrivateMsg(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && sendPrivate()}
              />
              <button style={styles.sendBtn} onClick={sendPrivate}>Send</button>
            </div>
          </div>
        ) : (
          <>
            <div style={styles.messages}>
              {filteredMessages.map((msg, i) => {
                if (msg.username === 'System') return <div key={i} style={styles.systemMsg}>{msg.message}</div>;
                const isMe = msg.username === username;
                const av = getAvatar(msg.username);
                return (
                  <div key={i} style={styles.msgWrapper(isMe)}>
                    {!isMe && <div style={styles.avatar(msg.username)}>{av.letter}</div>}
                    <div style={styles.bubble(isMe)}>
                      {!isMe && <div style={styles.msgUsername}>{msg.username}</div>}
                      {msg.fileUrl ? (
                        msg.fileType?.startsWith('image/') ? (
                          <img src={msg.fileUrl} alt={msg.fileName} style={styles.fileImg} />
                        ) : (
                          <a href={msg.fileUrl} download={msg.fileName} style={styles.fileLink}>📎 {msg.fileName}</a>
                        )
                      ) : (
                        <p style={styles.msgText}>{msg.message}</p>
                      )}
                      <div style={styles.msgTime}>{msg.time}</div>
                      {msg._id && (
                        <div style={styles.reactions}>
                          {['👍','❤️','😂','😮','😢','🔥'].map(emoji => (
                            <button key={emoji} style={styles.reactionBtn} onClick={() => addReaction(msg._id, emoji)}>
                              {emoji} {msg.reactions?.[emoji]?.length || ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {isMe && <div style={styles.avatar(msg.username)}>{av.letter}</div>}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {typing && <div style={styles.typingIndicator}>{typing}</div>}

            <div style={styles.inputArea}>
              {showEmojiPicker && (
                <div style={styles.emojiPicker}>
                  {ALL_EMOJIS.map(emoji => (
                    <span key={emoji} style={{ fontSize: '20px', cursor: 'pointer' }}
                      onClick={() => { setMessage(prev => prev + emoji); setShowEmojiPicker(false); }}>
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
              <div style={styles.inputRow}>
                <button style={styles.iconBtn} onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
                <button style={styles.iconBtn} onClick={() => fileInputRef.current.click()}>📎</button>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileUpload} />
                <input
                  style={styles.input}
                  placeholder="Type a message..."
                  value={message}
                  onChange={handleTyping}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <button style={styles.sendBtn} onClick={sendMessage}>Send</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Chat;