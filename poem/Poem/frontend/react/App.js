import React, { useEffect, useState } from "react";
import Login from "./Login";
import {
  MetricProfileVersionCompare,
  MetricProfileVersionDetails,
  MetricProfilesChange,
  MetricProfilesClone,
  MetricProfilesList,
} from "./MetricProfiles";
import Home, { PublicHome } from "./Home";
import {
  ProbeComponent,
  ProbeList,
  ProbeVersionCompare,
  ProbeVersionDetails,
} from "./Probes";
import {
  MetricChange,
  MetricVersionDetails,
  ListOfMetrics,
  CompareMetrics,
} from "./Metrics";
import {
  MetricTemplateVersionDetails,
  MetricTemplateComponent,
} from "./MetricTemplates";
import {
  TenantAdministration,
  SuperAdminAdministration,
} from "./Administration";
import {
  AggregationProfilesChange,
  AggregationProfilesList,
  AggregationProfileVersionCompare,
  AggregationProfileVersionDetails,
} from "./AggregationProfiles";
import { ReportsList, ReportsAdd, ReportsChange } from "./Reports";
import { UsersList, UserChange, ChangePassword } from "./Users";
import { GroupList, GroupChange } from "./GroupElements";
import { APIKeyList, APIKeyChange } from "./APIKey";
import NotFound from "./NotFound";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Container, Row, Col } from "reactstrap";
import {
  NavigationBar,
  NavigationAbout,
  CustomBreadcrumb,
  NavigationLinks,
  Footer,
  PublicPage,
  HistoryComponent,
  DocumentTitle,
} from "./UIElements";
import { NotificationContainer } from "react-notifications";
import { Backend, WebApi } from "./DataManager";
import { YumRepoList, YumRepoComponent } from "./YumRepos";
import {
  ThresholdsProfilesList,
  ThresholdsProfilesChange,
  ThresholdsProfileVersionCompare,
  ThresholdsProfileVersionDetail,
} from "./ThresholdProfiles";

import "./App.css";
import { PackageList, PackageComponent } from "./Package";
import { ServiceTypesList, ServiceTypesBulkAdd } from "./ServiceTypes";
import { TenantList, TenantChange } from "./Tenants";
import {
  OperationsProfilesList,
  OperationsProfileDetails,
} from "./OperationsProfiles";
import { CookiePolicy } from "./CookiePolicy";
import { QueryClient, QueryClientProvider } from "react-query";
import { ReactQueryDevtools } from "react-query/devtools";
import {
  fetchBackendAggregationProfiles,
  fetchAPIKeys,
  fetchBackendMetricProfiles,
  fetchMetrics,
  fetchMetricTags,
  fetchMetricTemplates,
  fetchMetricTemplateTypes,
  fetchOperationsProfiles,
  fetchOStags,
  fetchPackages,
  fetchProbes,
  fetchBackendReports,
  fetchTenants,
  fetchBackendThresholdsProfiles,
  fetchUserGroups,
  fetchUsers,
  fetchYumRepos,
  fetchReports,
  fetchMetricProfiles,
  fetchAggregationProfiles,
  fetchThresholdsProfiles,
  fetchTopologyTags,
  fetchTopologyGroups,
  fetchTopologyEndpoints,
  fetchServiceTypes,
} from "./QueryFunctions";
import { MetricTagsComponent, MetricTagsList } from "./MetricTags";
import { MetricOverrideChange, MetricOverrideList } from "./MetricOverrides";
import { DefaultPortsList } from "./DefaultPorts";
import { ProbeCandidateChange, ProbeCandidateList } from "./ProbeCandidates";

const queryClient = new QueryClient();

const SuperUserRoute = ({ isSuperUser }) => {
  return isSuperUser ? <Outlet /> : <NotFound />;
};

const AddRoute = ({ usergroups }) => {
  return usergroups.length > 0 ? <Outlet /> : <NotFound />;
};

export const RedirectAfterLogin = ({ isSuperUser }) => {
  let last = "";
  let before_last = "";
  let destination = "";
  let referrer = localStorage.getItem("referrer");

  if (isSuperUser) destination = "/ui/administration";
  else destination = "/ui/metricprofiles";

  if (referrer) {
    let urls = JSON.parse(referrer);

    if (urls.length === 1) {
      last = urls.pop();
      before_last = last;
    } else {
      last = urls.pop();
      before_last = urls.pop();
    }
  }

  if (last !== before_last) destination = before_last;

  localStorage.removeItem("referrer");

  return <Navigate to={destination} />;
};

const TenantRouteSwitch = ({
  webApiAggregation,
  webApiMetric,
  webApiThresholds,
  webApiOperations,
  webApiReports,
  webApiServiceTypes,
  token,
  tenantName,
  showServiceTitle,
  isSuperUser,
  userGroups,
  tenantDetails,
}) => (
  <Routes>
    <Route
      path="/ui/"
      element={<RedirectAfterLogin isSuperUser={isSuperUser} />}
    />
    <Route
      path="/ui/login"
      element={<RedirectAfterLogin isSuperUser={isSuperUser} />}
    />
    <Route path="/ui/home" element={<Home />} />
    <Route path="/ui/probes" element={<ProbeList isTenantSchema={true} />} />
    <Route
      path="/ui/probes/:name/history"
      element={<HistoryComponent object="probe" />}
    />
    <Route
      path="/ui/probes/:name/history/compare/:id1/:id2"
      element={<ProbeVersionCompare />}
    />
    <Route
      path="/ui/probes/:name/history/:version"
      element={<ProbeVersionDetails />}
    />
    <Route
      path="/ui/probes/:name/:metrictemplatename"
      element={<MetricTemplateComponent tenantview={true} probeview={true} />}
    />
    <Route
      path="/ui/probes/:name"
      element={<ProbeComponent isTenantSchema={true} />}
    />

    <Route
      path="/ui/metrics"
      element={
        <ListOfMetrics
          type="metrics"
          isTenantSchema={true}
          webapimetric={webApiMetric}
          webapitoken={token}
        />
      }
    />
    <Route
      path="/ui/metrics/:name/history"
      element={<HistoryComponent object="metric" />}
    />
    <Route
      path="/ui/metrics/:name/history/compare/:id1/:id2"
      element={<CompareMetrics type="metric" />}
    />
    <Route
      path="/ui/metrics/:name/history/:version"
      element={<MetricVersionDetails />}
    />
    <Route path="/ui/metrics/:name" element={<MetricChange />} />

    <Route
      path="/ui/metricprofiles"
      element={
        <MetricProfilesList webapimetric={webApiMetric} webapitoken={token} />
      }
    />
    <Route element={<AddRoute usergroups={userGroups.metricprofiles} />}>
      <Route
        path="/ui/metricprofiles/add"
        element={
          <MetricProfilesChange
            webapimetric={webApiMetric}
            webapitoken={token}
            tenantname={tenantName}
            webapiservicetypes={webApiServiceTypes}
            addview={true}
            tenantDetails={tenantDetails}
          />
        }
      />
    </Route>
    <Route
      path="/ui/metricprofiles/:name"
      element={
        <MetricProfilesChange
          webapimetric={webApiMetric}
          webapiaggregation={webApiAggregation}
          webapireports={webApiReports}
          webapiservicetypes={webApiServiceTypes}
          webapitoken={token}
          tenantname={tenantName}
          tenantDetails={tenantDetails}
        />
      }
    />
    <Route
      path="/ui/metricprofiles/:name/clone"
      element={
        <MetricProfilesClone
          webapimetric={webApiMetric}
          webapiservicetypes={webApiServiceTypes}
          webapitoken={token}
          tenantname={tenantName}
          tenantDetails={tenantDetails}
        />
      }
    />
    <Route
      path="/ui/metricprofiles/:name/history"
      element={<HistoryComponent object="metricprofile" />}
    />
    <Route
      path="/ui/metricprofiles/:name/history/compare/:id1/:id2"
      element={<MetricProfileVersionCompare />}
    />
    <Route
      path="/ui/metricprofiles/:name/history/:version"
      element={<MetricProfileVersionDetails />}
    />

    <Route
      path="/ui/aggregationprofiles"
      element={
        <AggregationProfilesList
          webapiaggregation={webApiAggregation}
          webapimetric={webApiMetric}
          webapitoken={token}
        />
      }
    />
    <Route
      path="/ui/aggregationprofiles/:name"
      element={
        <AggregationProfilesChange
          webapiaggregation={webApiAggregation}
          webapimetric={webApiMetric}
          webapireports={webApiReports}
          webapitoken={token}
          tenantname={tenantName}
        />
      }
    />
    <Route element={<AddRoute usergroups={userGroups.aggregations} />}>
      <Route
        path="/ui/aggregationprofiles/add"
        element={
          <AggregationProfilesChange
            webapiaggregation={webApiAggregation}
            webapimetric={webApiMetric}
            webapitoken={token}
            tenantname={tenantName}
            addview={true}
          />
        }
      />
    </Route>
    <Route
      path="/ui/aggregationprofiles/:name/history"
      element={<HistoryComponent object="aggregationprofile" />}
    />
    <Route
      path="/ui/aggregationprofiles/:name/history/compare/:id1/:id2"
      element={<AggregationProfileVersionCompare />}
    />
    <Route
      path="/ui/aggregationprofiles/:name/history/:version"
      element={<AggregationProfileVersionDetails />}
    />

    <Route
      path="/ui/thresholdsprofiles"
      element={
        <ThresholdsProfilesList
          webapithresholds={webApiThresholds}
          webapimetric={webApiMetric}
          webapitoken={token}
        />
      }
    />
    <Route element={<AddRoute usergroups={userGroups.thresholdsprofiles} />}>
      <Route
        path="/ui/thresholdsprofiles/add"
        element={
          <ThresholdsProfilesChange
            webapithresholds={webApiThresholds}
            webapimetric={webApiMetric}
            webapireports={webApiReports}
            webapitoken={token}
            tenantname={tenantName}
            addview={true}
          />
        }
      />
    </Route>
    <Route
      path="/ui/thresholdsprofiles/:name"
      element={
        <ThresholdsProfilesChange
          webapithresholds={webApiThresholds}
          webapimetric={webApiMetric}
          webapireports={webApiReports}
          webapitoken={token}
          tenantname={tenantName}
        />
      }
    />
    <Route
      path="/ui/thresholdsprofiles/:name/history"
      element={<HistoryComponent object="thresholdsprofile" />}
    />
    <Route
      path="/ui/thresholdsprofiles/:name/history/compare/:id1/:id2"
      element={<ThresholdsProfileVersionCompare />}
    />
    <Route
      path="/ui/thresholdsprofiles/:name/history/:version"
      element={<ThresholdsProfileVersionDetail />}
    />

    <Route
      path="/ui/operationsprofiles"
      element={
        <OperationsProfilesList
          webapioperations={webApiOperations}
          webapitoken={token}
        />
      }
    />
    <Route
      path="/ui/operationsprofiles/:name"
      element={
        <OperationsProfileDetails
          webapioperations={webApiOperations}
          webapitoken={token}
        />
      }
    />

    <Route path="/ui/cookiepolicies/" element={<CookiePolicy />} />

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route path="/ui/administration" element={<TenantAdministration />} />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/metricoverrides"
        element={<MetricOverrideList />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/metricoverrides/add"
        element={<MetricOverrideChange addview={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/metricoverrides/:name"
        element={<MetricOverrideChange />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/probecandidates"
        element={<ProbeCandidateList />}
      />
    </Route>

    {/* OVO TREBA PROVJERITI!!! DODATI PROBE CANDIDATES KROZ API I TESTIRATI */}
    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/probecandidates/:id"
        element={<ProbeCandidateChange />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/users"
        element={<UsersList isTenantSchema={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/users/add"
        element={<UserChange addview={true} isTenantSchema={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/users/:user_name"
        element={<UserChange isTenantSchema={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofreports"
        element={
          <GroupList
            group="reports"
            id="groupofreports"
            name="group of reports"
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofreports/add"
        element={
          <GroupChange
            group="reports"
            id="groupofreports"
            title="reports"
            addview={true}
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofreports/:name"
        element={
          <GroupChange group="reports" id="groupofreports" title="reports" />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofmetrics"
        element={
          <GroupList
            group="metrics"
            id="groupofmetrics"
            name="group of metrics"
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofmetrics/add"
        element={
          <GroupChange
            group="metrics"
            id="groupofmetrics"
            title="metrics"
            addview={true}
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofmetrics/:name"
        element={
          <GroupChange group="metrics" id="groupofmetrics" title="metrics" />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofaggregations"
        element={
          <GroupList
            group="aggregations"
            id="groupofaggregations"
            name="group of aggregations"
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofaggregations/add"
        element={
          <GroupChange
            group="aggregations"
            id="groupofaggregations"
            title="aggregations"
            addview={true}
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofaggregations/:name"
        element={
          <GroupChange
            group="aggregations"
            id="groupofaggregations"
            title="aggregations"
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofmetricprofiles"
        element={
          <GroupList
            group="metricprofiles"
            id="groupofmetricprofiles"
            name="group of metric profiles"
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofmetricprofiles/add"
        element={
          <GroupChange
            group="metricprofiles"
            id="groupofmetricprofiles"
            title="metric profiles"
            addview={true}
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofmetricprofiles/:name"
        element={
          <GroupChange
            group="metricprofiles"
            id="groupofmetricprofiles"
            title="metric profiles"
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route path="/ui/administration/apikey" element={<APIKeyList />} />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/apikey/add"
        element={<APIKeyChange addview={true} isTenantSchema={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/metrictemplates/"
        element={<ListOfMetrics type="metrictemplates" isTenantSchema={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/metrictemplates/:name"
        element={<MetricTemplateComponent tenantview={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/metrictemplates/:name/history"
        element={<HistoryComponent object="metrictemplate" tenantView={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/metrictemplates/:name/history/compare/:id1/:id2"
        element={<CompareMetrics type="metrictemplate" />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/metrictemplates/:name/history/:version"
        element={<MetricTemplateVersionDetails />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/apikey/:name"
        element={<APIKeyChange isTenantSchema={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/yumrepos/"
        element={<YumRepoList isTenantSchema={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/yumrepos/:name"
        element={<YumRepoComponent disabled={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/packages/"
        element={<PackageList isTenantSchema={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/packages/:nameversion"
        element={<PackageComponent disabled={true} />}
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofthresholdsprofiles"
        element={
          <GroupList
            group="thresholdsprofiles"
            id="groupofthresholdsprofiles"
            name="group of thresholds profiles"
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofthresholdsprofiles/add"
        element={
          <GroupChange
            group="thresholdsprofiles"
            id="groupofthresholdsprofiles"
            title="thresholds profiles"
            addview={true}
          />
        }
      />
    </Route>

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/administration/groupofthresholdsprofiles/:name"
        element={
          <GroupChange
            group="thresholdsprofiles"
            id="groupofthresholdsprofiles"
            title="thresholds profiles"
          />
        }
      />
    </Route>

    <Route
      path="/ui/reports"
      element={
        <ReportsList
          webapitoken={token}
          webapireports={webApiReports}
          webapimetric={webApiMetric}
          webapiaggregation={webApiAggregation}
          webapioperations={webApiOperations}
          webapithresholds={webApiThresholds}
        />
      }
    />

    <Route element={<AddRoute usergroups={userGroups.reports} />}>
      <Route
        path="/ui/reports/add"
        element={
          <ReportsAdd
            webapitoken={token}
            webapireports={webApiReports}
            webapimetric={webApiMetric}
            webapiaggregation={webApiAggregation}
            webapioperations={webApiOperations}
            webapithresholds={webApiThresholds}
          />
        }
      />
    </Route>

    <Route
      path="/ui/reports/:name"
      element={
        <ReportsChange
          webapitoken={token}
          webapireports={webApiReports}
          webapimetric={webApiMetric}
          webapiaggregation={webApiAggregation}
          webapioperations={webApiOperations}
          webapithresholds={webApiThresholds}
        />
      }
    />

    <Route
      path="/ui/servicetypes/"
      element={
        <ServiceTypesList
          webapitoken={token}
          webapiservicetypes={webApiServiceTypes}
          showtitles={showServiceTitle}
        />
      }
    />

    <Route element={<SuperUserRoute isSuperUser={isSuperUser} />}>
      <Route
        path="/ui/servicetypes/add"
        element={
          <ServiceTypesBulkAdd
            webapitoken={token}
            webapiservicetypes={webApiServiceTypes}
            showtitles={showServiceTitle}
          />
        }
      />
    </Route>

    <Route element={<NotFound />} />
  </Routes>
);

const SuperAdminRouteSwitch = () => (
  <Routes>
    <Route path="/ui/login" element={<Navigate to="/ui/administration" />} />
    <Route path="/ui/home" element={<Home />} />

    <Route path="/ui/probes" element={<ProbeList />} />
    <Route path="/ui/probes/add" element={<ProbeComponent addview={true} />} />
    <Route
      path="/ui/probes/:name/clone"
      element={<ProbeComponent cloneview={true} />}
    />
    <Route
      path="/ui/probes/:name/history"
      element={<HistoryComponent object="probe" />}
    />
    <Route
      path="/ui/probes/:name/history/compare/:id1/:id2"
      element={<ProbeVersionCompare />}
    />
    <Route
      path="/ui/probes/:name/history/:version"
      element={<ProbeVersionDetails />}
    />
    <Route path="/ui/probes/:name" element={<ProbeComponent />} />

    <Route path="/ui/metrictags" element={<MetricTagsList />} />
    <Route
      path="/ui/metrictags/add"
      element={<MetricTagsComponent addview={true} />}
    />
    <Route path="/ui/metrictags/:name" element={<MetricTagsComponent />} />

    <Route
      path="/ui/metrictemplates"
      element={<ListOfMetrics type="metrictemplates" />}
    />
    <Route
      path="/ui/metrictemplates/add"
      element={<MetricTemplateComponent addview={true} />}
    />
    <Route
      path="/ui/metrictemplates/:name/clone"
      element={<MetricTemplateComponent cloneview={true} />}
    />
    <Route
      path="/ui/metrictemplates/:name/history"
      element={<HistoryComponent object="metrictemplate" />}
    />
    <Route
      path="/ui/metrictemplates/:name/history/compare/:id1/:id2"
      element={<CompareMetrics type="metrictemplate" />}
    />
    <Route
      path="/ui/metrictemplates/:name/history/:version"
      element={<MetricTemplateVersionDetails />}
    />
    <Route
      path="/ui/metrictemplates/:name"
      element={<MetricTemplateComponent />}
    />

    <Route path="/ui/yumrepos/" element={<YumRepoList />} />
    <Route
      path="/ui/yumrepos/add"
      element={<YumRepoComponent addview={true} />}
    />
    <Route
      path="/ui/yumrepos/:name/clone"
      element={<YumRepoComponent cloneview={true} />}
    />
    <Route path="/ui/yumrepos/:name" element={<YumRepoComponent />} />

    <Route path="/ui/packages/" element={<PackageList />} />
    <Route
      path="/ui/packages/add"
      element={<PackageComponent addview={true} />}
    />
    <Route path="/ui/packages/:nameversion" element={<PackageComponent />} />
    <Route
      path="/ui/packages/:nameversion/clone"
      element={<PackageComponent cloneview={true} />}
    />

    <Route path="/ui/administration" element={<SuperAdminAdministration />} />
    <Route
      path="/ui/administration/default_ports"
      element={<DefaultPortsList />}
    />

    <Route path="/ui/administration/users" element={<UsersList />} />
    <Route
      path="/ui/administration/users/add"
      element={<UserChange addview={true} />}
    />
    <Route
      path="/ui/administration/users/:user_name/change_password"
      element={<ChangePassword />}
    />
    <Route
      path="/ui/administration/users/:user_name"
      element={<UserChange />}
    />
    <Route path="/ui/administration/apikey" element={<APIKeyList />} />
    <Route
      path="/ui/administration/apikey/add"
      element={<APIKeyChange addview={true} />}
    />
    <Route path="/ui/administration/apikey/:name" element={<APIKeyChange />} />

    <Route path="/ui/tenants" element={<TenantList />} />
    <Route path="/ui/tenants/:name" element={<TenantChange />} />
    <Route path="/ui/cookiepolicies/" element={<CookiePolicy />} />
    <Route element={<NotFound />} />
  </Routes>
);

const App = () => {
  const backend = new Backend();

  let [isSessionActive, setIsSessionActive] = useState(undefined);
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [userDetails, setUserDetails] = useState(undefined);
  const [webApiAggregation, setWebApiAggregation] = useState(undefined);
  const [webApiMetric, setWebApiMetric] = useState(undefined);
  const [webApiThresholds, setWebApiThresholds] = useState(undefined);
  const [webApiOperations, setWebApiOperations] = useState(undefined);
  const [webApiServiceTypes, setWebApiServiceTypes] = useState(undefined);
  const [webApiReports, setWebApiReports] = useState(undefined);
  let [publicView, setPublicView] = useState(undefined);
  const [tenantName, setTenantName] = useState(undefined);
  const [privacyLink, setPrivacyLink] = useState(undefined);
  const [termsLink, setTermsLink] = useState(undefined);
  const [token, setToken] = useState(undefined);
  const [version, setVersion] = useState(undefined);
  const [isTenantSchema, setIsTenantSchema] = useState(null);
  const [showServiceTitle, setShowServiceTitle] = useState(undefined)
  const [tenantDetails, setTenantDetails] = useState({ combined: false, tenants: {} })
  

  async function onLogin(response) {
    let isTenantSchema = await backend.isTenantSchema();
    await initalizeState(isTenantSchema, response);
  }

  function onLogout() {
    setIsSessionActive(false);
    localStorage.removeItem("referrer");
  }

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  async function initalizeState(poemType, response) {
    let options = await backend.fetchConfigOptions();
    setIsTenantSchema(poemType);
    setIsSessionActive(response.active);
    setUserDetails(response.userdetails);
    setTenantDetails(response.tenantdetails);
    setVersion(options && options.result.version);
    setPrivacyLink(options && options.result.terms_privacy_links.privacy);
    setTermsLink(options && options.result.terms_privacy_links.terms);
    setPublicView(false);
    if (poemType) {
      setToken(response && response.userdetails.token);
      setWebApiMetric(options && options.result.webapimetric);
      setWebApiAggregation(options && options.result.webapiaggregation);
      setWebApiThresholds(options && options.result.webapithresholds);
      setWebApiOperations(options && options.result.webapioperations);
      setWebApiReports(options && options.result.webapireports);
      setWebApiServiceTypes(options && options.result.webapiservicetypes);
      setTenantName(options && options.result.tenant_name);
      setShowServiceTitle(options && options.result.use_service_title);
    }
    options &&
      prefetchData(
        false,
        poemType,
        options,
        poemType ? response.userdetails.token : null
      );
  }

  async function initalizePublicState() {
    let token = await backend.fetchPublicToken();
    let options = await backend.fetchConfigOptions();
    let isTenantSchema = await backend.isTenantSchema();

    setIsTenantSchema(isTenantSchema);
    setIsSessionActive(false);
    setUserDetails({ username: "Anonymous" });
    setToken(token);
    setWebApiMetric(options && options.result.webapimetric);
    setWebApiAggregation(options && options.result.webapiaggregation);
    setWebApiThresholds(options && options.result.webapithresholds);
    setWebApiOperations(options && options.result.webapioperations);
    setWebApiReports(options && options.result.webapireports);
    setWebApiServiceTypes(options && options.result.webapiservicetypes);
    setPrivacyLink(options && options.result.terms_privacy_links.privacy);
    setTermsLink(options && options.result.terms_privacy_links.terms);
    setTenantName(options && options.result.tenant_name);
    setShowServiceTitle(options && options.result.use_service_title);
    setPublicView(true);
    options && prefetchData(true, isTenantSchema, options, token);
  }

  function prefetchData(isPublic, isTenant, options, token) {
    if (!isPublic) {
      queryClient.prefetchQuery("user", () => fetchUsers());
      queryClient.prefetchQuery("yumrepo", () => fetchYumRepos());
      queryClient.prefetchQuery("apikey", () => fetchAPIKeys());
    }

    queryClient.prefetchQuery(`${isPublic ? "public_" : ""}ostags`, () =>
      fetchOStags(isPublic)
    );
    queryClient.prefetchQuery(`${isPublic ? "public_" : ""}package`, () =>
      fetchPackages(isPublic)
    );
    queryClient.prefetchQuery(`${isPublic ? "public_" : ""}metrictags`, () =>
      fetchMetricTags(isPublic)
    );
    queryClient.prefetchQuery(
      `${isPublic ? "public_" : ""}metrictemplate`,
      () => fetchMetricTemplates(isPublic)
    );
    queryClient.prefetchQuery(
      `${isPublic ? "public_" : ""}metrictemplatestypes`,
      () => fetchMetricTemplateTypes(isPublic)
    );
    queryClient.prefetchQuery(`${isPublic ? "public_" : ""}metrictags`, () =>
      fetchMetricTags(isPublic)
    );
    queryClient.prefetchQuery(`${isPublic ? "public_" : ""}probe`, () =>
      fetchProbes(isPublic)
    );

    if (isTenant) {
      let webapi = new WebApi({
        token: token,
        metricProfiles: options.result.webapimetric,
        aggregationProfiles: options.result.webapiaggregation,
        thresholdsProfiles: options.result.webapithresholds,
        operationsProfiles: options.result.webapioperations,
        reportsConfigurations: options.result.webapireports,
        serviceTypes: options.result.webapiservicetypes,
      });

      if (!isPublic)
        queryClient.prefetchQuery("usergroups", () =>
          fetchUserGroups(isTenant)
        );

      queryClient.prefetchQuery(`${isPublic ? "public_" : ""}metric`, () =>
        fetchMetrics(isPublic)
      );
      queryClient.prefetchQuery(
        [`${isPublic ? "public_" : ""}metric`, "usergroups"],
        () => fetchUserGroups(isTenant, isPublic, "metrics")
      );
      queryClient.prefetchQuery(
        [`${isPublic ? "public_" : ""}report`, "backend"],
        () => fetchBackendReports(isPublic)
      );
      queryClient.prefetchQuery(
        [`${isPublic ? "public_" : ""}report`, "webapi"],
        () => fetchReports(webapi)
      );
      queryClient.prefetchQuery(
        [`${isPublic ? "public_" : ""}metricprofile`, "backend"],
        () => fetchBackendMetricProfiles(isPublic)
      );
      queryClient.prefetchQuery(
        [`${isPublic ? "public_" : ""}metricprofile`, "webapi"],
        () => fetchMetricProfiles(webapi)
      );
      queryClient.prefetchQuery(
        [`${isPublic ? "public_" : ""}aggregationprofile`, "backend"],
        () => fetchBackendAggregationProfiles(isPublic)
      );
      queryClient.prefetchQuery(
        [`${isPublic ? "public_" : ""}aggregationprofile`, "webapi"],
        () => fetchAggregationProfiles(webapi)
      );
      queryClient.prefetchQuery(
        [`${isPublic ? "public_" : ""}thresholdsprofile`, "backend"],
        () => fetchBackendThresholdsProfiles(isPublic)
      );
      queryClient.prefetchQuery(
        [`${isPublic ? "public_" : ""}thresholdsprofile`, "webapi"],
        () => fetchThresholdsProfiles(webapi)
      );
      queryClient.prefetchQuery(
        [`${isPublic ? "public_" : ""}servicetypes`, "webapi"],
        () => fetchServiceTypes(webapi)
      );
      queryClient.prefetchQuery(
        `${isPublic ? "public_" : ""}operationsprofile`,
        () => fetchOperationsProfiles(webapi)
      );
      if (options.result.webapireports) {
        if (!isPublic)
          queryClient.prefetchQuery("topologytags", () =>
            fetchTopologyTags(webapi)
          );

        queryClient.prefetchQuery(
          `${isPublic ? "public_" : ""}topologygroups`,
          () => fetchTopologyGroups(webapi)
        );
        queryClient.prefetchQuery(
          `${isPublic ? "public_" : ""}topologyendpoints`,
          () => fetchTopologyEndpoints(webapi)
        );
      }
    } else {
      queryClient.prefetchQuery("tenant", () => fetchTenants());
    }
  }

  function isPublicUrl() {
    const pathname = window.location.pathname;

    return pathname.includes("public_");
  }

  function getAndSetReferrer() {
    let referrer = localStorage.getItem("referrer");
    let stackUrls = undefined;

    if (referrer) stackUrls = JSON.parse(referrer);
    else stackUrls = new Array();

    stackUrls.push(window.location.pathname);
    localStorage.setItem("referrer", JSON.stringify(stackUrls));
  }

  async function fetchData() {
    if (isPublicUrl()) {
      initalizePublicState();
    } else {
      let isTenantSchema = await backend.isTenantSchema();
      let response = await backend.isActiveSession(isTenantSchema);
      response.active && initalizeState(isTenantSchema, response);
    }

    getAndSetReferrer();
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (publicView && privacyLink && termsLink && isTenantSchema !== undefined) {
    if (isTenantSchema)
      return (
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools />
          <BrowserRouter>
            <Routes>
              <Route
                path="/ui/public_home"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <PublicHome />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_probes"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ProbeList publicView={true} isTenantSchema={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_probes/:name"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ProbeComponent publicView={true} isTenantSchema={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_probes/:name/history"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <HistoryComponent object="probe" publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_probes/:name/history/compare/:id1/:id2"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ProbeVersionCompare publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_probes/:name/history/:version"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ProbeVersionDetails publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrictemplates"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ListOfMetrics
                      type="metrictemplates"
                      isTenantSchema={true}
                      publicView={true}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrictemplates/:name"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <MetricTemplateComponent
                      publicView={true}
                      tenantView={true}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrictemplates/:name/history"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <HistoryComponent
                      publicView={true}
                      object="metrictemplate"
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrictemplates/:name/history/compare/:id1/:id2"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <CompareMetrics publicView={true} type="metrictemplate" />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrictemplates/:name/history/:version"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <MetricTemplateVersionDetails publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_default_ports"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <DefaultPortsList publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrics"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ListOfMetrics
                      type="metrics"
                      publicView={true}
                      isTenantSchema={true}
                      webapitoken={token}
                      webapimetric={webApiMetric}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrics/:name"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <MetricChange publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_reports"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ReportsList
                      publicView={true}
                      webapitoken={token}
                      webapireports={webApiReports}
                      webapimetric={webApiMetric}
                      webapiaggregation={webApiAggregation}
                      webapioperations={webApiOperations}
                      webapithresholds={webApiThresholds}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_reports/:name"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ReportsChange
                      publicView={true}
                      webapitoken={token}
                      webapireports={webApiReports}
                      webapimetric={webApiMetric}
                      webapiaggregation={webApiAggregation}
                      webapioperations={webApiOperations}
                      webapithresholds={webApiThresholds}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metricprofiles"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <MetricProfilesList
                      webapimetric={webApiMetric}
                      webapitoken={token}
                      publicView={true}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metricprofiles/:name"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <MetricProfilesChange
                      webapimetric={webApiMetric}
                      webapitoken={token}
                      tenantname={tenantName}
                      publicView={true}
                      tenantDetails={tenantDetails}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_aggregationprofiles"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <AggregationProfilesList
                      publicView={true}
                      webapimetric={webApiMetric}
                      webapiaggregation={webApiAggregation}
                      webapitoken={token}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_aggregationprofiles/:name"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <AggregationProfilesChange
                      webapimetric={webApiMetric}
                      webapiaggregation={webApiAggregation}
                      webapitoken={token}
                      tenantname={tenantName}
                      publicView={true}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_thresholdsprofiles"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ThresholdsProfilesList
                      publicView={true}
                      webapithresholds={webApiThresholds}
                      webapimetric={webApiMetric}
                      webapitoken={token}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_thresholdsprofiles/:name"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ThresholdsProfilesChange
                      webapithresholds={webApiThresholds}
                      webapimetric={webApiMetric}
                      webapireports={webApiReports}
                      webapitoken={token}
                      tenantname={tenantName}
                      publicView={true}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_operationsprofiles"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <OperationsProfilesList
                      publicView={true}
                      webapitoken={token}
                      webapioperations={webApiOperations}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_operationsprofiles/:name"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <OperationsProfileDetails
                      publicView={true}
                      webapitoken={token}
                      webapioperations={webApiOperations}
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_servicetypes"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ServiceTypesList
                      webapitoken={token}
                      webapiservicetypes={webApiServiceTypes}
                      showtitles={showServiceTitle}
                      publicView={true}
                    />
                  </PublicPage>
                }
              />

              <Route element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      );
    else
      return (
        <QueryClientProvider client={queryClient}>
          <ReactQueryDevtools />
          <BrowserRouter>
            <Routes>
              <Route
                path="/ui/public_home"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <PublicHome isSuperAdmin={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_probes"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ProbeList publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_probes/:name"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ProbeComponent publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_probes/:name/history"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <HistoryComponent object="probe" publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_probes/:name/history/compare/:id1/:id2"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ProbeVersionCompare publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_probes/:name/history/:version"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ProbeVersionDetails publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrictemplates"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <ListOfMetrics type="metrictemplates" publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrictemplates/:name"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <MetricTemplateComponent publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrictemplates/:name/history"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <HistoryComponent
                      publicView={true}
                      object="metrictemplate"
                    />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrictemplates/:name/history/compare/:id1/:id2"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <CompareMetrics publicView={true} type="metrictemplate" />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_metrictemplates/:name/history/:version"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <MetricTemplateVersionDetails publicView={true} />
                  </PublicPage>
                }
              />

              <Route
                path="/ui/public_default_ports"
                element={
                  <PublicPage privacyLink={privacyLink} termsLink={termsLink}>
                    <DefaultPortsList publicView={true} />
                  </PublicPage>
                }
              />

              <Route element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </QueryClientProvider>
      );
  } else if (!publicView && !isSessionActive) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/ui/*" element={<Login onLogin={onLogin} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  } else if (
    isSessionActive &&
    userDetails &&
    privacyLink &&
    termsLink &&
    isTenantSchema !== null
  ) {
    return (
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools />
        <BrowserRouter>
          <Container fluid>
            <DocumentTitle />
            <Row>
              <NotificationContainer />
              <Col>
                <NavigationBar
                  onLogout={onLogout}
                  isOpenModal={areYouSureModal}
                  toggle={toggleAreYouSure}
                  titleModal="Log out"
                  msgModal="Are you sure you want to log out?"
                  userDetails={userDetails}
                  isTenantSchema={isTenantSchema}
                  publicView={publicView}
                />
              </Col>
            </Row>
            <Row className="g-0">
              <Col
                sm={{ size: 2 }}
                md={{ size: 2 }}
                id="sidebar-col"
                className="d-flex flex-column"
              >
                <NavigationLinks
                  isTenantSchema={isTenantSchema}
                  userDetails={userDetails}
                />
                <div
                  id="sidebar-grow"
                  className="flex-grow-1 border-left border-right mb-0 pb-5"
                />
                <NavigationAbout
                  poemVersion={version}
                  tenantName={tenantName}
                  termsLink={termsLink}
                  privacyLink={privacyLink}
                />
              </Col>
              <Col>
                <CustomBreadcrumb />
                {isTenantSchema ? (
                  <TenantRouteSwitch
                    webApiMetric={webApiMetric}
                    webApiAggregation={webApiAggregation}
                    webApiThresholds={webApiThresholds}
                    webApiOperations={webApiOperations}
                    webApiReports={webApiReports}
                    webApiServiceTypes={webApiServiceTypes}
                    token={token}
                    tenantName={tenantName}
                    showServiceTitle={showServiceTitle}
                    isSuperUser={userDetails.is_superuser}
                    userGroups={userDetails.groups}
                    tenantDetails={tenantDetails}
                  />
                ) : (
                  <SuperAdminRouteSwitch />
                )}
              </Col>
            </Row>
            <Row>
              <Col>
                <Footer
                  loginPage={false}
                  termsLink={termsLink}
                  privacyLink={privacyLink}
                />
              </Col>
            </Row>
          </Container>
        </BrowserRouter>
      </QueryClientProvider>
    );
  } else if (isTenantSchema === null && isSessionActive) {
    return (
      <QueryClientProvider client={queryClient}>
        <React.Fragment>
          <h1>Something went wrong</h1>
          <p>Cannot obtain schema.</p>
        </React.Fragment>
      </QueryClientProvider>
    );
  } else return null;
};

export default App;
