import React from 'react';

interface AudioVisualizerProps {
  isActive?: boolean;
  isListening?: boolean;
  color?: string;
  barCount?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isActive,
  isListening,
  color = '#6366f1',
  barCount = 18,
}) => {
  const active = Boolean(isActive || isListening);
  return (
    <div className="flex items-center justify-center gap-1 h-8 px-2">
      {Array.from({ length: barCount }).map((_, i) => {
        const height = active
          ? Math.max(20, Math.sin((i / barCount) * Math.PI) * 100 * (0.4 + Math.random() * 0.6))
          : 15;

        return (
          <span
            key={i}
            className="w-1 rounded-full transition-all duration-150"
            style={{
              backgroundColor: active ? color : '#cbd5e1',
              height: `${height}%`,
              opacity: active ? 0.9 : 0.4,
              animation: active ? `pulseWave 0.8s ease-in-out infinite alternate ${i * 0.05}s` : 'none',
            }}
          />
        );
      })}
    </div>
  );
};
