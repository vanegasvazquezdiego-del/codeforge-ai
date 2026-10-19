import { useEffect, useState } from 'react';

/**
 * Suscripción a una media query. Se usa para decidir entre el copiloto "docked"
 * (columna fija) y el overlay móvil: nunca se montan los dos a la vez, así que
 * no hay ids duplicados ni suscripciones fantasma.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}