import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';


export class UsersList extends Component
{
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_users: null
    }

    this.location = props.location;
    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true})
    this.backend.fetchUsers()
      .then(json =>
        this.setState({
          list_users: json,
          loading: false
        }))
  }

  render() {
    const columns = [
      {
        Header: 'Username',
        id: 'username',
        accessor: e =>
        <Link to={'/ui/administration/users/' + e.username}>
          {e.username}
        </Link>
      },
      {
        Header: 'First name',
        accessor: 'first_name'
      },
      {
        Header: 'Last name',
        accessor: 'last_name'
      },
      {
        Header: 'Email address',
        accessor: 'email'
      },
      {
        id: 'is_superuser',
        Header: 'Superuser status',
        accessor: d => 
        d.is_superuser ? 
          <FontAwesomeIcon icon={faCheckCircle} style={{color: "#339900"}}/> : 
          <FontAwesomeIcon icon={faTimesCircle} style={{color: "#CC0000"}}/>
      },
      {
        Header: 'Staff status',
        id: 'is_staff',
        accessor: d => 
          d.is_staff ?
            <FontAwesomeIcon icon={faCheckCircle} style={{color: "#339900"}}/> :
            <FontAwesomeIcon icon={faTimesCircle} style={{color: "#CC0000"}}/>
      }
    ];
    const { loading, list_users } = this.state

    if (loading)
      return (<LoadingAnim />);
    
    else if (!loading && list_users) {
      return (
        <BaseArgoView
          resourcename='users'
          location={this.location}
          listview={true}>
            <ReactTable
              data={list_users}
              columns={columns}
              className="-striped -highlight"
              defaultPageSize={12}
            />
          </BaseArgoView>
      )
    }
    else
      return null
  }
}
