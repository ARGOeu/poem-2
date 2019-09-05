import React, { Component } from 'react';
import Login from './Login';
import { MetricProfilesChange, MetricProfilesList } from './MetricProfiles';
import Home from './Home';
import { ProbeList, ProbeDetails, ProbeHistory, ProbeVersionCompare, ProbeVersionDetails } from './Probes';
import { MetricList, MetricChange } from './Metrics';
import Administration from './Administration';
import { AggregationProfilesChange, AggregationProfilesList } from './AggregationProfiles';
import Reports from './Reports';
import Services from './Services';
import { UsersList, UserChange } from './Users';
import { GroupOfMetricsList, GroupOfMetricsChange, GroupOfAggregationsList, GroupOfAggregationsChange, GroupOfMetricProfilesList, GroupOfMetricProfilesChange } from './GroupElements';
import { APIKeyList, APIKeyChange } from './APIKey';
import NotFound from './NotFound';
import { Route, Switch, BrowserRouter, Redirect, withRouter } from 'react-router-dom';
import { Container, Button, Row, Col } from 'reactstrap';
import { NavigationBar, CustomBreadcrumb, NavigationLinks, Footer } from './UIElements';
import { NotificationContainer, NotificationManager } from 'react-notifications';

import './App.css';


const NavigationBarWithRouter = withRouter(NavigationBar);
const NavigationLinksWithRouter = withRouter(NavigationLinks);
const CustomBreadcrumbWithRouter = withRouter(CustomBreadcrumb);

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
      .then(response => {
        if (response.ok)
          return response.json();
      })
  }

  fetchToken() {
    return fetch('/api/v2/internal/tokens/WEB-API')
      .then(response => response.ok ? response.json() : null)
      .then(json => json['token'])
      .catch(err => alert('Something went wrong: ' + err))
  }

  componentDidMount() {
    this.state.isLogged && Promise.all([this.fetchToken(), this.fetchConfigOptions()])
      .then(([token, options]) => {
        this.setState({
          token: token,
          webApiMetric: options.result.webapimetric,
          webApiAggregation: options.result.webapiaggregation,
          tenantName: options.result.tenant_name
        })
      })
  }

  componentDidUpdate(prevProps, prevState) {
    // Intentional push to /ui/home route again if history.push 
    // from Login does not trigger rendering of Home 
    if (this.state.isLogged !== prevState.isLogged && 
      this.state.token === undefined)
      window.location = '/ui/home';
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
              <NotificationContainer />
              <Col>
                <NavigationBarWithRouter 
                  onLogout={this.onLogout}
                  isOpenModal={this.state.areYouSureModal}
                  toggle={this.toggleAreYouSure}
                  titleModal='Log out'
                  msgModal='Are you sure you want to log out?'/>
              </Col>
            </Row>
            <Row className="no-gutters">
              <Col sm={{size: 2}} md={{size: 2}} className="d-flex flex-column">
                <NavigationLinksWithRouter />
                <div id="sidebar-grow" className="flex-grow-1 border-left border-right rounded-bottom"/>
              </Col>
              <Col>
                <CustomBreadcrumbWithRouter />
                <Switch>
                  <Route exact path="/ui/home" component={Home} />
                  <Route exact path="/ui/services" component={Services} />
                  <Route exact path="/ui/reports" component={Reports} />
                  <Route exact path="/ui/probes" component={ProbeList} />
                  <Route exact path="/ui/probes/:name/history" render={props => <ProbeHistory {...props}/>}/>
                  <Route exact path="/ui/probes/:name/history/compare/:id1/:id2" render={props => <ProbeVersionCompare {...props}/>}/>
                  <Route exact path="/ui/probes/:name/history/:version" render={props => <ProbeVersionDetails {...props}/>}/>
                  <Route exact path="/ui/probes/:name" render={props => <ProbeDetails {...props}/>}/>
                  <Route exact path="/ui/metrics" component={MetricList} />
                  <Route exact path="/ui/metrics/:name" render={props => <MetricChange {...props}/>}/>
                  <Route exact path="/ui/metricprofiles" component={MetricProfilesList} />
                  <Route exact path="/ui/metricprofiles/add" 
                    render={props => <MetricProfilesChange 
                      {...props}
                      webapimetric={this.state.webApiMetric}
                      webapitoken={this.state.token}
                      tenantname={this.state.tenantName}
                      addview={true}/>}
                    />
                  <Route exact path="/ui/metricprofiles/:name" 
                    render={props => <MetricProfilesChange 
                      {...props}
                      webapimetric={this.state.webApiMetric}
                      webapitoken={this.state.token}
                      tenantname={this.state.tenantName}/>}
                    />
                  <Route exact path="/ui/aggregationprofiles" component={AggregationProfilesList} />
                  <Route exact path="/ui/aggregationprofiles/add"
                    render={props => <AggregationProfilesChange 
                      {...props} 
                      webapiaggregation={this.state.webApiAggregation} 
                      webapimetric={this.state.webApiMetric}
                      webapitoken={this.state.token}
                      tenantname={this.state.tenantName}
                      addview={true}/>} 
                    />
                  <Route exact path="/ui/aggregationprofiles/:name" 
                    render={props => <AggregationProfilesChange 
                      {...props} 
                      webapiaggregation={this.state.webApiAggregation} 
                      webapimetric={this.state.webApiMetric}
                      webapitoken={this.state.token}
                      tenantname={this.state.tenantName}/>} 
                    />
                  <Route exact path="/ui/administration" component={Administration} />
                  <Route exact path="/ui/administration/users" component={UsersList} />
                  <Route exact path="/ui/administration/users/add"
                    render={props => <UserChange
                      {...props}
                      addview={true}/>}
                  />
                  <Route exact path="/ui/administration/users/:user_name"
                    render={props => <UserChange {...props}/>}
                  />
                  <Route exact path="/ui/administration/groupofmetrics" component={GroupOfMetricsList} />
                  <Route exact path="/ui/administration/groupofmetrics/add"
                    render={props => <GroupOfMetricsChange
                      {...props}
                      addview={true}/>}
                  />
                  <Route exact path="/ui/administration/groupofmetrics/:group"
                    render={props => <GroupOfMetricsChange {...props}/>}
                  />
                  <Route exact path="/ui/administration/groupofaggregations" component={GroupOfAggregationsList} />
                  <Route exact path="/ui/administration/groupofaggregations/add"
                    render={props => <GroupOfAggregationsChange
                      {...props}
                      addview={true}/>}
                  />
                  <Route exact path="/ui/administration/groupofaggregations/:group"
                    render={props => <GroupOfAggregationsChange {...props}/>}
                  />
                  <Route exact path="/ui/administration/groupofmetricprofiles" component={GroupOfMetricProfilesList} />
                  <Route exact path="/ui/administration/groupofmetricprofiles/add"
                    render={props => <GroupOfMetricProfilesChange
                      {...props}
                      addview={true}/>}
                  />
                  <Route exact path="/ui/administration/groupofmetricprofiles/:group"
                    render={props => <GroupOfMetricProfilesChange {...props}/>}
                  />
                  <Route exact path="/ui/administration/apikey" component={APIKeyList} />
                  <Route exact path="/ui/administration/apikey/add"  
                    render={props => <APIKeyChange {...props} addview={true}/>}
                  />
                  <Route exact path="/ui/administration/apikey/:name"  
                    render={props => <APIKeyChange {...props} />}
                  />
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
