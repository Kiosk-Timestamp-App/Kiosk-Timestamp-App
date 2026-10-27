'use client';

import dynamic from 'next/dynamic';

const Preview = dynamic(() => import('../../../previews/CompanyPreview'), { ssr: false });

export default function Page() {
  return <Preview />;
}
