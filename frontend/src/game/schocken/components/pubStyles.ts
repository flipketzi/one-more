// Shared Tailwind class sets for the Schocken pub look

export const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pub-foam';

export const PRIMARY_BUTTON =
  `w-full py-4 rounded-xl bg-pub-beer text-pub-wood font-pub font-bold text-xl shadow-[0_4px_0_#9A6A1E] ${FOCUS_RING}`;

export const SECONDARY_BUTTON =
  `w-full py-3 rounded-xl border-2 border-pub-foam/60 text-pub-foam font-pub font-semibold text-lg ${FOCUS_RING}`;

/** Felt lining inside a leather rim — the dice tray the cup and dice sit on. */
export const DICE_TRAY =
  'rounded-[28px] bg-pub-felt border-[6px] border-pub-leather shadow-[inset_0_4px_18px_rgba(0,0,0,0.55)]';

/** Full-screen overlay backdrop: the bar counter, slightly see-through. */
export const OVERLAY_BACKDROP = 'fixed inset-0 bg-pub-wood/95 text-pub-foam font-pub-body';
