const VARS = [
  { key: '{{nombre}}',   label: '{{nombre}}',   title: 'Nombre del contacto en WhatsApp' },
  { key: '{{telefono}}', label: '{{telefono}}',  title: 'Número de teléfono' },
  { key: '{{empresa}}',  label: '{{empresa}}',   title: 'Nombre de la empresa' },
];

const COLOR_MAP = {
  blue:   'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100',
  green:  'bg-green-50 text-green-600 border-green-200 hover:bg-green-100',
  amber:  'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100',
};

export default function VarChips({ onInsert, color = 'blue' }) {
  const chipClass = COLOR_MAP[color] || COLOR_MAP.blue;

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1.5">
      <span className="text-[10px] text-gray-400 mr-0.5">Variables:</span>
      {VARS.map(v => (
        <button
          key={v.key}
          type="button"
          title={v.title}
          onClick={() => onInsert(v.key)}
          className={`nodrag text-[10px] border rounded px-1.5 py-0.5 font-mono transition-colors ${chipClass}`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
