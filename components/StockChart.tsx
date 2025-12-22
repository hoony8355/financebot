
import React from 'react';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { ChartPoint } from '../types';

interface StockChartProps {
  basePrice: number;
  trend: '상승' | '하락' | '횡보';
  data?: ChartPoint[];
}

const StockChart: React.FC<StockChartProps> = ({ basePrice, trend, data }) => {
  // 데이터가 없을 경우에만 시뮬레이션 데이터 생성 (폴백)
  const chartData = React.useMemo(() => {
    if (data && data.length > 0) return data;

    const points = 20;
    const result = [];
    let current = basePrice * 0.95;
    for (let i = 0; i < points; i++) {
      const volatility = basePrice * 0.015;
      const drift = trend === '상승' ? basePrice * 0.005 : trend === '하락' ? -basePrice * 0.005 : 0;
      current += drift + (Math.random() - 0.5) * volatility;
      result.push({
        time: `${i}:00`,
        price: parseFloat(current.toFixed(2))
      });
    }
    return result;
  }, [basePrice, trend, data]);

  const isRealData = data && data.length > 0;
  const color = trend === '상승' ? '#ef4444' : trend === '하락' ? '#3b82f6' : '#64748b';

  return (
    <div className="h-72 w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          {isRealData ? (
            <>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              최근 5일 실제 주가 추이 (1시간 간격)
            </>
          ) : (
            '주가 추이 시뮬레이션'
          )}
        </h3>
        {isRealData && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">LIVE DATA</span>}
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.15}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="time" 
            hide={!isRealData} 
            tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
            axisLine={false}
            tickLine={false}
            minTickGap={30}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            hide 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
            itemStyle={{ fontSize: '12px', fontWeight: '900', color: '#1e293b' }}
            labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 'bold' }}
            formatter={(value: number) => [`${value.toLocaleString()}`, 'Price']}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            strokeWidth={4}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
