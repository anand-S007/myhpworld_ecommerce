import { useEffect, useState } from 'react';

function secondsUntil(endDate) {
  if (!endDate) return null;
  const diff = Math.floor((new Date(endDate) - Date.now()) / 1000);
  return diff > 0 ? diff : 0;
}

export default function CountdownTimer({ endDate, seconds: secondsProp = 8 * 3600 + 42 * 60 + 17 }) {
  const initial = endDate ? (secondsUntil(endDate) ?? secondsProp) : secondsProp;
  const [total, setTotal] = useState(initial);

  useEffect(() => {
    if (endDate) {
      setTotal(secondsUntil(endDate) ?? 0);
    }
  }, [endDate]);

  useEffect(() => {
    const id = setInterval(() => {
      setTotal((t) => {
        if (t <= 1) return endDate ? 0 : 24 * 3600;
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [endDate]);

  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-2">
      <Unit value={pad(h)} label="Hrs" />
      <Unit value={pad(m)} label="Min" />
      <Unit value={pad(s)} label="Sec" />
    </div>
  );
}

function Unit({ value, label }) {
  return (
    <div className="bubble">
      <div className="font-display font-bold text-xl">{value}</div>
      <div className="text-[10px] uppercase text-slate-400 mt-1">{label}</div>
    </div>
  );
}
