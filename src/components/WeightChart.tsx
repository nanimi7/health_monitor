'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface WeightChartProps {
  data: { date: string; weight: number }[];
}

export default function WeightChart({ data }: WeightChartProps) {
  const chartData = useMemo(() => {
    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        ...item,
        displayDate: format(new Date(item.date), 'M/d', { locale: ko }),
      }));
  }, [data]);

  const minWeight = Math.min(...data.map(d => d.weight)) - 2;
  const maxWeight = Math.max(...data.map(d => d.weight)) + 2;

  if (data.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">체중 변화 그래프</h3>
        <div className="h-64 flex items-center justify-center text-[#9CA3AF]">
          기록된 체중 데이터가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">체중 변화 그래프</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="displayDate"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              domain={[minWeight, maxWeight]}
              tick={{ fontSize: 12, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(value) => `${value}kg`}
            />
            <Tooltip
              formatter={(value: number) => [`${value}kg`, '체중']}
              labelFormatter={(label) => label}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '0.375rem',
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#7C3AED"
              strokeWidth={2}
              dot={{ fill: '#7C3AED', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: '#5B21B6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
