import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Check, X } from 'lucide-react';

const selectIcon = L.divIcon({
  html: `
    <div style="background-color: #ec4899; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); display: flex; align-items: center; justify-content: center;">
      <div style="width: 8px; height: 8px; background-color: white; border-radius: 50%;"></div>
    </div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export interface MapSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export default function MapSelectorModal({ isOpen, onClose, onSelect, initialLat = 25.0330, initialLng = 121.5654 }: MapSelectorModalProps) {
  const [selectedPos, setSelectedPos] = useState<{lat: number, lng: number} | null>(
    (initialLat && initialLng) ? { lat: initialLat, lng: initialLng } : null
  );

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" 
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          className="relative w-full max-w-2xl h-[70vh] bg-white rounded-[40px] shadow-2xl z-[310] flex flex-col overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400 z-10" />
          
          <div className="flex items-center justify-between p-6 pb-4 shrink-0 shadow-sm z-10 bg-white">
            <div className="flex flex-col">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">在地圖選取地點</h3>
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 mt-1">
                點擊地圖標記地標，再按下確認
              </p>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X size={20}/>
            </button>
          </div>

          <div className="flex-1 w-full bg-slate-100 relative">
            <MapContainer 
              center={[selectedPos?.lat || initialLat, selectedPos?.lng || initialLng]} 
              zoom={13} 
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              attributionControl={false}
              zoomControl={false}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
              <MapClickHandler onLocationSelect={(lat, lng) => setSelectedPos({ lat, lng })} />
              {selectedPos && (
                <Marker position={[selectedPos.lat, selectedPos.lng]} icon={selectIcon} />
              )}
            </MapContainer>
          </div>

          <div className="p-6 shrink-0 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-10">
            <button
              onClick={() => {
                if (selectedPos) {
                  onSelect(selectedPos.lat, selectedPos.lng);
                  onClose();
                }
              }}
              disabled={!selectedPos}
              className="w-full h-14 rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-black text-[15px] uppercase tracking-widest shadow-lg shadow-fuchsia-200/60 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Check size={20} className="shrink-0" />
              <span>確認選取座標</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
