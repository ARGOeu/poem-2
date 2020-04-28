import React, { Component } from 'react';
import Login from './Login';
import {
  MetricProfileHistory,
  MetricProfileVersionCompare,
  MetricProfileVersionDetails,
  MetricProfilesChange,
  MetricProfilesClone,
  MetricProfilesList
} from './MetricProfiles';
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
import { AggregationProfilesChange, AggregationProfilesList, AggregationProfileHistory, AggregationProfileVersionCompare, AggregationProfileVersionDetails } from './AggregationProfiles';
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
import { NavigationBar, CustomBreadcrumb, NavigationLinks, Footer, PublicPage} from './UIElements';
import { NotificationContainer } from 'react-notifications';
import { Backend } from './DataManager';
import { YumRepoList, YumRepoChange, YumRepoClone } from './YumRepos';
import { ThresholdsProfilesList, ThresholdsProfilesChange, ThresholdsProfilesHistory, ThresholdsProfileVersionCompare, ThresholdsProfileVersionDetail } from './ThresholdProfiles';
import Cookies from 'universal-cookie';

import './App.css';
import { PackageList, PackageChange } from './Package';


const NavigationBarWithRouter = withRouter(NavigationBar);
const NavigationLinksWithRouter = withRouter(NavigationLinks);
const CustomBreadcrumbWithRouter = withRouter(CustomBreadcrumb);


const SuperUserRoute = ({isSuperUser, ...props}) => (
  isSuperUser ?
    <Route {...props} />
  :
    <Route component={NotFound} />
)


const AddRoute = ({usergroups, ...props}) => (
  usergroups.length > 0 ?
    <Route {...props} />
  :
    <Route component={NotFound} />
);


const RedirectAfterLogin = ({isSuperUser, ...props}) => {
  let last = ''
  let before_last = ''
  let destination = ''
  let referrer = localStorage.getItem('referrer')

  if (isSuperUser)
    destination = "/ui/administration"
  else
    destination = "/ui/metricprofiles"

  if (referrer) {
    let urls = JSON.parse(referrer)

    if (urls.length === 1) {
      last = urls.pop()
      before_last = last
    }
    else {
      last = urls.pop()
      before_last = urls.pop()
    }
  }

  if (last !== before_last)
    destination = before_last

  localStorage.removeItem('referrer')

  return <Redirect to={destination}/>
}


const TenantRouteSwitch = ({webApiAggregation, webApiMetric, webApiThresholds, token, tenantName, isSuperUser, userGroups}) => (
  <Switch>
    <Route exact path="/ui/login" render={props => <RedirectAfterLogin isSuperUser={isSuperUser} {...props}/>}/>
    <Route exact path="/ui/home" component={Home} />
    <Route exact path="/ui/services" component={Services} />
    <Route exact path="/ui/reports" component={Reports} />
    <Route exact path="/ui/probes" component={ProbeList} />
    <Route exact path="/ui/probes/:name/history" render={props => <ProbeHistory {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/compare/:id1/:id2" render={props => <ProbeVersionCompare {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/:version" render={props => <ProbeVersionDetails {...props}/>}/>
    <Route exact path="/ui/probes/:name/:metrictemplatename"
      render={props => <MetricTemplateChange {...props} tenantview={true} probeview={true}/>}
    />
    <Route exact path="/ui/probes/:name" render={props => <ProbeChange {...props}/>}/>
    <Route exact path="/ui/metrics" component={MetricList} />
    <Route exact path="/ui/metrics/:name/history" render={props => <MetricHistory {...props}/>}/>
    <Route exact path="/ui/metrics/:name/history/compare/:id1/:id2" render={props => <MetricVersonCompare {...props}/>}/>
    <Route exact path="/ui/metrics/:name/history/:version" render={props => <MetricVersionDetails {...props}/>}/>
    <Route exact path="/ui/metrics/:name" render={props => <MetricChange {...props}/>}/>
    <Route exact path="/ui/metricprofiles" component={MetricProfilesList} />
    <AddRoute usergroups={userGroups.metricprofiles} exact path="/ui/metricprofiles/add"
      render={props => <MetricProfilesChange
        {...props}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}
        addview={true}/>}
      />
    <Route exact path="/ui/metricprofiles/:apiid"
      render={props => <MetricProfilesChange
        {...props}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}/>}
    />
    <Route exact path="/ui/metricprofiles/:apiid/clone"
      render={props => <MetricProfilesClone
        {...props}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}/>}
    />
    <Route exact path="/ui/metricprofiles/:apiid/history"
      render={props => <MetricProfileHistory {...props}/>}
    />
    <Route exact path="/ui/metricprofiles/:apiid/history/compare/:id1/:id2"
      render={props => <MetricProfileVersionCompare {...props}/>}
    />
    <Route exact path="/ui/metricprofiles/:apiid/history/:version"
      render={props => <MetricProfileVersionDetails {...props}/>}
    />
    <Route exact path="/ui/aggregationprofiles" component={AggregationProfilesList} />
    <AddRoute usergroups={userGroups.aggregations} exact path="/ui/aggregationprofiles/add"
      render={props => <AggregationProfilesChange
        {...props}
        webapiaggregation={webApiAggregation}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}
        addview={true}/>}
      />
    <Route exact path="/ui/aggregationprofiles/:apiid"
      render={props => <AggregationProfilesChange
        {...props}
        webapiaggregation={webApiAggregation}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}/>}
      />
    <Route exact path="/ui/aggregationprofiles/:apiid/history"
      render={props => <AggregationProfileHistory {...props}/>}
    />
    <Route exact path="/ui/aggregationprofiles/:apiid/history/compare/:id1/:id2"
      render={props => <AggregationProfileVersionCompare {...props}/>}
    />
    <Route exact path="/ui/aggregationprofiles/:apiid/history/:version"
      render={props => <AggregationProfileVersionDetails {...props}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration" component={TenantAdministration} />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/users" component={UsersList} />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/users/add"
      render={props => <UserChange
        {...props}
        addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/users/:user_name"
      render={props => <UserChange {...props}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetrics" component={GroupOfMetricsList} />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetrics/add"
      render={props => <GroupOfMetricsChange
        {...props}
        addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetrics/:group"
      render={props => <GroupOfMetricsChange {...props}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofaggregations" component={GroupOfAggregationsList} />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofaggregations/add"
      render={props => <GroupOfAggregationsChange
        {...props}
        addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofaggregations/:group"
      render={props => <GroupOfAggregationsChange {...props}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetricprofiles" component={GroupOfMetricProfilesList} />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetricprofiles/add"
      render={props => <GroupOfMetricProfilesChange
        {...props}
        addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetricprofiles/:group"
      render={props => <GroupOfMetricProfilesChange {...props}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/apikey" component={APIKeyList} />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/apikey/add"
      render={props => <APIKeyChange {...props} addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/metrictemplates/' component={TenantMetricTemplateList}/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/metrictemplates/:name'
      render={props => <MetricTemplateChange {...props} tenantview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/metrictemplates/:name/history' render={props => <TenantMetricTemplateHistory {...props}/>}/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/metrictemplates/:name/history/compare/:id1/:id2' render={props => <MetricTemplateVersionCompare {...props}/>}/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/metrictemplates/:name/history/:version' render={props => <MetricTemplateVersionDetails {...props}/>}/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/apikey/:name"
      render={props => <APIKeyChange {...props} />}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/yumrepos/' component={YumRepoList}/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/yumrepos/:name'
      render={props => <YumRepoChange {...props} disabled={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofthresholdsprofiles" component={GroupOfThresholdsProfilesList} />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofthresholdsprofiles/add"
      render={props => <GroupOfThresholdsProfilesChange
        {...props}
        addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofthresholdsprofiles/:group"
      render={props => <GroupOfThresholdsProfilesChange {...props}/>}
    />
    <Route exact path="/ui/thresholdsprofiles" component={ThresholdsProfilesList} />
    <AddRoute usergroups={userGroups.thresholdsprofiles} exact path="/ui/thresholdsprofiles/add"
      render={props => <ThresholdsProfilesChange
        {...props}
        webapithresholds={webApiThresholds}
        webapitoken={token}
        tenantname={tenantName}
        addview={true}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:apiid"
      render={props => <ThresholdsProfilesChange
        {...props}
        webapithresholds={webApiThresholds}
        webapitoken={token}
        tenantname={tenantName}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:apiid/history"
      render={props => <ThresholdsProfilesHistory {...props}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:apiid/history/compare/:id1/:id2"
      render={props => <ThresholdsProfileVersionCompare {...props}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:apiid/history/:version"
      render={props => <ThresholdsProfileVersionDetail {...props}/>}
    />
    <Route component={NotFound} />
  </Switch>
)


const SuperAdminRouteSwitch = ({props}) => (
  <Switch>
    <Route exact path="/ui/login" render={() => <Redirect to="/ui/administration" />}/>
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
    <Route exact path='/ui/yumrepos/:name/clone' render={props => <YumRepoClone {...props}/>}/>
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
      isSessionActive: undefined,
      areYouSureModal: false,
      userDetails: undefined,
      webApiAggregation: undefined,
      webApiMetric: undefined,
      webApiThresholds: undefined,
      publicView: undefined,
      tenantName: undefined,
      token: undefined,
      isTenantSchema: null
    };

    this.onLogin = this.onLogin.bind(this);
    this.onLogout = this.onLogout.bind(this);
    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
  }

  async onLogin(json) {
    let response = new Object({
      active: true,
      userdetails: json
    })

    let isTenantSchema = await this.backend.isTenantSchema();
    let initialState = await this.initalizeState(isTenantSchema, response);
  }

  onLogout() {
    this.setState({isSessionActive: false});
    localStorage.removeItem('referrer')
  }

  toggleAreYouSure() {
    this.setState(prevState =>
      ({areYouSureModal: !prevState.areYouSureModal}));
  }

  async initalizeState(poemType, response) {
    if (poemType) {
      let token = await this.backend.fetchToken();
      let options = await this.backend.fetchConfigOptions();
      this.setState({
        isTenantSchema: poemType,
        isSessionActive: response.active,
        userDetails: response.userdetails,
        token: token,
        webApiMetric: options && options.result.webapimetric,
        webApiAggregation: options && options.result.webapiaggregation,
        webApiThresholds: options && options.result.webapithresholds,
        tenantName: options && options.result.tenant_name,
        publicView: false,
      });
    } else {
      this.setState({
        isTenantSchema: poemType,
        isSessionActive: response.active,
        userDetails: response.userdetails,
        publicView: false,
      });
    };
  }

  async initalizePublicState() {
    let token = await this.backend.fetchPublicToken()
    let options = await this.backend.fetchConfigOptions();
    this.setState({
      isTenantSchema: true,
      isSessionActive: false,
      userDetails: {username: 'Anonymous'},
      token: token,
      webApiMetric: options && options.result.webapimetric,
      webApiAggregation: options && options.result.webapiaggregation,
      webApiThresholds: options && options.result.webapithresholds,
      tenantName: options && options.result.tenant_name,
      publicView: true,
    })
  }

  isPublicUrl () {
    const pathname = window.location.pathname

    return pathname.includes('public_')
  }

  getAndSetReferrer() {
    let referrer = localStorage.getItem('referrer')
    let stackUrls = undefined

    if (referrer)
      stackUrls = JSON.parse(referrer)
    else
      stackUrls = new Array()

    stackUrls.push(window.location.pathname)
    localStorage.setItem('referrer', JSON.stringify(stackUrls))
  }

  async componentDidMount() {
    if (this.isPublicUrl()) {
      this.initalizePublicState()
    }
    else {
      let isTenantSchema = await this.backend.isTenantSchema();
      let response = await this.backend.isActiveSession(isTenantSchema);
      response.active && this.initalizeState(isTenantSchema, response);
    }

    this.getAndSetReferrer()
  }

  render() {
    let {isSessionActive, userDetails, publicView} = this.state

    if (publicView) {
      return (
        <BrowserRouter>
          <Switch>
            <Route
              exact path="/ui/public_probes"
              render={props =>
                <PublicPage>
                  <ProbeList publicView={true} {...props} />
                </PublicPage>
              }
            />
            <Route
              exact path="/ui/public_probes/:name"
              render={props =>
                <PublicPage>
                  <ProbeChange publicView={true} {...props}/>
                </PublicPage>
              }
            />
            <Route exact path="/ui/public_probes/:name/history"
              render={props =>
                <PublicPage>
                  <ProbeHistory publicView={true} {...props}/>
                </PublicPage>
              }
            />
            <Route exact path="/ui/public_probes/:name/history/compare/:id1/:id2"
              render={props =>
                <PublicPage>
                  <ProbeVersionCompare publicView={true} {...props}/>
                </PublicPage>
              }
            />
            <Route exact path="/ui/public_probes/:name/history/:version"
              render={props =>
                <PublicPage>
                  <ProbeVersionDetails publicView={true} {...props}/>
                </PublicPage>
              }
            />
            <Route exact path="/ui/public_metrics"
              render={props =>
                <PublicPage>
                  <MetricList publicView={true} {...props}/>
                </PublicPage>
              }
            />
            <Route exact path="/ui/public_metrics/:name"
              render={props =>
                <PublicPage>
                  <MetricChange publicView={true} {...props}/>
                </PublicPage>
              }
            />
          </Switch>
          <Route exact path="/ui/public_services"
            render={props =>
              <PublicPage>
                <Services publicView={true} {...props}/>
              </PublicPage>
            }
          />
          <Route exact path="/ui/public_metricprofiles"
            render={props =>
              <PublicPage>
                <MetricProfilesList publicView={true} {...props} />
              </PublicPage>
            }
          />
          <Route exact path="/ui/public_metricprofiles/:name"
            render={props =>
              <PublicPage>
                <MetricProfilesChange {...props}
                  webapimetric={this.state.webApiMetric}
                  webapitoken={this.state.token}
                  tenantname={this.state.tenantName}
                  publicView={true}
                />
              </PublicPage>
            }
          />
          <Route exact path="/ui/public_aggregationprofiles"
            render={props =>
              <PublicPage>
                <AggregationProfilesList publicView={true} {...props} />
              </PublicPage>
            }
          />
          <Route exact path="/ui/public_aggregationprofiles/:name"
            render={props =>
              <PublicPage>
                <AggregationProfilesChange {...props}
                  webapimetric={this.state.webApiMetric}
                  webapiaggregation={this.state.webApiAggregation}
                  webapitoken={this.state.token}
                  tenantname={this.state.tenantName}
                  publicView={true}
                />
              </PublicPage>
            }
          />
          <Route exact path="/ui/public_thresholdsprofiles"
            render={props =>
              <PublicPage>
                <ThresholdsProfilesList publicView={true} {...props} />
              </PublicPage>
            }
          />
          <Route exact path="/ui/public_thresholdsprofiles/:name"
            render={props =>
              <PublicPage>
                <ThresholdsProfilesChange {...props}
                  webapithresholds={this.state.webApiThresholds}
                  webapiaggregation={this.state.webApiAggregation}
                  webapitoken={this.state.token}
                  tenantname={this.state.tenantName}
                  publicView={true}
                />
              </PublicPage>
            }
          />
        </BrowserRouter>
      )
    }
    else if (!publicView && !isSessionActive) {

      return (
        <BrowserRouter>
          <Switch>
            <Route
              path="/ui/"
              render={props =>
                <Login onLogin={this.onLogin} {...props} />
              }
            />
            <Route component={NotFound} />
          </Switch>
        </BrowserRouter>
      )
    }
    else if (isSessionActive && userDetails &&
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
                  msgModal='Are you sure you want to log out?'
                  userDetails={userDetails}
                />
              </Col>
            </Row>
            <Row className="no-gutters">
              <Col sm={{size: 2}} md={{size: 2}} id="sidebar-col" className="d-flex flex-column">
                <NavigationLinksWithRouter isTenantSchema={this.state.isTenantSchema} userDetails={userDetails}/>
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
                    tenantName={this.state.tenantName}
                    isSuperUser={userDetails.is_superuser}
                    userGroups={userDetails.groups}/>
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
