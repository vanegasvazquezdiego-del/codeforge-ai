import { useCallback, useEffect, useState } from 'react';
import type { ViewId } from './types';

const VALID: ViewId[] = ['editor', 'exercises', 'profile', 'settings'];
const DEFAULT_VIEW: ViewId = 'editor';

function read(): ViewId {
  const raw = window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0];
  return (VALID as string[]).includes(raw) ? (raw as ViewId) : DEFAULT_VIEW;
}

/**
 * Router por hash: sin dependencias, con deep-link real y botón atrás del
 * navegador funcionando. Para una SPA de cuatro vistas no hace falta más.
 */
export function useHashRoute(): [ViewId, (view: ViewId) => void] {
  const [view, setView] = useState<ViewId>(read);

  useEffect(() => {
    const onChange = () => setView(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: ViewId) => {
    if (window.location.hash.replace(/^#\/?/, '') === next) return;
    window.location.hash = `/${next}`;
    setView(next);
  }, []);

  return [view, navigate];
}