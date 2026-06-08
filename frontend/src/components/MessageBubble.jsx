import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { 
  Copy, Check, FileText, ChevronDown, ChevronUp, Bot, User 
} from 'lucide-react';

export default function MessageBubble({ message }) {
  const { sender, text, sources } = message;
  const isAi = sender === 'ai';
  const [copied, setCopied] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-4 w-full max-w-3xl mx-auto ${isAi ? 'justify-start' : 'justify-end'}`}
    >
      {/* Avatar */}
      {isAi && (
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-primary flex items-center justify-center flex-shrink-0">
          <Bot className="w-4.5 h-4.5" />
        </div>
      )}

      {/* Bubble Container */}
      <div className={`flex flex-col max-w-[85%] group ${isAi ? 'items-start' : 'items-end'}`}>
        <div 
          className={`relative p-4 rounded-2xl text-sm leading-relaxed border ${
            isAi 
              ? 'bg-surface border-white/5 rounded-tl-sm text-text-gray/90' 
              : 'bg-primary/10 border-primary/20 rounded-tr-sm text-text-gray'
          }`}
        >
          {/* Action buttons */}
          {isAi && (
            <button
              onClick={handleCopy}
              className="absolute right-3 top-3 p-1.5 rounded-lg bg-surface/80 border border-white/5 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-white/5 text-text-gray/50 hover:text-white transition-all cursor-pointer"
              title="Copy response"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-secondary" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Markdown Content */}
          <div className="prose prose-invert max-w-none text-sm leading-relaxed text-text-gray/95 markdown">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        </div>

        {/* Sources dropdown */}
        {isAi && sources && sources.length > 0 && (
          <div className="mt-2 w-full">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-1.5 text-xs text-text-gray/40 hover:text-text-gray/70 font-semibold focus:outline-none transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span>📄 Source Citations ({sources.length})</span>
              {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <AnimatePresence>
              {showSources && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {sources.map((src, i) => (
                      <div 
                        key={i} 
                        className="bg-surface/30 border border-white/5 rounded-xl p-3 text-xs flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between text-indigo-400 font-semibold">
                          <span className="truncate max-w-[80%]">{src.source}</span>
                          {src.page && <span className="text-[10px] uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full">Page {src.page}</span>}
                        </div>
                        <p className="text-text-gray/50 italic leading-relaxed pl-2 border-l-2 border-white/10 select-none">
                          "{src.snippet}"
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {!isAi && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-lg shadow-indigo-500/20 select-none">
          {localStorage.getItem('username')?.charAt(0).toUpperCase()}
        </div>
      )}
    </motion.div>
  );
}
