import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FileText, MessageSquarePlus, RefreshCw, Sparkles, CheckCircle, Plus, Trash2
} from 'lucide-react';

export default function Sidebar({ 
  uploadedFiles, 
  onNewChat, 
  onSummarize, 
  summarizing, 
  summary, 
  clearSummary,
  onDeleteFile
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatPage = location.pathname === '/chat';

  return (
    <aside className="w-80 border-r border-white/10 bg-surface/30 flex flex-col h-full z-10">
      {/* Action tray */}
      <div className="p-4 space-y-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            onNewChat();
            if (!isChatPage) navigate('/chat');
          }}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/95 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-primary/30 transition-all cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Chat</span>
        </motion.button>

        {!isChatPage && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/chat')}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-4 rounded-xl transition-all cursor-pointer"
          >
            <span>Open Workspace</span>
          </motion.button>
        )}
        
        {isChatPage && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 px-4 rounded-xl transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Documents</span>
          </motion.button>
        )}
      </div>

      {/* Indexed files list */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-gray/40 mb-3 px-2">
          Indexed Knowledge
        </h2>
        
        {uploadedFiles.length === 0 ? (
          <div className="text-center py-8 text-sm text-text-gray/30 italic">
            No documents indexed.
          </div>
        ) : (
          <div className="space-y-2">
            {uploadedFiles.map((file, i) => (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                key={i}
                className="flex items-center gap-3 p-3 bg-surface/50 border border-white/5 hover:border-white/10 rounded-xl transition-all group"
              >
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-gray truncate">
                    {file.filename}
                  </p>
                  <p className="text-xs text-text-gray/40">
                    {file.chunks} {file.chunks === 1 ? 'chunk' : 'chunks'}
                  </p>
                </div>
                <div className="relative w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-secondary/80 absolute transition-all duration-200 group-hover:opacity-0 group-hover:scale-75" />
                  <Trash2 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete "${file.filename}" from the workspace?`)) {
                        onDeleteFile(file.filename);
                      }
                    }}
                    className="w-4 h-4 text-red-500/60 hover:text-red-400 absolute opacity-0 scale-75 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100 cursor-pointer" 
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Summarize button */}
        {uploadedFiles.length > 0 && (
          <div className="mt-6 px-1">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSummarize}
              disabled={summarizing}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-indigo-600/50 disabled:to-violet-600/50 text-white py-2.5 px-4 rounded-xl shadow-lg shadow-indigo-500/20 font-medium text-sm transition-all cursor-pointer"
            >
              {summarizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Summarize Documents</span>
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Inline Summary box */}
        <AnimatePresence>
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="mt-6 p-4 rounded-xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 to-indigo-500/5"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Executive Summary
                </h3>
                <button 
                  onClick={clearSummary}
                  className="text-xs text-text-gray/50 hover:text-white cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-xs text-text-gray/80 leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                {summary}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 border-t border-white/10 text-center text-xs text-text-gray/40">
        RAG Workspace v1.0.0
      </div>
    </aside>
  );
}
