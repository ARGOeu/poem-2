import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView, Checkbox } from './UIElements';
import ReactTable from 'react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { Formik, Form, Field } from 'formik';
import { FormGroup, Row, Col, Label, FormText } from "reactstrap";

import './Users.css';


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
        Cell: row =>
          <div style={{textAlign: "center"}}
          >{row.value}</div>,
        accessor: d => 
        d.is_superuser ? 
          <FontAwesomeIcon icon={faCheckCircle} style={{color: "#339900"}}/> : 
          <FontAwesomeIcon icon={faTimesCircle} style={{color: "#CC0000"}}/>
      },
      {
        Header: 'Staff status',
        id: 'is_staff',
        Cell: row =>
          <div style={{textAlign: "center"}}
          >{row.value}</div>,
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


export class UserChange extends Component {
  constructor(props) {
    super(props);

    this.user_name = props.match.params.user_name;
    this.addview = props.addview;

    this.state = {
      custuser: {},
      userprofile: {},
      usergroups: {},
      allgroups: {'metrics': [], 'aggregations': [], 'metricprofiles': []},
      write_perm: false,
      loading: false,
    }

    this.backend = new Backend();
    this.location = props.location;
  }

  componentDidMount() {
    this.setState({loading: true})

    if (!this.addview) {
      Promise.all([this.backend.fetchUserByUsername(this.user_name),
      this.backend.fetchUserprofile(this.user_name),
      this.backend.fetchGroupsForUser(this.user_name),
      this.backend.fetchAllGroups()
    ]).then(([user, userprofile, usergroups, allgroups]) => {
      this.setState({
        custuser: user,
        userprofile: userprofile,
        usergroups: usergroups,
        allgroups: allgroups,
        loading: false
      });
    });
    }
  }

  render() {
    const {custuser, userprofile, usergroups, allgroups, loading, write_perm} = this.state;

    if (loading)
      return(<LoadingAnim />)

    else if (!loading) {
      console.log(this.state)
      return (
        <BaseArgoView
          resourcename="Users"
          location={this.location}
          addview={this.addview}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}>
          <Formik
            initialValues = {{
              first_name: custuser.first_name,
              last_name: custuser.last_name,
              username: custuser.username,
              is_active: custuser.is_active,
              is_superuser: custuser.is_superuser,
              is_staff: custuser.is_staff,
              email: custuser.email,
              groupsofaggregations: usergroups.aggregations,
              groupsofmetrics: usergroups.metrics,
              groupsofmetricprofiles: usergroups.metricprofiles,
              displayname: userprofile.displayname,
              subject: userprofile.subject,
              egiid: userprofile.egiid
            }}
            render = {props => (
              <Form> 
                <FormGroup>
                  <Row>
                    <Col md={6}>
                      <Label for="userUsername">Username</Label>
                      <Field
                        type="text"
                        name="username"
                        required={true}
                        className="form-control"
                        id="userUsername"
                      />
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                  <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Personal info</h4>
                  <Row>
                    <Col md={6}>
                      <Label for="userFirstName">First name</Label>
                      <Field
                        type="text"
                        name="first_name"
                        required={false}
                        className="form-control"
                        id="userFirstName"
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Label for="userLastName">Last name</Label>
                      <Field
                        type="text"
                        name="last_name"
                        required={false}
                        className="form-control"
                        id="userLastName"
                      />
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Label for="userEmail">Email</Label>
                      <Field
                        type="text"
                        name="email"
                        required={true}
                        className="form-control"
                        id="userEmail"
                      />
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                  <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Permissions</h4>
                  <Row>
                    <Col md={6}>
                      <Field
                        component={Checkbox}
                        name="is_superuser"
                        required={false}
                        className="form-control"
                        id="checkbox"
                        label="Superuser status"
                      />
                      <FormText color="muted">
                        Designates that this user has all permissions without explicitly assigning them.
                      </FormText>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Field
                        component={Checkbox}
                        name="is_staff"
                        required={false}
                        className="form-control"
                        id="checkbox"
                        label="Staff status"
                      />
                      <FormText color="muted">
                        Designates whether the user can log into this admin site.
                      </FormText>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Field 
                        component={Checkbox}
                        name="is_active"
                        required={false}
                        className="form-control"
                        id="checkbox"
                        label="Active"
                      />
                      <FormText color="muted">
                        Designates whether this user should be treated as active. Unselect this instead of deleting accounts.
                      </FormText>
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                  <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>POEM user permissions</h4>
                  <Row>
                    <Col md={6}>
                      <Label for="groupsofmetrics" className="grouplabel">Groups of metrics</Label>
                      <Field
                        component="select"
                        name="groupsofmetrics"
                        id='select-field'
                        onChange={evt =>
                          props.setFieldValue(
                            "groupsofmetrics",
                            [].slice
                              .call(evt.target.selectedOptions)
                              .map(option => option.value)
                          )
                        }
                        multiple={true}
                      >
                        {allgroups.metrics.map( s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Field>
                      <FormText color="muted">
                        The groups of metrics that user will control. Hold down "Control" or "Command" on a Mac to select more than one.
                      </FormText>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Label for="groupsofmetricprofiles" className="grouplabel">Groups of metric profiles</Label>
                      <Field
                        component="select"
                        name="groupsofmetricprofiles"
                        id='select-field'
                        onChange={evt =>
                          props.setFieldValue(
                            "groupsofmetricprofiles",
                            [].slice
                              .call(evt.target.selectedOptions)
                              .map(option => option.value)
                          )
                        }
                        multiple={true}
                      >
                        {allgroups.metricprofiles.map( s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Field>
                      <FormText color="muted">
                        The groups of metric profiles that user will control. Hold down "Control" or "Command" on a Mac to select more than one.
                    </FormText>
                    </Col>
                  </Row>
                  <Row>
                    <Col md={6}>
                      <Label for="groupsofaggregations" className="grouplabel">Groups of aggregations</Label>
                      <Field
                        component="select"
                        name="groupsofaggregations"
                        id='select-field'
                        onChange={evt =>
                          props.setFieldValue(
                            "groupsofaggregations",
                            [].slice
                              .call(evt.target.selectedOptions)
                              .map(option => option.value)
                          )
                        }
                        multiple={true}
                      >
                        {allgroups.aggregations.map( s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Field>
                      <FormText color="muted">
                        The groups of aggregations that user will control. Hold down "Control" or "Command" on a Mac to select more than one.
                      </FormText>
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                  <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Additional information</h4>
                  <Row>
                    <Col md={12}>
                      <Label for="distinguishedname">distinguishedName</Label>
                      <Field 
                        type="text"
                        name="subject"
                        required={false}
                        className="form-control"
                        id="distinguishedname"
                      />
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                  <Row>
                    <Col md={8}>
                      <Label for="eduid">eduPersonUniqueId</Label>
                      <Field 
                        type="text"
                        name="egiid"
                        required={false}
                        className="form-control"
                        id='eduid'
                      />
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                  <Row>
                    <Col md={6}>
                      <Label for="displayname">displayName</Label>
                      <Field 
                        type="text"
                        name="displayname"
                        required={false}
                        className="form-control"
                        id="displayname"
                      />
                    </Col>
                  </Row>
                </FormGroup>
              </Form>
            )}
          />
        </BaseArgoView>
      )
    }
  }
}
