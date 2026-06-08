import { useEffect, useRef, useState } from 'react';
import { Send, FileText, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import MessageBubble from './MessageBubble';
import Loader from './Loader';

export default function ChatWindow({ 
  messages, 
  onSendMessage, 
  loading, 
  isVectorStoreReady, 
  onNavigateToUpload 
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !isVectorStoreReady) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Scrollable Message List */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {!isVectorStoreReady && messages.length === 0 ? (
          /* Empty State UX */
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 100 }}
              className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-primary flex items-center justify-center mb-6 shadow-xl shadow-primary/5"
            >
              <FileText className="w-8 h-8" />
            </motion.div>
            
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Begin RAG Conversation
            </h2>
            <p className="text-sm text-text-gray/50 mt-2 mb-8 leading-relaxed">
              To start asking questions, you need to upload a document (PDF, DOCX, TXT) or paste plain text content to build your knowledge base.
            </p>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNavigateToUpload}
              className="flex items-center gap-2 bg-primary hover:bg-primary/95 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all cursor-pointer text-sm"
            >
              <span>Upload or Paste Content</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </div>
        ) : messages.length === 0 ? (
          /* Store is ready, but no messages yet */
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-secondary-color/10 border border-secondary-color/25 text-secondary flex items-center justify-center mb-6">
              <FileText className="w-8 h-8" />
            </div>
            
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Knowledge Base Ready
            </h2>
            <p className="text-sm text-text-gray/50 mt-2 leading-relaxed">
              Ask any question about your uploaded documents below. The response will cite context blocks directly from the source.
            </p>
          </div>
        ) : (
          /* Render Messages */
          <div className="space-y-6">
            {messages.map((msg, index) => (
              <MessageBubble key={index} message={msg} />
            ))}
            {loading && <Loader />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Console */}
      <div className="p-6 bg-gradient-to-t from-background via-background to-transparent z-10">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !isVectorStoreReady 
                ? 'Please upload files to enable chat...' 
                : 'Ask anything about your documents... (Shift+Enter for new line)'
            }
            disabled={loading || !isVectorStoreReady}
            className="w-full bg-surface/80 border border-white/10 rounded-2xl py-4 pl-4 pr-14 text-sm text-text-gray placeholder-text-gray/30 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 transition-all shadow-xl resize-none max-h-36 min-h-[52px]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !isVectorStoreReady}
            className="absolute right-3 bottom-3 w-9 h-9 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-white/5 disabled:text-text-gray/20 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg shadow-primary/20"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
