'use client';

import dynamic from 'next/dynamic';

const Preview = dynamic(() => import('../../../previews/InsightsPreview'), { ssr: false });

export default function Page() {
  return <Preview />;
}
