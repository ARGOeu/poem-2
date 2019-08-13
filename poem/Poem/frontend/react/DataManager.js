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

  fetchMetricsAll() {
    return fetch('/api/v2/internal/metricsall')
      .then(response => response.json())
      .then(json => {
        let metrics = [];
        json.forEach((e) => metrics.push(e.name));
        return metrics;
      })
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchServiceFlavoursAll() {
    return fetch('/api/v2/internal/serviceflavoursall')
      .then(response => response.json())
      .then(json => {
        let service_flavours = [];
        json.forEach((e) => service_flavours.push(e.name));
        return service_flavours;
      })
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchMetricProfileUserGroups() {
    return fetch('/api/v2/internal/groups/metricprofiles')
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchUsers() {
    return fetch('/api/v2/internal/users')
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchUserByUsername(username) {
    return fetch('/api/v2/internal/users' + '/' + username)
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchUserprofile(username) {
    return fetch('/api/v2/internal/userprofile/' + username)
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchGroupsForUser(username) {
    return fetch('/api/v2/internal/usergroups/' + username)
      .then(response => response.json())
      .then(json => json['result'])
      .catch(err => alert('Something went wrong: ' + err));
  }

  fetchAllGroups() {
    return fetch('/api/v2/internal/usergroups/')
      .then(response => response.json())
      .then(json => json['result'])
      .catch(err => alert('Something went wrong: ' + err));
  }

  changeMetricProfile(profile) {
    return this.send(
      '/api/v2/internal/metricprofiles/',
      'PUT',
      profile
    );
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

  addMetricProfile(profile) {
    return this.send(
      '/api/v2/internal/metricprofiles/',
      'POST',
      profile
    );
  }

  deleteMetricProfile(id) {
    return this.send(
      '/api/v2/internal/metricprofiles/' + id,
      'DELETE',
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

  changeMetricProfile(profile) {
    return this.send(
      this.metricprofiles + '/' + profile.id,
      'PUT',
      profile
    );
  }

  addMetricProfile(profile) {
    return this.send(
      this.metricprofiles,
      'POST',
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

  deleteMetricProfile(id) {
    return this.send(
      this.metricprofiles + '/' + id,
      'DELETE'
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
