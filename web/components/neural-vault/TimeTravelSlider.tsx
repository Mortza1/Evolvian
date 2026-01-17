'use client';

import { useState } from 'react';
import { KnowledgeGraph } from '@/lib/knowledge-graph';

interface TimeTravelSliderProps {
  graph: KnowledgeGraph;
  onDateChange: (date: Date) => void;
}

export default function TimeTravelSlider({ graph, onDateChange }: TimeTravelSliderProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Get min and max dates from evolution history
  const dates = graph.evolutionHistory.map((e) => e.timestamp.getTime());
  const minDate = Math.min(...dates, graph.metadata.lastUpdated.getTime());
  const maxDate = graph.metadata.lastUpdated.getTime();

  const [currentTime, setCurrentTime] = useState(maxDate);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value);
    setCurrentTime(newTime);
    onDateChange(new Date(newTime));
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(timestamp));
  };

  const getEventsAtTime = () => {
    return graph.evolutionHistory.filter((e) => e.timestamp.getTime() <= currentTime).length;
  };

  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white mb-1">Time Travel</h3>
          <p className="text-xs text-slate-400">
            {getEventsAtTime()} / {graph.evolutionHistory.length} events
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-[#6366F1]">{formatDate(currentTime)}</div>
          <div className="text-xs text-slate-500">
            {currentTime === maxDate ? 'Present' : 'Historical View'}
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={minDate}
          max={maxDate}
          value={currentTime}
          onChange={handleSliderChange}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#6366F1]"
        />

        {/* Event markers */}
        <div className="relative mt-2 h-8">
          {graph.evolutionHistory.map((event, idx) => {
            const position = ((event.timestamp.getTime() - minDate) / (maxDate - minDate)) * 100;
            const isActive = event.timestamp.getTime() <= currentTime;

            return (
              <div
                key={idx}
                style={{ left: `${position}%` }}
                className="absolute top-0 -translate-x-1/2 group"
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all ${
                    isActive ? 'bg-[#6366F1] scale-110' : 'bg-slate-600'
                  }`}
                />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="glass rounded-lg p-2 whitespace-nowrap text-xs">
                    <div className="font-semibold text-white">{formatDate(event.timestamp.getTime())}</div>
                    <div className="text-slate-400">{event.description}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => {
            const prevEventTime = Math.max(
              ...graph.evolutionHistory
                .map((e) => e.timestamp.getTime())
                .filter((t) => t < currentTime),
              minDate
            );
            setCurrentTime(prevEventTime);
            onDateChange(new Date(prevEventTime));
          }}
          disabled={currentTime === minDate}
          className="px-3 py-1.5 text-xs bg-[#020617]/50 border border-slate-700/50 rounded-lg text-slate-300 hover:bg-[#020617]/70 hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        <button
          onClick={() => {
            const nextEventTime = Math.min(
              ...graph.evolutionHistory
                .map((e) => e.timestamp.getTime())
                .filter((t) => t > currentTime),
              maxDate
            );
            setCurrentTime(nextEventTime);
            onDateChange(new Date(nextEventTime));
          }}
          disabled={currentTime === maxDate}
          className="px-3 py-1.5 text-xs bg-[#020617]/50 border border-slate-700/50 rounded-lg text-slate-300 hover:bg-[#020617]/70 hover:border-slate-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next →
        </button>

        <div className="flex-1"></div>

        <button
          onClick={() => {
            setCurrentTime(maxDate);
            onDateChange(new Date(maxDate));
          }}
          disabled={currentTime === maxDate}
          className="px-3 py-1.5 text-xs bg-[#6366F1] text-white rounded-lg hover:bg-[#5558E3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back to Present
        </button>
      </div>
    </div>
  );
}
