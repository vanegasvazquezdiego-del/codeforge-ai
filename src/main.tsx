import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { useSettings } from './store/settings';
import { KEY_SETTINGS, readJSON } from './lib/storage';
import type { ThemeId } from './lib/types';

const container = document.getElementById('root');
if (!container) throw new Error('No se encontro el nodo #root en index.html.');

// El tema se aplica antes del primer pintado (script inline en index.html);
// aqui solo garantizamos que el atributo refleje el estado persistido.
document.documentElement.dataset.theme = readJSON<{ theme?: string }>(KEY_SETTINGS, {}).theme ?? 'void';

// Sincroniza el tema entre pestanas del mismo navegador.
window.addEventListener('storage', (event) => {
  if (event.key !== KEY_SETTINGS) return;
  const theme = readJSON<{ theme?: string }>(KEY_SETTINGS, {}).theme;
  if (!theme) return;
  document.documentElement.dataset.theme = theme;
  useSettings.setState({ theme: theme as ThemeId });
});

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);