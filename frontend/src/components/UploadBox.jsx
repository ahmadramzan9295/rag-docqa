import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, File, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

export default function UploadBox({ onUpload, onProcessText, processing }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');
  const [error, setError] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const validateFile = (file) => {
    setError('');
    if (!file) return false;
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['pdf', 'docx', 'txt'];
    if (!allowed.includes(ext)) {
      setError(`Unsupported file format (.${ext}). Please upload PDF, DOCX, or TXT.`);
      return false;
    }
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError('File is too large (maximum size is 50MB).');
      return false;
    }
    return true;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile);
    setSelectedFile(null);
  };

  const handleTextSubmit = async () => {
    if (!pastedText.trim()) return;
    const title = pastedTitle.trim() || `pasted_text_${Date.now().toString().slice(-4)}.txt`;
    await onProcessText(pastedText, title);
    setPastedText('');
    setPastedTitle('');
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Upload Zone */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-bold text-text-gray flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-primary" />
          Upload Files
        </h3>

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            dragActive 
              ? 'border-primary bg-primary/5 scale-[1.01]' 
              : 'border-white/10 bg-surface/30 hover:border-white/20 hover:bg-surface/50'
          }`}
        >
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={processing}
          />
          
          <div className="flex flex-col items-center">
            <motion.div
              animate={dragActive ? { y: -5 } : { y: 0 }}
              className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 text-text-gray/50"
            >
              <UploadCloud className="w-6 h-6" />
            </motion.div>
            <p className="text-sm font-semibold text-text-gray">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-text-gray/40 mt-1">
              Supports PDF, DOCX, and TXT up to 50MB
            </p>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <AnimatePresence>
          {selectedFile && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 bg-surface/80 border border-white/10 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                    <File className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-gray truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-text-gray/40">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedFile(null)}
                    disabled={processing}
                    className="py-1.5 px-3 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-text-gray/50 hover:text-text-gray transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUploadSubmit}
                    disabled={processing}
                    className="flex items-center gap-1.5 py-1.5 px-4 bg-primary hover:bg-primary/90 disabled:bg-primary/55 text-xs font-semibold text-white rounded-lg shadow-md shadow-primary/20 transition-all cursor-pointer"
                  >
                    {processing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Index Document</span>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-white/5"></div>
        <span className="flex-shrink mx-4 text-xs font-bold uppercase tracking-wider text-text-gray/30">Or</span>
        <div className="flex-grow border-t border-white/5"></div>
      </div>

      {/* Manual Input Zone */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <h3 className="text-lg font-bold text-text-gray flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" />
          Paste Manual Text
        </h3>

        <div className="bg-surface/30 border border-white/10 rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-gray/40 mb-1">
              Document Name / Identifier
            </label>
            <input
              type="text"
              value={pastedTitle}
              onChange={(e) => setPastedTitle(e.target.value)}
              placeholder="e.g. quarterly_notes.txt"
              className="w-full bg-background/50 border border-white/5 rounded-xl py-2 px-4 text-sm text-text-gray placeholder-text-gray/20 focus:outline-none focus:border-primary transition-all"
              disabled={processing}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-text-gray/40 mb-1">
              Content Body
            </label>
            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Don't have a document? Paste your content here to index..."
              className="w-full bg-background/50 border border-white/5 rounded-xl p-4 text-sm text-text-gray placeholder-text-gray/20 focus:outline-none focus:border-primary transition-all resize-none"
              disabled={processing}
            />
          </div>

          <div className="flex justify-end">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleTextSubmit}
              disabled={processing || !pastedText.trim()}
              className="flex items-center gap-2 py-2.5 px-6 bg-accent hover:bg-accent/90 disabled:bg-accent/55 text-sm font-semibold text-white rounded-xl shadow-lg shadow-accent/25 transition-all cursor-pointer"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Process Content</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
