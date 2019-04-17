import React, { Component } from 'react';
import Login from './Login';
import Home from './Home';
import NotFound from './NotFound';
import {Route, Switch, BrowserRouter} from 'react-router-dom';

// import './App.css';


class App extends Component {
  render() {
    return ( 
    <BrowserRouter>
      <Switch>
        <Route exact path="/ui" component={Login} />
        <Route exact path="/ui/home" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </BrowserRouter>
    )
  }
}

export default App;
