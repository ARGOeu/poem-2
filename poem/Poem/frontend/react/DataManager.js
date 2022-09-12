import Cookies from 'universal-cookie';

export class Backend {
  async isActiveSession(isTenant=true) {
    try {
      let response = await fetch(`/api/v2/internal/sessionactive/${isTenant}`);
      if (response.ok)
        return response.json();
      else
        return false;
    } catch(err) {
      return false;
    }
  }

  async isTenantSchema() {
    try {
      let response = await fetch('/api/v2/internal/istenantschema');
      if (response.ok) {
        let json = await response.json();
        return json['isTenantSchema'];
      } else
        return null;
    } catch(err) {
      return null;
    }
  }

  async fetchPublicToken() {
    // this one fetch token with predefined name WEB-API-RO
    // API is not protected and is used for public views
    try {
      let response = await fetch('/api/v2/internal/public_apikey');
      if (response.ok) {
        let json = await response.json();
        return json['token'];
      } else
        return null;
    } catch(err) {
      return null;
    }
  }

  async fetchConfigOptions() {
    const url = '/api/v2/internal/config_options';
    try {
      let response = await fetch(url);
      if (response.ok) {
        let json = await response.json();
        return json;
      }
    } catch(err) {
      throw Error(`${err} in fetch ${url}`)
    }
  }

  async fetchData(url) {
    let error_msg = '';
    try {
      let response = await fetch(url);
      if (response.ok)
        return response.json();

      else {
        try {
          let json = await response.json();
          error_msg = `${response.status} ${response.statusText} in fetch ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch(err1) {
          error_msg = `${response.status} ${response.statusText} in fetch ${url}`;
        }
      }
    } catch (err) {
      error_msg = `${err} in fetch ${url}`;
    }
    if (error_msg)
      throw Error(error_msg);
  }

  async fetchListOfNames(url) {
    let error_msg = '';
    try {
      let response = await fetch(url);
      if (response.ok) {
        let json = await response.json();
        let list = [];
        json.forEach(e => list.push(e.name));
        return list;
      } else {
        try {
          let json = await response.json();
          error_msg = `${response.status} ${response.statusText} in fetch ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch(err1) {
          error_msg = `${response.status} ${response.statusText} in fetch ${url}`;
        }
      }
    } catch(err) {
      error_msg = `${err} in fetch ${url}`;
    }
    if (error_msg)
      throw Error(error_msg);
  }

  async fetchResult(url) {
    let error_msg = '';
    try {
      let response = await fetch(url);
      if (response.ok) {
        let json = await response.json();
        return json['result'];
      } else {
        try {
          let json = await response.json();
          error_msg = `${response.status} ${response.statusText} in fetch ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch(err1) {
          error_msg = `${response.status} ${response.statusText} in fetch ${url}`;
        }
      }
    } catch(err) {
      error_msg = `${err} in fetch ${url}`;
    }
    if (error_msg)
      throw Error(error_msg);
  }

  async changeObject(url, data) {
    let error_msg = '';
    try {
      const response = await this.send(url, 'PUT', data);
      if (!response.ok) {
        try {
          let json = await response.json();
          error_msg = `${response.status} ${response.statusText} in PUT ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch (err2) {
          error_msg = `${response.status} ${response.statusText} in PUT ${url}`;
        }
      } else {
        return response;
      }
    } catch (err1) {
      error_msg = `${err1} in PUT ${url}`
    }

    if (error_msg)
      throw Error(error_msg)
  }

  async addObject(url, data) {
    let error_msg = '';
    try {
      const response = await this.send(url, 'POST', data);

      if (!response.ok) {
        try {
          let json = await response.json();
          error_msg = `${response.status} ${response.statusText} in POST ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch (err1) {
          error_msg = `${response.status} ${response.statusText} in POST ${url}`;
        }
      }
    } catch (err2) {
      error_msg = `${err2} in POST ${url}`;
    }

    if (error_msg)
      throw Error(error_msg)
  }

  async deleteObject(url) {
    let error_msg = '';
    try {
      const response =  await this.send(url, 'DELETE');

      if (!response.ok) {
        try {
          let json = await response.json();
          error_msg = `${response.status} ${response.statusText} in DELETE ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch (err1) {
          error_msg = `${response.status} ${response.statusText} in DELETE ${url}`;
        }
      }
    } catch (err2) {
      error_msg = `${err2} in DELETE ${url}`;
    }

    if (error_msg)
      throw Error(error_msg)
  }

  async importMetrics(data) {
    let error_msg = '';
    const url = '/api/v2/internal/importmetrics/';
    try {
      const response = await this.send(url, 'POST', data)

      if (response.ok) {
        return await response.json();
      } else {
        try {
          let json = await response.json();
          error_msg = `${response.status} ${response.statusText} in POST ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch(err1) {
          error_msg = `${response.status} ${response.statusText} in POST ${url}`;
        }
      }
    } catch(err2) {
      error_msg = `${err2} in POST ${url}`;
    }

    if (error_msg)
      throw Error(error_msg)
  }

  async bulkDeleteMetrics(data) {
    let error_msg = '';
    const url = '/api/v2/internal/deletetemplates/';
    try {
      const response = await this.send(url, 'POST', data);

      if (response.ok) {
        let json = await response.json()
        return json
      } else {
        try {
          let json = await response.json();
          error_msg = `${response.status} ${response.statusText} in POST ${url}${json.detail ? `: ${json.detail}` : ''}`
        } catch(err1) {
          error_msg = `${response.status} ${response.statusText} in POST ${url}`;
        }
      }
    } catch(err2) {
      error_msg = `${err2} in POST ${url}`;
    }

    if (error_msg)
      throw Error(error_msg)
  }

  send(url, method, values=undefined) {
    const cookies = new Cookies();

    return fetch(url, {
      method: method,
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': cookies.get('csrftoken'),
        'Referer': 'same-origin'
      },
      body: values && JSON.stringify(values)
    });
  }
}

export class WebApi {
  constructor(
    {
      token=undefined,
      metricProfiles=undefined,
      aggregationProfiles=undefined,
      thresholdsProfiles=undefined,
      operationsProfiles=undefined,
      reportsConfigurations=undefined,
      serviceTypes=undefined
    }) {
    this.token = token;
    this.metricprofiles = metricProfiles;
    this.aggregationprofiles = aggregationProfiles;
    this.thresholdsprofiles = thresholdsProfiles;
    this.operationsprofiles = operationsProfiles;
    this.reports = reportsConfigurations;
    this.servicetypes = serviceTypes;
  }

  async fetchProfiles(url) {
    let err_msg = '';
    try {
      let response = await fetch(
        url,
        {
          headers: {
            "Accept": "application/json",
            "x-api-key": this.token
          }
        }
      );
      if (response.ok) {
        let json = await response.json();
        return json['data'];
      } else {
        try {
          let json = await response.json();
          err_msg = `${response.status} ${response.statusText} in fetch ${url}${json.status.details ? `: ${json.status.details}` : ''}`;
        } catch(err) {
          err_msg = `${response.status} ${response.statusText} in fetch ${url}`;
        }
      }
    } catch(err) {
      err_msg = `${err} in fetch ${url}`;
    }
    if (err_msg)
      throw Error(err_msg);
  }

  async fetchMetricProfiles() {
    return this.fetchProfiles(this.metricprofiles);
  }

  async fetchAggregationProfiles() {
    return this.fetchProfiles(this.aggregationprofiles);
  }

  async fetchOperationsProfiles() {
    return this.fetchProfiles(this.operationsprofiles);
  }

  async fetchThresholdsProfiles() {
    return this.fetchProfiles(this.thresholdsprofiles)
  }

  async fetchReports() {
    return this.fetchProfiles(this.reports['main']);
  }

  async fetchReportsTopologyEndpoints() {
    return this.fetchProfiles(this.reports['topologyendpoints']);
  }

  async fetchReportsTopologyGroups() {
    return this.fetchProfiles(this.reports['topologygroups'])
  }

  async fetchReportsTopologyTags() {
    return this.fetchProfiles(this.reports['tags']);
  }

  async fetchServiceTypes() {
    return this.fetchProfiles(this.servicetypes);
  }

  fetchMetricProfile(id) {
    return this.fetchProfile(`${this.metricprofiles}/${id}`);
  }

  async fetchOperationProfile(name) {
    const profiles = await this.fetchOperationsProfiles();
    let profile = {};
    profiles.forEach(prof => {
      if (prof.name === name)
        profile = prof;
    });
    return profile;
  }

  async fetchReport(name) {
    const reports = await this.fetchReports();
    let report = {};
    reports.forEach(rep => {
      if (rep.info.name === name)
        report = rep;
    });
    return report;
  }

  fetchAggregationProfile(id) {
    return this.fetchProfile(`${this.aggregationprofiles}/${id}`);
  }

  fetchThresholdsProfile(id) {
    return this.fetchProfile(`${this.thresholdsprofiles}/${id}`);
  }

  changeAggregation(profile) {
    return this.changeProfile(this.aggregationprofiles, profile);
  }

  changeMetricProfile(profile) {
    return this.changeProfile(this.metricprofiles, profile);
  }

  changeThresholdsProfile(profile) {
    return this.changeProfile(this.thresholdsprofiles, profile);
  }

  addMetricProfile(profile) {
    return this.addProfile(this.metricprofiles, profile);
  }

  addAggregation(profile) {
    return this.addProfile(this.aggregationprofiles, profile);
  }

  addThresholdsProfile(profile) {
    return this.addProfile(this.thresholdsprofiles, profile);
  }

  addReport(report) {
    return this.addProfile(this.reports['main'], report);
  }

  async addServiceTypes(service_types) {
    try {
      await this.addProfile(this.servicetypes, service_types);
    }
    catch (err) {
      if (err.message.includes('409'))
        try {
          await this.deleteProfile(this.servicetypes);
          await this.addProfile(this.servicetypes, service_types);
        }
        catch (err2) {
          throw Error(err2)
        }
    }
  }

  changeReport(report) {
    return this.changeProfile(`${this.reports['main']}`, report);
  }

  deleteMetricProfile(id) {
    return this.deleteProfile(`${this.metricprofiles}/${id}`);
  }

  deleteAggregation(id) {
    return this.deleteProfile(`${this.aggregationprofiles}/${id}`);
  }

  deleteThresholdsProfile(id) {
    return this.deleteProfile(`${this.thresholdsprofiles}/${id}`);
  }

  deleteReport(id) {
    return this.deleteProfile(`${this.reports['main']}/${id}`);
  }

  async fetchProfile(url) {
    let err_msg = '';
    try {
      let response = await fetch(
        url,
        {
          headers: {
            "Accept": "application/json",
            "x-api-key": this.token
          }
        }
      );
      if (response.ok) {
        let json = await response.json();
        return json['data'][0];
      } else {
        try {
          let json = await response.json();
          if (json.status.details)
            err_msg = `${response.status} ${response.statusText} in fetch ${url}: ${json.status.details}`;

          else if (json.errors[0].details)
            err_msg = `${response.status} ${response.statusText} in fetch ${url}: ${json.errors[0].details}`;

          else
            err_msg = `${response.status} ${response.statusText} in fetch ${url}`;
        } catch(err1) {
          err_msg = `${response.status} ${response.statusText} in fetch ${url}`;
        }
      }
    } catch(err) {
      err_msg = `${err} in fetch ${url}`;
    }
    if (err_msg)
      throw Error(err_msg);
  }

  async changeProfile(url, data) {
    let err_mesg = '';

    try {
      const response = await this.send(`${url}/${data.id}`, 'PUT', data);

      if (response.ok) {
        let json = await response.json()
        return json
      } else {
        try {
          let json = await response.json();
          if (json.status.details)
            err_mesg = `${response.status} ${response.statusText} in PUT ${url}: ${json.status.details}`;

          else if (json.errors[0].details)
            err_mesg = `${response.status} ${response.statusText} in PUT ${url}: ${json.errors[0].details}`;

          else
            err_mesg = `${response.status} ${response.statusText} in PUT ${url}`;
        } catch (err1) {
          err_mesg =`${response.status} ${response.statusText} in PUT ${url}`;
        }
      }
    } catch (err2) {
      err_mesg = `${err2} in PUT ${url}`;
    }

    if (err_mesg)
      throw Error(err_mesg)
  }

  async addProfile(url, data) {
    let err_mesg = '';

    try {
      const response = await this.send(url, 'POST', data);

      if (response.ok) {
        let json = await response.json()
        return json
      } else {
        try {
          let json = await response.json();
          if (json.status.details)
            err_mesg = `${response.status} ${response.statusText} in POST ${url}: ${json.status.details}`;

          else if (json.errors[0].details)
            err_mesg = `${response.status} ${response.statusText} in POST ${url}: ${json.errors[0].details}`;

          else
            err_mesg = `${response.status} ${response.statusText} in POST ${url}`;
        } catch (err1) {
          err_mesg =`${response.status} ${response.statusText} in POST ${url}`;
        }
      }
    } catch (err2) {
      err_mesg = `${err2} in POST ${url}`;
    }

    if (err_mesg)
      throw Error(err_mesg)
  }

  async deleteProfile(url) {
    let err_msg = '';

    try {
      const response = await this.send(url, 'DELETE');

      if (response.ok) {
        return response;
      } else {
        try {
          let json = await response.json();
          if (json.status.details)
            err_msg = `${response.status} ${response.statusText} in DELETE ${url}: ${json.status.details}`;

          else if (json.errors[0].details)
            err_msg = `${response.status} ${response.statusText} in DELETE ${url}: ${json.errors[0].details}`;

          else
            err_msg = `${response.status} ${response.statusText} in DELETE ${url}`;
        } catch (err1) {
          err_msg = `${response.status} ${response.statusText} in DELETE ${url}`;
        }
      }
    } catch(err2) {
      err_msg = `${err2} in DELETE ${url}`
    }

    if (err_msg)
      throw Error(err_msg)
  }

  send(url, method, values=null) {
    return fetch(url, {
      method: method,
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-api-key': this.token
      },
      body: values && JSON.stringify(values)
    });
  }
}
