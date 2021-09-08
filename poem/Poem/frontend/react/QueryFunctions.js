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


export const fetchYumRepos = async () => {
  const backend = new Backend()
  return await backend.fetchData('/api/v2/internal/yumrepos')
}


export const fetchOStags = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}ostags`);
}


export const fetchUserDetails = async (isTenantSchema) => {
  const backend = new Backend();

  let arg = isTenantSchema ? true : false;
  let session = await backend.isActiveSession(arg);

  if (session.active)
    return session.userdetails;
}


export const fetchAllMetrics = async (publicView) => {
  const backend = new Backend();
  return await backend.fetchListOfNames(`/api/v2/internal/${publicView ? 'public_' : ''}metricsall`);
};


export const fetchPackages = async (publicView=false) => {
  const backend = new Backend();
  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}packages`)
}


export const fetchProbeVersions = async () => {
  const backend = new Backend();
  return await backend.fetchData('/api/v2/internal/version/probe');
}


export const fetchOperationsProfiles = async (webapi) => {
  return await webapi.fetchOperationsProfiles();
}


export const fetchProbeVersion = async (publicView, name) => {
  const backend = new Backend();
  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}version/probe/${name}`);
}


export const fetchMetricTemplates = async (publicView) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metrictemplates`);
}


export const fetchMetricTemplateTypes = async (publicView) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}mttypes`);
}


export const fetchMetricTags = async (publicView) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metrictags`);
}