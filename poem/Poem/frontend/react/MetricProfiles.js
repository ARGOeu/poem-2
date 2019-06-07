import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import {Backend} from './DataManager';
import { LoadingAnim, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';
import 'react-table/react-table.css';


const MetricProfiles = (props) =>
(
  <div>
    "I'm MetricProfiles"
  </div>
)


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

export default MetricProfiles;
