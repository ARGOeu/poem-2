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
      if (response.ok) {
        return response.json();
      }

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

  async fetchWebApiData(url) {
    const json = await this.fetchData(url);
    return json.data;
  }

  async fetchWebApiMetricProfiles(publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/metricprofiles/`);
  }

  async fetchWebApiMetricProfile(id, publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/metricprofiles/${id}`);
  }

  async fetchWebApiAggregations(publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/aggregations/`);
  }

  async fetchWebApiAggregation(id, publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/aggregations/${id}`);
  }

  async fetchWebApiThresholdsProfiles(publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/thresholdsprofiles/`);
  }

  async fetchWebApiThresholdsProfile(id, publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/thresholdsprofiles/${id}`);
  }

  async fetchWebApiOperationsProfiles(publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/operationsprofiles/`);
  }

  async fetchWebApiOperationsProfile(name, publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/operationsprofiles/${name}`);
  }

  async fetchWebApiReports(publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/reports/`);
  }

  async fetchWebApiReport(name, publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/reports/${name}`);
  }

  async fetchWebApiTopologyTags(publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/topology/tags/`);
  }

  async fetchWebApiTopologyGroups(publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/topology/groups/`);
  }

  async fetchWebApiTopologyEndpoints(publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/topology/endpoints/`);
  }

  async fetchWebApiServiceTypes(publicView=false) {
    return await this.fetchWebApiData(`/api/v2/internal/${publicView ? 'public_' : ''}webapi/topology/service-types/`);
  }

  async fetchWebApiCombinedMetricProfiles() {
    return await this.fetchData('/api/v2/internal/webapi/combined/metricprofiles/');
  }

  async replaceServiceTypes(serviceTypes) {
    const url = '/api/v2/internal/webapi/topology/service-types/';
    let error_msg = '';
    try {
      const response = await this.send(url, 'PUT', serviceTypes);
      if (response.ok) {
        const json = await response.json();
        return json.data;
      } else {
        try {
          const json = await response.json();
          error_msg = `${response.status} ${response.statusText} in PUT ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch (err) {
          error_msg = `${response.status} ${response.statusText} in PUT ${url}`;
        }
      }
    } catch (err) {
      error_msg = `${err} in PUT ${url}`;
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

  async changeMetricProfile(data) {
    let error_msg = ""
    const url = "/api/v2/internal/metricprofiles/"
    try {
      const response = await this.send(url, 'PUT', data);
      if (!response.ok) {
        try {
          let json = await response.json()
          error_msg = `${response.status} ${response.statusText} in PUT ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch (err2) {
          error_msg = `${response.status} ${response.statusText} in PUT ${url}`;
        }
      } else {
        return await response.json()
      }
    } catch (err1) {
      error_msg = `${err1} in PUT ${url}`
    }

    if (error_msg)
      throw Error(error_msg)
  }

  async addMetricProfile(data) {
    let error_msg = ""
    const url = "/api/v2/internal/metricprofiles/"
    try {
      const response = await this.send(url, 'POST', data);
      if (!response.ok) {
        try {
          let json = await response.json()
          error_msg = `${response.status} ${response.statusText} in POST ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch (err2) {
          error_msg = `${response.status} ${response.statusText} in POST ${url}`;
        }
      } else {
        return await response.json()
      }
    } catch (err1) {
      error_msg = `${err1} in POST ${url}`
    }

    if (error_msg)
      throw Error(error_msg)
  }

  async deleteMetricProfile(idProfile) {
    let error_msg = ""
    const url = `/api/v2/internal/metricprofiles/${idProfile}`
    try {
      const response = await this.send(url, 'DELETE');
      if (!response.ok) {
        try {
          let json = await response.json()
          error_msg = `${response.status} ${response.statusText} in DELETE ${url}${json.detail ? `: ${json.detail}` : ''}`;
        } catch (err2) {
          error_msg = `${response.status} ${response.statusText} in DELETE ${url}`;
        }
      } else {
        return response
      }
    } catch (err1) {
      error_msg = `${err1} in DELETE ${url}`
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
