import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { LanguageProvider } from './lib/translations';
import { UnitProvider } from './lib/UnitContext';
import { AuditTrailProvider } from './lib/AuditTrailContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <UnitProvider>
        <AuditTrailProvider>
          <App />
        </AuditTrailProvider>
      </UnitProvider>
    </LanguageProvider>
  </StrictMode>,
);
