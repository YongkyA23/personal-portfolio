import { lazy, Suspense, useEffect, useState } from 'react';
import { seed } from './content/seed';
import type { Content } from './content/types';
import { fetchContent } from './lib/api';
import Site from './site/Site';

const Admin = lazy(() => import('./admin/Admin'));

const isAdmin = () => window.location.pathname.replace(/\/+$/, '') === '/admin';

export default function App() {
  // Render the bundled content at once, then swap in whatever the server has saved.
  const [content, setContent] = useState<Content>(seed);
  const [admin] = useState(isAdmin);

  useEffect(() => {
    if (admin) return;
    const controller = new AbortController();
    void fetchContent(controller.signal).then((fresh) => {
      if (fresh && JSON.stringify(fresh) !== JSON.stringify(seed)) setContent(fresh);
    });
    return () => controller.abort();
  }, [admin]);

  if (admin) {
    return (
      <Suspense fallback={null}>
        <Admin />
      </Suspense>
    );
  }
  return <Site content={content} />;
}
