import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import{ LoadingAnim, BaseArgoView, DropdownFilterComponent } from './UIElements';
import ReactTable from 'react-table';


export class PackageList extends Component {
    constructor(props) {
      super(props);

      this.location = props.location;
      this.backend = new Backend();

      this.state = {
        loading: false,
        list_packages: null,
        list_repos: null,
        search_name: '',
        search_repo: ''
      };
    };

    componentDidMount() {
      this.setState({loading: true});

      Promise.all([
        this.backend.fetchPackages(),
        this.backend.fetchYumRepos()
      ])
        .then(([pkgs, repos]) => {
          let list_repos = [];
          repos.forEach(e => list_repos.push(e.name));
          this.setState({
            list_packages: pkgs,
            list_repos: list_repos,
            loading: false
          });
        });
    };

    render() {
      var { list_packages, loading } = this.state;

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
          Header: 'Name and version',
          id: 'name',
          minWidth: 80,
          accessor: e =>
            <Link to={'/ui/packages/' + e.name + '-' + e.version}>{e.name + ' (' + e.version + ')'}</Link>,
          filterable: true,
          Filter: (
            <input 
              value={this.state.search_name}
              onChange={e => this.setState({search_name: e.target.value})}
              placeholder='Search by name and version'
              style={{width: '100%'}}
            />
          )
        },
        {
          Header: 'Repo',
          id: 'repo',
          accessor: 'repo',
          Cell: row =>
            <div style={{textAlign: 'center'}}>
              {row.value}
            </div>,
          filterable: true,
          Filter: 
            <DropdownFilterComponent
              value=''
              onChange={e => this.setState({search_repo: e.target.value})}
              data={this.state.list_repos}
            />
        }
      ];

      if (this.state.search_name) {
        list_packages = list_packages.filter(row =>
          `${row.name} + ' (' + ${row.version} + ')`.toLowerCase().includes(this.state.search_name.toLowerCase())
        );
      };

      if (this.state.search_repo) {
        list_packages = list_packages.filter(
          row =>
            `${row.repo}`.toLowerCase().includes(this.state.search_repo.toLowerCase())
        );
      };

      if (loading)
        return <LoadingAnim/>;
      
      else if (!loading && list_packages) {
        return (
          <BaseArgoView
            resourcename='package'
            location={this.location}
            listview={true}
          >
            <ReactTable
              data={list_packages}
              columns={columns}
              className='-striped -highlight'
              defaultPageSize={50}
            />
          </BaseArgoView>
        );
      } else 
        return null;
    };
};
