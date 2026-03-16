import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../auth';
import socket from '../Socket';
import './Messages.css';
 
const Messages = () => {
  const { user }                                          = useAuth();
  const location                                          = useLocation();
  const [conversations, setConversations]                 = useState([]);
  const [selectedConversation, setSelectedConversation]   = useState(null);
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
    loadConversations();
 
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
      loadConversations();
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
    if (location.state?.openUserId && conversations.length > 0) {
      const existing = conversations.find(
        c => c.other_user_id === location.state.openUserId
      );
      if (existing) {
        loadMessages(existing.conversation_id);
      }
      // Clear state so it doesn't re-trigger
      window.history.replaceState({}, document.title);
    }
  }, [location.state, conversations]);
 
  useEffect(() => { scrollToBottom(); }, [messages]);
 
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
 
  const loadConversations = async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
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
    if (!newMessage.trim() || !selectedConversation) return;
 
    const conversation = conversations.find(c => c.conversation_id === selectedConversation);
    if (!conversation) return;
 
    setSending(true);
    try {
      await api.post('/messages/send', {
        receiver_id: conversation.other_user_id,
        message:     newMessage.trim()
      });
      setNewMessage('');
      await loadMessages(selectedConversation);
      await loadConversations();
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
    // Find the last message that was NOT sent by the current user
    const lastReceived = [...messages]
      .reverse()
      .find(m => m.sender_id !== user?.id);
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
 
  const filteredConversations = conversations.filter(c =>
    c.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
 
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }
 
  const selectedConv = conversations.find(c => c.conversation_id === selectedConversation);
  const showSidebar  = !isMobile || !selectedConversation;
  const showChat     = !isMobile || selectedConversation;
 
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
                transform: 'translateY(-50%)', fontSize: '0.875rem', color: '#94a3b8'
              }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
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
                {searchQuery ? 'No results found' : 'No conversations yet.\nMessage a business from their profile.'}
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedConversation === conv.conversation_id;
                return (
                  <div
                    key={conv.conversation_id}
                    onClick={() => loadMessages(conv.conversation_id)}
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
                        background: getAvatarColor(conv.other_user_id),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0
                      }}>
                        {getInitials(conv.other_user_name)}
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
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', flex: 1
                          }}>
                            {conv.last_message || 'No messages yet'}
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
          {selectedConversation ? (
            <>
              {/* Chat Header — no hardcoded Active */}
              <div style={{
                padding: '1rem 1.5rem', borderBottom: '1px solid #e2e8f0',
                background: 'white', display: 'flex', alignItems: 'center', gap: '0.875rem',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}>
                {isMobile && (
                  <button onClick={() => setSelectedConversation(null)}
                    style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#0f172a' }}>
                    ←
                  </button>
                )}
                <div style={{
                  width: '40px', height: '40px', borderRadius: '50%',
                  background: getAvatarColor(selectedConv?.other_user_id),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0
                }}>
                  {getInitials(selectedConv?.other_user_name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>
                    {selectedConv?.other_user_name}
                  </div>
                  {onlineUsers.has(Number(selectedConv?.other_user_id)) ? (
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>
                      Online
                    </div>
                  ) : (
                    selectedConv?.last_message_at && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {getLastSeen(selectedConv)}
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
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>👋</div>
                    <div style={{ fontWeight: 500, color: '#0f172a', marginBottom: '0.375rem' }}>
                      Start the conversation
                    </div>
                    <div style={{ fontSize: '0.875rem' }}>
                      Say hello to {selectedConv?.other_user_name}
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
                              background: getAvatarColor(selectedConv?.other_user_id),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontSize: '0.6875rem', fontWeight: 700,
                              flexShrink: 0, marginRight: '0.5rem', alignSelf: 'flex-end'
                            }}>
                              {getInitials(selectedConv?.other_user_name)}
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
                                <span style={{ opacity: msg.is_read ? 1 : 0.5 }}>
                                  {msg.is_read ? '✓✓' : '✓'}
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
                        fontSize: '1.125rem', flexShrink: 0,
                        boxShadow: newMessage.trim() ? '0 2px 8px rgba(37,99,235,0.35)' : 'none'
                      }}
                    >
                      {sending ? '•••' : '➤'}
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
                fontSize: '2rem', marginBottom: '0.25rem'
              }}>
                💬
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Your Messages</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', maxWidth: '240px' }}>
                Select a conversation or message a business from their profile
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
 
export default Messages;