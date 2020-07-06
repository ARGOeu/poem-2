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
    let response = await fetch('/api/v2/internal/config_options');
    if (response.ok) {
      let json = await response.json();
      return json;
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
          error_msg = `${response.status} ${response.statusText}; in fetch ${url}; ${json.detail}`;
        } catch(err1) {
          error_msg = `${response.status} ${response.statusText}; in fetch ${url}`;
        }
      }
    } catch (err) {
      error_msg = `${err}; in fetch ${url}`;
    };
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
          error_msg = `${response.status} ${response.statusText}; in fetch ${url}; ${json.detail}`;
        } catch(err1) {
          error_msg = `${response.status} ${response.statusText}; in fetch ${url}`;
        }
      }
    } catch(err) {
      error_msg = `${err}; in fetch ${url}`;
    };
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
          error_msg = `${response.status} ${response.statusText}; in fetch ${url}; ${json.detail}`;
        } catch(err1) {
          error_msg = `${response.status} ${response.statusText}; in fetch ${url}`;
        };
      }
    } catch(err) {
      error_msg = `${err}; in fetch ${url}`;
    };
    if (error_msg)
      throw Error(error_msg);
  }

  changeObject(url, data) {
    return this.send(url, 'PUT', data);
  }

  addObject(url, data) {
    return this.send(url, 'POST', data);
  }

  deleteObject(url) {
    return this.send(url, 'DELETE');
  }

  importMetrics(data) {
    return this.send(
      '/api/v2/internal/importmetrics/',
      'POST',
      data
    )
  }

  bulkDeleteMetrics(data) {
    return this.send(
      '/api/v2/internal/deletetemplates/',
      'POST',
      data
    );
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
      reportsConfigurations=undefined
    }) {
    this.token = token;
    this.metricprofiles = metricProfiles;
    this.aggregationprofiles = aggregationProfiles;
    this.thresholdsprofiles = thresholdsProfiles;
  }

  async fetchMetricProfiles() {
    let err_msg = '';
    try {
      let response = await fetch(
        this.metricprofiles,
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
          err_msg = `${response.status} ${response.statusText}; in fetch ${this.metricprofiles}; ${json.status.details}`;
        } catch(err) {
          err_msg = `${response.status} ${response.statusText}; in fetch ${this.metricprofiles}`;
        };
      };
    } catch(err) {
      err_msg = `${err}; in fetch ${this.metricprofiles}`;
    };
    if (err_msg)
      throw Error(err_msg);
  }

  fetchMetricProfile(id) {
    return this.fetchProfile(`${this.metricprofiles}/${id}`);
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

  deleteMetricProfile(id) {
    return this.deleteProfile(`${this.metricprofiles}/${id}`);
  }

  deleteAggregation(id) {
    return this.deleteProfile(`${this.aggregationprofiles}/${id}`);
  }

  deleteThresholdsProfile(id) {
    return this.deleteProfile(`${this.thresholdsprofiles}/${id}`);
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
            err_msg = `${response.status} ${response.statusText}; in fetch ${url}; ${json.status.details}`;

          else if (json.errors[0].details)
            err_msg = `${response.status} ${response.statusText}; in fetch ${url}; ${json.errors[0].details}`;

          else
            err_msg = `${response.status} ${response.statusText}; in fetch ${url}`;
        } catch(err1) {
          err_msg = `${response.status} ${response.statusText}; in fetch ${url}`;
        };
      };
    } catch(err) {
      err_msg = `${err}; in fetch ${url}`;
    };
    if (err_msg)
      throw Error(err_msg);
  }

  changeProfile(url, data) {
    return this.send(`${url}/${data.id}`, 'PUT', data);
  }

  addProfile(url, data) {
    return this.send(url, 'POST', data);
  }

  deleteProfile(url) {
    return this.send(url, 'DELETE');
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
