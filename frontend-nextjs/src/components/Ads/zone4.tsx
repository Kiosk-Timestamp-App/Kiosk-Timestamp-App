import React, { useCallback, useState } from 'react';
import type { CompanyAd } from '../../template/AdsDisplay';
import { AdFrame } from './AdFrame';

/** Zone 4: Raster 2 × 2 – Zonen ohne ladbare Medien werden ausgeblendet, die übrigen füllen die Fläche */
const Zone: React.FC<{ ad: CompanyAd; language?: string | null }> = ({ ad, language = null }) => {
  const [empty, setEmpty] = useState<string[]>([]);
  const onEmpty = useCallback((z: string) => setEmpty((e) => (e.includes(z) ? e : [...e, z])), []);
  const all = ["Zone 1","Zone 2","Zone 3","Zone 4"];
  const ok = all.filter((z) => !empty.includes(z));
  const zones = ok.length ? ok : all.slice(0, 1);
  const n = Math.max(1, zones.length);
  return (
    <div className="grid h-full gap-[1.1vmin]" style={{ gridTemplateColumns: n > 1 ? "repeat(2, minmax(0, 1fr))" : "1fr", gridTemplateRows: n > 2 ? "repeat(2, minmax(0, 1fr))" : "1fr" }}>
      {zones.map((z, i) => (
        <AdFrame key={z} ad={ad} zone={z} language={language} badge={i === 0} delayMs={i * 110} onEmpty={onEmpty} className={n === 3 && i === 2 ? "col-span-2" : ""} />
      ))}
    </div>
  );
};

export default Zone;
