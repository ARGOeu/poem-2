import { Backend } from "./DataManager";

export const fetchUserGroups = async (isTenantSchema) => {
  const backend = new Backend();
  if (isTenantSchema) {
    let allgroups = await backend.fetchResult('/api/v2/internal/usergroups');

    return allgroups;
  }
}