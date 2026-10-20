/** Lokale Vorschau des Bildschirms „Ihr Partner vor Ort“ in der Navy-App-Hülle (nicht Teil der App). */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import Header from '../KioskDisplayComponents/Header';
import Footer from '../KioskDisplayComponents/Footer';
import { StageDecor } from '../../design/primitives';
import CompanyInfo from '../../template/CompanyInfo';

const preview = (
    <div className="ov-stage dark h-screen w-screen overflow-hidden font-sans text-white">
      <StageDecor arc={false} />
      <div className="flex h-full w-full flex-col gap-[calc(0.5vw+0.5vh)] p-[calc(0.8vw+0.8vh)]">
        <Header theme="dark" toggleTheme={() => {}} language="DE" currentSystemConfig={null} />
        <main className="relative min-h-0 flex-1">
          <CompanyInfo language="DE" />
        </main>
        <Footer theme="dark" language="DE" />
      </div>
    </div>
  );

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {preview}
  </StrictMode>,
);
