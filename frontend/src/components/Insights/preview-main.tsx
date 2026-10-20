/** Nur für die lokale Vorschau (preview-insights.html): App-Rahmen + Bildschirm „Energie heute & Prognose“. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import Header from '../KioskDisplayComponents/Header';
import Footer from '../KioskDisplayComponents/Footer';
import { StageDecor } from '../../design/primitives';
import EnergyInsights from '../../template/EnergyInsights';

// Sprache per ?lang=EN|IT|FR|SQ testen (Standard DE)
const lang = new URLSearchParams(location.search).get('lang') ?? 'DE';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="ov-stage dark h-screen w-screen overflow-hidden font-sans text-white">
      <StageDecor arc={false} />
      <div className="flex h-full w-full flex-col gap-[calc(0.5vw+0.5vh)] p-[calc(0.8vw+0.8vh)]">
        <Header theme="dark" toggleTheme={() => {}} language={lang} />
        <main className="relative min-h-0 flex-1">
          <div className="ov-screen absolute inset-0 z-10 overflow-hidden" data-active="true">
            <EnergyInsights language={lang} />
          </div>
        </main>
        <Footer theme="dark" language={lang} />
      </div>
    </div>
  </StrictMode>,
);
