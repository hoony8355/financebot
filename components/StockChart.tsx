
import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';

interface StockChartProps {
  basePrice: number;
  trend: '상승' | '하락' | '횡보';
}

const StockChart: React.FC<StockChartProps> = ({ basePrice, trend }) => {
  // Generate pseudo-historical data based on trend
  const data = React.useMemo(() => {
    const points = 20;
    const result = [];
    let current = basePrice * 0.9;
    
    for (let i = 0; i < points; i++) {
      const volatility = basePrice * 0.02;
      const drift = trend === '상승' ? basePrice * 0.01 : trend === '하락' ? -basePrice * 0.01 : 0;
      current += drift + (Math.random() - 0.5) * volatility;
      result.push({
        time: `${i}:00`,
        price: parseFloat(current.toFixed(2))
      });
    }
    return result;
  }, [basePrice, trend]);

  const color = trend === '상승' ? '#ef4444' : trend === '하락' ? '#3b82f6' : '#64748b';

  return (
    <div className="h-64 w-full bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <h3 className="text-sm font-semibold text-slate-500 mb-4 uppercase tracking-wider">주가 추이 (최근 20시간 시뮬레이션)</h3>
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="time" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            labelStyle={{ display: 'none' }}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
