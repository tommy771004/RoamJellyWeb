import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Sparkles, X, Send, PlusCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getOverlayTransition, getSheetMotion, subtlePressableClass } from '../lib/motionTokens';

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
  const prefersReducedMotion = useReducedMotion() ?? false;
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const sheetMotion = getSheetMotion(prefersReducedMotion);

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
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.8 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.8 }}
            transition={prefersReducedMotion ? { duration: 0.16 } : { type: 'spring', bounce: 0.6, duration: 0.7 }}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-24 right-5 z-40 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border border-white/20 bg-gradient-to-tr from-sky-500 via-fuchsia-500 to-orange-400 shadow-[0_12px_28px_rgba(14,165,233,0.28)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-400/60 sm:right-6 sm:h-14 sm:w-14 ${subtlePressableClass}`}
            aria-label="開啟 Jelly AI 行程顧問"
          >
            <div className="absolute inset-[1px] rounded-full bg-gradient-to-br from-white/22 to-transparent opacity-80" />
            <Sparkles size={24} className="text-white relative z-10" />
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
            transition={overlayTransition}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/28 backdrop-blur-[6px] z-sheet"
          />
        )}
      </AnimatePresence>

      {/* Chat Sheet Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={sheetMotion.initial}
            animate={sheetMotion.animate}
            exit={sheetMotion.exit}
            transition={sheetMotion.transition}
            className="fixed bottom-0 left-0 right-0 z-sheet-above mx-auto flex h-80dvh w-full max-w-[600px] flex-col overflow-hidden rounded-t-[30px] border-t border-white/52 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,250,251,0.82),rgba(241,248,255,0.80))] shadow-[0_-12px_36px_rgba(15,23,42,0.14)] overscroll-contain dark:border-white/10 dark:bg-black/62 sm:rounded-t-[34px]"
            style={{ backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)' }}
          >
            <div className="flex justify-center pt-2 pb-1 bg-white/36 dark:bg-black/24">
              <div className="h-1.5 w-10 rounded-full bg-slate-300/80 dark:bg-white/15" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/20 bg-white/42 px-5 py-4 dark:border-white/5 dark:bg-black/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-orange-400 text-xl shadow-inner">
                  {assistantAvatar}
                </div>
                <div>
                  <h3 className="text-[16px] font-black tracking-[-0.03em] text-slate-800 dark:text-white">Jelly AI 行程顧問</h3>
                  <p className="fluid-kicker text-slate-500 dark:text-slate-500">Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                aria-label="關閉 AI 顧問"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100/50 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain p-3.5 scrollbar-hide sm:p-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'ai' && (
                    <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-orange-400 text-[14px] shadow-sm">
                      {assistantAvatar}
                    </div>
                  )}
                  <div className={`max-w-[80%] flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-[22px] px-4 py-3 ${message.role === 'user' ? 'rounded-tr-sm bg-gradient-to-br from-sky-500 to-orange-400 text-white shadow-[0_8px_20px_rgba(14,165,233,0.22)]' : 'rounded-tl-sm border border-white/60 bg-white/94 text-slate-800 shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:border-white/5 dark:bg-white/10 dark:text-white'}`}>
                      <p className="fluid-copy font-bold">{message.text}</p>
                    </div>
                    {message.hasCard && (
                      <motion.div 
                        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={prefersReducedMotion ? { duration: 0.16 } : { type: 'spring', bounce: 0.5, duration: 0.6 }}
                        className="mt-2 w-full overflow-hidden rounded-[24px] border border-white/60 bg-white/95 shadow-[0_12px_32px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-white/10"
                      >
                        <div className="relative flex h-24 items-center justify-center bg-gradient-to-tr from-sky-500 via-fuchsia-500 to-orange-400">
                          <div className="absolute inset-0 bg-black/10" />
                          <h4 className="relative z-10 text-[18px] font-black tracking-[0.16em] text-white drop-shadow-md">TRIP PLAN</h4>
                        </div>
                        <div className="flex flex-col gap-3 p-3.5">
                          <p className="fluid-body text-slate-600 dark:text-slate-400">精選機加酒與必去景點，馬上開啟您的專屬之旅！</p>
                          <button 
                            onClick={handleAddItinerary}
                            className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-slate-900 py-2.5 text-[14px] font-black text-white transition-colors hover:bg-slate-800 active:scale-95 dark:bg-fuchsia-500 dark:hover:bg-fuchsia-600"
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
                  <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-orange-400 text-[14px] shadow-sm">
                    {assistantAvatar}
                  </div>
                  <div className="flex items-center rounded-[20px] rounded-tl-sm border border-white/50 bg-white/90 px-4 py-3 text-slate-800 shadow-sm dark:border-white/5 dark:bg-white/10 dark:text-white">
                    {typingText ? (
                      <p className="fluid-copy">{typingText}<span className="ml-1 inline-block h-4 w-1.5 animate-pulse align-middle bg-fuchsia-500" /></p>
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
              <div className="flex gap-2 overflow-x-auto px-3.5 pb-2 scrollbar-hide sm:px-4">
                <button 
                  onClick={() => handleSend('規劃專屬五天四夜')}
                  className="fluid-caption whitespace-nowrap rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 font-black text-fuchsia-600 transition-transform active:scale-95 dark:border-fuchsia-700/50 dark:bg-fuchsia-900/30 dark:text-fuchsia-300"
                >
                  ✨ 規劃專屬行程
                </button>
                <button 
                  onClick={() => handleSend('附近有什麼好吃的？')}
                  className="fluid-caption whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-4 py-2 font-black text-slate-600 transition-transform active:scale-95 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                >
                  🍣 附近有什麼好吃的？
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-white/20 bg-white/40 p-3.5 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] dark:border-white/5 dark:bg-black/40 sm:p-4">
              <div className="flex items-center rounded-full border border-white/50 bg-white/60 p-1.5 pr-2 shadow-inner dark:border-white/10 dark:bg-black/60">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder="輸入訊息或指令…"
                  className="fluid-copy flex-1 rounded-full border-none bg-transparent px-4 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-fuchsia-400/40 dark:text-white"
                  inputMode="text"
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isTyping}
                  aria-label="送出"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500 text-white transition-colors active:scale-95 disabled:bg-slate-300 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
