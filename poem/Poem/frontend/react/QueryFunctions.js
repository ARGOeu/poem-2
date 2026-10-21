import { Backend } from "./DataManager";

export const fetchUserGroups = async (isTenantSchema, publicView=false, group=undefined) => {
  const backend = new Backend();
  if (isTenantSchema) {
    let allgroups = await backend.fetchResult(`/api/v2/internal/${publicView ? 'public_' : ''}usergroups`);

    if (group)
      return allgroups[group];

    else
      return allgroups;
  }
}


export const fetchUserDetails = async (isTenantSchema) => {
  const backend = new Backend();

  let arg = isTenantSchema ? true : false;
  let session = await backend.isActiveSession(arg);

  if (session.active)
    return session.userdetails;
}


export const fetchUsers = async () => {
  const backend = new Backend();

  return await backend.fetchData('/api/v2/internal/users');
}


export const fetchMetrics = async (publicView) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metric`);
}


export const fetchAllMetrics = async (publicView) => {
  const backend = new Backend();
  return await backend.fetchListOfNames(`/api/v2/internal/${publicView ? 'public_' : ''}metricsall`);
};


export const fetchMetricTags = async (publicView) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metrictags`);
}


export const fetchMetricTemplates = async (publicView) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metrictemplates`);
}


export const fetchMetricTemplateTypes = async (publicView) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}mttypes`);
}


export const fetchMetricTemplateVersion = async (publicView, name) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}version/metrictemplate/${name}`)
}


export const fetchProbes = async (publicView) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}probes`);
}


export const fetchProbeVersions = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}version/probe`);
}


export const fetchProbeVersion = async (publicView, name) => {
  const backend = new Backend();
  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}version/probe/${name}`);
}

export const fetchYumRepos = async () => {
  const backend = new Backend()
  return await backend.fetchData('/api/v2/internal/yumrepos')
}


export const fetchOStags = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}ostags`);
}


export const fetchPackages = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}packages`)
}


export const fetchAPIKeys = async () => {
  const backend = new Backend();

  return await backend.fetchData('/api/v2/internal/apikeys');
}


export const fetchTenants = async (publicview=false) => {
  const backend = new  Backend();

  return await backend.fetchData(`/api/v2/internal/${publicview ? "public_": ""}tenants`);
}


export const fetchBackendReports = async (publicView=false) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}reports`);
}


export const fetchReports = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiReports(publicView);
}


export const fetchBackendMetricProfiles = async (publicView=false) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metricprofiles`)
}


export const fetchMetricProfiles = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiMetricProfiles(publicView);
}


export const fetchBackendAggregationProfiles = async (publicView=false) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}aggregations`)
}


export const fetchAggregationProfiles = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiAggregations(publicView);
}


export const fetchBackendThresholdsProfiles = async (publicView=false) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}thresholdsprofiles`);
}


export const fetchThresholdsProfiles = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiThresholdsProfiles(publicView);
}


export const fetchOperationsProfiles = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiOperationsProfiles(publicView);
}


export const fetchTopologyTags = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiTopologyTags(publicView);
}


export const fetchTopologyGroups = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiTopologyGroups(publicView);
}

export const fetchTopologyEndpoints = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiTopologyEndpoints(publicView);
}


export const fetchServiceTypes = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiServiceTypes(publicView);
}


export const fetchMetricProfile = async (id, publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiMetricProfile(id, publicView);
}


export const fetchAggregationProfile = async (id, publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiAggregation(id, publicView);
}


export const fetchThresholdsProfile = async (id, publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiThresholdsProfile(id, publicView);
}


export const fetchOperationProfile = async (name, publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiOperationsProfile(name, publicView);
}


export const fetchReport = async (name, publicView=false) => {
  const backend = new Backend();
  return await backend.fetchWebApiReport(name, publicView);
}


export const fetchCombinedMetricProfiles = async () => {
  const backend = new Backend();
  return await backend.fetchWebApiCombinedMetricProfiles();
}
