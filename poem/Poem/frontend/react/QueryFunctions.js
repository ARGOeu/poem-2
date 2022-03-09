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


export const fetchMetricTypes = async (publicView) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}mtypes`);
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


export const fetchTenants = async () => {
  const backend = new  Backend();

  return await backend.fetchData('/api/v2/internal/tenants');
}


export const fetchBackendReports = async (publicView=false) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}reports`);
}


export const fetchReports = async (webapi) => {
  return await webapi.fetchReports()
}


export const fetchBackendMetricProfiles = async (publicView=false) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metricprofiles`)
}


export const fetchMetricProfiles = async (webapi) => {
  return await webapi.fetchMetricProfiles();
}


export const fetchBackendAggregationProfiles = async (publicView=false) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}aggregations`)
}


export const fetchAggregationProfiles = async (webapi) => {
  return await webapi.fetchAggregationProfiles()
}


export const fetchBackendThresholdsProfiles = async (publicView=false) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}thresholdsprofiles`);
}


export const fetchThresholdsProfiles = async (webapi) => {
  return await webapi.fetchThresholdsProfiles()
}


export const fetchOperationsProfiles = async (webapi) => {
  return await webapi.fetchOperationsProfiles();
}


export const fetchTopologyTags = async (webapi) => {
  return await webapi.fetchReportsTopologyTags()
}


export const fetchTopologyGroups = async (webapi) => {
  return await webapi.fetchReportsTopologyGroups()
}
