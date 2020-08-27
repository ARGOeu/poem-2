import React, { Component } from 'react';
import Login from './Login';
import {
  MetricProfileVersionCompare,
  MetricProfileVersionDetails,
  MetricProfilesChange,
  MetricProfilesClone,
  MetricProfilesList
} from './MetricProfiles';
import Home, { PublicHome } from './Home';
import {
  ProbeList,
  ProbeChange,
  ProbeVersionCompare,
  ProbeVersionDetails,
  ProbeClone
} from './Probes';
import {
  MetricChange,
  MetricVersionDetails,
  ListOfMetrics,
  CompareMetrics
} from './Metrics';
import {
  MetricTemplateVersionDetails,
  MetricTemplateComponent
} from './MetricTemplates';
import { TenantAdministration, SuperAdminAdministration } from './Administration';
import {
  AggregationProfilesChange,
  AggregationProfilesList,
  AggregationProfileVersionCompare,
  AggregationProfileVersionDetails
} from './AggregationProfiles';
import { ReportsList, ReportsComponent } from './Reports';
import { UsersList, UserChange, SuperAdminUserChange, ChangePassword } from './Users';
import {
  GroupList,
  GroupChange
} from './GroupElements';
import { APIKeyList, APIKeyChange } from './APIKey';
import NotFound from './NotFound';
import { Route, Switch, BrowserRouter, Redirect, withRouter } from 'react-router-dom';
import { Container, Row, Col } from 'reactstrap';
import { NavigationBar, NavigationAbout, CustomBreadcrumb, NavigationLinks, Footer, PublicPage, HistoryComponent} from './UIElements';
import { NotificationContainer } from 'react-notifications';
import { Backend } from './DataManager';
import { YumRepoList, YumRepoChange, YumRepoClone } from './YumRepos';
import { ThresholdsProfilesList, ThresholdsProfilesChange, ThresholdsProfileVersionCompare, ThresholdsProfileVersionDetail } from './ThresholdProfiles';
import Cookies from 'universal-cookie';

import './App.css';
import { PackageList, PackageChange, PackageClone } from './Package';
import { ServiceTypesList } from './ServiceTypes';
import { TenantList, TenantChange } from './Tenants';
import { OperationsProfilesList, OperationsProfileDetails } from './OperationsProfiles';
import { CookiePolicy } from './CookiePolicy';


const NavigationBarWithRouter = withRouter(NavigationBar);
const NavigationLinksWithRouter = withRouter(NavigationLinks);
const NavigationAboutWithRouter = withRouter(NavigationAbout);
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


const TenantRouteSwitch = ({webApiAggregation, webApiMetric, webApiThresholds, webApiOperations, webApiReports, token, tenantName, isSuperUser, userGroups}) => (
  <Switch>
    <Route exact path="/ui/login" render={props => <RedirectAfterLogin isSuperUser={isSuperUser} {...props}/>}/>
    <Route exact path="/ui/home" component={Home} />
    <Route exact path="/ui/probes" component={ProbeList} />
    <Route exact path="/ui/probes/:name/history" render={props => <HistoryComponent object='probe' {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/compare/:id1/:id2" render={props => <ProbeVersionCompare {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/:version" render={props => <ProbeVersionDetails {...props}/>}/>
    <Route exact path="/ui/probes/:name/:metrictemplatename"
      render={props => <MetricTemplateComponent
        {...props}
        tenantview={true}
        probeview={true}
      />}
    />
    <Route exact path="/ui/probes/:name" render={props => <ProbeChange {...props}/>}/>
    <Route exact path="/ui/metrics" render={props => <ListOfMetrics {...props} type='metrics'/>} />
    <Route exact path="/ui/metrics/:name/history" render={props => <HistoryComponent {...props} object='metric'/>}/>
    <Route exact path="/ui/metrics/:name/history/compare/:id1/:id2" render={props => <CompareMetrics {...props} type='metric'/>}/>
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
    <Route exact path="/ui/metricprofiles/:name"
      render={props => <MetricProfilesChange
        {...props}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}/>}
    />
    <Route exact path="/ui/metricprofiles/:name/clone"
      render={props => <MetricProfilesClone
        {...props}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}/>}
    />
    <Route exact path="/ui/metricprofiles/:name/history"
      render={props => <HistoryComponent object='metricprofile' {...props}/>}
    />
    <Route exact path="/ui/metricprofiles/:name/history/compare/:id1/:id2"
      render={props => <MetricProfileVersionCompare {...props}/>}
    />
    <Route exact path="/ui/metricprofiles/:name/history/:version"
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
    <Route exact path="/ui/aggregationprofiles/:name"
      render={props => <AggregationProfilesChange
        {...props}
        webapiaggregation={webApiAggregation}
        webapimetric={webApiMetric}
        webapitoken={token}
        tenantname={tenantName}/>}
      />
    <Route exact path="/ui/aggregationprofiles/:name/history"
      render={props => <HistoryComponent object='aggregationprofile' {...props}/>}
    />
    <Route exact path="/ui/aggregationprofiles/:name/history/compare/:id1/:id2"
      render={props => <AggregationProfileVersionCompare {...props}/>}
    />
    <Route exact path="/ui/aggregationprofiles/:name/history/:version"
      render={props => <AggregationProfileVersionDetails {...props}/>}
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
    <Route exact path="/ui/thresholdsprofiles/:name"
      render={props => <ThresholdsProfilesChange
        {...props}
        webapithresholds={webApiThresholds}
        webapitoken={token}
        tenantname={tenantName}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:name/history"
      render={props => <ThresholdsProfilesHistory {...props}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:name/history/compare/:id1/:id2"
      render={props => <ThresholdsProfileVersionCompare {...props}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:name/history/:version"
      render={props => <ThresholdsProfileVersionDetail {...props}/>}
    />
    <Route
      exact path="/ui/operationsprofiles"
      render={props => <OperationsProfilesList
        {...props}
        webapioperations={webApiOperations}
        webapitoken={token}
      />} />
    <Route
      exact path="/ui/operationsprofiles/:name"
      render={props => <OperationsProfileDetails
        {...props}
        webapioperations={webApiOperations}
        webapitoken={token}
      />}
    />
    <Route exact path="/ui/cookiepolicies/" component={CookiePolicy} />
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
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetrics"
      render={props => <GroupList {...props} group='metrics' id='groupofmetrics' name='group of metrics'/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetrics/add"
      render={props => <GroupChange
        {...props}
        group='metrics'
        id='groupofmetrics'
        title='metrics'
        addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetrics/:name"
      render={props => <GroupChange
        {...props}
        group='metrics'
        id='groupofmetrics'
        title='metrics'/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofaggregations"
      render={props => <GroupList {...props} group='aggregations' id='groupofaggregations' name='group of aggregations'/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofaggregations/add"
      render={props => <GroupChange
        {...props}
        group='aggregations'
        id='groupofaggregations'
        title='aggregations'
        addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofaggregations/:name"
      render={props => <GroupChange
        {...props}
        group='aggregations'
        id='groupofaggregations'
        title='aggregations'
      />}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetricprofiles"
      render={props => <GroupList {...props} group='metricprofiles' id='groupofmetricprofiles' name='group of metric profiles'/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetricprofiles/add"
      render={props => <GroupChange
        {...props}
        group='metricprofiles'
        id='groupofmetricprofiles'
        title='metric profiles'
        addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofmetricprofiles/:name"
      render={props => <GroupChange
        {...props}
        group='metricprofiles'
        id='groupofmetricprofiles'
        title='metric profiles'
      />}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/apikey" component={APIKeyList} />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/apikey/add"
      render={props => <APIKeyChange {...props} addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/metrictemplates/' render={props => <ListOfMetrics type='metrictemplates' {...props} /> } />
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/metrictemplates/:name'
      render={props => <MetricTemplateComponent
        {...props}
        tenantview={true}
      />}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/metrictemplates/:name/history' render={props => <HistoryComponent object='metrictemplate' tenantView={true} {...props}/>}/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/metrictemplates/:name/history/compare/:id1/:id2' render={props => <CompareMetrics {...props} type='metrictemplate'/>}/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/metrictemplates/:name/history/:version' render={props => <MetricTemplateVersionDetails {...props}/>}/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/apikey/:name"
      render={props => <APIKeyChange {...props} />}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/yumrepos/' component={YumRepoList}/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/yumrepos/:name'
      render={props => <YumRepoChange {...props} disabled={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/packages/' component={PackageList}/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/packages/:nameversion'
      render={props => <PackageChange {...props} disabled={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofthresholdsprofiles"
      render={props => <GroupList {...props} group='thresholdsprofiles' id='groupofthresholdsprofiles' name='group of thresholds profiles'/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofthresholdsprofiles/add"
      render={props => <GroupChange
        {...props}
        group='thresholdsprofiles'
        id='groupofthresholdsprofiles'
        title='thresholds profiles'
        addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofthresholdsprofiles/:name"
      render={props => <GroupChange
        {...props}
        group='thresholdsprofiles'
        id='groupofthresholdsprofiles'
        title='thresholds profiles'
      />}
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
    <Route exact path="/ui/thresholdsprofiles/:name"
      render={props => <ThresholdsProfilesChange
        {...props}
        webapithresholds={webApiThresholds}
        webapitoken={token}
        tenantname={tenantName}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:name/history"
      render={props => <HistoryComponent object='thresholdsprofile' {...props}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:name/history/compare/:id1/:id2"
      render={props => <ThresholdsProfileVersionCompare {...props}/>}
    />
    <Route exact path="/ui/thresholdsprofiles/:name/history/:version"
      render={props => <ThresholdsProfileVersionDetail {...props}/>}
    />
    <Route
      exact path="/ui/operationsprofiles"
      render={props => <OperationsProfilesList
        {...props}
        webapioperations={webApiOperations}
        webapitoken={token}
      />} />
    <Route
      exact path="/ui/operationsprofiles/:name"
      render={props => <OperationsProfileDetails
        {...props}
        webapioperations={webApiOperations}
        webapitoken={token}
      />}
    />
    <Route
      exact path="/ui/reports"
      render={props =>
        <ReportsList
          {...props}
          webapitoken={token}
          webapireports={webApiReports}
        />
      }
    />
    <Route
      exact path="/ui/reports/:name"
      render={props => <ReportsComponent
        {...props}
        webapitoken={token}
        webapireports={webApiReports}
        webapimetric={webApiMetric}
        webapiaggregation={webApiAggregation}
        webapioperations={webApiOperations}
      />}
    />
    <Route
      exact path="/ui/servicetypes/"
      component={ServiceTypesList}
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
    <Route exact path="/ui/probes/:name/history" render={props => <HistoryComponent object='probe' {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/compare/:id1/:id2" render={props => <ProbeVersionCompare {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/:version" render={props => <ProbeVersionDetails {...props}/>}/>
    <Route exact path="/ui/probes/:name" render={props => <ProbeChange {...props}/>}/>
    <Route exact path='/ui/metrictemplates' render={props => <ListOfMetrics type='metrictemplates' {...props} />} />
    <Route exact path='/ui/metrictemplates/add' render={props => <MetricTemplateComponent {...props} addview={true}/>}/>
    <Route exact path='/ui/metrictemplates/:name/clone' render={props => <MetricTemplateComponent {...props} cloneview={true}/>}/>
    <Route exact path='/ui/metrictemplates/:name/history' render={props => <HistoryComponent {...props} object='metrictemplate'/>}/>
    <Route exact path='/ui/metrictemplates/:name/history/compare/:id1/:id2' render={props => <CompareMetrics {...props} type='metrictemplate'/>}/>
    <Route exact path='/ui/metrictemplates/:name/history/:version' render={props => <MetricTemplateVersionDetails {...props}/>}/>
    <Route exact path='/ui/metrictemplates/:name' render={props => <MetricTemplateComponent {...props}/>}/>
    <Route exact path='/ui/yumrepos/' render={props => <YumRepoList {...props}/>}/>
    <Route exact path='/ui/yumrepos/add' render={props => <YumRepoChange addview={true} {...props}/>}/>
    <Route exact path='/ui/yumrepos/:name/clone' render={props => <YumRepoClone {...props}/>}/>
    <Route exact path='/ui/yumrepos/:name' render={props => <YumRepoChange {...props}/>}/>
    <Route exact path='/ui/packages/' render={props => <PackageList {...props}/>}/>
    <Route exact path='/ui/packages/add' render={props => <PackageChange addview={true} {...props}/>}/>
    <Route exact path='/ui/packages/:nameversion' render={props => <PackageChange {...props}/>}/>
    <Route exact path='/ui/packages/:nameversion/clone' render={props => <PackageClone {...props}/>}/>
    <Route exact path="/ui/administration" component={SuperAdminAdministration}/>
    <Route exact path="/ui/administration/users" component={UsersList} />
    <Route exact path="/ui/administration/users/add"
      render={props => <SuperAdminUserChange
        {...props}
        addview={true}/>}
    />
    <Route exact path="/ui/administration/users/:user_name/change_password"
      render={props => <ChangePassword {...props}/>}
    />
    <Route exact path="/ui/administration/users/:user_name"
      render={props => <SuperAdminUserChange {...props}/>}
    />
    <Route exact path="/ui/administration/apikey" component={APIKeyList} />
    <Route exact path="/ui/administration/apikey/add"
      render={props => <APIKeyChange {...props} addview={true}/>}
    />
    <Route exact path="/ui/administration/apikey/:name"
      render={props => <APIKeyChange {...props} />}
    />
    <Route exact path="/ui/tenants" component={TenantList}/>
    <Route exact path="/ui/tenants/:name"
      render={props => <TenantChange {...props} />}
    />
    <Route exact path="/ui/cookiepolicies/" component={CookiePolicy} />
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
      webApiOperations: undefined,
      webApiReports: undefined,
      publicView: undefined,
      tenantName: undefined,
      token: undefined,
      version: undefined,
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
    let options = await this.backend.fetchConfigOptions();
    if (poemType) {
      this.setState({
        isTenantSchema: poemType,
        isSessionActive: response.active,
        userDetails: response.userdetails,
        token: response.userdetails.token,
        webApiMetric: options && options.result.webapimetric,
        webApiAggregation: options && options.result.webapiaggregation,
        webApiThresholds: options && options.result.webapithresholds,
        webApiOperations: options && options.result.webapioperations,
        version: options && options.result.version,
        webApiReports: options && options.result.webapireports,
        tenantName: options && options.result.tenant_name,
        publicView: false,
      });
    } else {
      this.setState({
        isTenantSchema: poemType,
        isSessionActive: response.active,
        userDetails: response.userdetails,
        version: options && options.result.version,
        publicView: false,
      });
    };
  }

  async initalizePublicState() {
    let token = await this.backend.fetchPublicToken()
    let options = await this.backend.fetchConfigOptions();
    let isTenantSchema = await this.backend.isTenantSchema();
    this.setState({
      isTenantSchema: isTenantSchema,
      isSessionActive: false,
      userDetails: {username: 'Anonymous'},
      token: token,
      webApiMetric: options && options.result.webapimetric,
      webApiAggregation: options && options.result.webapiaggregation,
      webApiThresholds: options && options.result.webapithresholds,
      webApiOperations: options && options.result.webapioperations,
      webApiReports: options && options.result.webapireports,
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
    let {isSessionActive, isTenantSchema, userDetails, publicView} = this.state

    if (publicView && isTenantSchema !== undefined) {
      if (isTenantSchema)
        return (
          <BrowserRouter>
            <Switch>
              <Route
                exact path="/ui/public_home"
                render={props =>
                  <PublicPage>
                    <PublicHome/>
                  </PublicPage>
                }
              />
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
                    <HistoryComponent object='probe' publicView={true} {...props}/>
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
              <Route
                exact path="/ui/public_metrictemplates"
                render={props =>
                  <PublicPage>
                    <ListOfMetrics type='metrictemplates' publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name"
                render={props =>
                  <PublicPage>
                    <MetricTemplateComponent publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name/history"
                render={props =>
                  <PublicPage>
                    <HistoryComponent publicView={true} object='metrictemplate' {...props}/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name/history/compare/:id1/:id2"
                render={props =>
                  <PublicPage>
                    <CompareMetrics publicView={true} {...props} type='metrictemplate'/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name/history/:version"
                render={props =>
                  <PublicPage>
                    <MetricTemplateVersionDetails publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_metrics"
                render={props =>
                  <PublicPage>
                    <ListOfMetrics type='metrics' publicView={true} {...props}/>
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
              <Route exact path="/ui/public_operationsprofiles"
                render={props =>
                  <PublicPage>
                    <OperationsProfilesList
                      {...props}
                      publicView={true}
                      webapitoken={this.state.token}
                      webapioperations={this.state.webApiOperations}
                    />
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_operationsprofiles/:name"
                render={props =>
                  <PublicPage>
                    <OperationsProfileDetails
                      {...props}
                      publicView={true}
                      webapitoken={this.state.token}
                      webapioperations={this.state.webApiOperations}
                    />
                  </PublicPage>
                }
              />
              <Route component={NotFound} />
            </Switch>
          </BrowserRouter>
        )
      else
        return (
          <BrowserRouter>
            <Switch>
              <Route
                exact path="/ui/public_home"
                render={props =>
                  <PublicPage>
                    <PublicHome isSuperAdmin={true} {...props}/>
                  </PublicPage>
                }
              />
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
                    <HistoryComponent object='probe' publicView={true} {...props}/>
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
              <Route
                exact path="/ui/public_metrictemplates"
                render={props =>
                  <PublicPage>
                    <ListOfMetrics type='metrictemplates' publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name"
                render={props =>
                  <PublicPage>
                    <MetricTemplateComponent publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name/history"
                render={props =>
                  <PublicPage>
                    <HistoryComponent publicView={true} object='metrictemplate' {...props}/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name/history/compare/:id1/:id2"
                render={props =>
                  <PublicPage>
                    <CompareMetrics publicView={true} {...props} type='metrictemplate'/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name/history/:version"
                render={props =>
                  <PublicPage>
                    <MetricTemplateVersionDetails publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route component={NotFound} />
            </Switch>
          </BrowserRouter>
        );
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
                  isTenantSchema={this.state.isTenantSchema}
                  publicView={publicView}
                />
              </Col>
            </Row>
            <Row className="no-gutters">
              <Col sm={{size: 2}} md={{size: 2}} id="sidebar-col" className="d-flex flex-column">
                <NavigationLinksWithRouter isTenantSchema={this.state.isTenantSchema} userDetails={userDetails}/>
                <div id="sidebar-grow" className="flex-grow-1 border-left border-right mb-0 pb-5"/>
                <NavigationAboutWithRouter poemVersion={this.state.version}/>
              </Col>
              <Col>
                <CustomBreadcrumbWithRouter />
                {this.state.isTenantSchema ?
                  <TenantRouteSwitch
                    webApiMetric={this.state.webApiMetric}
                    webApiAggregation={this.state.webApiAggregation}
                    webApiThresholds={this.state.webApiThresholds}
                    webApiOperations={this.state.webApiOperations}
                    webApiReports={this.state.webApiReports}
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
    else if (this.state.isTenantSchema === null && isSessionActive) {
      return (
        <React.Fragment>
          <h1>Something went wrong</h1>
          <p>Cannot obtain schema.</p>
        </React.Fragment>
      )
    }
    else
      return null
  }
}

export default App;
