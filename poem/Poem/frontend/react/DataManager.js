import Cookies from 'universal-cookie';

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
    })
  }

}

class WebApi {

}
