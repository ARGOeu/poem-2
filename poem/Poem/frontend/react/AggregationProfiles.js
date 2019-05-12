import React, { Component } from 'react';
import { LoadingAnim } from './UIElements';
import ReactTable from 'react-table';
import 'react-table/react-table.css';


const AggregationProfilesList = ({list_aggregations}) =>
{
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

  return (
    list_aggregations && 
    <ReactTable
      data={list_aggregations}
      columns={columns}
      className="-striped -highlight"
      defaultPageSize={10}
    />
  )
}


class AggregationProfiles extends Component {
  constructor(props) {
    super(props);

    const {params} = this.props.match;
    if (params.change) {
      this.view = 'change';
    }
    else if (params.history) {
      this.view = 'history';
    }
    else if (params.add) {
      this.view = 'add';
    }
    else {
      this.view = undefined;
    }

    this.state = {
      loading: false,
      list_aggregations: null
    }
  }

  componentDidMount() {
    if (!this.view) {
      this.setState({loading: true})
      fetch('/api/v2/internal/aggregations')
        .then(response => response.json())
        .then(json =>
          this.setState({
            list_aggregations: json, 
            loading: false})
        )
    }
    else if (this.view == 'change') {
    }
  }

  render() {
    const {loading, list_aggregations} = this.state

    return (
      (loading)
      ?
        <LoadingAnim />
      :
        <AggregationProfilesList list_aggregations={list_aggregations} />
    )
  }
}

export default AggregationProfiles;
