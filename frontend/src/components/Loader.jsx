import { motion } from 'framer-motion';
import { Bot } from 'lucide-react';

export default function Loader() {
  return (
    <div className="flex gap-4 w-full max-w-3xl mx-auto justify-start">
      {/* Bot Icon */}
      <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-primary flex items-center justify-center flex-shrink-0 animate-pulse">
        <Bot className="w-4.5 h-4.5" />
      </div>

      {/* Pulsing Skeleton Bubble */}
      <div className="flex flex-col w-[75%] items-start">
        <div className="w-full bg-surface border border-white/5 p-4 rounded-2xl rounded-tl-sm space-y-3">
          <motion.div 
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="h-3 w-1/3 bg-white/10 rounded-full"
          />
          <motion.div 
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.5, delay: 0.2, repeat: Infinity, ease: "easeInOut" }}
            className="h-3 w-3/4 bg-white/10 rounded-full"
          />
          <motion.div 
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.5, delay: 0.4, repeat: Infinity, ease: "easeInOut" }}
            className="h-3 w-1/2 bg-white/10 rounded-full"
          />
        </div>
      </div>
    </div>
  );
}
