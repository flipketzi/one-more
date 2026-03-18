import React from 'react';
import { useLocale } from '../context/LocaleContext';
import { LOCALES } from '../i18n';

export const LanguageSelector: React.FC = () => {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map(l => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          className={`
            px-2 py-1 rounded-lg text-xs font-bold transition-all
            ${locale === l.code
              ? 'bg-amber-400 text-black'
              : 'text-slate-500 hover:text-white hover:bg-white/10'
            }
          `}
          title={l.flag}
        >
          {l.flag} {l.label}
        </button>
      ))}
    </div>
  );
};
