
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator && window.isSecureContext) {
  // Prevent registration in cross-origin iframes to avoid security errors.
  let isSafeToRegister = true;
  try {
    if (window.top?.location.origin !== window.location.origin) {
      isSafeToRegister = false;
    }
  } catch (e) {
    // Accessing top.location may throw a cross-origin error.
    isSafeToRegister = false;
  }

  if (isSafeToRegister) {
    window.addEventListener('load', () => {
      // Construct an absolute URL for sw.js using the current page's origin.
      // This is the most reliable method to prevent "origin mismatch" errors,
      // especially in sandboxed environments where relative paths can be ambiguous.
      const swUrl = new URL('sw.js', window.location.origin).toString();
      const scope = '/';

      navigator.serviceWorker
        .register(swUrl, { scope })
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(err => {
          console.warn('Service Worker registration failed:', err);
        });
    });
  }
}
