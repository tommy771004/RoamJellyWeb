import * as React from "react";
import { motion } from "motion/react";
import { MapPin, Clock } from "lucide-react";
import { cn } from "../../lib/utils";

// Prop definitions for the EventCard component
export interface EventCardProps {
  heading: string;
  description: string;
  date: Date;
  imageUrl: string;
  imageAlt: string;
  eventName: string;
  location: string;
  time: string;
  actionLabel: string;
  onActionClick: (e: React.MouseEvent) => void;
  className?: string;
}

const EventCard = React.forwardRef<HTMLDivElement, EventCardProps>(
  (
    {
      heading,
      description,
      date,
      imageUrl,
      imageAlt,
      eventName,
      location,
      time,
      actionLabel,
      onActionClick,
      className,
    },
    ref
  ) => {
    // Format date parts for display
    const dayOfWeek = date.toLocaleDateString('zh-TW', { weekday: 'long' }).toUpperCase();
    const month = date.toLocaleDateString('zh-TW', { month: 'short' });
    const day = date.getDate();

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        ref={ref}
        className={cn(
          "w-full rounded-[32px] border border-slate-200/60 bg-white/70 backdrop-blur-md p-6 text-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-sans relative overflow-hidden group/event-card cursor-pointer",
          className
        )}
        aria-labelledby="event-name"
        onClick={onActionClick}
      >
        <div className="flex flex-col relative z-10 pointer-events-none">
          {/* Header Section */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-[18px] font-black tracking-tight">{heading}</h2>
              <p className="mt-1 text-[13px] font-bold text-slate-500 line-clamp-1">{description}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black tracking-widest text-pink-500 uppercase">
                {dayOfWeek}
              </p>
              <p className="text-3xl font-black text-slate-800 tracking-tighter">
                <span className="mr-1 text-[18px] font-bold text-slate-800 align-top">{month}</span>
                {day}
              </p>
            </div>
          </div>

          {/* Image Section */}
          <div className="my-5 aspect-video w-full overflow-hidden rounded-2xl shadow-sm relative pointer-events-auto">
            <img
              src={imageUrl}
              alt={imageAlt}
              className="h-full w-full object-cover transition-transform duration-500 group-hover/event-card:scale-105"
            />
            {/* Overlay Gradient for contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/event-card:opacity-100" />
          </div>

          {/* Details Section */}
          <div>
            <h3 id="event-name" className="text-[17px] font-black text-slate-800 line-clamp-1">
              {eventName}
            </h3>
            <div className="mt-3 flex flex-col space-y-2 text-[13px] font-bold text-slate-500">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
                <span className="line-clamp-1">{location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
                <span>{time}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative background blur inside the card */}
        <div className="absolute -inset-10 bg-gradient-to-br from-pink-100/30 via-transparent to-rose-100/30 opacity-0 transition-opacity duration-500 group-hover/event-card:opacity-100 mix-blend-multiply pointer-events-none" />
      </motion.div>
    );
  }
);

EventCard.displayName = "EventCard";

export { EventCard };
