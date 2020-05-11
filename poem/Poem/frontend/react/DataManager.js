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
      alert(`Something went wrong: ${err}`);
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
      alert(`Something went wrong: ${err}`)
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
          error_msg = `Fetch ${url}: ${response.status} ${response.statusText}: ${json.detail}`;
        } catch(err1) {
          error_msg = `Fetch ${url}: ${response.status} ${response.statusText}`;
        }
      }
    } catch (err) {
      error_msg = `Fetch ${url}: ${err}`;
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
          error_msg = `Fetch ${url}: ${response.status} ${response.statusText}: ${json.detail}`;
        } catch(err1) {
          error_msg = `Fetch ${url}: ${response.status} ${response.statusText}`
        }
      }
    } catch(err) {
      error_msg = `Fetch ${url}: ${err}`;
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
          error_msg = `Fetch ${url}: ${response.status} ${response.statusText}: ${json.detail}`;
        } catch(err1) {
          error_msg = `Fetch ${url}: ${response.status} ${response.statusText}`;
        };
      }
    } catch(err) {
      error_msg = `Fetch ${url}: ${err}`;
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
      let json = await response.json();
      return json['data'];
    } catch(err) {
      alert(`Something went wrong: ${err}`);
    }
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
      let json = await response.json();
      return json['data'][0];
    } catch(err) {
      alert(`Something went wrong: ${err}`);
    }
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
