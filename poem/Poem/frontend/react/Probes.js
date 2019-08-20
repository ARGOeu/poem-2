import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';


export class ProbeList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_probe: null
    };

    this.location = props.location;
    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchAllProbes()
      .then(json =>
        this.setState({
          list_probe: json,
          loading: false
        }))
  }

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name', 
        minWidth: 80,
        accessor: e =>
          <Link to={'/ui/probes/' + e.name}>
            {e.name}
          </Link>
      },
      {
        Header: '#versions',
        minWidth: 25,
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        accessor: 'nv'
      },
      {
        Header: 'Description',
        minWidth: 300,
        accessor: 'description'
      }
    ];

    const { loading, list_probe } = this.state;

    if (loading)
      return (<LoadingAnim />)

    else if (!loading && list_probe) {
      return (
        <React.Fragment>
          <div className="d-flex align-items-center justify-content-between">
            <React.Fragment>
              <h2 className="ml-3 mt-1 mb-4">{'Select probe to see'}</h2>
            </React.Fragment>
          </div>
          <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
            <ReactTable
              data={list_probe}
              columns={columns}
              className='-striped -highlight'
              defaultPageSize={20}
            />
          </div>
        </React.Fragment>
      )
    }
    else
      return null;
  }
}
