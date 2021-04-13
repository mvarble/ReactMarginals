import React from 'react';
import ReactDOM from 'react-dom';
import Marginals from '../src.jsx';
import data from './data.json'


window.onload = () => {
  const dom = document.createElement('div');
  document.body.appendChild(dom);
  ReactDOM.render(<Marginals data={ data } />, dom);
};
