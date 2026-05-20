import { SPRING_SMOOTH, SPRING_SNAPPY, SPRING_BOUNCY } from '../lib/motionTokens';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Sparkles, X, Send, PlusCircle, Plane, Luggage, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getOverlayTransition, getSheetMotion, subtlePressableClass } from '../lib/motionTokens';
import { suggestChatAssistantResponse, ChatResponseData } from '../lib/openrouterApi';
import { getStoredToken, addFavorite } from '../lib/workflowApi';

const assistantAvatar = '🍮';

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
  suggestedType?: 'flights' | 'packing-list' | 'activities' | 'none';
  flights?: Array<{
    provider: string;
    time: string;
    price: number;
    from: string;
    to: string;
    stops: number;
  }>;
  packingList?: string[];
  activities?: Array<{
    title: string;
    time?: string;
    description: string;
    category?: string;
  }>;
}

function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    landmark: '🏯',
    food: '🍜',
    shopping: '🛍️',
    nature: '🌿',
    activity: '🎡',
    other: '📍'
  };
  return map[category] || '📍';
}

export default function JellyAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'ai', text: '哈囉！我是您的行程果凍顧問 🍮！我可以幫您比價機票、行李準備、以及推薦台北的私房下雨行程，需要我的時候隨時問我喔！' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSyncing, setIsSyncing] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const overlayTransition = getOverlayTransition(prefersReducedMotion);
  const sheetMotion = getSheetMotion(prefersReducedMotion);

  const { showToast, activeTripId } = useAppStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text: string = inputValue) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const historyParam = messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.text,
      }));

      const response = await suggestChatAssistantResponse(text, historyParam, {
        activeDestination: activeTripId ? `trip_${activeTripId}` : undefined,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: response.text,
          suggestedType: response.suggestedType,
          flights: response.flights,
          packingList: response.packingList,
          activities: response.activities,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: `抱歉，伺服器連線稍微不穩定。您可以直接輸入如「幫我找飛機」或「台北下雨帶什麼行李」來測試我的快速回撥機制！ (${err?.message || 'API 錯誤'})`,
          suggestedType: 'none',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleImportPackingList = async (items: string[], messageId: string) => {
    if (!activeTripId) {
      showToast('請先建立或選擇一個行程，才能匯入打包必備備忘喔！', 'warning');
      return;
    }

    setIsSyncing((prev) => ({ ...prev, [messageId]: true }));
    try {
      // Fetch existing checklist first
      const getRes = await fetch(`/api/checklist?trip_id=${activeTripId}`);
      let existingItems: any[] = [];
      if (getRes.ok) {
        existingItems = await getRes.json();
      }

      // Format pack list elements
      const nextIdBase = Date.now();
      const newChecklistItems = items.map((text, index) => ({
        id: `ai_pack_${nextIdBase}_${index}`,
        text: text,
        checked: false,
        category: 'other',
      }));

      const combined = [...existingItems, ...newChecklistItems];

      const updatePayload = {
        trip_id: activeTripId,
        items: combined.map((i: any) => ({
          id: i.id,
          content: i.text || i.content,
          completed: i.checked || i.completed || false,
          category: i.category || 'other',
        })),
      };

      const patchRes = await fetch('/api/checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
        },
        body: JSON.stringify(updatePayload),
      });

      if (!patchRes.ok) throw new Error('API Sync Failed');

      showToast('🎉 行李打包清單已成功匯入「旅途工具盒 ➔ 行李清單」！', 'success');
    } catch (err) {
      console.error(err);
      showToast('匯入行李清單失敗，請稍後再試。', 'warning');
    } finally {
      setIsSyncing((prev) => ({ ...prev, [messageId]: false }));
    }
  };

  const handleAddActivityToFavorite = async (title: string, category: string) => {
    if (!activeTripId) {
      showToast('請建立或選擇一個行程，才能收藏熱門活動喔！', 'warning');
      return;
    }
    try {
      const emoji = getCategoryEmoji(category);
      const res = await addFavorite(activeTripId, title, emoji);
      if (res?.error) {
        showToast(res.error, 'warning');
      } else {
        showToast(`🎉 已成功收藏「${title}」至您的儲存景點！`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('收藏失敗，請稍後再試。', 'warning');
    }
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
            transition={prefersReducedMotion ? { duration: 0.16 } : SPRING_BOUNCY}
            onClick={() => setIsOpen(true)}
            className={`fixed bottom-[96px] right-5 z-40 flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full border border-white/20 bg-gradient-to-tr from-sky-500 via-fuchsia-500 to-orange-400 shadow-[0_12px_28px_rgba(14,165,233,0.32)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-fuchsia-400/60 sm:right-6 sm:h-14 sm:w-14 ${subtlePressableClass}`}
            aria-label="開啟 Jelly AI 行程顧問"
            id="jelly-ai-assistant-btn"
          >
            <div className="absolute inset-[1px] rounded-full bg-gradient-to-br from-white/22 to-transparent opacity-80 animate-pulse" />
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
            className="fixed inset-0 bg-slate-900/32 backdrop-blur-[6px] z-sheet"
            id="jelly-ai-backdrop"
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
            className="fixed bottom-0 left-0 right-0 z-sheet-above mx-auto flex h-[82dvh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[30px] border-t border-white/52 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,250,251,0.88),rgba(241,248,255,0.85))] shadow-[0_-12px_44px_rgba(15,23,42,0.18)] overscroll-contain dark:border-white/10 dark:bg-black/62 sm:rounded-t-[34px]"
            style={{ backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)' }}
            id="jelly-ai-sheet"
          >
            <div className="flex justify-center pt-2 pb-1 bg-white/36 dark:bg-black/24">
              <div className="h-1.5 w-10 rounded-full bg-slate-300/80 dark:bg-white/15" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white/52 px-5 py-4 dark:border-white/5 dark:bg-black/40">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-orange-400 text-xl shadow-inner animate-bounce" style={{ animationDuration: '3s' }}>
                  {assistantAvatar}
                </div>
                <div>
                  <h3 className="text-[16px] font-black tracking-[-0.03em] text-slate-800 dark:text-white">Jelly AI 果凍顧問</h3>
                  <p className="fluid-kicker text-sky-600 dark:text-sky-400 flex items-center gap-1.5 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-ping" />
                    旅行管家在線
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="關閉 AI 顧問"
                id="jelly-ai-close-btn"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100/50 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 scrollbar-hide">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'ai' && (
                    <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-orange-400 text-[14px] shadow-sm">
                      {assistantAvatar}
                    </div>
                  )}
                  <div className={`max-w-[85%] flex flex-col gap-2 ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-[22px] px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.03)] ${
                      message.role === 'user'
                        ? 'rounded-tr-sm bg-gradient-to-br from-sky-500 to-orange-400 text-white shadow-[0_8px_20px_rgba(14,165,233,0.18)]'
                        : 'rounded-tl-sm border border-white/60 bg-white/94 text-slate-800 dark:border-white/5 dark:bg-white/10 dark:text-white'
                    }`}>
                      <p className="text-[14px] font-semibold leading-[1.62] tracking-normal whitespace-pre-wrap">{message.text}</p>
                    </div>

                    {/* STRUCTURED RENDERER – flights */}
                    {message.suggestedType === 'flights' && message.flights && message.flights.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2 w-full flex flex-col gap-2.5 rounded-[22px] border border-sky-100 bg-sky-50/45 p-3.5 shadow-sm"
                      >
                        <div className="flex items-center gap-1.5 text-sky-800 text-[10px] font-black uppercase tracking-[0.18em]">
                          <Plane size={13} className="text-sky-500 animate-pulse" />
                          <span>AI 最低航班速報</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {message.flights.map((f, i) => (
                            <div key={i} className="flex flex-col gap-1 rounded-[16px] border border-white bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.01)] hover:border-sky-300 transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-[12.5px] text-slate-800">{f.provider}</span>
                                <span className="font-mono text-[13px] font-black text-sky-600">NT$ {f.price.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center justify-between text-slate-500 text-[11.5px] font-medium mt-0.5">
                                <span className="font-mono">{f.time}</span>
                                <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full text-[9px] font-bold">
                                  {f.from} ➔ {f.to} ({f.stops === 0 ? '直飛' : `${f.stops} 轉乘`})
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* STRUCTURED RENDERER – packing list */}
                    {message.suggestedType === 'packing-list' && message.packingList && message.packingList.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2 w-full flex flex-col gap-3 rounded-[22px] border border-orange-100 bg-orange-50/45 p-3.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-orange-900 text-[10px] font-black uppercase tracking-[0.18em]">
                            <Luggage size={13} className="text-orange-500" />
                            <span>AI 打包行李推薦清單</span>
                          </div>
                          <span className="text-[10px] bg-orange-100 text-orange-850 font-black px-2 py-0.5 rounded-full">
                            {message.packingList.length} 項
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {message.packingList.map((item, i) => (
                            <div key={i} className="flex items-center gap-2 rounded-[14px] bg-white border border-transparent hover:border-orange-200 px-3 py-2 shadow-[0_2px_6px_rgba(0,0,0,0.01)]">
                              <div className="h-4.5 w-4.5 rounded-full border border-orange-200 flex items-center justify-center text-[10px] text-orange-600 font-extrabold bg-orange-50/30">
                                {i + 1}
                              </div>
                              <span className="text-[12.5px] font-semibold text-slate-700">{item}</span>
                            </div>
                          ))}
                        </div>
                        {activeTripId ? (
                          <button
                            onClick={() => handleImportPackingList(message.packingList || [], message.id)}
                            disabled={isSyncing[message.id]}
                            className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-orange-600 hover:bg-orange-700 active:scale-[0.98] py-2.5 text-[12.5px] font-black text-white shadow-md shadow-orange-600/14 transition-all disabled:opacity-50"
                          >
                            {isSyncing[message.id] ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <PlusCircle size={15} />
                            )}
                            一鍵導入旅途行李箱
                          </button>
                        ) : (
                          <p className="text-[11px] font-medium text-slate-450 text-center leading-tight">
                            （進入旅程行程頁後，即可一鍵匯入為打勾清單項目）
                          </p>
                        )}
                      </motion.div>
                    )}

                    {/* STRUCTURED RENDERER – activities */}
                    {message.suggestedType === 'activities' && message.activities && message.activities.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2 w-full flex flex-col gap-3 rounded-[22px] border border-purple-100 bg-purple-50/45 p-3.5 shadow-sm"
                      >
                        <div className="flex items-center gap-1.5 text-purple-900 text-[10px] font-black uppercase tracking-[0.18em]">
                          <Sparkles size={13} className="text-purple-500 animate-pulse" />
                          <span>AI 文青散步特輯景點</span>
                        </div>
                        <div className="flex flex-col gap-2.5">
                          {message.activities.map((act, i) => (
                            <div key={i} className="flex flex-col gap-1.5 rounded-[16px] border border-white bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.01)]">
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-[12.5px] text-slate-800 flex items-center gap-1">
                                  <span>{getCategoryEmoji(act.category || 'landmark')}</span>
                                  <span>{act.title}</span>
                                </span>
                                {act.time && (
                                  <span className="font-mono text-[9px] font-extrabold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-0.5 rounded">
                                    {act.time}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11.5px] text-slate-500 font-medium leading-[1.58]">{act.description}</p>
                              {activeTripId && (
                                <div className="flex justify-end pt-1">
                                  <button
                                    onClick={() => handleAddActivityToFavorite(act.title, act.category || 'landmark')}
                                    className="flex items-center gap-1 rounded-full bg-purple-100 hover:bg-purple-200 active:scale-[0.95] px-2.5 py-1 text-[10px] font-black text-purple-700 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.01)]"
                                  >
                                    ❤ 收藏到此行程景點
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="mr-2 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-orange-400 text-[14px] shadow-sm animate-spin">
                    {assistantAvatar}
                  </div>
                  <div className="flex items-center rounded-[20px] rounded-tl-sm border border-white/50 bg-white/90 px-4 py-3 text-slate-800 shadow-sm dark:border-white/5 dark:bg-white/10 dark:text-white">
                    <div className="flex gap-1.5 py-1">
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Default Smart Suggestion Quick Actions */}
            {messages.length === 1 && !isTyping && (
              <div className="flex gap-2 overflow-x-auto px-4 pb-3.5 scrollbar-hide">
                <button
                  onClick={() => handleSend('台北下雨天推薦去哪裡晃晃？有什麼室內活動嗎？')}
                  className="fluid-caption whitespace-nowrap rounded-full border border-purple-200 bg-purple-50 hover:bg-purple-100 px-4 py-2 font-black text-purple-700 transition-transform active:scale-[0.97]"
                >
                  🌧️ 台北雨天行程活動
                </button>
                <button
                  onClick={() => handleSend('幫我找出發去東京的直飛航班與機票比價')}
                  className="fluid-caption whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 hover:bg-sky-100 px-4 py-2 font-black text-sky-700 transition-transform active:scale-[0.97]"
                >
                  ✈️ 東京機票比價推薦
                </button>
                <button
                  onClick={() => handleSend('打包行李箱該帶什麼？幫我推薦打包清單')}
                  className="fluid-caption whitespace-nowrap rounded-full border border-orange-200 bg-orange-50 hover:bg-orange-100 px-4 py-2 font-black text-orange-700 transition-transform active:scale-[0.97]"
                >
                  💼 極簡必備行李打包
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="border-t border-slate-100 bg-white/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] dark:border-white/5 dark:bg-black/40">
              <div className="flex items-center rounded-full border border-slate-200 bg-white p-1.5 pr-2 shadow-sm focus-within:ring-2 focus-within:ring-fuchsia-400/32 focus-within:border-fuchsia-300 transition-all">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSend();
                  }}
                  placeholder="輸入疑問（例如：機票比價、行李帶什麼、台北下雨...）"
                  className="text-[13.5px] font-semibold flex-1 rounded-full border-none bg-transparent px-4 outline-none placeholder:text-slate-402 focus:ring-0 dark:text-white"
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
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-sky-500 to-orange-400 text-white transition-all active:scale-[0.94] disabled:bg-slate-300 disabled:opacity-30"
                >
                  <Send size={16} className="ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
