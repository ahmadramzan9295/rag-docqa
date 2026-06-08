import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './components/Auth';
import Home from './pages/Home';
import Chat from './pages/Chat';
import { documentService } from './services/api';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [username, setUsername] = useState(localStorage.getItem('username'));
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [summarizing, setSummarizing] = useState(false);
  const [summary, setSummary] = useState('');

  // Refresh files list
  const refreshFiles = async () => {
    if (!token) return;
    try {
      const docs = await documentService.list();
      setUploadedFiles(docs);
    } catch (err) {
      console.error('Failed to load documents', err);
    }
  };

  useEffect(() => {
    refreshFiles();
  }, [token]);

  useEffect(() => {
    const handleAuthChange = () => {
      const newToken = localStorage.getItem('token');
      setToken(newToken);
      setUsername(localStorage.getItem('username'));
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  const handleSetAuth = (newToken) => {
    setToken(newToken);
    setUsername(localStorage.getItem('username'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    sessionStorage.clear();
    setToken(null);
    setUsername(null);
    setUploadedFiles([]);
    setSummary('');
  };

  const handleSummarize = async () => {
    if (uploadedFiles.length === 0) return;
    setSummarizing(true);
    setSummary('');
    try {
      const data = await documentService.summarize();
      setSummary(data.summary);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to summarize documents');
    } finally {
      setSummarizing(false);
    }
  };

  const handleNewChat = () => {
    setSummary('');
  };

  const handleDeleteFile = async (filename) => {
    try {
      await documentService.delete(filename);
      await refreshFiles();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete file');
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/login" 
          element={!token ? <Auth setAuthToken={handleSetAuth} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={
            token ? (
              <Home 
                username={username} 
                onLogout={handleLogout} 
                uploadedFiles={uploadedFiles}
                refreshFiles={refreshFiles}
                onNewChat={handleNewChat}
                onSummarize={handleSummarize}
                summarizing={summarizing}
                summary={summary}
                clearSummary={() => setSummary('')}
                onDeleteFile={handleDeleteFile}
              />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route 
          path="/chat" 
          element={
            token ? (
              <Chat 
                username={username} 
                onLogout={handleLogout} 
                uploadedFiles={uploadedFiles}
                onNewChat={handleNewChat}
                onSummarize={handleSummarize}
                summarizing={summarizing}
                summary={summary}
                clearSummary={() => setSummary('')}
                onDeleteFile={handleDeleteFile}
              />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
