import React, { Component } from 'react';
import Login from './Login';
import MetricProfiles from './MetricProfiles';
import Home from './Home';
import Administration from './Administration';
import AggregationProfiles from './AggregationProfiles';
import Reports from './Reports';
import NotFound from './NotFound';
import {Route, Switch, BrowserRouter, Redirect} from 'react-router-dom';

// import './App.css';

const PrivateRoute = ({component: Component}, ...rest) => (
  <Route
    {...rest}
    render={props =>
        localStorage.getItem('authIsLogged') ? (
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
          <PrivateRoute exact path="/ui/reports" component={Reports} />
          <PrivateRoute exact path="/ui/metricprofiles" component={MetricProfiles} />
          <PrivateRoute exact path="/ui/aggregationprofiles" component={AggregationProfiles} />
          <PrivateRoute exact path="/ui/administration" component={Administration} />
          <Route component={NotFound} />
        </Switch>
      </BrowserRouter>
    )
  }
}

export default App;
