'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function MetricsChart({ data, dataKey, label }: { data: Record<string, any>[]; dataKey: string; label: string }) {
  return (
    <div role="img" aria-label={label} className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="#E3E8ED" vertical={false} />
          <XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} width={48} /><Tooltip />
          <Line type="monotone" dataKey={dataKey} stroke="#1F7A5C" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
