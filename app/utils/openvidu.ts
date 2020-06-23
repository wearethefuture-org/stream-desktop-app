import axios from 'axios';
import { SERVER_SECRET } from './store';

const createSession = async (baseURL: string, customSessionId: string) => {
  const data = JSON.stringify({ customSessionId });
  const headers = {
    Authorization: `Basic ${btoa(`OPENVIDUAPP:${SERVER_SECRET}`)}`,
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  try {
    const response = await axios.post('/api/sessions', data, {
      baseURL,
      headers,
      responseType: 'json'
    });

    return response.data['id'];
  } catch (error) {
    if (error.response.status === 409) return customSessionId;
    console.log(`Can't connect to the server: ${baseURL}`);
    throw error;
  }
};

export const getToken = async (baseURL: string, sessionName: string) => {
  const session = await createSession(baseURL, sessionName);
  const data = JSON.stringify({ session });
  const headers = {
    Authorization: `Basic ${btoa(`OPENVIDUAPP:${SERVER_SECRET}`)}`,
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  const response = await axios.post('/api/tokens', data, {
    baseURL,
    headers,
    responseType: 'json'
  });

  return response.data['token'];
};
