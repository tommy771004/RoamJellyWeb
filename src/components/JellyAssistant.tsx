import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, PlusCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const assistantAvatar = '✨';

export default function JellyAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: 'ai' | 'user'; text: string; hasCard?: boolean }[]>([
    { id: '1', role: 'ai', text: '想去哪裡？我可以幫您規劃！' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingText, setTypingText] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { showToast } = useAppStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingText]);

  const simulateAiResponse = () => {
    setIsTyping(true);
    const fullText = "好的，這就為您奉上「專屬五天四夜」的行程懶人包，包含機加酒與票券建議！";
    let index = 0;
    
    // Typewriter effect
    const interval = setInterval(() => {
      setTypingText(fullText.substring(0, index + 1));
      index++;
      if (index === fullText.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsTyping(false);
          setTypingText('');
          setMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'ai', 
            text: fullText,
            hasCard: true
          }]);
        }, 500);
      }
    }, 50);
  };

  const handleSend = (text: string = inputValue) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text }]);
    setInputValue('');
    
    if (text.includes('規劃') || text === '規劃專屬五天四夜') {
      setTimeout(simulateAiResponse, 500);
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: '請問您想規劃去哪裡呢？我可以幫您生成專屬行程喔！' }]);
      }, 1000);
    }
  };

  const handleAddItinerary = () => {
    setIsOpen(false);
    showToast('已成功將行程懶人包加入您的手帳！', 'success');
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-fuchsia-500 via-purple-500 to-indigo-500 shadow-[0_8px_30px_rgba(217,70,239,0.4)] flex items-center justify-center z-40 transition-transform active:scale-95 group focus:outline-none"
            style={{ animation: 'float 3s ease-in-out infinite' }}
          >
            <div className="absolute inset-0 rounded-full bg-white/20 animate-ping opacity-75" style={{ animationDuration: '3s' }} />
            <Sparkles size={24} className="text-white relative z-10 group-hover:rotate-12 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Sheet Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[100]"
          />
        )}
      </AnimatePresence>

      {/* Chat Sheet Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-w-[600px] mx-auto h-[80vh] bg-white/80 dark:bg-black/60 backdrop-blur-[40px] border-t border-white/40 dark:border-white/10 rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[101] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-fuchsia-500 to-indigo-500 flex items-center justify-center text-xl shadow-inner">
                  {assistantAvatar}
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-slate-800 dark:text-white">Jelly AI 行程顧問</h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100/50 dark:bg-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/20 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-hide">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'ai' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-500 to-indigo-500 flex items-center justify-center text-[14px] shrink-0 mr-2 mt-1 shadow-sm">
                      {assistantAvatar}
                    </div>
                  )}
                  <div className={`max-w-[80%] flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 rounded-2xl ${message.role === 'user' ? 'bg-fuchsia-500 text-white rounded-tr-sm shadow-[0_4px_15px_rgba(217,70,239,0.3)]' : 'bg-white/90 dark:bg-white/10 dark:text-white text-slate-800 rounded-tl-sm shadow-sm border border-white/50 dark:border-white/5'}`}>
                      <p className="text-[14.5px] leading-relaxed">{message.text}</p>
                    </div>
                    {message.hasCard && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="w-full bg-white/90 dark:bg-white/10 border border-white/50 dark:border-white/10 rounded-[24px] overflow-hidden shadow-lg mt-2"
                      >
                        <div className="h-24 bg-gradient-to-r from-orange-400 to-pink-500 flex items-center justify-center relative">
                          <div className="absolute inset-0 bg-black/10" />
                          <h4 className="text-white font-black text-xl tracking-wider relative z-10 drop-shadow-md">TRIP PLAN</h4>
                        </div>
                        <div className="p-4 flex flex-col gap-3">
                          <p className="text-[13px] text-slate-600 dark:text-slate-300">精選機加酒與必去景點，馬上開啟您的專屬之旅！</p>
                          <button 
                            onClick={handleAddItinerary}
                            className="w-full py-2.5 bg-slate-900 dark:bg-fuchsia-500 text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 dark:hover:bg-fuchsia-600 transition-colors active:scale-95"
                          >
                            <PlusCircle size={16} />
                            一鍵加入手帳
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-fuchsia-500 to-indigo-500 flex items-center justify-center text-[14px] shrink-0 mr-2 mt-1 shadow-sm">
                    {assistantAvatar}
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-white/90 dark:bg-white/10 dark:text-white text-slate-800 rounded-tl-sm shadow-sm border border-white/50 dark:border-white/5 flex items-center">
                    {typingText ? (
                      <p className="text-[14.5px] leading-relaxed">{typingText}<span className="inline-block w-1.5 h-4 ml-1 bg-fuchsia-500 animate-pulse align-middle" /></p>
                    ) : (
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Default Suggestions */}
            {messages.length === 1 && !isTyping && (
              <div className="px-4 pb-2 flex overflow-x-auto scrollbar-hide gap-2">
                <button 
                  onClick={() => handleSend('規劃專屬五天四夜')}
                  className="px-4 py-2 bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-300 rounded-full text-[13px] font-bold whitespace-nowrap active:scale-95 transition-transform border border-fuchsia-200 dark:border-fuchsia-700/50"
                >
                  ✨ 規劃專屬行程
                </button>
                <button 
                  onClick={() => handleSend('附近有什麼好吃的？')}
                  className="px-4 py-2 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-full text-[13px] font-bold whitespace-nowrap active:scale-95 transition-transform border border-slate-200 dark:border-white/10"
                >
                  🍣 附近有什麼好吃的？
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-white/40 dark:bg-black/40 border-t border-white/20 dark:border-white/5">
              <div className="flex items-center bg-white/60 dark:bg-black/60 rounded-full p-1.5 pr-2 border border-white/50 dark:border-white/10 shadow-inner">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder="輸入訊息或指令..."
                  className="flex-1 bg-transparent border-none outline-none px-4 text-[15px] dark:text-white placeholder:text-slate-400"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isTyping}
                  className="w-10 h-10 rounded-full bg-fuchsia-500 text-white flex items-center justify-center disabled:opacity-50 disabled:bg-slate-300 transition-colors active:scale-95"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}} />
    </>
  );
}
