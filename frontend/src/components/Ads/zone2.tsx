import React, { useCallback, useState } from 'react';
import type { CompanyAd } from '../../template/AdsDisplay';
import { AdFrame } from './AdFrame';

/** Zone 2: zwei Rahmen übereinander – Zonen ohne ladbare Medien werden ausgeblendet, die übrigen füllen die Fläche */
const Zone: React.FC<{ ad: CompanyAd; language?: string | null }> = ({ ad, language = null }) => {
  const [empty, setEmpty] = useState<string[]>([]);
  const onEmpty = useCallback((z: string) => setEmpty((e) => (e.includes(z) ? e : [...e, z])), []);
  const all = ["Zone 1","Zone 2"];
  const ok = all.filter((z) => !empty.includes(z));
  const zones = ok.length ? ok : all.slice(0, 1);
  const n = Math.max(1, zones.length);
  return (
    <div className="grid h-full gap-[1.1vmin]" style={{ gridTemplateRows: `repeat(${n}, minmax(0, 1fr))` }}>
      {zones.map((z, i) => (
        <AdFrame key={z} ad={ad} zone={z} language={language} badge={i === 0} delayMs={i * 110} onEmpty={onEmpty} />
      ))}
    </div>
  );
};

export default Zone;
