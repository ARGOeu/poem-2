export class Backend {
  fetchServices() {
    return fetch('/api/v2/internal/services')
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err))
  }

  fetchAggregationUserGroups() {
    return fetch('/api/v2/internal/groups/aggregations')
      .then(response => response.json())
      .catch(err => alert('Something went wrong: ' + err))
  }

  fetchAggregationGroup(aggregation_name) {
    return fetch('/api/v2/internal/aggregations' + '/' + aggregation_name)
      .then(response => response.json())
      .then(json => json['groupname'])
      .catch(err => alert('Something went wrong: ' + err))
  }

  fetchAggregationProfileIdFromName(name) {
    return fetch('/api/v2/internal/aggregations')
      .then(response => response.json())
      .then(json => json.filter((item, i) => item.name === name))
      .then(list_item => list_item[0])
      .then(profile => profile.apiid)
      .catch(err => alert('Something went wrong: ' + err))
  }

}

class WebApi {

}
