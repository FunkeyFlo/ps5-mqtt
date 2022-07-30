import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';

const elm = document.getElementById('root');

const root = ReactDOM.createRoot(elm);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);