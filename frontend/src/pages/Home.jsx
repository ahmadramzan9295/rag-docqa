import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, FileCode } from 'lucide-react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import UploadBox from '../components/UploadBox';
import { documentService } from '../services/api';

export default function Home({ 
  username, 
  onLogout, 
  uploadedFiles, 
  refreshFiles, 
  onNewChat, 
  onSummarize, 
  summarizing, 
  summary, 
  clearSummary,
  onDeleteFile
}) {
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleFileUpload = async (file) => {
    setProcessing(true);
    setSuccessMsg('');
    try {
      const data = await documentService.upload(file);
      await refreshFiles();
      setSuccessMsg(`"${data.filename}" processed and indexed successfully (${data.chunks_added} chunks)!`);
      setTimeout(() => {
        navigate('/chat');
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to index file');
    } finally {
      setProcessing(false);
    }
  };

  const handleTextProcess = async (text, filename) => {
    setProcessing(true);
    setSuccessMsg('');
    try {
      const data = await documentService.processText(text, filename);
      await refreshFiles();
      setSuccessMsg(`Text document "${data.filename}" created and indexed successfully (${data.chunks_added} chunks)!`);
      setTimeout(() => {
        navigate('/chat');
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to process pasted content');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Navbar username={username} onLogout={onLogout} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          uploadedFiles={uploadedFiles} 
          onNewChat={onNewChat}
          onSummarize={onSummarize}
          summarizing={summarizing}
          summary={summary}
          clearSummary={clearSummary}
          onDeleteFile={onDeleteFile}
        />

        <main className="flex-1 overflow-y-auto p-8 flex flex-col justify-between">
          <div className="max-w-2xl mx-auto w-full space-y-6 pt-6">
            <div className="text-center space-y-2 mb-8">
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-extrabold tracking-tight text-white"
              >
                Build your Document Context
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="text-sm text-text-gray/50 max-w-md mx-auto"
              >
                Load raw knowledge documents or write copy/notes to construct your localized vector search database.
              </motion.p>
            </div>

            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 p-4 rounded-xl bg-secondary-color/10 border border-secondary-color/20 text-secondary text-sm font-semibold"
              >
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            <UploadBox 
              onUpload={handleFileUpload} 
              onProcessText={handleTextProcess}
              processing={processing}
            />
          </div>

          <div className="max-w-2xl mx-auto w-full text-center text-xs text-text-gray/30 py-4 border-t border-white/5 flex justify-between items-center mt-12">
            <span>Powered by FAISS & Sentence-Transformers</span>
            {uploadedFiles.length > 0 && (
              <button 
                onClick={() => navigate('/chat')}
                className="flex items-center gap-1 text-primary hover:text-primary-hover font-semibold transition-colors focus:outline-none cursor-pointer"
              >
                <span>Go to Chat Workspace</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
