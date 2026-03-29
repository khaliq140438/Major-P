import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';
import socket from '../Socket';
import { Search, ChevronLeft, Hand, Send, MessageSquare, Check, CheckCheck } from 'lucide-react';
import './Messages.css';

const Messages = () => {
  const { user }                                          = useAuth();
  const location                                          = useLocation();
  const [conversations, setConversations]                 = useState([]);
  const [connections, setConnections]                     = useState([]);
  const [selectedConversation, setSelectedConversation]   = useState(null);
  
  // NEW: Track when clicking a connection who we haven't texted yet
  const [selectedUser, setSelectedUser]                   = useState(null);
  
  const [messages, setMessages]                           = useState([]);
  const [newMessage, setNewMessage]                       = useState('');
  const [loading, setLoading]                             = useState(true);
  const [sending, setSending]                             = useState(false);
  const [searchQuery, setSearchQuery]                     = useState('');
  const [onlineUsers, setOnlineUsers]                     = useState(new Set());
  const [isMobile, setIsMobile]                           = useState(window.innerWidth <= 768);
  const messagesEndRef                                    = useRef(null);
  const selectedConvRef                                   = useRef(null);

  // Keep ref in sync so socket handlers always have current value
  useEffect(() => { selectedConvRef.current = selectedConversation; }, [selectedConversation]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    loadInitialData();

    // Ask server for current online users immediately on mount
    socket.emit("get_online_users");

    // ── Socket.IO: Receive current online users list ──
    socket.on("online_users_list", (userIds) => {
      setOnlineUsers(new Set(userIds.map(Number)));
    });

    // ── Socket.IO: Real-time message reception ──
    socket.on('receive_message', (messageData) => {
      if (messageData.conversation_id === selectedConvRef.current) {
        setMessages(prev => [...prev, {
          ...messageData,
          is_read: false
        }]);
      }
      loadConversationsOnly();
    });

    // ── Socket.IO: Online presence ──
    socket.on('user_online',  (userId) => setOnlineUsers(prev => new Set([...prev, Number(userId)])));
    socket.on('user_offline', (userId) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(Number(userId)); return s; }));

    return () => {
      socket.off('online_users_list');
      socket.off('receive_message');
      socket.off('user_online');
      socket.off('user_offline');
    };
  }, []);

  // Handle navigation from Profile/Connections with a target user
  useEffect(() => {
    if (location.state?.openUserId && (conversations.length > 0 || connections.length > 0)) {
      const existingConv = conversations.find(c => c.other_user_id === location.state.openUserId);
      if (existingConv) {
        handleSelectChat(existingConv);
      } else {
        const unconnectedUser = connections.find(c => c.connected_user_id === location.state.openUserId);
        if (unconnectedUser) {
          handleSelectChat({
            conversation_id: null,
            other_user_id: unconnectedUser.connected_user_id,
            other_user_name: unconnectedUser.company_name,
            other_user_logo: unconnectedUser.logo
          });
        }
      }
      // Clear state so it doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state, conversations, connections]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadInitialData = async () => {
    try {
      const [convRes, connRes] = await Promise.all([
        api.get('/messages/conversations'),
        api.get('/connections')
      ]);
      setConversations(convRes.data || []);
      setConnections(connRes.data || []);
    } catch (err) {
      console.error('Failed to load messaging data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationsOnly = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const handleSelectChat = (convEntry) => {
    if (convEntry.conversation_id) {
      loadMessages(convEntry.conversation_id);
      setSelectedUser(null);
    } else {
      // It's a brand new empty chat!
      setMessages([]);
      setSelectedConversation(null);
      setSelectedUser({
        other_user_id: convEntry.other_user_id,
        other_user_name: convEntry.other_user_name,
        other_user_logo: convEntry.other_user_logo
      });
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const res = await api.get(`/messages/${conversationId}`);
      setMessages(res.data || []);
      setSelectedConversation(conversationId);
      // Join the conversation room for real-time messages
      socket.emit('join_conversation', conversationId);
      setConversations(prev =>
        prev.map(c => c.conversation_id === conversationId ? { ...c, unread_count: 0 } : c)
      );
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const hasActiveChat = selectedConversation || selectedUser;
    if (!newMessage.trim() || !hasActiveChat) return;

    const receiverId = selectedConversation 
      ? conversations.find(c => c.conversation_id === selectedConversation)?.other_user_id
      : selectedUser.other_user_id;

    if (!receiverId) return;

    setSending(true);
    try {
      const res = await api.post('/messages/send', {
        receiver_id: receiverId,
        message:     newMessage.trim()
      });
      setNewMessage('');
      
      const newConvId = res.data.conversation_id;
      
      await loadConversationsOnly(); 
      
      // If this was an empty chat, seamlessly upgrade the UI state to the new DB conversation
      if (!selectedConversation) {
        setSelectedConversation(newConvId);
        setSelectedUser(null);
      }
      
      await loadMessages(newConvId);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const d         = new Date(date);
    const today     = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString())     return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Last seen — only based on messages received FROM the other user, not sent by us
  const getLastSeen = (conv) => {
    if (!conv?.last_message_at) return null;
    const lastReceived = [...messages].reverse().find(m => m.sender_id !== user?.id);
    if (!lastReceived) return null;
    return `Last active ${formatDate(lastReceived.created_at)} at ${formatTime(lastReceived.created_at)}`;
  };

  const getInitials = (name = '') => {
    const words = name.trim().split(' ');
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (id) => {
    const colors = [
      'linear-gradient(135deg, #0969da, #0550ae)',
      'linear-gradient(135deg, #1a7f37, #116329)',
      'linear-gradient(135deg, #8250df, #6639ba)',
      'linear-gradient(135deg, #bf8700, #9a6700)',
      'linear-gradient(135deg, #cf1322, #a8071a)',
      'linear-gradient(135deg, #0969da, #8250df)'
    ];
    return colors[(id || 0) % colors.length];
  };

  // ----- UNIFIED LOGIC: Hide unused connections by default! -----
  // If the user isn't searching, only display active conversations.
  let filteredConversations = [];

  if (!searchQuery.trim()) {
    filteredConversations = [...conversations];
  } else {
    // If they are searching, merge connections into the list dynamically to create empty chat shells!
    const unifiedList = [...conversations];

    connections.forEach(conn => {
      const existing = conversations.find(c => c.other_user_id === conn.connected_user_id);
      if (!existing) {
        unifiedList.push({
          conversation_id: null,
          other_user_id: conn.connected_user_id,
          other_user_name: conn.company_name,
          other_user_logo: conn.logo,
          last_message: null,
          last_message_at: null,
          unread_count: 0
        });
      }
    });

    const queryLower = searchQuery.toLowerCase();
    filteredConversations = unifiedList.filter(c =>
      c.other_user_name?.toLowerCase().includes(queryLower)
    );
  }
  // -----------------------------

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const currentChatUser = selectedConversation 
    ? conversations.find(c => c.conversation_id === selectedConversation)
    : selectedUser;
    
  const hasActiveChat = selectedConversation || selectedUser;
  const showSidebar  = !isMobile || !hasActiveChat;
  const showChat     = !isMobile || hasActiveChat;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '340px 1fr',
      height: isMobile ? 'calc(100vh - 120px)' : '72vh',
      minHeight: '500px',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
    }}>

      {/* SIDEBAR */}
      {showSidebar && (
        <div style={{
          borderRight: '1px solid #e2e8f0',
          display: 'flex', flexDirection: 'column',
          background: '#ffffff', overflow: 'hidden'
        }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Messages
              </h2>
              {conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0) > 0 && (
                <span style={{
                  background: '#2563eb', color: 'white',
                  padding: '0.125rem 0.5rem', borderRadius: '999px',
                  fontSize: '0.75rem', fontWeight: 600
                }}>
                  {conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)}
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: '0.75rem', top: '50%',
                transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8',
                display: 'flex', alignItems: 'center'
              }}>
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations & connections..."
                style={{
                  width: '100%', padding: '0.5rem 0.875rem 0.5rem 2.25rem',
                  border: '1px solid #e2e8f0', borderRadius: '8px',
                  fontSize: '0.8125rem', outline: 'none',
                  background: '#f8fafc', boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', fontSize: '0.875rem' }}>
                {searchQuery ? 'No matched connections found.' : 'Your network is empty.'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = (selectedConversation && selectedConversation === conv.conversation_id) || 
                                   (selectedUser && selectedUser.other_user_id === conv.other_user_id);
                return (
                  <div
                    key={conv.conversation_id || `new_${conv.other_user_id}`}
                    onClick={() => handleSelectChat(conv)}
                    style={{
                      padding: '0.875rem 1.25rem',
                      background: isSelected ? '#dbeafe' : 'white',
                      borderBottom: '1px solid #f0f0f0',
                      borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                      cursor: 'pointer', transition: 'all 0.1s ease'
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'white'; }}
                  >
                    <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: conv.other_user_logo ? 'transparent' : getAvatarColor(conv.other_user_id),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0,
                        overflow: 'hidden'
                      }}>
                        {conv.other_user_logo ? (
                           <img src={conv.other_user_logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                           getInitials(conv.other_user_name)
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <div style={{
                            fontWeight: conv.unread_count > 0 ? 700 : 600,
                            color: '#0f172a', fontSize: '0.875rem',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {conv.other_user_name}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#94a3b8', flexShrink: 0, marginLeft: '0.5rem' }}>
                            {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{
                            fontSize: '0.8125rem',
                            color: conv.unread_count > 0 ? '#0f172a' : '#64748b',
                            fontWeight: conv.unread_count > 0 ? 500 : 400,
                            fontStyle: !conv.last_message ? 'italic' : 'normal',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', flex: 1
                          }}>
                            {conv.last_message || 'Start a conversation...'}
                          </div>
                          {conv.unread_count > 0 && (
                            <div style={{
                              background: '#2563eb', color: 'white',
                              padding: '0.125rem 0.4375rem', borderRadius: '999px',
                              fontSize: '0.6875rem', fontWeight: 700,
                              marginLeft: '0.5rem', flexShrink: 0
                            }}>
                              {conv.unread_count}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CHAT AREA */}
      {showChat && (
        <div style={{ display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>
          {hasActiveChat ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
                background: 'white', display: 'flex', alignItems: 'center', gap: '0.875rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}>
                {isMobile && (
                  <button onClick={() => { setSelectedConversation(null); setSelectedUser(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f172a', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: currentChatUser?.other_user_logo ? 'transparent' : getAvatarColor(currentChatUser?.other_user_id),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {currentChatUser?.other_user_logo ? (
                    <img src={currentChatUser.other_user_logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    getInitials(currentChatUser?.other_user_name)
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>
                    {currentChatUser?.other_user_name}
                  </div>
                  {onlineUsers.has(Number(currentChatUser?.other_user_id)) ? (
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                      Online
                    </div>
                  ) : (
                    currentChatUser?.last_message_at && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {getLastSeen(currentChatUser)}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem',
                display: 'flex', flexDirection: 'column', gap: '0.25rem'
              }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: '#64748b' }}>
                    <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center' }}>
                      <Hand size={40} color="#60a5fa" />
                    </div>
                    <div style={{ fontWeight: 500, color: '#0f172a', marginBottom: '0.375rem' }}>
                      Say hello!
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      Start networking with {currentChatUser?.other_user_name}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, index) => {
                    const isOwn    = msg.sender_id === user?.id;
                    const showDate = index === 0 ||
                      formatDate(messages[index - 1].created_at) !== formatDate(msg.created_at);
                    const isGrouped = index > 0 &&
                      messages[index - 1].sender_id === msg.sender_id && !showDate;

                    return (
                      <div key={msg.id}>
                        {showDate && (
                          <div style={{ textAlign: 'center', margin: '1rem 0 0.75rem' }}>
                            <span style={{
                              background: '#e2e8f0', color: '#64748b',
                              padding: '0.25rem 0.875rem', borderRadius: '12px',
                              fontSize: '0.75rem', fontWeight: 500
                            }}>
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <div style={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          marginTop: isGrouped ? '0.125rem' : '0.5rem'
                        }}>
                          {!isOwn && !isGrouped && (
                            <div style={{
                              width: '28px', height: '28px', borderRadius: '50%',
                              background: currentChatUser?.other_user_logo ? 'transparent' : getAvatarColor(currentChatUser?.other_user_id),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: '0.6875rem', fontWeight: 700,
                              flexShrink: 0, marginRight: '0.5rem', alignSelf: 'flex-end',
                              overflow: 'hidden'
                            }}>
                              {currentChatUser?.other_user_logo ? (
                                <img src={currentChatUser.other_user_logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                getInitials(currentChatUser?.other_user_name)
                              )}
                            </div>
                          )}
                          {!isOwn && isGrouped && (
                            <div style={{ width: '28px', marginRight: '0.5rem', flexShrink: 0 }} />
                          )}
                          <div style={{
                            maxWidth: '62%', padding: '0.5rem 0.875rem',
                            borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isOwn ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'white',
                            color: isOwn ? 'white' : '#0f172a',
                            fontSize: '0.9375rem', lineHeight: 1.5, wordWrap: 'break-word',
                            boxShadow: isOwn ? '0 2px 8px rgba(37,99,235,0.3)' : '0 1px 3px rgba(0,0,0,0.08)',
                            border: isOwn ? 'none' : '1px solid #e2e8f0'
                          }}>
                            <div>{msg.message}</div>
                            <div style={{
                              fontSize: '0.625rem', marginTop: '0.25rem',
                              opacity: 0.75, textAlign: 'right',
                              display: 'flex', justifyContent: 'flex-end', gap: '0.25rem', alignItems: 'center'
                            }}>
                              {formatTime(msg.created_at)}
                              {isOwn && (
                                <span style={{ opacity: msg.is_read ? 1 : 0.5, display: 'flex', alignItems: 'center' }}>
                                  {msg.is_read ? <CheckCheck size={14} /> : <Check size={14} />}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid #e2e8f0', background: 'white' }}>
                <form onSubmit={sendMessage}>
                  <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-end' }}>
                    <input
                      type="text" value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message... (Enter to send)"
                      style={{
                        flex: 1, padding: '0.75rem 1.125rem',
                        border: '1px solid #e2e8f0', borderRadius: '24px',
                        fontSize: '0.9375rem', outline: 'none',
                        background: '#f8fafc', boxSizing: 'border-box'
                      }}
                      onFocus={e => e.target.style.borderColor = '#2563eb'}
                      onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
                    />
                    <button type="submit"
                      disabled={sending || !newMessage.trim()}
                      style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: newMessage.trim() ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#e2e8f0',
                        color: newMessage.trim() ? 'white' : '#94a3b8',
                        border: 'none', cursor: newMessage.trim() ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: newMessage.trim() ? '0 2px 8px rgba(37,99,235,0.35)' : 'none'
                      }}
                    >
                      {sending ? '•••' : <Send size={18} />}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', flexDirection: 'column', gap: '0.75rem'
            }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '0.25rem', color: '#2563eb'
              }}>
                <MessageSquare size={32} />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Your Messages</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', maxWidth: '240px' }}>
                Select an active conversation, or search for a connection to start a new chat.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Messages;