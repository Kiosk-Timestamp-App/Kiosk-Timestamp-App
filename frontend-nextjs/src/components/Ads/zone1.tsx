import React from 'react';
import type { CompanyAd } from '../../template/AdsDisplay';
import { AdFrame } from './AdFrame';

/** Zone 1: ein Rahmen über die ganze Fläche (ohne ladbare Medien: Markenfläche) */
const ZoneScreenOne: React.FC<{ ad: CompanyAd; language?: string | null }> = ({ ad, language = null }) => (
  <div className="grid h-full">
    <AdFrame ad={ad} zone="Zone 1" language={language} badge />
  </div>
);

export default ZoneScreenOne;
