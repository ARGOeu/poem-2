import React, { Component } from 'react';
import Login from './Login';
import MetricProfiles from './MetricProfiles';
import Home from './Home';
import Administration from './Administration';
import AggregationProfiles from './AggregationProfiles';
import Reports from './Reports';
import NotFound from './NotFound';
import {Route, Switch, BrowserRouter, Redirect, withRouter} from 'react-router-dom';
import {Container, Row, Col} from 'reactstrap';
import {NavigationBar, NavigationLinks} from './UIElements';


const NavigationBarWithHistory = withRouter(NavigationBar);
const NavigationLinksWithLocation = withRouter(NavigationLinks);


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLogged: false 
    };

    this.onLogin = this.onLogin.bind(this);
    this.onLogout = this.onLogout.bind(this);
  }

  onLogin() {
    this.setState({isLogged: true});
  } 

  onLogout() {
    this.setState({isLogged: false});
  } 

  render() {
    return ( 
      !this.state.isLogged
      ?
        <BrowserRouter>
          <Switch>
            <Route 
              exact 
              path="/ui/login"
              render={props =>
                  <Login onLogin={this.onLogin} {...props} />
              }
            />
            <Route
              exact 
              path="/ui/(home|reports|metricprofiles|aggregationprofiles|administration)"
              render={props => (
                <Redirect to={{
                  pathname: '/ui/login',
                  state: {from: props.location}
                }}/>
              )}/>
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
                  <Route exact path="/ui/home" component={Home} />
                  <Route exact path="/ui/reports" component={Reports} />
                  <Route exact path="/ui/metricprofiles" component={MetricProfiles} />
                  <Route exact path="/ui/aggregationprofiles" component={AggregationProfiles} />
                  <Route exact path="/ui/administration" component={Administration} />
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
