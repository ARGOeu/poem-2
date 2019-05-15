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
import {Container, Row, Col} from 'reactstrap';
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
    };

    this.onLogin = this.onLogin.bind(this);
    this.onLogout = this.onLogout.bind(this);
    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
  }

  onLogin(json) {
    this.setState({isLogged: true});
    localStorage.setItem('authUsername', json.username);
    localStorage.setItem('authIsLogged', true);
    localStorage.setItem('authFirstName', json.first_name);
    localStorage.setItem('authLastName', json.last_name);
    localStorage.setItem('authIsSuperuser', json.is_superuser);
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
      :
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
              <Col sm={{size: 2}} className="d-flex flex-column">
                <NavigationLinksWithLocation />
                <div id="sidebar-grow" className="flex-grow-1 border-left border-right rounded-bottom"/>
              </Col>
              <Col>
                <div id="argo-contentwrap" className="m-2 p-2">
                  <Switch>
                    <Route exact path="/ui/home" component={Home} />
                    <Route exact path="/ui/services" component={Services} />
                    <Route exact path="/ui/reports" component={Reports} />
                    <Route exact path="/ui/metricprofiles" component={MetricProfiles} />
                    <Route exact path="/ui/aggregationprofiles" component={AggregationProfilesList} />
                    <Route exact path="/ui/aggregationprofiles/change/:id" component={AggregationProfilesChange} />
                    <Route exact path="/ui/administration" component={Administration} />
                    <Route component={NotFound} />
                  </Switch>
                </div>
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
}

export default App;
