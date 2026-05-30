import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('https://chat-app-ymm4.onrender.com');
const EMOJIS = ['👍','❤️','😂','😮','😢','🔥'];

function Chat({ username, room }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState('');
  const [privateMsg, setPrivateMsg] = useState('');
  const [privateTo, setPrivateTo] = useState('');
  const [privateInbox, setPrivateInbox] = useState([]);
  const [showPrivate, setShowPrivate] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit('join_room', { username, room });

    socket.on('message_history', (history) => {
      const formatted = history.map(m => ({
        _id: m._id,
        username: m.username,
        message: m.message,
        time: new Date(m.createdAt).toLocaleTimeString(),
        reactions: m.reactions || {}
      }));
      setMessages(formatted);
    });

    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
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

  return (
    <div className="chat-container">
      <div className="sidebar">
        <h3>Room: {room}</h3>
        <h4>Online Users</h4>
        {users.map((user, i) => (
          <div key={i} className="user-item" onClick={() => setPrivateTo(user.username)}>
            🟢 {user.username}
          </div>
        ))}
        <button className="pm-btn" onClick={() => setShowPrivate(!showPrivate)}>
          💬 Private Msg {privateInbox.length > 0 && `(${privateInbox.length})`}
        </button>
      </div>

      <div className="chat-box">
        {showPrivate ? (
          <div className="private-panel">
            <h3>Private Messages</h3>
            <div className="messages">
              {privateInbox.map((m, i) => (
                <div key={i} className={`message ${m.self ? 'my-message' : 'other-message'}`}>
                  <span className="msg-username">{m.self ? 'You' : m.from}</span>
                  <p>{m.message}</p>
                  <span className="msg-time">{m.time}</span>
                </div>
              ))}
            </div>
            <div className="input-box">
              <input
                type="text"
                placeholder="To username..."
                value={privateTo}
                onChange={e => setPrivateTo(e.target.value)}
                style={{width:'120px'}}
              />
              <input
                type="text"
                placeholder="Private message..."
                value={privateMsg}
                onChange={e => setPrivateMsg(e.target.value)}
              />
              <button onClick={sendPrivate}>Send</button>
            </div>
          </div>
        ) : (
          <>
            <div className="messages">
              {messages.map((msg, i) => (
                <div key={i} className={`message ${msg.username === username ? 'my-message' : msg.username === 'System' ? 'system-message' : 'other-message'}`}>
                  {msg.username !== 'System' && <span className="msg-username">{msg.username}</span>}
                  <p>{msg.message}</p>
                  <span className="msg-time">{msg.time}</span>
                  {msg._id && (
                    <div className="reactions">
                      {EMOJIS.map(emoji => (
                        <span key={emoji} className="emoji-btn" onClick={() => addReaction(msg._id, emoji)}>
                          {emoji} {msg.reactions?.[emoji]?.length || ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            {typing && <div className="typing-indicator">{typing}</div>}
            <div className="input-box">
              <input
                type="text"
                placeholder="Type a message..."
                value={message}
                onChange={handleTyping}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Chat;