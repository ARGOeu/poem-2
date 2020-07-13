import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, ErrorComponent, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';


export class TenantList extends Component {
  constructor(props) {
    super(props);

    this.location = props.location;

    this.state = {
        list_tenants: null,
        loading: false,
        error: null
    };

    this.backend = new Backend();
    };

    async componentDidMount() {
      this.setState({ loading: true });

      try {
        let json = await this.backend.fetchData('/api/v2/internal/tenants');
        this.setState({
            list_tenants: json,
            loading: false
        });
      } catch(err) {
        this.setState({
            error: err,
            loading: false
        });
      };
    };

    render() {
      const columns = [
        {
          Header: '#',
          id: 'row',
          minWidth: 12,
          Cell: (row) =>
            <div style={{textAlign: 'center'}}>
              {row.index + 1}
            </div>
        },
        {
            Header: 'Name',
            id: 'name',
            accessor: e =>
              <Link to={`/ui/tenants/${e.name.trim().split(' ').join('_')}`}>
                {e.name}
              </Link>
        },
        {
          Header: 'Schema name',
          accessor: 'schema_name'
        },
        {
          Header: 'Tenant POEM URL',
          accessor: 'domain_url'
        }
      ];

      const { loading, list_tenants, error } = this.state;

      if (loading)
        return (<LoadingAnim/>);

      else if (error)
        return (<ErrorComponent error={error}/>);

      else if (!loading && list_tenants) {
        return (
          <BaseArgoView
            resourcename='tenant'
            location={this.location}
            listview={true}
            addnew={false}
          >
            <ReactTable
              data={list_tenants}
              columns={columns}
              className='-highlight'
              defaultPageSize={10}
              rowsText='tenants'
              getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
            />
          </BaseArgoView>
        );
      } else
        return null;
    };
};