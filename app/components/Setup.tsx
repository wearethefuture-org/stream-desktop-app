import React from 'react';
import { FormControl, TextField, Button, makeStyles, Paper } from '@material-ui/core';
import { SERVER_ADDRESS_KEY, SESSION_KEY } from '../utils/store';
import { useElectronStore } from '../utils/store';
import { useHistory } from 'react-router';
import { HOME_PATH } from '../utils/paths';

const useStyles = makeStyles({
  root: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    padding: '50px'
  }
});

const Setup: React.FC = () => {
  const classes = useStyles();
  const history = useHistory();

  const [serverAddress, setServerAddress] = useElectronStore(SERVER_ADDRESS_KEY, '');
  const [sessionName, setSessionName] = useElectronStore(SESSION_KEY, '');

  const withEvent = (fn: any) => (event: any) => {
    fn(event.target.value);
  };

  return (
    <Paper elevation={3} className={classes.root}>
      <FormControl>
        <TextField value={serverAddress} label='Server Address' required onInput={withEvent(setServerAddress)} />
        <TextField value={sessionName} label='Session Name' required onInput={withEvent(setSessionName)} />
        <Button onClick={() => history.push(HOME_PATH)}>Connect</Button>
      </FormControl>
    </Paper>
  );
};

export default Setup;
