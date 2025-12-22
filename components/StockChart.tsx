
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
  const chartData = React.useMemo(() => {
    if (data && data.length > 0) return data;

    // 폴백: 데이터가 없을 때만 시뮬레이션
    const points = 24;
    const result = [];
    let current = basePrice;
    for (let i = 0; i < points; i++) {
      const volatility = basePrice * 0.01;
      current += (Math.random() - 0.5) * volatility;
      result.push({
        time: `${i}:00`,
        price: parseFloat(current.toFixed(2))
      });
    }
    return result;
  }, [basePrice, data]);

  const isRealData = data && data.length > 0;
  // 실제 데이터의 첫 포인트와 마지막 포인트를 비교해 색상 결정
  const isUp = isRealData 
    ? chartData[chartData.length - 1].price >= chartData[0].price
    : trend === '상승';
    
  const color = isUp ? '#ef4444' : '#3b82f6';

  return (
    <div className="h-80 w-full bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-1">
            {isRealData ? (
              <>
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                7-Day Price Action History (Hourly)
              </>
            ) : (
              'Simulated Price Trend'
            )}
          </h3>
          <p className="text-[10px] font-bold text-slate-400">데이터 제공: Yahoo Finance API</p>
        </div>
        {isRealData && <span className="text-[10px] font-black text-white bg-slate-900 px-3 py-1 rounded-full tracking-widest">7D HISTORY</span>}
      </div>
      <ResponsiveContainer width="100%" height="75%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="time" 
            hide={!isRealData} 
            tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} 
            axisLine={false}
            tickLine={false}
            minTickGap={60}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            hide 
          />
          <Tooltip 
            contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
            itemStyle={{ fontSize: '13px', fontWeight: '900', color: '#0f172a' }}
            labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '6px', fontWeight: 'bold', textTransform: 'uppercase' }}
            formatter={(value: number) => [`${value.toLocaleString()}`, 'Price']}
          />
          <Area 
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            animationDuration={2000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;
