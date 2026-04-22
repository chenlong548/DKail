import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useStore } from '../../store';

export default function TrafficChart() {
  const { trafficData } = useStore();

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={trafficData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
          <XAxis 
            dataKey="time" 
            stroke="#8B949E" 
            tick={{ fill: '#8B949E', fontSize: 12 }}
          />
          <YAxis 
            stroke="#8B949E" 
            tick={{ fill: '#8B949E', fontSize: 12 }}
            tickFormatter={formatBytes}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#161B22', 
              border: '1px solid #30363D',
              borderRadius: '8px',
              color: '#E6EDF3'
            }}
            formatter={(value: number) => [formatBytes(value), '']}
            labelStyle={{ color: '#E6EDF3' }}
          />
          <Legend 
            wrapperStyle={{ color: '#8B949E' }}
          />
          <Line 
            type="monotone" 
            dataKey="inbound" 
            name="入站流量"
            stroke="#00FF00" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#00FF00' }}
          />
          <Line 
            type="monotone" 
            dataKey="outbound" 
            name="出站流量"
            stroke="#58A6FF" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#58A6FF' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
