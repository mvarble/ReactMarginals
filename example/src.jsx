import React from 'react';
import ReactDOM from 'react-dom';
// comment out next line if we want live updates
import { MarginalsInteractive } from '@mvarble/react-marginals';
// comment out next line if we want to test build
// import { MarginalsInteractive } from '../src';
import data from './data.json'


window.onload = () => {
  const dom = document.createElement('div');
  document.body.appendChild(dom);
  ReactDOM.render(<MarginalsInteractive data={ data } />, dom);
};
