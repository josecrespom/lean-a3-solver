import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { installPrintFit } from './utils/printFit';

installPrintFit();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fullPage>
    <App />
  </ErrorBoundary>
);
