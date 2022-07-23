import React from 'react';
import * as Grommet from 'grommet';
import ReactDOM from 'react-dom/client';
import App from './app';
import theme from './theme';

const elm = document.getElementById('root');

const root = ReactDOM.createRoot(elm);

root.render(
    <React.StrictMode>
      <Grommet.Grommet theme={theme} full>
        <App />
      </Grommet.Grommet>
    </React.StrictMode>
);