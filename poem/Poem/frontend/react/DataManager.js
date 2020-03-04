import Cookies from 'universal-cookie';

export class Backend {
  isActiveSession() {
    return fetch('/api/v2/internal/sessionactive')
      .then(response => {
        if (response.ok)
          return response.json()
        else
          return false
      })
      .catch(() => false);
  };

  isTenantSchema() {
    return fetch('/api/v2/internal/istenantschema')
      .then(response => response.ok ? response.json() : null)
      .then(json => json['isTenantSchema'])
      .catch(err => alert(`Something went wrong: ${err}`))
  };

  fetchData(url) {
    return fetch(url)
      .then(response => response.json())
      .catch(err => alert(`Something went wrong: ${err}`));
  };

  fetchListOfNames(url) {
    return fetch(url)
      .then(response => response.json())
      .then(json => {
        let list = [];
        json.forEach((e) => list.push(e.name));
        return list;
      })
      .catch(err => alert(`Something went wrong: ${err}`));
  };

  fetchResult(url) {
    return fetch(url)
      .then(response => response.json())
      .then(json => json['result'])
      .catch(err => alert(`Something went wrong: ${err}`));
  };

  changeObject(url, data) {
    return this.send(url, 'PUT', data);
  };

  addObject(url, data) {
    return this.send(url, 'POST', data);
  };

  deleteObject(url) {
    return this.send(url, 'DELETE');
  };

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
  };

  fetchMetricProfiles() {
    return fetch(this.metricprofiles,
      {headers:
        {
          "Accept": "application/json",
          "x-api-key": this.token
        }
      })
      .then(response => response.json())
      .then(json => json['data'])
      .catch(err => alert(`Something went wrong: ${err}`));
  };

  fetchMetricProfile(id) {
    return this.fetchProfile(`${this.metricprofiles}/${id}`);
  };

  fetchAggregationProfile(id) {
    return this.fetchProfile(`${this.aggregationprofiles}/${id}`);
  };

  fetchThresholdsProfile(id) {
    return this.fetchProfile(`${this.thresholdsprofiles}/${id}`);
  };

  changeAggregation(profile) {
    return this.changeProfile(this.aggregationprofiles, profile);
  };

  changeMetricProfile(profile) {
    return this.changeProfile(this.metricprofiles, profile);
  };

  changeThresholdsProfile(profile) {
    return this.changeProfile(this.thresholdsprofiles, profile);
  };

  addMetricProfile(profile) {
    return this.addProfile(this.metricprofiles, profile);
  };

  addAggregation(profile) {
    return this.addProfile(this.aggregationprofiles, profile);
  };

  addThresholdsProfile(profile) {
    return this.addProfile(this.thresholdsprofiles, profile);
  };

  deleteMetricProfile(id) {
    return this.deleteProfile(`${this.metricprofiles}/${id}`);
  };

  deleteAggregation(id) {
    return this.deleteProfile(`${this.aggregationprofiles}/${id}`);
  };

  deleteThresholdsProfile(id) {
    return this.deleteProfile(`${this.thresholdsprofiles}/${id}`);
  };

  fetchProfile(url) {
    return fetch(url,
      {headers:
        {
          "Accept": "application/json",
          "x-api-key": this.token
        }
      })
      .then(response => response.json())
      .then(json => json['data'])
      .then(array => array[0])
      .catch(err => alert(`Something went wrong: ${err}`));
  };

  changeProfile(url, data) {
    return this.send(`${url}/${data.id}`, 'PUT', data);
  };

  addProfile(url, data) {
    return this.send(url, 'POST', data);
  };

  deleteProfile(url) {
    return this.send(url, 'DELETE');
  };

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
