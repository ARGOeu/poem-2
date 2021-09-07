import React, { useEffect, useState } from 'react';
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
  ProbeComponent,
  ProbeList,
  ProbeVersionCompare,
  ProbeVersionDetails,
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
import { ReportsList, ReportsAdd, ReportsChange } from './Reports';
import { UsersList, UserChange, ChangePassword } from './Users';
import {
  GroupList,
  GroupChange
} from './GroupElements';
import { APIKeyList, APIKeyChange } from './APIKey';
import NotFound from './NotFound';
import { Route, Switch, BrowserRouter, Redirect, withRouter } from 'react-router-dom';
import { Container, Row, Col } from 'reactstrap';
import { NavigationBar, NavigationAbout, CustomBreadcrumb, NavigationLinks, Footer, PublicPage, HistoryComponent, DocumentTitle} from './UIElements';
import { NotificationContainer } from 'react-notifications';
import { Backend } from './DataManager';
import { YumRepoList, YumRepoComponent } from './YumRepos';
import { ThresholdsProfilesList, ThresholdsProfilesChange, ThresholdsProfileVersionCompare, ThresholdsProfileVersionDetail } from './ThresholdProfiles';

import './App.css';
import { PackageList, PackageComponent } from './Package';
import { ServiceTypesList } from './ServiceTypes';
import { TenantList, TenantChange } from './Tenants';
import { OperationsProfilesList, OperationsProfileDetails } from './OperationsProfiles';
import { CookiePolicy } from './CookiePolicy';
import { QueryClientProvider, QueryClient } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';


const NavigationBarWithRouter = withRouter(NavigationBar);
const NavigationLinksWithRouter = withRouter(NavigationLinks);
const NavigationAboutWithRouter = withRouter(NavigationAbout);
const CustomBreadcrumbWithRouter = withRouter(CustomBreadcrumb);
const DocumentTitleWithRouter = withRouter(DocumentTitle);

const queryClient = new QueryClient();


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
)


const RedirectAfterLogin = ({isSuperUser}) => {
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
    <Route exact path="/ui/probes/:name" render={props => <ProbeComponent {...props}/>}/>
    <Route exact path="/ui/metrics" render={props => <ListOfMetrics {...props} type='metrics'/>} />
    <Route exact path="/ui/metrics/:name/history" render={props => <HistoryComponent {...props} object='metric'/>}/>
    <Route exact path="/ui/metrics/:name/history/compare/:id1/:id2" render={props => <CompareMetrics {...props} type='metric'/>}/>
    <Route exact path="/ui/metrics/:name/history/:version" render={props => <MetricVersionDetails {...props}/>}/>
    <Route exact path="/ui/metrics/:name" render={props => <MetricChange {...props}/>}/>
    <Route exact path="/ui/metricprofiles"
      render={ props => <MetricProfilesList
        {...props}
        webapimetric={webApiMetric}
        webapitoken={token}
      /> }
    />
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
    <Route exact path="/ui/thresholdsprofiles"
      render={ props => <ThresholdsProfilesList
        {...props}
        webapithresholds={webApiThresholds}
        webapitoken={token}
      /> }
    />
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
    <Route exact path="/ui/cookiepolicies/" component={CookiePolicy} />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration" component={TenantAdministration} />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/users"
      render={ props => <UsersList
        {...props}
        isTenantSchema={true}
      /> }
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/users/add"
      render={props => <UserChange
        {...props}
        addview={true}
        isTenantSchema={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/users/:user_name"
      render={props => <UserChange {...props} isTenantSchema={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofreports"
      render={props => <GroupList {...props} group='reports' id='groupofreports' name='group of reports'/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofreports/add"
      render={props => <GroupChange
        {...props}
        group='reports'
        id='groupofreports'
        title='reports'
        addview={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path="/ui/administration/groupofreports/:name"
      render={props => <GroupChange
        {...props}
        group='reports'
        id='groupofreports'
        title='reports'/>}
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
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/yumrepos/' render={ props => <YumRepoList {...props} isTenantSchema={true} /> }/>
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/yumrepos/:name'
      render={props => <YumRepoComponent {...props} disabled={true}/>}
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/packages/'
      render={ props => <PackageList {...props} isTenantSchema={true} /> }
    />
    <SuperUserRoute isSuperUser={isSuperUser} exact path='/ui/administration/packages/:nameversion'
      render={props => <PackageComponent {...props} disabled={true}/>}
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
    <Route exact path="/ui/thresholdsprofiles"
      render={ props => <ThresholdsProfilesList
        {...props}
        webapithresholds={webApiThresholds}
        webapitoken={token}
      /> }
    />
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
    <AddRoute
      exact path="/ui/reports/add"
      usergroups={userGroups.reports}
      render={props => <ReportsAdd
        {...props}
        webapitoken={token}
        webapireports={webApiReports}
        webapimetric={webApiMetric}
        webapiaggregation={webApiAggregation}
        webapioperations={webApiOperations}
      />}
    />
    <Route
      exact path="/ui/reports/:name"
      render={props => <ReportsChange
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


const SuperAdminRouteSwitch = () => (
  <Switch>
    <Route exact path="/ui/login" render={() => <Redirect to="/ui/administration" />}/>
    <Route exact path="/ui/home" component={Home} />
    <Route exact path="/ui/probes" component={ProbeList} />
    <Route exact path="/ui/probes/add" render={props => <ProbeComponent {...props} addview={true}/>}/>
    <Route exact path="/ui/probes/:name/clone" render={props => <ProbeComponent {...props} cloneview={true}/>}/>
    <Route exact path="/ui/probes/:name/history" render={props => <HistoryComponent object='probe' {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/compare/:id1/:id2" render={props => <ProbeVersionCompare {...props}/>}/>
    <Route exact path="/ui/probes/:name/history/:version" render={props => <ProbeVersionDetails {...props}/>}/>
    <Route exact path="/ui/probes/:name" render={props => <ProbeComponent {...props}/>}/>
    <Route exact path='/ui/metrictemplates' render={props => <ListOfMetrics type='metrictemplates' {...props} />} />
    <Route exact path='/ui/metrictemplates/add' render={props => <MetricTemplateComponent {...props} addview={true}/>}/>
    <Route exact path='/ui/metrictemplates/:name/clone' render={props => <MetricTemplateComponent {...props} cloneview={true}/>}/>
    <Route exact path='/ui/metrictemplates/:name/history' render={props => <HistoryComponent {...props} object='metrictemplate'/>}/>
    <Route exact path='/ui/metrictemplates/:name/history/compare/:id1/:id2' render={props => <CompareMetrics {...props} type='metrictemplate'/>}/>
    <Route exact path='/ui/metrictemplates/:name/history/:version' render={props => <MetricTemplateVersionDetails {...props}/>}/>
    <Route exact path='/ui/metrictemplates/:name' render={props => <MetricTemplateComponent {...props}/>}/>
    <Route exact path='/ui/yumrepos/' render={props => <YumRepoList {...props}/>}/>
    <Route exact path='/ui/yumrepos/add' render={props => <YumRepoComponent addview={true} {...props}/>}/>
    <Route exact path='/ui/yumrepos/:name/clone' render={props => <YumRepoComponent {...props} cloneview={true}/>}/>
    <Route exact path='/ui/yumrepos/:name' render={props => <YumRepoComponent {...props}/>}/>
    <Route exact path='/ui/packages/' render={props => <PackageList {...props}/>}/>
    <Route exact path='/ui/packages/add' render={props => <PackageComponent addview={true} {...props}/>}/>
    <Route exact path='/ui/packages/:nameversion' render={props => <PackageComponent {...props}/>}/>
    <Route exact path='/ui/packages/:nameversion/clone' render={props => <PackageComponent {...props} cloneview={true}/>}/>
    <Route exact path="/ui/administration" component={SuperAdminAdministration}/>
    <Route exact path="/ui/administration/users" component={UsersList} />
    <Route exact path="/ui/administration/users/add"
      render={props => <UserChange
        {...props}
        addview={true}/>}
    />
    <Route exact path="/ui/administration/users/:user_name/change_password"
      render={props => <ChangePassword {...props}/>}
    />
    <Route exact path="/ui/administration/users/:user_name"
      render={props => <UserChange {...props}/>}
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


const App = () => {
  const backend = new Backend();

  const [isSessionActive, setIsSessionActive] = useState(undefined);
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [userDetails, setUserDetails] = useState(undefined);
  const [webApiAggregation, setWebApiAggregation] = useState(undefined);
  const [webApiMetric, setWebApiMetric] = useState(undefined);
  const [webApiThresholds, setWebApiThresholds] = useState(undefined);
  const [webApiOperations, setWebApiOperations] = useState(undefined);
  const [webApiReports, setWebApiReports] = useState(undefined);
  const [publicView, setPublicView] = useState(undefined);
  const [tenantName, setTenantName] = useState(undefined);
  const [token, setToken] = useState(undefined);
  const [version, setVersion] = useState(undefined);
  const [isTenantSchema, setIsTenantSchema] = useState(null);

  async function onLogin(json) {
    let response = new Object({
      active: true,
      userdetails: json
    })

    let isTenantSchema = await backend.isTenantSchema();
    let initialState = await initalizeState(isTenantSchema, response);
  }

  function onLogout() {
    setIsSessionActive(false);
    localStorage.removeItem('referrer');
  }

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  async function initalizeState(poemType, response) {
    let options = await backend.fetchConfigOptions();
    if (poemType) {
      setIsTenantSchema(poemType);
      setIsSessionActive(response.active);
      setUserDetails(response.userdetails);
      setToken(response.userdetails.token);
      setWebApiMetric(options && options.result.webapimetric);
      setWebApiAggregation(options && options.result.webapiaggregation);
      setWebApiThresholds(options && options.result.webapithresholds);
      setWebApiOperations(options && options.result.webapioperations);
      setVersion(options && options.result.version);
      setWebApiReports(options && options.result.webapireports);
      setTenantName(options && options.result.tenant_name);
      setPublicView(false);
    } else {
      setIsTenantSchema(poemType);
      setIsSessionActive(response.active);
      setUserDetails(response.userdetails);
      setVersion(options && options.result.version);
      setPublicView(false);
    }
  }

  async function initalizePublicState() {
    let token = await backend.fetchPublicToken()
    let options = await backend.fetchConfigOptions();
    let isTenantSchema = await backend.isTenantSchema();
    setIsTenantSchema(isTenantSchema);
    setIsSessionActive(false);
    setUserDetails({username: 'Anonymous'});
    setToken(token);
    setWebApiMetric(options && options.result.webapimetric);
    setWebApiAggregation(options && options.result.webapiaggregation);
    setWebApiThresholds(options && options.result.webapithresholds);
    setWebApiOperations(options && options.result.webapioperations);
    setWebApiReports(options && options.result.webapireports);
    setTenantName(options && options.result.tenant_name);
    setPublicView(true);
  }

  function isPublicUrl () {
    const pathname = window.location.pathname;

    return pathname.includes('public_');
  }

  function getAndSetReferrer() {
    let referrer = localStorage.getItem('referrer');
    let stackUrls = undefined;

    if (referrer)
      stackUrls = JSON.parse(referrer);
    else
      stackUrls = new Array();

    stackUrls.push(window.location.pathname);
    localStorage.setItem('referrer', JSON.stringify(stackUrls));
  }

  useEffect(() => {
    fetchData();
    async function fetchData() {
      if (isPublicUrl()) {
        initalizePublicState()
      }
      else {
        let isTenantSchema = await backend.isTenantSchema();
        let response = await backend.isActiveSession(isTenantSchema);
        response.active && initalizeState(isTenantSchema, response);
      }

      getAndSetReferrer()
    }
  }, [])

  if (publicView && isTenantSchema !== undefined) {
    if (isTenantSchema)
      return (
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools />
          <BrowserRouter>
            <Switch>
              <Route
                exact path="/ui/public_home"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <PublicHome/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_probes"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <ProbeList publicView={true} {...props} />
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_probes/:name"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <ProbeComponent publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_probes/:name/history"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <HistoryComponent object='probe' publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_probes/:name/history/compare/:id1/:id2"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <ProbeVersionCompare publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_probes/:name/history/:version"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <ProbeVersionDetails publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <ListOfMetrics type='metrictemplates' publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <MetricTemplateComponent publicView={true} tenantView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name/history"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <HistoryComponent publicView={true} object='metrictemplate' {...props}/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name/history/compare/:id1/:id2"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <CompareMetrics publicView={true} {...props} type='metrictemplate'/>
                  </PublicPage>
                }
              />
              <Route
                exact path="/ui/public_metrictemplates/:name/history/:version"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <MetricTemplateVersionDetails publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_metrics"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <ListOfMetrics type='metrics' publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_metrics/:name"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <MetricChange publicView={true} {...props}/>
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_metricprofiles"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <MetricProfilesList
                      {...props}
                      webapimetric={webApiMetric}
                      webapitoken={token}
                      publicView={true}
                    />
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_metricprofiles/:name"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <MetricProfilesChange {...props}
                      webapimetric={webApiMetric}
                      webapitoken={token}
                      tenantname={tenantName}
                      publicView={true}
                    />
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_aggregationprofiles"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <AggregationProfilesList publicView={true} {...props} />
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_aggregationprofiles/:name"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <AggregationProfilesChange {...props}
                      webapimetric={webApiMetric}
                      webapiaggregation={webApiAggregation}
                      webapitoken={token}
                      tenantname={tenantName}
                      publicView={true}
                    />
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_thresholdsprofiles"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <ThresholdsProfilesList
                      {...props}
                      publicView={true}
                      webapithresholds={webApiThresholds}
                      webapitoken={token}
                    />
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_thresholdsprofiles/:name"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <ThresholdsProfilesChange {...props}
                      webapithresholds={webApiThresholds}
                      webapiaggregation={webApiAggregation}
                      webapitoken={token}
                      tenantname={tenantName}
                      publicView={true}
                    />
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_operationsprofiles"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <OperationsProfilesList
                      {...props}
                      publicView={true}
                      webapitoken={token}
                      webapioperations={webApiOperations}
                    />
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_operationsprofiles/:name"
                render={props =>
                  <PublicPage tenantName={tenantName}>
                    <OperationsProfileDetails
                      {...props}
                      publicView={true}
                      webapitoken={token}
                      webapioperations={webApiOperations}
                    />
                  </PublicPage>
                }
              />
              <Route exact path="/ui/public_servicetypes"
                render={props =>
                  <PublicPage>
                    <ServiceTypesList
                      {...props}
                      publicView={true}
                    />
                  </PublicPage>
                }
              />
              <Route component={NotFound} />
            </Switch>
          </BrowserRouter>
        </QueryClientProvider>
      )
    else
      return (
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools />
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
                    <ProbeComponent publicView={true} {...props}/>
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
        </QueryClientProvider>
      )
  }
  else if (!publicView && !isSessionActive) {
    return (
      <BrowserRouter>
        <Switch>
          <Route
            path="/ui/"
            render={props =>
              <Login onLogin={onLogin} {...props} />
            }
          />
          <Route component={NotFound} />
        </Switch>
      </BrowserRouter>
    )
  }
  else if (isSessionActive && userDetails &&
    isTenantSchema !== null) {

    return (
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools />
        <BrowserRouter>
          <Container fluid>
            <DocumentTitleWithRouter />
            <Row>
              <NotificationContainer />
              <Col>
                <NavigationBarWithRouter
                  onLogout={onLogout}
                  isOpenModal={areYouSureModal}
                  toggle={toggleAreYouSure}
                  titleModal='Log out'
                  msgModal='Are you sure you want to log out?'
                  userDetails={userDetails}
                  isTenantSchema={isTenantSchema}
                  publicView={publicView}
                />
              </Col>
            </Row>
            <Row className="no-gutters">
              <Col sm={{size: 2}} md={{size: 2}} id="sidebar-col" className="d-flex flex-column">
                <NavigationLinksWithRouter isTenantSchema={isTenantSchema} userDetails={userDetails}/>
                <div id="sidebar-grow" className="flex-grow-1 border-left border-right mb-0 pb-5"/>
                <NavigationAboutWithRouter poemVersion={version} tenantName={tenantName}/>
              </Col>
              <Col>
                <CustomBreadcrumbWithRouter />
                {isTenantSchema ?
                  <TenantRouteSwitch
                    webApiMetric={webApiMetric}
                    webApiAggregation={webApiAggregation}
                    webApiThresholds={webApiThresholds}
                    webApiOperations={webApiOperations}
                    webApiReports={webApiReports}
                    token={token}
                    tenantName={tenantName}
                    isSuperUser={userDetails.is_superuser}
                    userGroups={userDetails.groups}/>
                  :
                  <SuperAdminRouteSwitch/>
                }
              </Col>
            </Row>
            <Row>
              <Col>
                <Footer loginPage={false} tenantName={tenantName}/>
              </Col>
            </Row>
          </Container>
        </BrowserRouter>
      </QueryClientProvider>
    )
  }
  else if (isTenantSchema === null && isSessionActive) {
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

export default App;
