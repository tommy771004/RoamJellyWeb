import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { CloudRain, Check, Sparkles, Sun, Send, CheckCircle2, Plane, Star, ExternalLink, SlidersHorizontal, ArrowDownUp, Loader2, CalendarDays, MapPin, ArrowRight, ChevronDown, ChevronUp, AlertCircle, CreditCard, Layers, Grid } from "lucide-react";
import GlassCard from "../GlassCard";
import IconImg from "../ui/IconImg";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import { useToolsTabContext } from "./toolsTabContext";
import { GlowingIcon } from "../ui/GlowingIcon";
import HorizontalScrollRail from "../HorizontalScrollRail";

export default function WeatherCard({ className }: { className?: string }) {
  const {
    state: { weather, destination, loading, tripInfo },
  } = useToolsTabContext();
  const { isOffline } = useAppStore();

  const getWeatherDescription = (code?: number) => {
    if (code === undefined) return "未知天氣";
    if (code === 0) return "晴朗";
    if (code === 1) return "晴時多雲";
    if (code === 2) return "多雲";
    if (code === 3) return "陰天";
    if (code === 45 || code === 48) return "起霧";
    if (code >= 51 && code <= 55) return "毛毛雨";
    if (code === 56 || code === 57) return "冰雨";
    if (code === 61 || code === 80) return "小雨";
    if (code === 63 || code === 81) return "中雨";
    if (code === 65 || code === 82) return "大雨";
    if (code === 66 || code === 67) return "結冰雨";
    if (code === 71 || code === 73 || code === 75 || code === 85 || code === 86)
      return "下雪";
    if (code === 77) return "冰霰";
    if (code >= 95 && code <= 99) return "雷雨";
    return "多雲";
  };

  // Determine target weather data from trip start date
  let targetWeather = null;
  let isCurrentDay = true;
  let targetDateString = "今天";

  if (weather) {
    const dailyForecast = weather.daily ?? [];
    targetWeather = {
      temp_current: weather.temp_current,
      temp_max: weather.temp_max,
      temp_min: weather.temp_min,
      rain_prob: weather.rain_prob,
      weather_code: weather.weather_code,
    };
    if (tripInfo?.startDate && dailyForecast.length > 0) {
      const start = new Date(tripInfo.startDate);
      if (!isNaN(start.getTime())) {
        const match = dailyForecast.find((d: any) => {
          const dDate = new Date(d.date);
          return (
            dDate.getTime() === start.getTime() || d.date === tripInfo.startDate
          );
        });
        if (match) {
          isCurrentDay = new Date().toDateString() === start.toDateString();
          targetDateString = isCurrentDay
            ? "今天"
            : `${start.getMonth() + 1}/${start.getDate()}`;
          targetWeather = {
            temp_current: isCurrentDay
              ? weather.temp_current
              : Math.round((match.temp_max + match.temp_min) / 2),
            temp_max: match.temp_max,
            temp_min: match.temp_min,
            rain_prob: match.rain_prob,
            weather_code: match.weather_code,
          };
        } else if (start.getTime() > new Date().getTime()) {
          targetDateString = `${start.getMonth() + 1}/${start.getDate()} (無預報)`;
          targetWeather = null; // Too far in the future
        }
      }
    }
  }

  const Icon = targetWeather && targetWeather.rain_prob >= 50 ? CloudRain : Sun;

  if (!weather && loading) {
    return (
      <GlassCard className="!p-6 sm:!p-8 mb-8 flex flex-col gap-4 animate-pulse">
        <div className="h-5 w-32 bg-slate-200 rounded-full" />
        <div className="h-3 w-24 bg-slate-100 rounded-full" />
        <div className="flex items-end justify-between mt-2">
          <div className="h-8 w-24 bg-sky-100 rounded-full" />
          <div className="h-14 w-16 bg-slate-100 rounded-xl" />
        </div>
        <div className="h-12 w-full bg-slate-100 rounded-xl" />
      </GlassCard>
    );
  }

  const getOutfitSuggestion = (temp?: number, rainProb?: number) => {
    if (temp == null)
      return {
        title: "輕便舒適穿搭",
        desc: "建議搭飛機時洋蔥式穿搭，並預備舒適好走的鞋子。",
      };
    let desc = "建議帶件薄外套與好走的鞋。";
    let title = "輕薄層次穿搭";
    if (temp >= 28) {
      title = "透氣涼爽穿搭";
      desc = "建議穿著短袖與透氣材質，注意防曬避暑。";
    } else if (temp < 28 && temp >= 20) {
      title = "輕薄層次穿搭";
      desc = "建議短袖搭配薄外套，方便應對日夜溫差。";
    } else if (temp < 20 && temp >= 10) {
      title = "保暖防風穿搭";
      desc = "天氣微涼，建議準備長袖衣物與防風外套。";
    } else {
      title = "厚實禦寒穿搭";
      desc = "天氣寒冷，請準備保暖大衣、毛衣與圍巾。";
    }

    if (rainProb && rainProb >= 50) {
      desc += " 降雨機率高，請務必攜帶雨具出門。";
    }
    return { title, desc };
  };

  const outfit = getOutfitSuggestion(
    targetWeather?.temp_current,
    targetWeather?.rain_prob,
  );
  const weatherText = targetWeather
    ? getWeatherDescription(targetWeather.weather_code)
    : weather
      ? "無該日期的預報"
      : "未能取得天氣資料";

  return (
    <GlassCard className={cn("!p-4 sm:!p-6 flex flex-col relative overflow-hidden transition-all duration-200 glass-panel shadow-md hover:shadow-xl border-white/80", className)}>
      <div className="absolute -top-10 -right-10 w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-sky-200/35 blur-[36px] pointer-events-none group-hover:scale-105 transition-transform duration-200" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-orange-200/25 blur-[28px] pointer-events-none group-hover:scale-105 transition-transform duration-200" />
      <div className="absolute top-5 left-5 flex gap-2 opacity-90">
        <span className="size-2 rounded-full bg-sky-300" />
        <span className="size-2 rounded-full bg-orange-300" />
        <span className="size-2 rounded-full bg-emerald-300" />
      </div>

      <div className="relative z-10">
        <div className="mb-5 flex flex-wrap items-center gap-2 pt-4 sm:pt-0">
          <span className="clay-badge clay-sky uppercase tracking-[0.16em]">
            天氣明信片
          </span>
          {destination ? (
            <span className="clay-badge clay-peach">
              {destination}
            </span>
          ) : null}
        </div>
        <h2 className="text-balance text-[26px] sm:text-3xl font-black text-slate-900 mb-1 leading-tight">
          {targetDateString}在 {destination || "您的目的地"}
        </h2>
        <div className="flex flex-col gap-1 mb-5 sm:mb-6">
          <p className="text-[11px] sm:text-xs uppercase text-sky-700 font-black">
            當地氣象與穿搭建議
          </p>
          {isOffline && (
            <span className="text-[9px] sm:text-xs text-amber-600 font-bold bg-amber-50 w-fit px-2.5 py-0.5 rounded-full border border-amber-200 shadow-sm mt-1">
              最後更新於 2 小時前
            </span>
          )}
        </div>

        <div className="flex items-center sm:items-end justify-between mb-4 sm:mb-5 bg-white/70 dark:bg-slate-800/70 p-3 sm:p-4 rounded-[24px] sm:rounded-[28px] border border-white/70 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex bg-white/80 backdrop-blur-md rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2 items-center gap-2 border border-slate-100 shadow-sm w-fit">
              <Icon
                size={16}
                className="text-sky-500 sm:w-[18px] sm:h-[18px]"
                strokeWidth={2.5}
              />
              <span className="text-slate-700 font-black text-xs sm:text-sm">
                {weatherText}
              </span>
            </div>
            {targetWeather && (
              <span className="text-slate-500 font-bold text-[11px] sm:text-xs tracking-wider pl-1 flex items-center gap-2">
                <span>最高 {targetWeather.temp_max ?? "--"}°</span>
                <span className="opacity-50">|</span>
                <span>最低 {targetWeather.temp_min ?? "--"}°</span>
                <span className="opacity-50">|</span>
                <span>降雨 {targetWeather.rain_prob}%</span>
              </span>
            )}
          </div>
          <div className="flex flex-col items-end rounded-[28px] border border-white/80 bg-white/78 px-4 py-3 shadow-[0_4px_16px_rgba(244,114,182,0.08)]">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              today vibe
            </span>
            <div className="text-[48px] sm:text-[56px] leading-none font-black tracking-tighter text-slate-800 drop-shadow-sm flex items-start gap-1 whitespace-nowrap">
              {targetWeather?.temp_current != null
                ? targetWeather.temp_current
                : "--"}
              <span className="text-2xl mt-2 font-bold text-slate-500">°</span>
            </div>
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-800/70 rounded-[24px] sm:rounded-[28px] p-3 flex items-center gap-4 border border-white/70 shadow-sm mb-4 sm:mb-5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-3xl bg-white/86 flex items-center justify-center shadow-inner border border-white shrink-0 group-hover:-translate-y-0.5 transition-transform duration-200">
            <GlowingIcon icon={Sparkles} size={18} glowColor="bg-sky-400" iconColor="text-sky-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-slate-800 font-black text-sm">
              {outfit.title}
            </span>
            <span className="text-slate-500 text-[11px] sm:text-sm font-bold leading-snug mt-0.5">
              {outfit.desc}
            </span>
          </div>
        </div>

        {weather && weather.daily && weather.daily.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-sky-100/80 pt-4">
            <span className="text-[11px] uppercase text-sky-700 font-bold mb-1">
              14-Day Forecast
            </span>
            <HorizontalScrollRail
              label="天氣預報"
              viewportClassName="pb-4 -mx-2 px-2"
              contentClassName="gap-3"
              controlsVisibilityClass="flex"
            >
              {weather.daily.map((day: any, idx: number) => {
                const date = new Date(day.date);
                const dayName = new Intl.DateTimeFormat("en-US", {
                  weekday: "short",
                }).format(date);
                const isRainy = day.rain_prob >= 50;
                const DayIcon = isRainy ? CloudRain : Sun;
                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center flex-shrink-0 bg-white/60 dark:bg-slate-800/60 shadow-sm border border-slate-100 dark:border-slate-700/50 rounded-[18px] w-[64px] py-2.5 snap-center"
                  >
                    <span className="text-xs font-bold text-slate-500 mb-2">
                      {idx === 0 ? "Today" : dayName}
                    </span>
                    <div className="my-1">
                      <GlowingIcon
                        icon={DayIcon}
                        size={20}
                        glowColor={isRainy ? "bg-blue-400" : "bg-amber-400"}
                        iconColor={isRainy ? "text-blue-500" : "text-amber-500"}
                      />
                    </div>
                    <div className="mt-2 flex gap-1 items-baseline font-bold">
                      <span className="text-sm text-slate-700">
                        {day.temp_max}°
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {day.temp_min}°
                      </span>
                    </div>
                  </div>
                );
              })}
            </HorizontalScrollRail>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
