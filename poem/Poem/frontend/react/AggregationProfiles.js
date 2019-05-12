import React, { Component } from 'react';
import { LoadingAnim } from './UIElements';
import ReactTable from 'react-table';
import 'react-table/react-table.css';

class AggregationProfilesChange extends Component
{
  constructor(props) {
    super(props);

    this.profile_id = props.apiid;

    this.state = {
      aggregation_profile: {},
      groups_field: undefined,
      list_user_groups: [],
      write_perm: false,
      list_id_metric_profiles: [],
      list_services: [],
      list_complete_metric_profiles: {},
      loading: false,
    }

    this.fetchMetricProfiles = this.fetchMetricProfiles.bind(this)
    this.fetchAggregationProfile = this.fetchAggregationProfile.bind(this)
    this.extractListOfMetricsProfiles = this.extractListOfMetricsProfiles.bind(this)

    this.logic_operations = ["OR", "AND"] 
    this.endpoint_groups = ["servicegroups", "sites"]
  }

  fetchToken() {
    return fetch('/api/v2/internal/tokens/WEB-API')
      .then(response => response.json())
      .catch(err => console.log('Something went wrong: ' + err))
  }

  fetchUserGroups() {
    return fetch('/api/v2/internal/groups/aggregations')
      .then(response => response.json())
      .catch(err => console.log('Something went wrong: ' + err))
  }

  fetchAggregationGroup(aggregation_name) {
    return fetch('https://web-api-devel.argo.grnet.gr/api/v2/aggregation_profiles' + '/' + aggregation_name)
      .then(response => response.json())
      .then(json => json['groupname'])
      .catch(err => console.log('Something went wrong: ' + err))
  }

  fetchMetricProfiles(token) {
    return fetch('https://web-api-devel.argo.grnet.gr/api/v2/metric_profiles',
      {headers: {"Accept": "application/json",
          "x-api-key": token}})
      .then(response => response.json())
      .then(json => json['data']) 
      .catch(err => console.log('Something went wrong: ' + err))
  }

  fetchAggregationProfile(token, idProfile) {
    return fetch('https://web-api-devel.argo.grnet.gr/api/v2/aggregation_profiles' + '/' + idProfile, 
      {headers: {"Accept": "application/json",
            "x-api-key": token}})
      .then(response => response.json())
      .then(json => json['data'])
      .then(array => array[0])
      .catch(err => console.log('Something went wrong: ' + err))
  }

  extractListOfServices(profileFromAggregation, listMetricProfiles) {
    let targetProfile = listMetricProfiles.filter(p => p.name === profileFromAggregation.name)

    return targetProfile[0].services.map(s => s.service)
  }

  extractListOfMetricsProfiles(allProfiles) {
    var list_profiles = []

    allProfiles.forEach(profile => {
      var i = list_profiles['length']
      var {name, id} = profile

      list_profiles[i] = {name, id}
      i += 1
    })

    return list_profiles
  }

  componentDidMount() {
    this.setState({loading: true})

    this.fetchToken().then(token => 
      Promise.all([this.fetchAggregationProfile(token, this.profile_id), 
        this.fetchMetricProfiles(token),
        this.fetchUserGroups()])
      .then(([aggregp, metricp, usergroups]) => {
        this.fetchAggregationGroup(aggregp.name)
        .then(group =>
          this.setState(
          {
            aggregation_profile: aggregp,
            groups_field: group,
            list_user_groups: usergroups,
            write_perm: usergroups.indexOf(group) >= 0,
            list_id_metric_profiles: this.extractListOfMetricsProfiles(metricp),
            list_services: this.extractListOfServices(aggregp.metric_profile, metricp),
            list_complete_metric_profiles: metricp,
            loading: false
          })
        )
      })
    )
  }

  render() {
    const {loading} = this.state;

    return (
      (loading)
      ?
        <LoadingAnim />
      :
        <div>
          I'm aggregation profile
        </div>
    )
  }
}

class AggregationProfilesList extends Component
{
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_aggregations: null
    }

  }

  componentDidMount() {
    this.setState({loading: true})
    fetch('/api/v2/internal/aggregations')
      .then(response => response.json())
      .then(json =>
        this.setState({
          list_aggregations: json, 
          loading: false})
      )
  }

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name',
        accessor: e => 
        <a href={'/ui/aggregationprofiles/change/' + e.apiid}>
          {e.name}
        </a>
      },
      {
        Header: 'Group',
        accessor: 'groupname',
        maxWidth: 150,
      }
    ]
    const {loading, list_aggregations} = this.state

    return (
      (loading)
      ?
        <LoadingAnim />
      :
        list_aggregations &&
        <ReactTable
          data={list_aggregations}
          columns={columns}
          className="-striped -highlight"
          defaultPageSize={10}
        />
    )
  }
}


const AggregationProfiles = (props) =>
{
  const {params} = props.match;
  let view = '';

  if (params.change) {
    view = 'change';
  }
  else if (params.history) {
    view = 'history';
  }
  else if (params.add) {
    view = 'add';
  }
  else {
    view = 'list';
  }

  return (
    view === 'list' && 
      <AggregationProfilesList /> 
    || 
    view === 'change' && 
      <AggregationProfilesChange apiid={params.id}/>
  )
}

export default AggregationProfiles;
