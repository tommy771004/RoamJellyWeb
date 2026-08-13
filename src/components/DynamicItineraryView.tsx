import { useMemo } from 'react';
import { ArrowLeft, ArrowUpRight, Clock, MapPin, Navigation2 } from 'lucide-react';
import type { ItineraryNode } from '../types/workflow';
import { useTranslation } from 'react-i18next';

type DynamicItineraryViewProps = {
  result: any;
  onBack: () => void;
  onSave?: (result: any) => void;
};

function getIntensityLabel(intensity: unknown, t: (key: string) => string) {
  if (intensity === 'chill') return t('str_11ee91');
  if (intensity === 'hardcore') return t('str_3c5d50cb');
  return '';
}

export default function DynamicItineraryView({
  result,
  onBack,
  onSave,
}: DynamicItineraryViewProps) {
  const { t } = useTranslation();
  const aiResponse = result?.fullResponse;
  const summary = aiResponse?.summary || {};
  const itinerary = Array.isArray(aiResponse)
    ? [{ day: 1, spots: aiResponse }]
    : aiResponse?.itinerary || [];

  const rawByDay = useMemo(() => {
    const grouped: Record<number, ItineraryNode[]> = {};
    (result?.rawSuggestions || []).forEach((node: ItineraryNode) => {
      const day = Number(node.day || 1);
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(node);
    });
    return grouped;
  }, [result?.rawSuggestions]);

  return (
    <main className="h-full w-full overflow-y-auto bg-[#eef2ed] text-[#26342d] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-6 sm:px-8 sm:pb-20 sm:pt-12">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('str_11c18a')}
          className="mb-5 flex h-11 w-11 items-center justify-center text-[#526159] transition-colors hover:text-[#9a452e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
        >
          <ArrowLeft size={23} />
        </button>

        <header className="mb-8 grid gap-5 sm:mb-10 lg:grid-cols-[1fr_18rem] lg:items-end">
          <div>
            <p className="mb-2 text-sm font-bold text-[#8a4935]">
              {t('ai_result.draft_label', 'AI 行程草稿')}
            </p>
            <h1 className="max-w-3xl text-balance font-heading text-[34px] font-black leading-[1.08] tracking-[-0.035em] text-[#26342d] sm:text-[52px]">
              {summary.title || result?.title || t('itinerary_planning')}
            </h1>
          </div>
          {Array.isArray(summary.smart_tags) && summary.smart_tags.length > 0 && (
            <p className="text-sm font-semibold leading-6 text-[#5b675f] lg:text-right">
              {summary.smart_tags.join(' · ')}
            </p>
          )}
        </header>

        <div className="space-y-5">
          {itinerary.map((dayData: any, dayIndex: number) => {
            const dayNumber = Number(dayData.day || dayIndex + 1);
            const rawNodes = rawByDay[dayNumber] || [];
            const spots = Array.isArray(dayData.spots) ? dayData.spots : [];

            return (
              <article
                key={dayNumber}
                className="grid bg-white/85 [clip-path:polygon(18px_0,100%_0,100%_calc(100%_-_18px),calc(100%_-_18px)_100%,0_100%,0_18px)] sm:grid-cols-[10rem_1fr]"
              >
                <header className="bg-[#26342d] px-6 py-6 text-white sm:px-7 sm:py-8">
                  <span className="block text-xs font-bold text-[#bdc9c1]">DAY</span>
                  <h2 className="mt-1 text-[44px] font-black leading-none tabular-nums">{String(dayNumber).padStart(2, '0')}</h2>
                  <p className="mt-3 text-xs font-semibold leading-5 text-[#dce4de]">
                    {t('ai_result.stop_count', '{{count}} 個停留點', { count: spots.length })}
                  </p>
                </header>

                <ol className="px-6 py-2 sm:px-8 sm:py-3">
                  {spots.map((spot: any, spotIndex: number) => {
                    const rawNode = rawNodes[spotIndex];
                    const imageUrl = rawNode?.image_url;
                    const lat = rawNode?.lat ?? spot.lat;
                    const lng = rawNode?.lng ?? spot.lng;
                    const hasCoordinates = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
                    const mapsUrl = hasCoordinates
                      ? `https://www.google.com/maps/search/?api=1&query=${Number(lat)},${Number(lng)}`
                      : undefined;
                    const intensityLabel = getIntensityLabel(spot.intensity, t);
                    const isLast = spotIndex === spots.length - 1;

                    return (
                      <li key={`${dayNumber}-${spotIndex}`} className={`grid gap-4 py-6 sm:grid-cols-[5.5rem_1fr] sm:gap-6 ${isLast ? '' : 'border-b border-[#dde4de]'}`}>
                        <div className="flex items-center gap-2 text-sm font-bold text-[#7d4b3b] sm:items-start sm:pt-1">
                          <Clock size={15} aria-hidden="true" />
                          <time>{spot.time || '10:00'}</time>
                        </div>

                        <div className="min-w-0">
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt=""
                              loading="lazy"
                              className="mb-4 h-40 w-full rounded-xl object-cover sm:h-52"
                              onError={(event) => {
                                event.currentTarget.hidden = true;
                              }}
                            />
                          )}
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <h3 className="text-xl font-black leading-7 text-[#26342d] sm:text-2xl">
                              {spot.name || spot.title || t('default_spot')}
                            </h3>
                            {mapsUrl && (
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-bold text-[#8a4935] transition-colors hover:text-[#26342d] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/20"
                              >
                                <MapPin size={16} aria-hidden="true" />
                                {t('str_ae5e6')}
                                <ArrowUpRight size={15} aria-hidden="true" />
                              </a>
                            )}
                          </div>

                          {spot.ai_note && (
                            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[#5b675f] sm:text-base sm:leading-7">
                              {spot.ai_note}
                            </p>
                          )}

                          {(intensityLabel || spot.transport_to_next) && (
                            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#657269]">
                              {intensityLabel && <span>{intensityLabel}</span>}
                              {spot.transport_to_next && !isLast && (
                                <span className="inline-flex items-center gap-2">
                                  <Navigation2 size={14} aria-hidden="true" />
                                  {spot.transport_to_next}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </article>
            );
          })}
        </div>

        {onSave && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="w-full text-sm font-medium leading-6 text-[#5b675f] sm:max-w-[36rem]">
              {t('ai_result.save_hint', '先保存這份草稿，再到行程頁逐站改時間、交通與備註。')}
            </p>
            <button
              type="button"
              onClick={() => onSave(result)}
              className="flex min-h-14 items-center justify-center gap-3 bg-[#9a452e] px-8 text-sm font-bold text-white [clip-path:polygon(0_0,calc(100%_-_14px)_0,100%_14px,100%_100%,14px_100%,0_calc(100%_-_14px))] transition-colors hover:bg-[#7d3826] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a3472b]/25 sm:min-w-[280px]"
            >
              {t('str_63541e5')}
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
