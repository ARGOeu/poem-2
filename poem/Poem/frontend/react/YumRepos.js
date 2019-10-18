import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';


export class YumRepoList extends Component {
  constructor(props) {
    super(props);

    this.location = props.location;

    this.state = {
      loading: false,
      list_repos: null,
      search_name: '',
      search_description: ''
    };

    this.backend = new Backend();
  };

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchYumRepos()
      .then(json => {
        this.setState({
          list_repos: json,
          loading: false
        });
      });
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
        minWidth: 80,
        accessor: e =>
          <Link to={'/ui/yumrepos/' + e.name}>{e.name}</Link>,
        filterable: true,
        Filter: (
          <input
            value={this.state.search_name}
            onChange={e => this.setState({search_name: e.target.value})}
            placeholder='Search by name'
            style={{width: '100%'}}
          />
        )
      },
      {
        Header: 'Description',
        accessor: 'description',
        filterable: true,
        Filter: (
          <input
            type='text'
            placeholder='Search by description'
            value={this.state.search_description}
            onChange={e => this.setState({search_description: e.target.value})}
            style={{width: '100%'}}
          />
        )
      }
    ];

    var { list_repos, loading } = this.state;

    if (this.state.search_name) {
      list_repos = list_repos.filter(row =>
          row.name.toLowerCase().includes(this.state.search_name.toLowerCase())
        )
    };

    if (this.state.search_description) {
      list_repos = list_repos.filter(row =>
          row.description.toLowerCase().includes(this.state.search_description.toLowerCase())
        )
    };

    if (loading)
      return (<LoadingAnim/>)

    else if (!loading && list_repos) {
      return (
        <BaseArgoView
          resourcename='YUM repo'
          location={this.location}
          listview={true}
        >
          <ReactTable
            data={list_repos}
            columns={columns}
            className='-striped -highlight'
            defaultPageSize={20}
          />
        </BaseArgoView>
      )
    }
    else 
      return null;
  }
}