import React, { Component } from 'react';
import Login from './Login';
import MetricProfiles from './MetricProfiles';
import Home from './Home';
import Administration from './Administration';
import AggregationProfiles from './AggregationProfiles';
import Reports from './Reports';
import NotFound from './NotFound';
import {Route, Switch, BrowserRouter, Redirect, withRouter} from 'react-router-dom';
import {
  Container,
  Row, 
  Col} from 'reactstrap';
import {NavigationBar, NavigationLinks} from './UIElements';


// import './App.css';

const PrivateRoute = ({component: Component}, ...rest) => (
  !localStorage.getItem('authIsLogged') && 
  (
    <Route
      {...rest}
      render={props =>
        (
          <Redirect to={{
            pathname: '/ui/login',
            state: {from: props.location}
          }}/>
        )
      }
    />
  )
)


const LoginRoute = ({component: Component, onLogin}, ...rest) => (
  <Route
    {...rest}
    render={props =>
        <Component onLogin={onLogin} {...props} />
    }
  />
)


const LoggedRoute = ({component: Component, onLogout}, ...rest) => (
  <Route
    {...rest}
    render={props =>
      <Component onLogout={onLogout} {...props} />
    }
  />
)


const NavigationBarWithHistory = withRouter(NavigationBar);
const NavigationLinksWithLocation = withRouter(NavigationLinks);


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLogged: false 
    }
    this.onLogin = this.onLogin.bind(this);
    this.onLogout = this.onLogout.bind(this);
  }

  onLogin() {
    this.setState({isLogged: true})
  } 

  onLogout() {
    this.setState({isLogged: false})
  } 

  render() {
    return ( 
      !this.state.isLogged
      ?
        <BrowserRouter>
          <Switch>
            <LoginRoute exact path="/ui/login" component={Login} onLogin={this.onLogin}/>
            <PrivateRoute exact path="/ui/home" />
            <PrivateRoute exact path="/ui/reports" />
            <PrivateRoute exact path="/ui/metricprofiles" />
            <PrivateRoute exact path="/ui/aggregationprofiles" />
            <PrivateRoute exact path="/ui/administration" />
            <Route component={NotFound} />
          </Switch>
        </BrowserRouter>
      :
        <BrowserRouter>
          <Container fluid>
            <Row>
              <Col md="12">
                <NavigationBarWithHistory onLogout={this.onLogout} />
              </Col>
            </Row>
            <Row>
              <Col sm={{size: 3, order: 0}}>
                <NavigationLinksWithLocation />
              </Col>
              <Col>
                <Switch>
                  <LoggedRoute exact path="/ui/home" component={Home} />
                  <LoggedRoute exact path="/ui/reports" component={Reports} />
                  <LoggedRoute exact path="/ui/metricprofiles" component={MetricProfiles} />
                  <LoggedRoute exact path="/ui/aggregationprofiles" component={AggregationProfiles} />
                  <LoggedRoute exact path="/ui/administration" component={Administration} />
                  <Route component={NotFound} />
                </Switch>
              </Col>
            </Row>
          </Container>
        </BrowserRouter>
    )
  }
}

export default App;
