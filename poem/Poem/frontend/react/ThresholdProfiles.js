import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Backend } from './DataManager';
import {
    LoadingAnim,
    BaseArgoView
} from './UIElements';
import ReactTable from 'react-table';


export class ThresholdsProfilesList extends Component {
  constructor(props) {
    super(props);
    this.location = props.location;
    this.backend = new Backend();

    this.state = {
      loading: false,
      list_thresholdsprofiles: null
    };
  };

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchThresholdsProfiles()
      .then(profiles => 
        this.setState({
          list_thresholdsprofiles: profiles,
          loading: false
        })
      );
  };

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name',
        accessor: e =>
          <Link to={'/ui/thresholdsprofiles/' + e.name}>
            {e.name}
          </Link>
      },
      {
        Header: 'Group',
        accessor: 'groupname',
        maxWidth: 150,
      }
    ];
    const { loading, list_thresholdsprofiles } = this.state;

    if (loading)
      return <LoadingAnim/>

    else if (!loading && list_thresholdsprofiles) {
      return (
        <BaseArgoView
          resourcename='thresholds profile'
          location={this.location}
          listview={true}
        >
          <ReactTable
            data={list_thresholdsprofiles}
            columns={columns}
            className='-striped -highlight'
            defaultPageSize={20}
          />
        </BaseArgoView>
      );
    } else
      return null;
  };
};