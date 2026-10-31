import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './auth';
import { CartProvider } from './cart';
import { ThemeProvider } from './theme';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider><BrowserRouter><AuthProvider><CartProvider><App /></CartProvider></AuthProvider></BrowserRouter></ThemeProvider>
  </React.StrictMode>
);