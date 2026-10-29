import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* Remove the inline splash as soon as React has painted. */
function dropBoot() {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.add('gone');
  setTimeout(() => boot.remove(), 320);
}
requestAnimationFrame(() => requestAnimationFrame(dropBoot));
