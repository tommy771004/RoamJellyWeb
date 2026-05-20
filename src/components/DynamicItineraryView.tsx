import { SPRING_SMOOTH, SPRING_SNAPPY, SPRING_BOUNCY } from '../lib/motionTokens';
import React, { lazy, Suspense, useMemo, useState } from 'react';
import { ArrowLeft, Clock, MapPin, Leaf, Flame, Navigation2, AlertTriangle, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import GlassCard from './GlassCard';
import ExpandableText from './ExpandableText';
import type { ItineraryNode } from '../types/workflow';
import { getNativeMapUrl, getFallbackSearchUrl } from '../lib/workflowApi';

function CollapsibleAiNote({ text, label }: { text: string; label: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div layout className="overflow-hidden">
      <AnimatePresence mode="popLayout">
        {!isExpanded ? (
          <motion.button 
            key="collapsed"
            layout
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            type="button"
            onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
            className="mt-3 flex items-center gap-1.5 px-3 py-1.5 w-fit rounded-full bg-white/60 text-slate-500 text-[11px] font-black tracking-widest uppercase hover:bg-white/80 transition-colors border border-white/40"
          >
            <Lightbulb size={12} className="opacity-70" />
            <span className="translate-y-px">展開 {label}</span>
            <ChevronDown size={12} className="opacity-70" />
          </motion.button>
        ) : (
          <motion.div 
            key="expanded"
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SPRING_SMOOTH}
            className="bg-white/50 backdrop-blur-sm text-sm text-slate-700 p-3 rounded-2xl border border-white/40 mt-3 shadow-inner"
          >
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                <Lightbulb size={10} className="opacity-70" /> {label}
              </p>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }}
                className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 px-2 py-1 -mr-2 bg-white/50 hover:bg-white/80 rounded-[10px] transition-colors"
              >
                收起 <ChevronUp size={10} className="inline opacity-70 mb-[1px]" />
              </button>
            </div>
            <p className="text-[13px] sm:text-[14px] font-medium text-slate-700 tracking-tight leading-[1.6] font-sans whitespace-pre-line text-pretty mt-1.5">
              {text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

const ItineraryMapView = lazy(() => import('./ItineraryMapView'));

export default function DynamicItineraryView({ 
  result, 
  onBack,
  onSave
}: { 
  result: any; 
  onBack: () => void;
  onSave?: (result: any) => void;
}) {
  const aiResponse = result?.fullResponse;
  
  const isIOS = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);
  
  // Extracting UI configurations or fallback
  const uiConfig = aiResponse?.ui_config || {};
  const uiState = aiResponse?.ui_state || {};
  const gradient = uiState.theme_gradient || uiConfig.bg_gradient || 'from-fuchsia-100 to-indigo-100';
  const isLargeFont = uiConfig.font_scale === 'large';
  const textScaleClass = isLargeFont ? 'text-lg' : 'text-base';
  const titleClass = isLargeFont ? 'text-5xl' : 'text-4xl';
  
  const summary = aiResponse?.summary || {};
  const itinerary = Array.isArray(aiResponse) ? [{ day: 1, spots: aiResponse }] : (aiResponse?.itinerary || []);

  // Group rawSuggestions (geocoded + enriched nodes) by day for image/map lookup
  const rawByDay = useMemo(() => {
    const map: Record<number, ItineraryNode[]> = {};
    (result?.rawSuggestions || []).forEach((node: ItineraryNode) => {
      const d = node.day || 1;
      if (!map[d]) map[d] = [];
      map[d].push(node);
    });
    return map;
  }, [result?.rawSuggestions]);

  const geoNodesByDay = useMemo(() => {
    const map: Record<number, ItineraryNode[]> = {};
    Object.entries(rawByDay).forEach(([day, nodes]) => {
      map[Number(day)] = (nodes as ItineraryNode[])
        .filter(n => n.lat != null && n.lng != null)
        .map(n => ({ ...n, lat: Number(n.lat), lng: Number(n.lng) }));
    });
    return map;
  }, [rawByDay]);

  // All nodes with valid coordinates for a top-level overview map
  const allGeoNodes: ItineraryNode[] = useMemo(
    () => (result?.rawSuggestions || []).filter((n: ItineraryNode) => n.lat != null && n.lng != null).map((n: ItineraryNode) => ({ ...n, lat: Number(n.lat), lng: Number(n.lng) })),
    [result?.rawSuggestions],
  );

  return (
    <div className={`flex-1 w-full h-full flex flex-col relative overflow-y-auto bg-gradient-to-br ${gradient} transition-colors duration-1000`}>
      {/* Background patterns */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)',
        backgroundSize: '24px 24px'
      }} />

      <div className="relative z-10 px-4 sm:px-6 pt-6 sm:pt-16 pb-tab-safe">
        <button
          onClick={onBack}
          className="w-11 h-11 rounded-full bg-white/40 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm text-slate-800 hover:bg-white/80 active:scale-[0.97] transition-all duration-200 mb-4 sm:mb-6"
        >
          <ArrowLeft size={20} />
        </button>

        <h1 className={`${titleClass} font-black text-slate-900 mb-2 drop-shadow-sm font-serif leading-tight tracking-tight`}>
          {summary.title || result?.title || '為您專屬規劃'}
        </h1>
        
        {/* Smart Tags */}
        {summary.smart_tags && summary.smart_tags.length > 0 && (
          <div className="flex gap-2 overflow-x-auto whitespace-nowrap py-2 mb-6 scrollbar-hide">
            {summary.smart_tags.map((tag: string, i: number) => (
              <span key={i} className="px-4 py-1.5 rounded-full bg-white/60 border border-white/80 shadow-sm text-slate-700 font-medium text-sm backdrop-blur-sm">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-6 mt-4">
          {itinerary.map((dayData: any, i: number) => {
            const dayNum: number = dayData.day || i + 1;
            const dayRawNodes: ItineraryNode[] = rawByDay[dayNum] || [];
            const dayGeoNodes = geoNodesByDay[dayNum] || [];

            return (
              <div key={i} className="bg-[linear-gradient(135deg,rgba(255,255,255,0.7),rgba(255,250,251,0.6))] backdrop-blur-xl border-2 border-white/80 shadow-[0_16px_40px_rgba(244,114,182,0.1),inset_0_2px_10px_rgba(255,255,255,1)] hover:shadow-[0_20px_50px_rgba(244,114,182,0.15)] rounded-[48px] p-6 sm:p-8 transition-shadow duration-500 transform-gpu">
                <h3 className="text-xl font-bold text-slate-800 mb-4 bg-white/60 w-fit px-5 py-2 rounded-full shadow-sm text-center whitespace-nowrap">
                  第 {dayData.day} 天
                </h3>

                {/* Per-day mini route map */}
                {dayGeoNodes.length >= 2 && (
                  <div className="mb-5 rounded-[2.5rem] overflow-hidden border-[6px] border-white/60 shadow-md relative h-[200px] sm:h-[300px]">
                    <Suspense fallback={<div className="h-full bg-white/40 flex items-center justify-center text-slate-500 text-xs">載入地圖中...</div>}>
                      <ItineraryMapView items={dayGeoNodes} />
                    </Suspense>
                  </div>
                )}
              
                <div className="pl-4 border-l-2 border-slate-300 dark:border-slate-700 flex flex-col gap-6">
                  {(dayData.spots || []).map((spot: any, j: number) => {
                    const rawNode: ItineraryNode | undefined = dayRawNodes[j];
                    const imageUrl: string | undefined = rawNode?.image_url;
                    const hasCoords = rawNode?.lat != null && rawNode?.lng != null;
                    const mapsUrl = hasCoords
                      ? getNativeMapUrl(Number(rawNode.lat), Number(rawNode.lng), spot.name, isIOS)
                      : getFallbackSearchUrl(spot.name, summary.destination || result?.title || '', isIOS);

                    return (
                      <div key={j} className="relative pl-6 pb-2">
                        {/* Timeline Node */}
                        <div className="absolute left-[-21px] top-1.5 w-10 h-10 -ml-5 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center text-lg z-10">
                          {spot.emoji || '📍'}
                        </div>
                        
                        {/* Spot image */}
                        {imageUrl && (
                          <div className="mb-3 rounded-2xl overflow-hidden h-32 w-full">
                            <img
                              src={imageUrl}
                              alt={spot.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                        )}

                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-bold text-slate-800 text-xl tracking-tight leading-snug`}>{spot.name}</h4>
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] font-bold text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-100 px-2.5 py-0.5 rounded-full hover:bg-fuchsia-100 hover:scale-105 active:scale-95 transition-all duration-200 shrink-0"
                                title={hasCoords ? "在 native map 查看" : "在地圖中搜尋"}
                              >
                                <MapPin size={10} />
                                {hasCoords ? "地圖" : "搜尋"}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {spot.time && (
                                <p className={`text-slate-600 font-medium ${textScaleClass} flex items-center gap-1`}>
                                  <Clock size={12} className="text-slate-500" />{spot.time}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Intensity Indicator */}
                          {spot.intensity && (
                            <div className="flex-shrink-0 ml-2">
                              {spot.intensity === 'chill' && <span title="輕鬆" className="text-emerald-500 bg-emerald-50 w-8 h-8 rounded-full flex items-center justify-center"><Leaf size={16}/></span>}
                              {spot.intensity === 'hardcore' && <span title="耗費體力" className="text-rose-500 bg-rose-50 w-8 h-8 rounded-full flex items-center justify-center"><Flame size={16}/></span>}
                            </div>
                          )}
                        </div>
                        
                        {/* AI Note */}
                        {spot.ai_note && (
                          <CollapsibleAiNote text={spot.ai_note} label="TIPS" />
                        )}

                        {/* Transport to next */}
                        {spot.transport_to_next && j !== (dayData.spots?.length || 0) - 1 ? (() => {
                          let minutes = 0;
                          const hrMatch = spot.transport_to_next.match(/(\d+)\s*(h|hr|小時|時)/i);
                          if (hrMatch) minutes += parseInt(hrMatch[1], 10) * 60;
                          const minMatch = spot.transport_to_next.match(/(\d+)\s*(m|min|分鐘|分)/i);
                          if (minMatch) minutes += parseInt(minMatch[1], 10);
                          const isLong = minutes > 90;
                          
                          return (
                            <div className={`mt-4 mb-2 flex items-center gap-2 text-xs font-bold w-fit px-3 py-2 rounded-xl border ${isLong ? 'bg-red-50 text-red-700 border-red-100 flex-wrap' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                              <Navigation2 size={14} className={isLong ? "text-red-500 animate-pulse" : "text-slate-500"} /> 
                              <span>{spot.transport_to_next}</span>
                              {isLong && (
                                <div className="flex items-center gap-1.5 ml-1 text-red-600 bg-white/60 px-2 py-0.5 rounded-md">
                                  <AlertTriangle size={12} />
                                  <span className="text-[11px] uppercase tracking-wider">車程較長</span>
                                </div>
                              )}
                            </div>
                          );
                        })() : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {onSave && (
          <button 
            onClick={() => onSave(result)}
            className="group w-full mt-10 py-5 sm:py-6 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white font-black text-lg sm:text-xl shadow-[0_16px_32px_rgba(236,72,153,0.3),inset_0_2px_4px_rgba(255,255,255,0.4)] hover:shadow-[0_20px_40px_rgba(236,72,153,0.4),inset_0_2px_4px_rgba(255,255,255,0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.97] flex items-center justify-center gap-3">
            <span className="group-hover:animate-cute-bounce">💾</span>
            <span className="drop-shadow-sm">儲存這份心動行程</span>
          </button>
        )}
      </div>
    </div>
  );
}
