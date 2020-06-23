import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { AppContainer as ReactHotAppContainer } from 'react-hot-loader';
import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom';
import { createMuiTheme, ThemeProvider } from '@material-ui/core';
import Home from './components/Home';
import Setup from './components/Setup';
import { HOME_PATH, SETUP_PATH } from './utils/paths';

const AppContainer = process.env.PLAIN_HMR ? Fragment : ReactHotAppContainer;

const theme = createMuiTheme({
  palette: {
    type: 'light'
  }
});

document.addEventListener('DOMContentLoaded', () =>
  render(
    <AppContainer>
      <BrowserRouter>
        <Switch>
          <Route path={SETUP_PATH}>
            <ThemeProvider theme={theme}>
              <Setup />
            </ThemeProvider>
          </Route>
          <Route path={HOME_PATH}>
            <ThemeProvider theme={theme}>
              <Home />
            </ThemeProvider>
          </Route>
          <Redirect from="/" to={SETUP_PATH} />
        </Switch>
      </BrowserRouter>
    </AppContainer>,
    document.getElementById('root')
  )
);
