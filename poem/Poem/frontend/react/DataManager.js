import Cookies from 'universal-cookie';

export class Backend {
  fetchServices() {
    return fetch('/api/v2/internal/services')
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchAggregationUserGroups() {
    return fetch('/api/v2/internal/groups/aggregations')
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchAggregationGroup(aggregation_name) {
    return fetch('/api/v2/internal/aggregations' + '/' + aggregation_name)
      .then(response => response.json())
      .then(json => json['groupname'])
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchAggregationProfileIdFromName(aggregation_name) {
    return fetch('/api/v2/internal/aggregations' + '/' + aggregation_name)
      .then(response => response.json())
      .then(json => json.apiid)
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchAggregation() {
    return fetch('/api/v2/internal/aggregations')
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchMetricProfiles() {
    return fetch('/api/v2/internal/metricprofiles')
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchMetricProfileGroup(metricprofile_name) {
    return fetch('/api/v2/internal/metricprofiles' + '/' + metricprofile_name)
      .then(response => response.json())
      .then(json => json['groupname'])
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchMetricProfileIdFromName(metricprofile_name) {
    return fetch('/api/v2/internal/metricprofiles' + '/' + metricprofile_name)
      .then(response => response.json())
      .then(json => json.apiid)
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchMetricProfileUserGroups() {
    return fetch('/api/v2/internal/groups/metricprofiles')
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err));
  }

  changeAggregation(profile) {
    return this.send(
      '/api/v2/internal/aggregations/',
      'PUT',
      profile
    );
  }

  addAggregation(profile) {
    return this.send(
      '/api/v2/internal/aggregations/',
      'POST',
      profile
    );
  }

  deleteAggregation(id) {
    return this.send(
      '/api/v2/internal/aggregations/' + id,
      'DELETE'
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
      reportsConfigurations=undefined
    }) {
    this.token = token;
    this.metricprofiles = metricProfiles;
    this.aggregationprofiles = aggregationProfiles; 
  }

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
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchMetricProfile(id) {
    return fetch(this.metricprofiles + '/' + id, 
      {headers: 
        {
          "Accept": "application/json",
          "x-api-key": this.token
        }
      })
      .then(response => response.json())
      .then(json => json['data'])
      .then(array => array[0])
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchAggregationProfile(id) {
    return fetch(this.aggregationprofiles + '/' + id, 
      {headers: 
        {
          "Accept": "application/json",
          "x-api-key": this.token
        }
      })
      .then(response => response.json())
      .then(json => json['data'])
      .then(array => array[0])
      .catch(err => alert('Something went wrong: ' + err));
  }

  changeAggregation(profile) {
    return this.send(
      this.aggregationprofiles + '/' + profile.id,
      'PUT',
      profile
    );
  }

  addAggregation(profile) {
    return this.send(
      this.aggregationprofiles,
      'POST',
      profile
    );
  }

  deleteAggregation(id) {
    return this.send(
      this.aggregationprofiles + '/' + id,
      'DELETE'
    );
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
