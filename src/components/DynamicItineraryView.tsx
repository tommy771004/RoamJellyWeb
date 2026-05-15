import React, { lazy, Suspense, useMemo } from 'react';
import { ArrowLeft, Clock, MapPin, Leaf, Flame, Navigation2 } from 'lucide-react';
import GlassCard from './GlassCard';
import type { ItineraryNode } from '../types/workflow';

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
  
  // Extracting UI configurations or fallback
  const uiConfig = aiResponse?.ui_config || {};
  const gradient = uiConfig.bg_gradient || 'from-fuchsia-100 to-indigo-100';
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
          className="w-11 h-11 rounded-full bg-white/40 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-sm text-slate-800 hover:bg-white/80 active:scale-[0.98] transition-all duration-200 mb-4 sm:mb-6"
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

        {/* Overview route map — shows all geocoded nodes */}
        {allGeoNodes.length >= 2 && (
          <div className="mb-6 rounded-[2.5rem] overflow-hidden shadow-xl border-[6px] border-white/60 relative h-[260px] sm:h-[360px]">
            <Suspense fallback={<div className="h-full bg-white/40 flex items-center justify-center text-slate-400 text-sm">載入地圖中...</div>}>
              <ItineraryMapView items={allGeoNodes} />
            </Suspense>
          </div>
        )}

        <div className="flex flex-col gap-6 mt-4">
          {itinerary.map((dayData: any, i: number) => {
            const dayNum: number = dayData.day || i + 1;
            const dayRawNodes: ItineraryNode[] = rawByDay[dayNum] || [];
            const dayGeoNodes = dayRawNodes.filter(n => n.lat != null && n.lng != null).map((n: ItineraryNode) => ({ ...n, lat: Number(n.lat), lng: Number(n.lng) }));

            return (
              <div key={i} className="bg-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] rounded-3xl p-6">
                <h3 className="text-xl font-bold text-slate-800 mb-4 bg-white/60 w-fit px-5 py-2 rounded-full shadow-sm text-center">
                  第 {dayData.day} 天
                </h3>

                {/* Per-day mini route map */}
                {dayGeoNodes.length >= 2 && (
                  <div className="mb-5 rounded-[2.5rem] overflow-hidden border-[6px] border-white/60 shadow-md relative h-[200px] sm:h-[300px]">
                    <Suspense fallback={<div className="h-full bg-white/40 flex items-center justify-center text-slate-400 text-xs">載入地圖中...</div>}>
                      <ItineraryMapView items={dayGeoNodes} />
                    </Suspense>
                  </div>
                )}
              
                <div className="pl-4 border-l-2 border-slate-300 dark:border-slate-700 flex flex-col gap-6">
                  {(dayData.spots || []).map((spot: any, j: number) => {
                    const rawNode: ItineraryNode | undefined = dayRawNodes[j];
                    const imageUrl: string | undefined = rawNode?.image_url;
                    const hasCoords = rawNode?.lat && rawNode?.lng;
                    const mapsUrl = hasCoords
                      ? `https://www.google.com/maps/search/?api=1&query=${rawNode.lat},${rawNode.lng}`
                      : undefined;

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
                              {mapsUrl && (
                                <a
                                  href={mapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[11px] font-bold text-fuchsia-600 bg-fuchsia-50 border border-fuchsia-100 px-2 py-0.5 rounded-full hover:bg-fuchsia-100 transition-colors shrink-0"
                                  title="在 Google Maps 查看"
                                >
                                  <MapPin size={10} />
                                  地圖
                                </a>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {spot.time && (
                                <p className={`text-slate-600 font-medium ${textScaleClass} flex items-center gap-1`}>
                                  <Clock size={12} className="text-slate-400" />{spot.time}
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
                          <div className="bg-white/50 backdrop-blur-sm text-sm text-slate-700 p-3 rounded-2xl border border-white/40 mt-3 shadow-inner">
                            <span className="font-semibold opacity-60 mr-1">TIPS /</span> {spot.ai_note}
                          </div>
                        )}

                        {/* Transport to next */}
                        {spot.transport_to_next && j !== (dayData.spots?.length || 0) - 1 && (
                          <div className="mt-4 mb-2 flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 w-fit px-3 py-1.5 rounded-lg border border-slate-100">
                            <Navigation2 size={12} className="text-slate-400" /> {spot.transport_to_next}
                          </div>
                        )}
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
            className="w-full mt-10 py-5 rounded-full bg-slate-900 border border-white/20 text-white font-bold text-lg shadow-xl hover:bg-slate-800 transition-transform duration-200 active:scale-[0.98] flex items-center justify-center gap-2">
            <span>💾 儲存此行程</span>
          </button>
        )}
      </div>
    </div>
  );
}
