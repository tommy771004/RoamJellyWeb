import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { MapContainer, Marker, Polyline, ScaleControl, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import GlassCard from './GlassCard';
import type { ItineraryNode } from '../types/workflow';

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

    let validItems = items.filter((node) => node.lat && node.lng);
    if (validItems.length === 0 && allItems && allItems.length > 0) {
      validItems = allItems.filter((node) => node.lat && node.lng);
    }

    if (validItems.length > 0) {
      const bounds = L.latLngBounds(validItems.map((node) => [node.lat!, node.lng!]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [selectedLat, selectedLng, items, allItems, map]);

  return null;
}

function CustomMarker({
  item,
  isSelected,
  onClick,
}: {
  item: ItineraryNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const iconHtml = `
    <div class="relative flex flex-col items-center">
      <div class="bg-white rounded-2xl px-2.5 py-1.5 border-2 ${isSelected ? 'border-pink-500 scale-110 shadow-lg shadow-pink-100' : 'border-white shadow-md'} flex items-center justify-center transition-all cursor-pointer group hover:scale-110">
        <span class="text-xl leading-none group-hover:scale-110 transition-transform">${item.emoji}</span>
      </div>
      <div class="w-3 h-3 -mt-2 border-r-2 border-b-2 rotate-45 ${isSelected ? 'bg-pink-500 border-pink-500' : 'bg-white border-white'}"></div>
      <div class="mt-1 px-2.5 py-1 rounded-full ${isSelected ? 'bg-pink-600 text-white shadow-md' : 'bg-slate-800/90 text-white/90'} transition-all"><span class="text-[10px] font-bold whitespace-nowrap block max-w-[120px] truncate">${item.title}</span></div>
    </div>
  `;

  const customIcon = L.divIcon({
    html: iconHtml,
    className: 'bg-transparent border-none',
    iconSize: [120, 80],
    iconAnchor: [60, 60],
    popupAnchor: [0, -60],
  });

  return (
    <Marker
      position={[item.lat!, item.lng!]}
      icon={customIcon}
      eventHandlers={{ click: onClick }}
      zIndexOffset={isSelected ? 1000 : 0}
    />
  );
}

export default function ItineraryMapView({
  items,
  allNodes,
}: {
  items: ItineraryNode[];
  allNodes?: ItineraryNode[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = items.find((node) => node.node_id === selectedId) ?? null;
  const validItems = items.filter((node) => node.lat && node.lng);

  let defaultCenter: [number, number] = [35.6762, 139.6503];
  if (validItems.length > 0) defaultCenter = [validItems[0].lat!, validItems[0].lng!];
  else if (allNodes) {
    const allValid = allNodes.filter((node) => node.lat && node.lng);
    if (allValid.length > 0) defaultCenter = [allValid[0].lat!, allValid[0].lng!];
  }

  return (
    <div className="flex flex-col gap-3">
      <GlassCard className="h-[55vh] relative overflow-hidden !p-0 border-4 border-white/40 rounded-[2.5rem]">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={true}
          className="w-full h-full z-10"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">Carto</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MapUpdater
            selectedLat={selectedNode?.lat}
            selectedLng={selectedNode?.lng}
            items={validItems}
            allItems={allNodes}
          />
          {validItems.length > 1 && (
            <Polyline
              positions={validItems.map((item) => [item.lat!, item.lng!])}
              pathOptions={{
                color: '#ec4899',
                weight: 4,
                dashArray: '1, 10',
                lineCap: 'round',
                opacity: 0.6,
              }}
            />
          )}
          {validItems.map((item) => (
            <CustomMarker
              key={item.node_id}
              item={item}
              isSelected={item.node_id === selectedId}
              onClick={() => setSelectedId(item.node_id === selectedId ? null : item.node_id)}
            />
          ))}
          <ScaleControl position="bottomright" />
        </MapContainer>

        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-[1000]">
            <span className="text-slate-400 font-semibold bg-white px-6 py-3 rounded-full shadow-sm">目前沒有行程顯示在地圖上</span>
          </div>
        )}
      </GlassCard>

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
                  {selectedNode.time && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">{selectedNode.time}</span>}
                  {selectedNode.category && <span className="text-[10px] font-bold text-fuchsia-500 bg-fuchsia-50/80 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 border border-fuchsia-100/50">{selectedNode.category}</span>}
                </div>
                {selectedNode.description && <p className="text-[12px] text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">{selectedNode.description}</p>}
              </div>
              <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors shrink-0 outline-none">
                <X size={14} strokeWidth={3} />
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}