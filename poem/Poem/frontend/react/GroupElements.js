import React, { Component } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView, NotifyOk } from './UIElements';
import ReactTable from 'react-table';
import { Link } from 'react-router-dom';


export function GroupList(group, spacedname, id) {
  let header = spacedname.charAt(0).toUpperCase() + spacedname.slice(1);
  let resourcename = spacedname.charAt(0).toLowerCase() + spacedname.slice(1);
  return class extends Component {
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
            list_groups: json[group],
            loading: false
          }))
  }

  render() {
    const columns = [
      {
        Header: header,
        id: id,
        accessor: e =>
          <Link to={'/ui/administration/' + id + '/' + e}>
            {e}
          </Link>
      }
    ];

    const { loading, list_groups } = this.state;

    if (loading)
      return(<LoadingAnim/>);
    
    else if (!loading && list_groups) {
      return (
        <BaseArgoView
          resourcename={resourcename}
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
}