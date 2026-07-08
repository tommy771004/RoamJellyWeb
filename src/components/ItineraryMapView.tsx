import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { MapContainer, Marker, Polyline, ScaleControl, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import GlassCard from './GlassCard';
import type { ItineraryNode } from '../types/workflow';
import { openNativeMap } from '../lib/workflowApi';
import { useTranslation } from "react-i18next";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapUpdater({
  selectedLat,
  selectedLng,
  items,
  allItems,
}: {
  selectedLat?: number;
  selectedLng?: number;
  items: ItineraryNode[];
  allItems?: ItineraryNode[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedLat && selectedLng) {
      map.setView([selectedLat, selectedLng], 15, { animate: true });
      return;
    }

    let validItems = items.filter((node) => node.lat != null && node.lng != null);
    if (validItems.length === 0 && allItems && allItems.length > 0) {
      validItems = allItems.filter((node) => node.lat != null && node.lng != null);
    }

    if (validItems.length > 0) {
      const bounds = L.latLngBounds(validItems.map((node) => [Number(node.lat!), Number(node.lng!)]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [selectedLat, selectedLng, items, allItems, map]);

  return null;
}

function CustomMarker({
  item,
  isSelected,
  onClick,
  seqNum,
  compact,
}: {
  item: ItineraryNode;
  isSelected: boolean;
  onClick: () => void;
  seqNum: number;
  compact?: boolean;
}) {
  const badgeColor = isSelected ? '#ec4899' : '#a855f7';
  const iconHtml = compact
    ? `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center">
      <div style="background:linear-gradient(135deg,#fff0f8 0%,#fef9ff 100%);border-radius:50%;width:34px;height:34px;border:2.5px solid ${badgeColor};display:flex;align-items:center;justify-content:center;font-size:17px;box-shadow:0 4px 12px ${badgeColor}40,0 1px 4px rgba(0,0,0,0.12);position:relative;">
        ${item.emoji}
        <span style="position:absolute;top:-8px;right:-8px;background:${badgeColor};color:white;border-radius:50%;width:17px;height:17px;font-size:9px;font-weight:900;display:flex;align-items:center;justify-content:center;line-height:1;border:1.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);">${seqNum}</span>
      </div>
      <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid ${badgeColor};margin-top:-2px;filter:drop-shadow(0 2px 2px ${badgeColor}40);"></div>
    </div>`
    : `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center">
      <div style="background:${isSelected ? 'linear-gradient(135deg,#fce7f3,#ede9fe)' : 'linear-gradient(135deg,#fff0f8,#fef9ff)'};border-radius:20px;padding:8px 12px;border:2px solid ${isSelected ? '#f472b6' : '#fbcfe8'};display:flex;align-items:center;justify-content:center;box-shadow:${isSelected ? '0 8px 24px #f472b640,0 2px 8px rgba(0,0,0,0.12)' : '0 4px 16px #f9a8d440,0 1px 4px rgba(0,0,0,0.08)'};position:relative;transform:${isSelected ? 'scale(1.12)' : 'scale(1)'};transition:all 0.2s;">
        <span style="font-size:22px;line-height:1;">${item.emoji}</span>
        <span style="position:absolute;top:-10px;right:-10px;background:${badgeColor};color:white;border-radius:9999px;min-width:21px;height:21px;padding:0 4px;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.2);border:2px solid white;">${seqNum}</span>
      </div>
      <div style="width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-top:10px solid ${isSelected ? '#f472b6' : '#fbcfe8'};margin-top:-2px;"></div>
      <div style="margin-top:3px;padding:3px 10px;border-radius:9999px;background:${isSelected ? 'linear-gradient(90deg,#db2777,#9333ea)' : 'linear-gradient(90deg,#fce7f3,#ede9fe)'};border:1px solid ${isSelected ? '#db277780' : '#f9a8d480'};box-shadow:0 2px 8px ${isSelected ? '#db277730' : '#f9a8d430'};"><span style="font-size:10px;font-weight:900;color:${isSelected ? 'white' : '#7c3aed'};white-space:nowrap;display:block;max-width:120px;overflow:hidden;text-overflow:ellipsis;">${item.title}</span></div>
    </div>
  `;

  const size: [number, number] = compact ? [48, 60] : [140, 90];
  const anchor: [number, number] = compact ? [24, 60] : [70, 68];

  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'bg-transparent border-none',
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -60],
  });

  return (
    <Marker
      position={[item.lat!, item.lng!]}
      icon={customIcon}
      eventHandlers={{ 
        click: () => {
          onClick();
          if (item.lat && item.lng) {
             openNativeMap(Number(item.lat), Number(item.lng), item.title);
          }
        }
      }}
      zIndexOffset={isSelected ? 1000 : 0}
    />
  );
}

export default function ItineraryMapView({
  items,
  allNodes,
  compact,
}: {
  items: ItineraryNode[];
  allNodes?: ItineraryNode[];
  compact?: boolean;
}) {
    const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = items.find((node) => node.node_id === selectedId) ?? null;

  // Sort by sort_order then time to ensure correct route order
  const validItems = useMemo(
    () =>
      items
        .filter((node) => node.lat != null && node.lng != null)
        .map(node => ({ ...node, lat: Number(node.lat), lng: Number(node.lng) }))
        .sort((a, b) => {
          const dayA = a.day ?? 999;
          const dayB = b.day ?? 999;
          if (dayA !== dayB) return dayA - dayB;
          
          const orderA = a.sort_order ?? 999;
          const orderB = b.sort_order ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          
          return ((a.time as string) || '00:00').localeCompare((b.time as string) || '00:00');
        }),
    [items],
  );

  let defaultCenter: [number, number] = [35.6762, 139.6503];
  if (validItems.length > 0) defaultCenter = [validItems[0].lat!, validItems[0].lng!];
  else if (allNodes) {
    const allValid = allNodes.filter((node) => node.lat != null && node.lng != null);
    if (allValid.length > 0) defaultCenter = [Number(allValid[0].lat!), Number(allValid[0].lng!)];
  }

  return (
    <div className={compact ? 'w-full h-full' : 'flex flex-col gap-3'}>
      <GlassCard className={`${compact ? 'h-full' : 'h-[55vh]'} relative w-full overflow-hidden !p-0 ${compact ? 'rounded-none border-0' : 'border-4 border-white/40 rounded-[2.5rem]'}`}>
        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full z-10"
          zoomControl={true}
          dragging={true}
          touchZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <MapUpdater
            selectedLat={selectedNode?.lat}
            selectedLng={selectedNode?.lng}
            items={validItems}
            allItems={allNodes}
          />
          {/* Cute kawaii route: soft halo → white core → colorful dashes */}
          {validItems.length > 1 && (
            <>
              <Polyline
                positions={validItems.map((item) => [item.lat!, item.lng!])}
                pathOptions={{
                  color: '#fce7f3',
                  weight: compact ? 10 : 18,
                  opacity: 0.55,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={validItems.map((item) => [item.lat!, item.lng!])}
                pathOptions={{
                  color: 'white',
                  weight: compact ? 4 : 7,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              <Polyline
                positions={validItems.map((item) => [item.lat!, item.lng!])}
                pathOptions={{
                  color: '#ec4899',
                  weight: compact ? 2 : 3,
                  dashArray: compact ? '4, 8' : '6, 12',
                  lineCap: 'round',
                  lineJoin: 'round',
                  opacity: 1,
                }}
              />
            </>
          )}
          {validItems.map((item, idx) => (
            <CustomMarker
              key={item.node_id}
              item={item}
              isSelected={item.node_id === selectedId}
              onClick={() => setSelectedId(item.node_id === selectedId ? null : item.node_id)}
              seqNum={idx + 1}
              compact={compact}
            />
          ))}
          {!compact && <ScaleControl position="bottomright" />}
        </MapContainer>

        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-max">
            <span className="text-slate-500 font-semibold bg-white px-6 py-3 rounded-full shadow-sm">{t('str_77ce6e04')}</span>
          </div>
        )}
      </GlassCard>

      {!compact && (
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <GlassCard className="!p-4 flex items-center gap-4 !rounded-2xl border border-fuchsia-100 bg-white/90 shadow-lg">
                <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-2xl shrink-0 shadow-sm border border-fuchsia-100/50">
                  {selectedNode.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 text-[15px] truncate">{selectedNode.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 max-w-full overflow-x-auto no-scrollbar shrink-0">
                    {selectedNode.time && <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest shrink-0">{selectedNode.time}</span>}
                    {selectedNode.category && <span className="text-[11px] font-bold text-fuchsia-500 bg-fuchsia-50/80 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-fuchsia-100/50">{selectedNode.category}</span>}
                  </div>
                  {selectedNode.description && <p className="text-[12px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{selectedNode.description}</p>}
                </div>
                <button onClick={() => setSelectedId(null)} aria-label={t('str_25ad2fee')} className="flex size-11 items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-200 hover:text-slate-600 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60">
                  <X size={14} strokeWidth={3} />
                </button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}