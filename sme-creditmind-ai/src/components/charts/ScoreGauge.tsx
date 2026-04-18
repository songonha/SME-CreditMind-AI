"use client";

import { getScoreColor } from "@/lib/format";

interface ScoreGaugeProps {
  score: number;
  maxScore?: number;
  size?: number;
  label?: string;
}

export function ScoreGauge({ score, maxScore = 1000, size = 200, label }: ScoreGaugeProps) {
  const percentage = Math.min(score / maxScore, 1);
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // semicircle
  const strokeDashoffset = circumference * (1 - percentage);
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size * 0.55} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size * 0.55}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
          strokeLinecap="round"
        />
        {/* Score arc */}
        <path
          d={`M ${strokeWidth / 2} ${size * 0.55} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size * 0.55}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
        {/* Score text */}
        <text
          x={size / 2}
          y={size * 0.45}
          textAnchor="middle"
          className="fill-foreground"
          style={{ fontSize: size * 0.18, fontWeight: 800 }}
        >
          {score}
        </text>
        <text
          x={size / 2}
          y={size * 0.58}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: size * 0.06 }}
        >
          / {maxScore}
        </text>
      </svg>
      {label && (
        <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
      )}
    </div>
  );
}
