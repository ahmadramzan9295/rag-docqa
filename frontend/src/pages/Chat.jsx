import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import { chatService } from '../services/api';

export default function Chat({ 
  username, 
  onLogout, 
  uploadedFiles, 
  onNewChat, 
  onSummarize, 
  summarizing, 
  summary, 
  clearSummary,
  onDeleteFile
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const navigate = useNavigate();

  // Load chat session history from sessionStorage to keep it persistent across page navigations
  useEffect(() => {
    const saved = sessionStorage.getItem('chat_history');
    const savedSid = sessionStorage.getItem('chat_session_id');
    if (saved) {
      setMessages(JSON.parse(saved));
    }
    if (savedSid) {
      setSessionId(savedSid);
    }
  }, []);

  const handleSendMessage = async (text) => {
    // Add user message
    const userMsg = { sender: 'user', text };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    sessionStorage.setItem('chat_history', JSON.stringify(updatedMsgs));
    setLoading(true);

    try {
      const response = await chatService.ask(text, sessionId);
      if (!sessionId && response.session_id) {
        setSessionId(response.session_id);
        sessionStorage.setItem('chat_session_id', response.session_id);
      }

      // Add AI response with source metadata citations
      const aiMsg = { 
        sender: 'ai', 
        text: response.answer, 
        sources: response.sources 
      };
      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      sessionStorage.setItem('chat_history', JSON.stringify(finalMsgs));
    } catch (err) {
      const errorMsg = { 
        sender: 'ai', 
        text: `Error: ${err.response?.data?.detail || 'Failed to fetch response. Please check your backend connection.'}`, 
        sources: [] 
      };
      const finalMsgs = [...updatedMsgs, errorMsg];
      setMessages(finalMsgs);
      sessionStorage.setItem('chat_history', JSON.stringify(finalMsgs));
    } finally {
      setLoading(false);
    }
  };

  const handleClearSession = async () => {
    if (sessionId) {
      try {
        await chatService.clearSession(sessionId);
      } catch (err) {
        console.error('Failed to clear session on backend', err);
      }
    }
    setMessages([]);
    setSessionId('');
    sessionStorage.removeItem('chat_history');
    sessionStorage.removeItem('chat_session_id');
    onNewChat();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Navbar username={username} onLogout={onLogout} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          uploadedFiles={uploadedFiles} 
          onNewChat={handleClearSession}
          onSummarize={onSummarize}
          summarizing={summarizing}
          summary={summary}
          clearSummary={clearSummary}
          onDeleteFile={onDeleteFile}
        />

        <ChatWindow 
          messages={messages} 
          onSendMessage={handleSendMessage} 
          loading={loading}
          isVectorStoreReady={uploadedFiles.length > 0}
          onNavigateToUpload={() => navigate('/')}
        />
      </div>
    </div>
  );
}
