import { useState, useRef, useEffect } from 'react';
import { Send, Bot, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const { data } = await api.post('/query', {
        question: userMessage.content,
        session_id: sessionId
      });
      
      if (!sessionId) {
        setSessionId(data.session_id);
      }

      const aiMessage = { 
        role: 'assistant', 
        content: data.answer, 
        sources: data.sources,
        latency: data.latency_ms
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      setMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: err.response?.data?.detail || 'An error occurred while generating the answer.',
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div className="chat-container">
        {messages.length === 0 ? (
          <div className="chat-empty animate-fade-in">
            <MessageSquare size={48} className="chat-empty-icon" />
            <h2>How can I help you today?</h2>
            <p style={{ marginTop: '0.5rem' }}>Ask a question about the documents you've uploaded.</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))
        )}
        
        {loading && (
          <div className="message-wrapper message-ai animate-fade-in">
            <div className="avatar avatar-ai">
              <Bot size={20} />
            </div>
            <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="animate-pulse">Thinking...</div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <form onSubmit={handleSubmit} className="chat-input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="chat-input"
            placeholder="Ask a question about your documents..."
            disabled={loading}
          />
          <button type="submit" className="chat-submit" disabled={!input.trim() || loading}>
            <Send size={16} style={{ marginLeft: '-2px' }} />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const [showSources, setShowSources] = useState(false);

  return (
    <div className={`message-wrapper ${isUser ? 'message-user' : 'message-ai'} animate-fade-in`}>
      {!isUser && (
        <div className="avatar avatar-ai">
          <Bot size={20} />
        </div>
      )}
      
      <div style={{ flex: 1, maxWidth: 'calc(100% - 50px)' }}>
        <div className="message-bubble">
          {message.isError ? (
            <span style={{ color: 'var(--error-color)' }}>{message.content}</span>
          ) : isUser ? (
            message.content
          ) : (
            <div className="markdown">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="sources-container">
            <button 
              className="sources-toggle"
              onClick={() => setShowSources(!showSources)}
            >
              {showSources ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {message.sources.length} Source{message.sources.length !== 1 ? 's' : ''}
              {message.latency && <span style={{ opacity: 0.5 }}> · {message.latency}ms</span>}
            </button>
            
            {showSources && (
              <div className="source-grid animate-fade-in">
                {message.sources.map((src, i) => (
                  <div key={i} className="source-card">
                    <div className="source-header">
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {src.source}
                      </span>
                      {src.page && <span style={{ opacity: 0.7, fontSize: '0.85em' }}>p. {src.page}</span>}
                    </div>
                    <div className="source-snippet">"{src.snippet}"</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
