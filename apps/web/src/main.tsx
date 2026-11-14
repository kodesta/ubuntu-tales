import '@fontsource-variable/lora/index.css';
import '@fontsource-variable/lora/wght-italic.css';
import '@fontsource-variable/dm-sans/index.css';
import './styles/tokens.css';
import './styles/base.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppProviders } from './app/providers';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Ubuntu Tales: #root element is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
