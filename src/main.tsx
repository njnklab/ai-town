import React from 'react';
import ReactDOM from 'react-dom/client';
import Home from './App.tsx';
import Dashboard from './dashboard/index.tsx';
import './index.css';
import 'uplot/dist/uPlot.min.css';
import 'react-toastify/dist/ReactToastify.css';
import ConvexClientProvider from './components/ConvexClientProvider.tsx';

function Router() {
  const path = location.pathname;
  if (path.endsWith('/dashboard')) return <Dashboard />;
  return <Home />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConvexClientProvider>
      <Router />
    </ConvexClientProvider>
  </React.StrictMode>,
);
