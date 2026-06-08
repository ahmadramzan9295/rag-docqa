import { motion } from 'framer-motion';
import { BookOpen, LogOut } from 'lucide-react';

export default function Navbar({ username, onLogout }) {
  return (
    <header className="h-16 border-b border-white/10 bg-surface/50 backdrop-blur-md flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen className="text-white w-4.5 h-4.5" />
        </div>
        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          DocQA
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-background/50 border border-white/5 py-1.5 px-3 rounded-full">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-semibold text-white">
            {username?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-text-gray/80 font-medium">{username}</span>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogout}
          className="p-2 rounded-xl bg-white/5 border border-white/10 text-text-gray/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </motion.button>
      </div>
    </header>
  );
}
