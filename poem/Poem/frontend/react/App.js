import React, { Component } from 'react';
import Login from './Login';
import { MetricProfilesChange, MetricProfilesList } from './MetricProfiles';
import Home from './Home';
import { ProbeList, ProbeChange, ProbeHistory, ProbeVersionCompare, ProbeVersionDetails, ProbeClone } from './Probes';
import { MetricList, MetricChange, MetricHistory, MetricVersonCompare, MetricVersionDetails } from './Metrics';
import {
  MetricTemplateList,
  MetricTemplateChange,
  MetricTemplateClone,
  TenantMetricTemplateList,
  MetricTemplateHistory,
  MetricTemplateVersionCompare,
  MetricTemplateVersionDetails,
  TenantMetricTemplateHistory
} from './MetricTemplates';
import { TenantAdministration, SuperAdminAdministration } from './Administration';
import { AggregationProfilesChange, AggregationProfilesList } from './AggregationProfiles';
import Reports from './Reports';
import Services from './Services';
import { UsersList, UserChange, SuperAdminUserChange } from './Users';
import {
  GroupOfMetricsList,
  GroupOfMetricsChange,
  GroupOfAggregationsList,
  GroupOfAggregationsChange,
  GroupOfMetricProfilesList,
  GroupOfMetricProfilesChange,
  GroupOfThresholdsProfilesList,
  GroupOfThresholdsProfilesChange
} from './GroupElements';
import { APIKeyList, APIKeyChange } from './APIKey';
import NotFound from './NotFound';
import { Route, Switch, BrowserRouter, Redirect, withRouter } from 'react-router-dom';
import { Container, Row, Col } from 'reactstrap';
import { NavigationBar, CustomBreadcrumb, NavigationLinks, Footer } from './UIElements';
import { NotificationContainer } from 'react-notifications';
import { Backend } from './DataManager';
import { YumRepoList, YumRepoChange } from './YumRepos';
import { ThresholdsProfilesList, ThresholdsProfilesChange } from './ThresholdProfiles';
import Cookies from 'universal-cookie';

import './App.css';
import { PackageList, PackageChange } from './Package';


const NavigationBarWithRouter = withRouter(NavigationBar);
const NavigationLinksWithRouter = withRouter(NavigationLinks);
const CustomBreadcrumbWithRouter = withRouter(CustomBreadcrumb);


const TenantRouteSwitch = ({webApiAggregation, webApiMetric, webApiThresholds, token, tenantName}) => (
  <Switch>
    <Route exact path="/ui/login" render={() => <Redirect to="/ui/home" />}/>
    <Route exact path="/ui/home" component={Home} />
    <Route exact path="/ui/services" component={Services} />
    <Route exact path="/ui/reports" component={Reports} />
    <Route exact path="/ui/probes" component={ProbeList} />
    <Route exact path="/ui/probes/:name/history" render={props => <ProbeHistory {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/compare/:id1/:id2" render={props => <ProbeVersionCompare {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/:version" render={props => <ProbeVersionDetails {...props}/>}/>
    <Route exact path="/ui/probes/:name" render={props => <ProbeChange {...props}/>}/>
    <Route exact path="/ui/metrics" component={MetricList} />
    <Route exact path="/ui/metrics/:name/history" render={props => <MetricHistory {...props}/>}/>
    <Route exact path="/ui/metrics/:name/history/compare/:id1/:id2" render={props => <MetricVersonCompare {...props}/>}/>
    <Route exact path="/ui/metrics/:name/history/:version" render={props => <MetricVersionDetails {...props}/>}/>
    <Route exact path="/ui/metrics/:name" render={props => <MetricChange {...props}/>}/>
    <Route exact path="/ui/metricprofiles" component={MetricProfilesList} />
    <Route exact path="/ui/metricprofiles/add"
      render={props => <MetricProfilesChange
        {...props}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}
        addview={true}/>}
      />
    <Route exact path="/ui/metricprofiles/:name"
      render={props => <MetricProfilesChange
        {...props}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}/>}
      />
    <Route exact path="/ui/aggregationprofiles" component={AggregationProfilesList} />
    <Route exact path="/ui/aggregationprofiles/add"
      render={props => <AggregationProfilesChange
        {...props}
        webapiaggregation={webApiAggregation}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}
        addview={true}/>}
      />
    <Route exact path="/ui/aggregationprofiles/:name"
      render={props => <AggregationProfilesChange
        {...props}
        webapiaggregation={webApiAggregation}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}/>}
      />
    <Route exact path="/ui/administration" component={TenantAdministration} />
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
    <Route exact path='/ui/administration/metrictemplates/' component={TenantMetricTemplateList}/>
    <Route exact path='/ui/administration/metrictemplates/:name'
      render={props => <MetricTemplateChange {...props} tenantview={true}/>}
    />
    <Route exact path='/ui/administration/metrictemplates/:name/history' render={props => <TenantMetricTemplateHistory {...props}/>}/>
    <Route exact path='/ui/administration/metrictemplates/:name/history/compare/:id1/:id2' render={props => <MetricTemplateVersionCompare {...props}/>}/>
    <Route exact path='/ui/administration/metrictemplates/:name/history/:version' render={props => <MetricTemplateVersionDetails {...props}/>}/>
    <Route exact path="/ui/administration/apikey/:name"
      render={props => <APIKeyChange {...props} />}
    />
    <Route exact path='/ui/administration/yumrepos/' component={YumRepoList}/>
    <Route exact path='/ui/administration/yumrepos/:name'
      render={props => <YumRepoChange {...props} disabled={true}/>}
    />
    <Route exact path="/ui/administration/groupofthresholdsprofiles" component={GroupOfThresholdsProfilesList} />
    <Route exact path="/ui/administration/groupofthresholdsprofiles/add"
      render={props => <GroupOfThresholdsProfilesChange
        {...props}
        addview={true}/>}
    />
    <Route exact path="/ui/administration/groupofthresholdsprofiles/:group"
      render={props => <GroupOfThresholdsProfilesChange {...props}/>}
    />
    <Route exact path="/ui/thresholdsprofiles" component={ThresholdsProfilesList} />
    <Route exact path="/ui/thresholdsprofiles/add"
      render={props => <ThresholdsProfilesChange
        {...props}
        webapithresholds={webApiThresholds}
        webapitoken={token}
        tenantname={tenantName}
        addview={true}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:name"
      render={props => <ThresholdsProfilesChange
        {...props}
        webapithresholds={webApiThresholds}
        webapitoken={token}
        tenantname={tenantName}/>}
    />
    <Route component={NotFound} />
  </Switch>
)


const SuperAdminRouteSwitch = ({props}) => (
  <Switch>
    <Route exact path="/ui/login" render={() => <Redirect to="/ui/home" />}/>
    <Route exact path="/ui/home" component={Home} />
    <Route exact path="/ui/probes" component={ProbeList} />
    <Route exact path="/ui/probes/add" render={props => <ProbeChange {...props} addview={true}/>}/>
    <Route exact path='/ui/probes/:name/clone' render={props => <ProbeClone {...props}/>}/>
    <Route exact path="/ui/probes/:name/history" render={props => <ProbeHistory {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/compare/:id1/:id2" render={props => <ProbeVersionCompare {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/:version" render={props => <ProbeVersionDetails {...props}/>}/>
    <Route exact path="/ui/probes/:name" render={props => <ProbeChange {...props}/>}/>
    <Route exact path='/ui/metrictemplates' component={MetricTemplateList}/>
    <Route exact path='/ui/metrictemplates/add' render={props => <MetricTemplateChange {...props} addview={true}/>}/>
    <Route exact path='/ui/metrictemplates/:name/clone' render={props => <MetricTemplateClone {...props}/>}/>
    <Route exact path='/ui/metrictemplates/:name/history' render={props => <MetricTemplateHistory {...props}/>}/>
    <Route exact path='/ui/metrictemplates/:name/history/compare/:id1/:id2' render={props => <MetricTemplateVersionCompare {...props}/>}/>
    <Route exact path='/ui/metrictemplates/:name/history/:version' render={props => <MetricTemplateVersionDetails {...props}/>}/>
    <Route exact path='/ui/metrictemplates/:name' render={props => <MetricTemplateChange {...props}/>}/>
    <Route exact path='/ui/yumrepos/' render={props => <YumRepoList {...props}/>}/>
    <Route exact path='/ui/yumrepos/add' render={props => <YumRepoChange addview={true} {...props}/>}/>
    <Route exact path='/ui/yumrepos/:name' render={props => <YumRepoChange {...props}/>}/>
    <Route exact path='/ui/packages/' render={props => <PackageList {...props}/>}/>
    <Route exact path='/ui/packages/add' render={props => <PackageChange addview={true} {...props}/>}/>
    <Route exact path='/ui/packages/:nameversion' render={props => <PackageChange {...props}/>}/>
    <Route exact path="/ui/administration" component={SuperAdminAdministration}/>
    <Route exact path="/ui/administration/users" component={UsersList} />
    <Route exact path="/ui/administration/users/add"
      render={props => <SuperAdminUserChange
        {...props}
        addview={true}/>}
    />
    <Route exact path="/ui/administration/users/:user_name"
      render={props => <SuperAdminUserChange {...props}/>}
    />
    <Route component={NotFound} />
  </Switch>
)


class App extends Component {
  constructor(props) {
    super(props);

    this.cookies = new Cookies();
    this.backend = new Backend();

    this.state = {
      isLogged: localStorage.getItem('authIsLogged') ? true : false,
      isSessionActive: undefined,
      areYouSureModal: false,
      webApiAggregation: undefined,
      webApiMetric: undefined,
      webApiThresholds: undefined,
      tenantName: undefined,
      token: undefined,
      isTenantSchema: null
    };

    this.onLogin = this.onLogin.bind(this);
    this.onLogout = this.onLogout.bind(this);
    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.flushStorage = this.flushStorage.bind(this);
  }

  onLogin(json, history) {
    localStorage.setItem('authUsername', json.username);
    localStorage.setItem('authIsLogged', true);
    localStorage.setItem('authFirstName', json.first_name);
    localStorage.setItem('authLastName', json.last_name);
    localStorage.setItem('authIsSuperuser', json.is_superuser);
    this.backend.isTenantSchema().then((isTenantSchema) =>
      this.initalizeState(isTenantSchema, true, true)).then(
        setTimeout(() => {
          history.push('/ui/home');
        }, 50
      )).then(this.cookies.set('poemActiveSession', true))
  }

  flushStorage() {
    localStorage.removeItem('authUsername');
    localStorage.removeItem('authIsLogged');
    localStorage.removeItem('authFirstName');
    localStorage.removeItem('authLastName');
    localStorage.removeItem('authIsSuperuser');
    this.cookies.remove('poemActiveSession')
  }

  onLogout() {
    this.flushStorage()
    this.setState({isLogged: false, isSessionActive: false});
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
    return fetch('/api/v2/internal/apikeys/WEB-API')
      .then(response => response.ok ? response.json() : null)
      .then(json => json['token'])
      .catch(err => alert('Something went wrong: ' + err))
  }

  initalizeState(poemType, activeSession, isLogged) {
    if (poemType) {
      return Promise.all([this.fetchToken(), this.fetchConfigOptions()])
        .then(([token, options]) => {
          this.setState({
            isTenantSchema: poemType,
            isSessionActive: activeSession,
            isLogged: isLogged,
            token: token,
            webApiMetric: options && options.result.webapimetric,
            webApiAggregation: options && options.result.webapiaggregation,
            webApiThresholds: options && options.result.webapithresholds,
            tenantName: options && options.result.tenant_name,
          })
        })
    }
    else {
      this.setState({
        isTenantSchema: poemType,
        isSessionActive: activeSession,
        isLogged: isLogged,
      })
    }
  }

  componentDidMount() {
    this.backend.isTenantSchema().then((isTenantSchema) => {
      this.state.isLogged && this.backend.isActiveSession().then(active => {
        if (active) {
          this.initalizeState(isTenantSchema, active, this.state.isLogged)
        }
        else
          this.flushStorage()
      })
    })
  }

  render() {
    let cookie = this.cookies.get('poemActiveSession')

    if (!cookie || !this.state.isLogged) {
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
              path="/ui/(home|services|probes|reports|probes|metrics|metricprofiles|aggregationprofiles|administration|metrictemplates|yumrepos)"
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
    else if (this.state.isLogged && cookie &&
      this.state.isTenantSchema !== null) {

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
              <Col sm={{size: 2}} md={{size: 2}} id="sidebar-col" className="d-flex flex-column">
                <NavigationLinksWithRouter isTenantSchema={this.state.isTenantSchema}/>
                <div id="sidebar-grow" className="flex-grow-1 border-left border-right rounded-bottom"/>
              </Col>
              <Col>
                <CustomBreadcrumbWithRouter />
                {this.state.isTenantSchema ?
                  <TenantRouteSwitch
                    webApiMetric={this.state.webApiMetric}
                    webApiAggregation={this.state.webApiAggregation}
                    webApiThresholds={this.state.webApiThresholds}
                    token={this.state.token}
                    tenantName={this.state.tenantName}/>
                 :
                 <SuperAdminRouteSwitch/>
                }
              </Col>
            </Row>
            <Row>
              <Col>
                <Footer loginPage={false}/>
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
