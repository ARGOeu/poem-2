import React, { Component } from 'react';
import Login from './Login';
import Home from './Home';
import NotFound from './NotFound';
import {Route, Switch, BrowserRouter, Redirect} from 'react-router-dom';

// import './App.css';

const PrivateRoute = ({component: Component}, ...rest) => (
  <Route
    {...rest}
    render={props =>
        localStorage.getItem('auth_logged') ? (
          <Component {...props}/>
        )
          : (
            <Redirect to={{
              pathname: '/ui/login',
              state: {from: props.location}
            }}/>
          )
    }/>
)


class App extends Component {
  render() {
    return ( 
    <BrowserRouter>
      <Switch>
        <Route exact path="/ui/login" component={Login} />
        <PrivateRoute exact path="/ui/home" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </BrowserRouter>
    )
  }
}

export default App;
