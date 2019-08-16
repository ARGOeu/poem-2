import React, { Component } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';
import { Link } from 'react-router-dom';


export class GroupOfMetricsList extends Component
{
  constructor(props) {
      super(props);

      this.state = {
          loading: false,
          list_groups: null
      }

      this.location = props.location;
      this.backend = new Backend();
  }

  componentDidMount() {
      this.setState({loading: true});
      this.backend.fetchAllGroups()
        .then(json => 
          this.setState({
            list_groups: json['metrics'],
            loading: false
          }))
  }

  render() {
    const columns = [
      {
        Header: 'Group of metrics',
        id: 'groupofmetrics',
        accessor: e =>
        <Link to={'/ui/administration/groupofmetrics/' + e}>
          {e}
        </Link>
      }
    ];

    const { loading, list_groups } = this.state;

    if (loading)
      return (<LoadingAnim />);
    
    else if (!loading && list_groups) {
      return (
        <BaseArgoView
          resourcename='group of metrics'
          location={this.location}
          listview={true}>
            <ReactTable 
              data={list_groups}
              columns={columns}
              className='-striped -highlight'
              defaultPageSize={12}
            />
          </BaseArgoView>
      );
    }
    else
      return null;
  }
}
