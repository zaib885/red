import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { startServerClock } from '@/firebase/serverClock';
import { waitForAuth } from '@/firebase/auth';
import './index.css';

startServerClock();
waitForAuth().catch(() => {});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
