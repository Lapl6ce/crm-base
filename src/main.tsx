import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { createMockProvider } from './data/mock';
import './index.css';

/* THE SWAP POINT.
 *
 * This is the only file in the app that names a concrete data adapter. Pointing
 * the CRM at a real backend is one import and one line here; no module, screen
 * or component changes. Set latencyMs while building loading states to make
 * sure they are real.
 */
const provider = createMockProvider({ latencyMs: 0 });

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App provider={provider} />
  </StrictMode>,
);
