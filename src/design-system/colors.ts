// Color tokens — Dark + Blue theme
// Never use violet/purple for interactive elements

export const colors = {
  // Backgrounds
  bg: {
    page:    'bg-slate-950',
    surface: 'bg-slate-900',
    card:    'bg-slate-900',
    input:   'bg-slate-950',
    overlay: 'bg-black/60',
  },

  // Borders
  border: {
    base:    'border-slate-700',
    subtle:  'border-slate-800',
    divider: 'border-slate-800',
    focus:   'border-blue-500',
  },

  // Text
  text: {
    primary:   'text-slate-100',
    secondary: 'text-slate-400',
    muted:     'text-slate-500',
    white:     'text-white',
    danger:    'text-red-400',
  },

  // Primary action — always blue
  primary: {
    bg:       'bg-blue-600',
    hover:    'hover:bg-blue-500',
    text:     'text-blue-400',
    border:   'border-blue-500',
    ring:     'focus:ring-blue-500',
  },

  // States
  success: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  danger:  { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'     },
  warning: { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20'   },
  info:    { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'    },
} as const;
