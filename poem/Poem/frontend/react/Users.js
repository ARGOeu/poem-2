import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Backend } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  Checkbox,
  NotifyOk,
  FancyErrorMessage
} from './UIElements';
import ReactTable from 'react-table';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  Label,
  FormText,
  Button,
  InputGroup,
  InputGroupAddon
} from "reactstrap";
import * as Yup from 'yup';

const UserSchema  = Yup.object().shape({
  username: Yup.string()
    .max(30, 'Username must be 30 characters or fewer.')
    .matches(/^[A-Za-z0-9@.+\-_]*$/, 'Letters, numbers and @/./+/-/_ characters')
    .required('Required'),
  addview: Yup.boolean(),
  password: Yup.string().when('addview', {
    is: true,
    then: Yup.string()
      .required('Required')
      .min(8, 'Your password must contain at least 8 characters.')
      .matches(/^\d*[a-zA-Z][a-zA-Z\d]*$/, 'Your password cannot be entirely numeric.')
  }),
  confirm_password: Yup.string().when('addview', {
    is: true,
    then: Yup.string()
      .required('Required')
      .oneOf([Yup.ref('password'), null], 'Passwords do not match!')
  }),
  email: Yup.string()
    .email('Enter valid email.')
    .required('Required')
})

import './Users.css';
import { NotificationManager } from 'react-notifications';


export const UserChange = UserChangeComponent(true);
export const SuperAdminUserChange = UserChangeComponent();


const CommonUser = ({add, errors}) =>
  <>
    {
      (add) ?
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupAddon addonType='prepend'>Username</InputGroupAddon>
                <Field
                  type="text"
                  name="username"
                  className={`form-control ${errors.username && 'border-danger'}`}
                  id="userUsername"
                />
              </InputGroup>
              {
                errors.username &&
                  FancyErrorMessage(errors.username)
              }
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupAddon addonType='prepend'>Password</InputGroupAddon>
                <Field
                type="password"
                name="password"
                className={`form-control ${errors.password && 'border-danger'}`}
                id="password"
              />
              </InputGroup>
              {
                errors.password &&
                  FancyErrorMessage(errors.password)
              }
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupAddon addonType='prepend'>Confirm password</InputGroupAddon>
                <Field
                  type='password'
                  name='confirm_password'
                  className={`form-control ${errors.confirm_password && 'border-danger'}`}
                  id='confirm_password'
                />
              </InputGroup>
              {
                errors.confirm_password &&
                  FancyErrorMessage(errors.confirm_password)
              }
            </Col>
          </Row>
        </FormGroup>
      :
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupAddon addonType='prepend'>Username</InputGroupAddon>
                <Field
                  type="text"
                  name='username'
                  className="form-control"
                  id='userUsername'
                />
              </InputGroup>
              {
                errors.username &&
                  FancyErrorMessage(errors.username)
              }
            </Col>
          </Row>
        </FormGroup>
    }
    <FormGroup>
      <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Personal info</h4>
      <Row>
        <Col md={6}>
          <InputGroup>
            <InputGroupAddon addonType="prepend">First name</InputGroupAddon>
            <Field
              type="text"
              name="first_name"
              className="form-control"
              id="userFirstName"
            />
          </InputGroup>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <InputGroup>
            <InputGroupAddon addonType="prepend">Last name</InputGroupAddon>
            <Field
              type="text"
              name="last_name"
              className="form-control"
              id="userLastName"
            />
          </InputGroup>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <InputGroup>
            <InputGroupAddon addonType="prepend">Email</InputGroupAddon>
            <Field
              type="text"
              name="email"
              className={`form-control ${errors.email && 'border-danger'}`}
              id="userEmail"
            />
          </InputGroup>
          {
            errors.email &&
              FancyErrorMessage(errors.email)
          }
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
            name="is_active"
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
  </>;


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
    this.backend.fetchData('/api/v2/internal/users')
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
        accessor: 'first_name',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>
      },
      {
        Header: 'Last name',
        accessor: 'last_name',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>
      },
      {
        Header: 'Email address',
        accessor: 'email',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>
      },
      {
        id: 'is_superuser',
        Header: 'Superuser status',
        Cell: row =>
          <div style={{textAlign: "center"}}
          >{row.value}</div>,
        accessor: d =>
        d.is_superuser ?
          <FontAwesomeIcon icon={faCheckCircle} style={{color: "#339900"}}/>
        :
          <FontAwesomeIcon icon={faTimesCircle} style={{color: "#CC0000"}}/>
      },
      {
        Header: 'Active status',
        id: 'is_active',
        Cell: row =>
          <div style={{textAlign: "center"}}
          >{row.value}</div>,
        accessor: d =>
          d.is_active ?
            <FontAwesomeIcon icon={faCheckCircle} style={{color: "#339900"}}/>
          :
            <FontAwesomeIcon icon={faTimesCircle} style={{color: "#CC0000"}}/>
      }
    ];
    const { loading, list_users } = this.state;

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
              className="-highlight"
              defaultPageSize={20}
              rowsText='users'
              getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
            />
          </BaseArgoView>
      );
    }
    else
      return null;
  }
}


function UserChangeComponent(isTenantSchema=false) {
  return class extends Component {
    constructor(props) {
      super(props);

      this.user_name = props.match.params.user_name;
      this.addview = props.addview;
      this.location = props.location;
      this.history = props.history;

      this.state = {
        custuser: {
          'pk': '',
          'first_name': '',
          'last_name': '',
          'username': '',
          'is_active': true,
          'is_superuser': false,
          'email': ''
        },
        password: '',
        userprofile: {
          'displayname': '',
          'subject': '',
          'egiid': ''
        },
        usergroups: {
          'aggregations': [],
          'metrics': [],
          'metricprofiles': [],
          'thresholdsprofiles': []
        },
        allgroups: {
          'metrics': [],
          'aggregations': [],
          'metricprofiles': [],
          'thresholdsprofiles': []
        },
        loading: false,
        areYouSureModal: false,
        modalFunc: undefined,
        modalTitle: undefined,
        modalMsg: undefined
      }

      this.backend = new Backend();

      this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
      this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
      this.onSubmitHandle = this.onSubmitHandle.bind(this);
      this.doChange = this.doChange.bind(this);
      this.doDelete = this.doDelete.bind(this);
    }

    toggleAreYouSure() {
      this.setState(prevState =>
        ({areYouSureModal: !prevState.areYouSureModal}));
    }

    toggleAreYouSureSetModal(msg, title, onyes) {
      this.setState(prevState =>
        ({areYouSureModal: !prevState.areYouSureModal,
          modalFunc: onyes,
          modalMsg: msg,
          modalTitle: title,
        }));
    }

    onSubmitHandle(values, action) {
      let msg = undefined;
      let title = undefined;

      if (this.addview) {
        msg = 'Are you sure you want to add user?';
        title = 'Add user';
      }
      else {
        msg = 'Are you sure you want to change user?';
        title = 'Change user';
      }
      this.toggleAreYouSureSetModal(msg, title,
        () => this.doChange(values, action));
    }

    doChange(values, action) {
      if (!this.addview) {
        this.backend.changeObject(
          '/api/v2/internal/users/',
          {
            pk: values.pk,
            username: values.username,
            first_name: values.first_name,
            last_name: values.last_name,
            email: values.email,
            is_superuser: values.is_superuser,
            is_active: values.is_active
          }
        ).then(response => {
          if (!response.ok) {
            response.json()
              .then(json => {
                NotificationManager.error(json.detail, 'Error');
              });
          } else {
            isTenantSchema ?
              this.backend.changeObject(
                '/api/v2/internal/userprofile/',
                {
                  username: values.username,
                  displayname: values.displayname,
                  subject: values.subject,
                  egiid: values.egiid,
                  groupsofaggregations: values.groupsofaggregations,
                  groupsofmetrics: values.groupsofmetrics,
                  groupsofmetricprofiles: values.groupsofmetricprofiles,
                  groupsofthresholdsprofiles: values.groupsofthresholdsprofiles
                }
              ).then(() =>
                NotifyOk({
                  msg: 'User successfully changed',
                  title: 'Changed',
                  callback: () => this.history.push('/ui/administration/users')
                })
              )
            :
              NotifyOk({
                msg: 'User successfully changed',
                title: 'Changed',
                callback: () => this.history.push('/ui/administration/users')
              });
          }
        });
      } else {
        this.backend.addObject(
          '/api/v2/internal/users/',
          {
            username: values.username,
            password: values.password,
            first_name: values.first_name,
            last_name: values.last_name,
            email: values.email,
            is_superuser: values.is_superuser,
            is_active: values.is_active
          }
        ).then(response => {
            if (!response.ok) {
              response.json()
                .then(json => {
                  NotificationManager.error(json.detail, 'Error');
                });
            } else {
              isTenantSchema ?
                this.backend.addObject(
                  '/api/v2/internal/userprofile/',
                  {
                    username: values.username,
                    displayname: values.displayname,
                    subject: values.subject,
                    egiid: values.egiid,
                    groupsofaggregations: values.groupsofaggregations,
                    groupsofmetrics: values.groupsofmetrics,
                    groupsofmetricprofiles: values.groupsofmetricprofiles,
                    groupsofthresholdsprofiles: values.groupsofthresholdsprofiles
                  }
                ).then(() => NotifyOk({
                  msg: 'User successfully added',
                  title: 'Added',
                  callback: () => this.history.push('/ui/administration/users')
                })
                )
              :
                NotifyOk({
                  msg: 'User successfully added',
                  title: 'Added',
                  callback: () => this.history.push('/ui/administration/users')
                });
            }
          });
        }
    }

    doDelete(username) {
      this.backend.deleteObject(`/api/v2/internal/users/${username}`)
        .then(() => NotifyOk({
          msg: 'User successfully deleted',
          title: 'Deleted',
          callback: () => this.history.push('/ui/administration/users')
        }));
    }

    componentDidMount() {
      this.setState({loading: true})

      if (!this.addview) {
        isTenantSchema ?
          Promise.all([
            this.backend.fetchData(`/api/v2/internal/users/${this.user_name}`),
            this.backend.fetchData(`/api/v2/internal/userprofile/${this.user_name}`),
            this.backend.fetchResult(`/api/v2/internal/usergroups/${this.user_name}`),
            this.backend.fetchResult('/api/v2/internal/usergroups')
          ]).then(([user, userprofile, usergroups, allgroups]) => {
            this.setState({
              custuser: user,
              userprofile: userprofile,
              usergroups: usergroups,
              allgroups: allgroups,
              loading: false
              });
            })
        :
          this.backend.fetchData(`/api/v2/internal/users/${this.user_name}`)
            .then((user) => {
              this.setState({
                custuser: user,
                loading: false
              });
            });
      } else {
        isTenantSchema ?
          this.backend.fetchResult('/api/v2/internal/usergroups').then(groups =>
            this.setState({
                allgroups: groups,
                loading: false
            }))
        :
          this.setState({
            loading: false
          });
      }
    }

    render() {
      const { custuser, userprofile, usergroups, allgroups, loading } = this.state;

      if (loading)
        return(<LoadingAnim />)

      else if (!loading) {
        return (
          <BaseArgoView
            resourcename="users"
            location={this.location}
            addview={this.addview}
            history={false}
            modal={true}
            state={this.state}
            toggle={this.toggleAreYouSure}>
            <Formik
              initialValues = {{
                addview: this.addview,
                pk: custuser.pk,
                first_name: custuser.first_name,
                last_name: custuser.last_name,
                username: custuser.username,
                password: '',
                confirm_password: '',
                is_active: custuser.is_active,
                is_superuser: custuser.is_superuser,
                email: custuser.email,
                groupsofaggregations: usergroups.aggregations,
                groupsofmetrics: usergroups.metrics,
                groupsofmetricprofiles: usergroups.metricprofiles,
                groupsofthresholdsprofiles: usergroups.thresholdsprofiles,
                displayname: userprofile.displayname,
                subject: userprofile.subject,
                egiid: userprofile.egiid
              }}
              validationSchema={UserSchema}
              onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
              render = {props => (
                <Form>
                  <CommonUser
                    {...props}
                    add={this.addview}
                  />
                  {
                    isTenantSchema &&
                      <>
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
                          <Row>
                            <Col md={6}>
                              <Label for="groupsofthresholdsprofiles" className="grouplabel">Groups of thresholds profiles</Label>
                              <Field
                                component="select"
                                name="groupsofthresholdsprofiles"
                                id='select-field'
                                onChange={evt =>
                                  props.setFieldValue(
                                    "groupsofthresholdsprofiles",
                                    [].slice
                                      .call(evt.target.selectedOptions)
                                      .map(option => option.value)
                                  )
                                }
                                multiple={true}
                              >
                                {allgroups.thresholdsprofiles.map( s => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </Field>
                              <FormText color="muted">
                                The groups of thresholds profiles that user will control. Hold down "Control" or "Command" on a Mac to select more than one.
                            </FormText>
                            </Col>
                          </Row>
                        </FormGroup>
                        <FormGroup>
                          <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Additional information</h4>
                          <Row>
                            <Col md={12}>
                              <InputGroup>
                                <InputGroupAddon addonType='prepend'>distinguishedName</InputGroupAddon>
                                <Field
                                  type="text"
                                  name="subject"
                                  required={false}
                                  className="form-control"
                                  id="distinguishedname"
                                />
                              </InputGroup>
                            </Col>
                          </Row>
                        </FormGroup>
                        <FormGroup>
                          <Row>
                            <Col md={8}>
                              <InputGroup>
                                <InputGroupAddon addonType="prepend">eduPersonUniqueId</InputGroupAddon>
                                <Field
                                  type="text"
                                  name="egiid"
                                  required={false}
                                  className="form-control"
                                  id='eduid'
                                />
                              </InputGroup>
                            </Col>
                          </Row>
                        </FormGroup>
                        <FormGroup>
                          <Row>
                            <Col md={6}>
                              <InputGroup>
                                <InputGroupAddon addonType="prepend">displayName</InputGroupAddon>
                                <Field
                                  type="text"
                                  name="displayname"
                                  required={false}
                                  className="form-control"
                                  id="displayname"
                                />
                              </InputGroup>
                            </Col>
                          </Row>
                        </FormGroup>
                      </>
                  }
                  {
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                      {
                        !this.addview ?
                          <Button
                            color="danger"
                            onClick={() => {
                              this.toggleAreYouSureSetModal('Are you sure you want to delete User?',
                              'Delete user',
                              () => this.doDelete(props.values.username))
                            }}
                          >
                            Delete
                          </Button>
                        :
                          <div></div>
                      }
                      <Button
                        color="success"
                        id="submit-button"
                        type="submit"
                      >
                        Save
                      </Button>
                    </div>
                  }
                </Form>
              )}
            />
          </BaseArgoView>
        );
      }
    }
  };
}
