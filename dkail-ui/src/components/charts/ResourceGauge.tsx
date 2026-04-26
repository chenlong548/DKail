interface ResourceGaugeProps {
  label: string;
  value: number;
  color: string;
}

export default function ResourceGauge({ label, value, color }: ResourceGaugeProps) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          {/* 背景圆环 */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke="#30363D"
            strokeWidth="8"
            fill="none"
          />
          {/* 进度圆环 */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease',
            }}
          />
        </svg>
        {/* 中心数值 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-kali-text">{Math.min(value, 100).toFixed(1)}%</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-kali-text">{label}</div>
        <div className="mt-1 h-2 bg-kali-border rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${Math.min(value, 100)}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </div>
  );
}
