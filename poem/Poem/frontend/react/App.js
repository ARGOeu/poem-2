import React, { Component } from 'react';
import Login from './Login';
import MetricProfiles from './MetricProfiles';
import Home from './Home';
import Administration from './Administration';
import {AggregationProfilesChange, AggregationProfilesList} from './AggregationProfiles';
import Reports from './Reports';
import Services from './Services';
import NotFound from './NotFound';
import {Route, Switch, BrowserRouter, Redirect, withRouter} from 'react-router-dom';
import {Container, Button, Row, Col} from 'reactstrap';
import {NavigationBar, NavigationLinks, Footer} from './UIElements';

import './App.css';


const NavigationBarWithHistory = withRouter(NavigationBar);
const NavigationLinksWithLocation = withRouter(NavigationLinks);


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLogged: localStorage.getItem('authIsLogged') ? true : false,
      areYouSureModal: false,
      webApiAggregation: undefined,
      webApiMetric: undefined,
      tenantName: undefined,
      token: undefined,
    };

    this.onLogin = this.onLogin.bind(this);
    this.onLogout = this.onLogout.bind(this);
    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
  }

  onLogin(json) {
    localStorage.setItem('authUsername', json.username);
    localStorage.setItem('authIsLogged', true);
    localStorage.setItem('authFirstName', json.first_name);
    localStorage.setItem('authLastName', json.last_name);
    localStorage.setItem('authIsSuperuser', json.is_superuser);
    this.setState({isLogged: true});
  } 

  onLogout() {
    localStorage.removeItem('authUsername');
    localStorage.removeItem('authIsLogged');
    localStorage.removeItem('authFirstName');
    localStorage.removeItem('authLastName');
    localStorage.removeItem('authIsSuperuser');
    this.setState({isLogged: false});
  } 

  toggleAreYouSure() {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal}));
  }

  fetchConfigOptions() {
    return fetch('/api/v2/internal/config_options')
      .then(response => response.json())
      .catch(err => console.log('Something went wrong: ' + err));
  }

  fetchToken() {
    return fetch('/api/v2/internal/tokens/WEB-API')
      .then(response => response.json())
      .catch(err => console.log('Something went wrong: ' + err))
  }

  componentDidMount() {
    Promise.all([this.fetchToken(), this.fetchConfigOptions()])
      .then(([token, options]) => {
        this.setState({
          token: token,
          webApiMetric: options.result.webapimetric,
          webApiAggregation: options.result.webapiaggregation,
          tenantName: options.result.tenant_name
        })
      })
  }

  render() {
    if (!this.state.isLogged) {
      return (
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
              path="/ui/(home|services|reports|metricprofiles|aggregationprofiles|administration)"
              render={props => (
                <Redirect to={{
                  pathname: '/ui/login',
                  state: {from: props.location}
                }}/>
              )}/>
            <Route component={NotFound} />
          </Switch>
        </BrowserRouter>
      )
    }
    else if (this.state.isLogged && this.state.token &&
      this.state.tenantName && this.state.webApiMetric && 
      this.state.webApiAggregation) {

      return ( 
        <BrowserRouter>
          <Container fluid>
            <Row>
              <Col>
                <NavigationBarWithHistory 
                  onLogout={this.onLogout}
                  isOpenModal={this.state.areYouSureModal}
                  toggle={this.toggleAreYouSure}
                  titleModal='Log out'
                  msgModal='Are you sure you want to log out?'/>
              </Col>
            </Row>
            <Row className="no-gutters">
              <Col sm={{size: 2}} md={{size: 2}} className="d-flex flex-column">
                <NavigationLinksWithLocation />
                <div id="sidebar-grow" className="flex-grow-1 border-left border-right rounded-bottom"/>
              </Col>
              <Col>
                <Switch>
                  <Route exact path="/ui/home" component={Home} />
                  <Route exact path="/ui/services" component={Services} />
                  <Route exact path="/ui/reports" component={Reports} />
                  <Route exact path="/ui/metricprofiles" component={MetricProfiles} />
                  <Route exact path="/ui/aggregationprofiles" component={AggregationProfilesList} />
                  <Route exact path="/ui/aggregationprofiles/change/:id" 
                    render={props => <AggregationProfilesChange 
                      {...props} 
                      webapiaggregation={this.state.webApiAggregation} 
                      webapimetric={this.state.webApiMetric}
                      webapitoken={this.state.token}
                      tenantname={this.state.tenantName}/>} 
                    />
                  <Route exact path="/ui/administration" component={Administration} />
                  <Route component={NotFound} />
                </Switch>
              </Col>
            </Row>
            <Row>
              <Col>
                <Footer addBorder={true}/>
              </Col>
            </Row>
          </Container>
        </BrowserRouter>
      )
    }
    else 
      return null
  }
}

export default App;
