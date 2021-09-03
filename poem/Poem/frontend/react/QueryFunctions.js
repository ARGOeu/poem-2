import { Backend } from "./DataManager";

export const fetchUserGroups = async (isTenantSchema) => {
  const backend = new Backend();
  if (isTenantSchema) {
    let allgroups = await backend.fetchResult('/api/v2/internal/usergroups');

    return allgroups;
  }
}


export const fetchYumRepos = async () => {
  const backend = new Backend()
  return await backend.fetchData('/api/v2/internal/yumrepos')
}


export const fetchOStags = async () => {
  const backend = new Backend();
  return await backend.fetchData('/api/v2/internal/ostags');
}