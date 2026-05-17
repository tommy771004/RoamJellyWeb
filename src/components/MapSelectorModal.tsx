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
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
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
          className="relative w-full max-w-2xl h-[70vh] bg-white rounded-[32px] sm:rounded-[40px] shadow-2xl z-modal-above flex flex-col overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-fuchsia-400 to-indigo-400 z-10" />
          
          <div className="flex items-center justify-between p-5 sm:p-6 pb-4 shrink-0 shadow-sm z-10 bg-white">
            <div className="flex flex-col">
              <h3 className="text-[18px] sm:text-xl font-black text-slate-800 tracking-tight">在地圖選取地點</h3>
              <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 mt-1">
                點擊地圖標記地標，再按下確認
              </p>
            </div>
            <button 
              type="button" 
              onClick={onClose}
              aria-label="關閉地圖選取"
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60 active:scale-95"
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

          <div className="p-5 sm:p-6 shrink-0 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-10">
            <button
              onClick={() => {
                if (selectedPos) {
                  onSelect(selectedPos.lat, selectedPos.lng);
                  onClose();
                }
              }}
              disabled={!selectedPos}
              className="w-full h-14 rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white font-black text-[15px] uppercase tracking-widest shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_20px_rgba(217,70,239,0.3)] hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(217,70,239,0.4)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-[0.92] hover:-translate-y-1 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 whitespace-nowrap"
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
