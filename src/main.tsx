import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Visor de clips de ZOE: herramienta de revisión, se descarga solo si se abre.
const ZoeVisor = lazy(() => import('./components/zoe/ZoeVisor'));
const isVisor = window.location.hash.startsWith('#/zoe-visor');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isVisor ? (
      <Suspense fallback={null}>
        <ZoeVisor />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
