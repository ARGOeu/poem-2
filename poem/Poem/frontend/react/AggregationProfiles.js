import React, { Component } from 'react';
import { LoadingAnim } from './UIElements';
import ReactTable from 'react-table';
import 'react-table/react-table.css';


class AggregationProfiles extends Component {
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
    const {loading, list_aggregations} = this.state
    const columns = [
      {
        Header: 'Name',
        id: 'name',
        accessor: e => 
        <a href={'/ui/aggregationprofiles/' + e.apiid}>
          {e.name}
        </a>
      },
      {
        Header: 'Group',
        accessor: 'groupname',
        maxWidth: 150,
      }
    ]

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

export default AggregationProfiles;
