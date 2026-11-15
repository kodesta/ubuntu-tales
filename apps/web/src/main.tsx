import '@fontsource-variable/lora/index.css';
import '@fontsource-variable/lora/wght-italic.css';
import '@fontsource-variable/dm-sans/index.css';
import './styles/tokens.css';
import './styles/base.css';
import { registerSW } from 'virtual:pwa-register';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from './app/providers';

// Service worker (production plan 06 §6): prompt the reader when a new version is waiting.
if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}

const container = document.getElementById('root');

if (!container) {
  throw new Error('Ubuntu Tales: #root element is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
