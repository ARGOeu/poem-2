import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import {Backend} from './DataManager';
import { LoadingAnim, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';
import 'react-table/react-table.css';


export class MetricProfilesChange extends Component 
{
  constructor(props) {
    super(props);

    this.tenant_name = props.tenant_name;
    this.token = props.webapitoken;
    this.webapimetric = props.webapimetric;
    this.profile_name = props.match.params.name;
    this.addview = props.addview
    this.history = props.history;
    this.location = props.location;

    this.state = {
      metric_profiles: {},
      write_perm: false,
      areYouSureModal: false,
      loading: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined,
    }

  }

  toggleAreYouSure() {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal}));
  }

  render() {
    const {write_perm, loading} = this.state;

    return (
      <BaseArgoView
        resourcename='Metric profile'
        location={this.location}
        addview={this.addview}
        modal={true}
        state={this.state}
        toggle={this.toggleAreYouSure}
        submitperm={write_perm}>
        <div>
          "I'm MetricProfiles"
        </div>
      </BaseArgoView>
    )
  }
}


export class MetricProfilesList extends Component
{
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_metricprofiles: null
    }

    this.location = props.location;
    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true})
    this.backend.fetchMetricProfiles()
      .then(json =>
        this.setState({
          list_metricprofiles: json, 
          loading: false})
      )
  }

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name',
        accessor: e => 
        <Link to={'/ui/metricprofiles/' + e.name}>
          {e.name}
        </Link>
      },
      {
        Header: 'Group',
        accessor: 'groupname',
        maxWidth: 150,
      }
    ]
    const {loading, list_metricprofiles} = this.state

    if (loading) 
      return (<LoadingAnim />)

    else if (!loading && list_metricprofiles) {
      return (
        <BaseArgoView 
          resourcename='metric profile'
          location={this.location}
          listview={true}>
          <ReactTable
            data={list_metricprofiles}
            columns={columns}
            className="-striped -highlight"
            defaultPageSize={10}
          />
        </BaseArgoView>
      )
    }
    else 
      return null
  }
}
