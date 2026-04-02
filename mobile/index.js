// Global patches — must run before any imports
// Fixes: "Cannot assign to property 'protocol' which has only a getter"
// This happens because socket.io-client tries to read window.location in RN

if (typeof global.location === 'undefined') {
  global.location = {
    protocol: 'https:',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    pathname: '/',
    search: '',
    hash: '',
    href: 'https://localhost/',
    origin: 'https://localhost',
  };
}

if (typeof global.window === 'undefined') {
  global.window = global;
}

if (typeof global.document === 'undefined') {
  global.document = {
    createElement: () => ({}),
    getElementsByTagName: () => [],
  };
}

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
