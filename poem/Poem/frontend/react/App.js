import React, { Component } from 'react';
import Login from './Login';
import {Route, Link, BrowserRouter} from 'react-router-dom';

// import './App.css';


class App extends Component {
  render() {
    return ( 
    <BrowserRouter>
      <Switch>
        <Route exact path="/" component={Login} />
      </Switch>
    </BrowserRouter>
    )
  }
}

export default App;
