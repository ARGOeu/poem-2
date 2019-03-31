import React from 'react';
import ReactDOM from 'react-dom';
import Aggregation_Profile from './Aggregation_Profile.js';
import Popup from 'react-popup';

ReactDOM.render(<Popup/>, document.getElementById('popupContainer'));
ReactDOM.render(<Aggregation_Profile django={window.props}/>, document.getElementById('react'));
