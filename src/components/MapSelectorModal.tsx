import React, { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Check, X } from 'lucide-react';
import { getModalMotion, getOverlayTransition } from '../lib/motionTokens';
import { useTranslation } from "react-i18next";
import { useModalAccessibility } from '../lib/useModalAccessibility';

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
  const { t } = useTranslation();
  const dialogRef = useModalAccessibility(onClose, isOpen);
  const titleId = useId();
  const [selectedPos, setSelectedPos] = useState<{lat: number, lng: number} | null>(
    (initialLat && initialLng) ? { lat: initialLat, lng: initialLng } : null
  );

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-modal flex items-center justify-center p-3 sm:p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={getOverlayTransition()}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" 
          onClick={onClose}
        />
        <motion.div
          ref={dialogRef}
          initial={getModalMotion().initial}
          animate={getModalMotion().animate}
          exit={getModalMotion().exit}
          transition={getModalMotion().transition}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative z-modal-above flex h-[72vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,250,251,0.94),rgba(241,248,255,0.92))] shadow-[0_24px_56px_rgba(15,23,42,0.16)] sm:rounded-[32px]"
        >
          <div className="absolute top-0 left-0 z-10 h-1.5 w-full bg-gradient-to-r from-sky-400 via-fuchsia-400 to-orange-300" />
          
          <div className="z-10 flex shrink-0 items-center justify-between bg-white/84 p-4 pb-3.5 shadow-sm backdrop-blur-xl sm:p-5">
            <div className="flex flex-col">
              <h2 id={titleId} className="fluid-title font-black text-slate-800">{t('str_57c7bc9a')}</h2>
              <p className="fluid-body mt-1 font-medium text-slate-500">
                {t('str_16f74770')}</p>
            </div>
            <button 
              type="button" 
              data-autofocus
              onClick={onClose}
              aria-label={t('str_1db23371')}
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/60 ios-press"
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

          <div className="z-10 shrink-0 bg-white/86 p-4 shadow-[0_-10px_24px_rgba(15,23,42,0.04)] backdrop-blur-xl sm:p-5">
            <button
              type="button"
              onClick={() => {
                if (selectedPos) {
                  onSelect(selectedPos.lat, selectedPos.lng);
                  onClose();
                }
              }}
              disabled={!selectedPos}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-700 to-orange-700 text-[14px] font-black uppercase tracking-[0.16em] text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_20px_rgba(14,165,233,0.3)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-0.5 hover:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),0_12px_28px_rgba(14,165,233,0.36)] ios-press disabled:cursor-not-allowed disabled:opacity-40 disabled:scale-100 disabled:hover:translate-y-0 whitespace-nowrap"
            >
              <Check size={20} className="shrink-0" />
              <span>{t('str_19af053d')}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
