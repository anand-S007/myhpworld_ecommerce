import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { CATEGORY_ICONS, categoryIconMap } from '../../lib/categoryIcons.js';

// Reusable searchable icon picker backed by the full lucide catalog.
// The stored value is the Lucide icon name (string) so renderers can resolve
// it via `categoryIconMap` without any special serialization.
//
// Props:
//   value    — currently selected icon name, e.g. "Laptop"
//   onChange — called with the new icon name when the user clicks one
//   cap      — optional max number of visible results (default 20)
export default function IconPicker({ value, onChange, cap = 20 }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const matched = q
    ? CATEGORY_ICONS.filter(({ name }) => name.toLowerCase().includes(q))
    : CATEGORY_ICONS;
  const results = matched.slice(0, cap);
  const hiddenCount = matched.length - results.length;
  const SelectedIcon = value ? categoryIconMap[value] : null;

  return (
    <div>
      <div className="text-sm text-slate-600 mb-1">Icon</div>

      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons (e.g. credit, gift)"
            className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 focus:border-hp-blue focus:ring-4 focus:ring-hp-blue/10 outline-none text-sm"
          />
        </div>
        <div
          className="h-10 px-3 min-w-[7rem] rounded-lg border border-slate-200 bg-slate-50 flex items-center gap-2 text-xs text-slate-600"
          title={value || 'No icon selected'}
        >
          {SelectedIcon ? (
            <>
              <SelectedIcon className="w-4 h-4 text-hp-blue" />
              <span className="font-mono truncate">{value}</span>
            </>
          ) : (
            <span className="text-slate-400">No selection</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
        {results.length === 0 && (
          <div className="col-span-full text-center py-6 text-xs text-slate-400">
            No icons match "{query}".
          </div>
        )}
        {results.map(({ name, Icon }) => {
          const selected = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              title={name}
              className={`relative grid place-items-center aspect-square rounded-lg border transition-colors ${
                selected
                  ? 'bg-hp-blue text-white border-hp-blue shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-hp-blue hover:text-hp-blue'
              }`}
            >
              <Icon className="w-5 h-5" />
              {selected && (
                <Check className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-hp-blue text-white rounded-full p-[1px] ring-2 ring-white" />
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-1 text-xs text-slate-400 flex items-center justify-between">
        <span>
          {matched.length.toLocaleString()} of {CATEGORY_ICONS.length.toLocaleString()} icons
          {hiddenCount > 0 && <> — showing first {cap}. Refine search to see more.</>}
        </span>
        {q && (
          <button type="button" onClick={() => setQuery('')} className="text-hp-blue hover:underline">
            clear
          </button>
        )}
      </div>
    </div>
  );
}
