// ── Entry point ─────────────────────────────────────────────────────
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { installMockServer } from './api/mock-server';
import { initGroundTruth } from './bugs';

// 1. Initialize the ground-truth telemetry array
initGroundTruth();

// 2. Install the mock API (fetch interceptor)
installMockServer();

// 3. Render the app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
