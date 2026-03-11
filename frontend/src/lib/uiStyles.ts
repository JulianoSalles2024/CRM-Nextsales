/**
 * Shared UI style tokens — derived from LeadDetailSlideover visual design.
 * Use these in modals, cards and forms to ensure visual consistency.
 */
export const ui = {
  /** Modal outer panel — dark background matching LeadDetailSlideover */
  modalContainer:
    'bg-[#0B0E14] rounded-2xl shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]',

  /** Inner section card */
  card:
    'bg-slate-900/30 border border-slate-800 rounded-2xl',

  /** Text input / textarea / select inner className */
  input:
    'w-full bg-slate-900/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-sky-500/50',

  /** Primary action button (save / create) */
  buttonPrimary:
    'px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl hover:shadow-[0_0_18px_rgba(29,161,242,0.45)] hover:-translate-y-0.5 transition-all duration-200',

  /** Secondary / cancel button */
  buttonSecondary:
    'px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-800 transition-colors',
} as const;
