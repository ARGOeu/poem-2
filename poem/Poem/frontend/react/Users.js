import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Backend } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  Checkbox,
  NotifyOk,
  FancyErrorMessage,
  NotifyError,
  ModalAreYouSure,
  ErrorComponent,
  ParagraphTitle
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

const UserSchema = Yup.object().shape({
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


const ChangePasswordSchema = Yup.object().shape({
  password: Yup.string()
    .required('Required')
    .min(8, 'Your password must contain at least 8 characters.')
    .matches(/^\d*[a-zA-Z][a-zA-Z\d]*$/, 'Your password cannot be entirely numeric.'),
  confirm_password: Yup.string()
    .required('Required')
    .oneOf([Yup.ref('password'), null], 'Passwords do not match!')
})


import './Users.css';


export const UserChange = UserChangeComponent(true);
export const SuperAdminUserChange = UserChangeComponent();


const CommonUser = ({add, errors, values}) =>
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
      <ParagraphTitle title='Personal info'/>
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
      {
        (!add) &&
          <>
            <Row>
              <Col md={6}>
                <InputGroup>
                  <InputGroupAddon addonType='prepend'>Last login</InputGroupAddon>
                  <Field
                    type='text'
                    name='last_login'
                    className='form-control'
                    readOnly
                  />
                </InputGroup>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <InputGroup>
                  <InputGroupAddon addonType='prepend'>Date joined</InputGroupAddon>
                  <Field
                    type='text'
                    name='date_joined'
                    className='form-control'
                    readOnly
                  />
                </InputGroup>
              </Col>
            </Row>
          </>
      }
    </FormGroup>
    <FormGroup>
      <ParagraphTitle title='permissions'/>
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
      list_users: null,
      error: null
    }

    this.location = props.location;
    this.backend = new Backend();
  }

  async componentDidMount() {
    this.setState({loading: true})

    try {
      let json = await this.backend.fetchData('/api/v2/internal/users');
      this.setState({
        list_users: json,
        loading: false
      });
    } catch(err) {
      this.setState({
        error: err,
        loading: false
      });
    };
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
    const { loading, list_users, error } = this.state;

    if (loading)
      return (<LoadingAnim />);

    else if (error)
      return (<ErrorComponent error={error}/>);

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
          'email': '',
          'last_login': '',
          'date_joined': ''
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
        modalMsg: undefined,
        userdetails: {'userdetails': {'username': ''}},
        error: null
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

    async doChange(values, action) {
      if (!this.addview) {
        let response = await this.backend.changeObject(
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
        );
        if (!response.ok) {
          let change_msg = '';
          try {
            let json = await response.json();
            change_msg = json.detail;
          } catch(err) {
            change_msg = 'Error changing user';
          };
          NotifyError({
            title: `Error: ${response.status} ${response.statusText}`,
            msg: change_msg
          });
        } else {
          if (isTenantSchema) {
            let profile_response = await this.backend.changeObject(
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
            );
            if (profile_response.ok) {
              NotifyOk({
                msg: 'User successfully changed',
                title: 'Changed',
                callback: () => this.history.push('/ui/administration/users')
              })
            } else {
              let change_msg = '';
              try {
                let json = await profile_response.json();
                change_msg = json.detail;
              } catch(err) {
                change_msg = 'Error changing user profile'
              };
              NotifyError({
                title: `Error: ${profile_response.status} ${profile_response.statusText}`,
                msg: change_msg
              });
            };
          } else {
            NotifyOk({
              msg: 'User successfully changed',
              title: 'Changed',
              callback: () => this.history.push('/ui/administration/users')
            });
          }
        };
      } else {
        let response = await this.backend.addObject(
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
        );
        if (!response.ok) {
          let add_msg = '';
          try {
            let json = await response.json();
            add_msg = json.detail;
          } catch(err) {
            add_msg = 'Error adding user';
          };
          NotifyError({
            title: `Error: ${response.status} ${response.statusText}`,
            msg: add_msg
          });
        } else {
          if (isTenantSchema) {
            let profile_response = await this.backend.addObject(
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
            );
            if (profile_response.ok) {
              NotifyOk({
                msg: 'User successfully added',
                title: 'Added',
                callback: () => this.history.push('/ui/administration/users')
              })
            } else {
              let add_msg = '';
              try {
                let json = await profile_response.json();
                add_msg = json.detail;
              } catch(err) {
                add_msg = 'Error adding user profile';
              };
              NotifyError({
                title: `Error: ${profile_response.status} ${profile_response.statusText}`,
                msg: add_msg
              });
            };
          } else {
            NotifyOk({
              msg: 'User successfully added',
              title: 'Added',
              callback: () => this.history.push('/ui/administration/users')
            });
          };
        };
      };
    }

    async doDelete(username) {
      let response = await this.backend.deleteObject(`/api/v2/internal/users/${username}`);
      if (response.ok) {
        NotifyOk({
          msg: 'User successfully deleted',
          title: 'Deleted',
          callback: () => this.history.push('/ui/administration/users')
        })
      } else {
        let msg = '';
        try {
          let json = await response.json();
          msg = json.detail;
        } catch(err) {
          msg = 'Error deleting user';
        };
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: msg
        });
      };
    }

    async componentDidMount() {
      this.setState({loading: true})

      try {
        if (!this.addview) {
          let user = await this.backend.fetchData(`/api/v2/internal/users/${this.user_name}`);
          if (isTenantSchema) {
            let userprofile = await this.backend.fetchData(`/api/v2/internal/userprofile/${this.user_name}`);
            let usergroups = await this.backend.fetchResult(`/api/v2/internal/usergroups/${this.user_name}`);
            let allgroups = await this.backend.fetchResult('/api/v2/internal/usergroups');
            this.setState({
              custuser: user,
              userprofile: userprofile,
              usergroups: usergroups,
              allgroups: allgroups,
              loading: false
              });
          } else {
            let userdetails = await this.backend.isActiveSession(false);
            this.setState({
              custuser: user,
              userdetails: userdetails,
              loading: false
            });
          }
        } else {
          if (isTenantSchema) {
            let groups = await this.backend.fetchResult('/api/v2/internal/usergroups');
            this.setState({
                allgroups: groups,
                loading: false
            });
          } else {
            this.setState({
              loading: false
            });
          };
        };
      } catch(err) {
        this.setState({
          error: err,
          loading: false
        });
      };
    }

    render() {
      const { custuser, userprofile, usergroups, allgroups, loading,
      error } = this.state;

      if (loading)
        return(<LoadingAnim />)

      else if (error)
        return (<ErrorComponent error={error}/>);

      else if (!loading) {
        if (isTenantSchema) {

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
                  last_login: custuser.last_login,
                  date_joined: custuser.date_joined,
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
                            <ParagraphTitle title='POEM user permissions'/>
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
                            <ParagraphTitle title='Additional information'/>
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
          )
        } else {
          return (
            <React.Fragment>
              {
                <ModalAreYouSure
                  isOpen={this.state.areYouSureModal}
                  toggle={this.toggleAreYouSure}
                  title={this.state.modalTitle}
                  msg={this.state.modalMsg}
                  onYes={this.state.modalFunc}
                />
              }
              <div className='d-flex align-items-center justify-content-between'>
                <h2 className='ml-3 mt-1 mb-4'>{`${this.addview ? 'Add' : 'Change'} user`}</h2>
                {
                  (!this.addview && this.state.userdetails.userdetails.username === this.user_name) &&
                    <Link
                      className='btn btn-secondary'
                      to={this.location.pathname + '/change_password'}
                      role='button'
                    >
                      Change password
                    </Link>
                }
              </div>
              <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
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
                    last_login: custuser.last_login,
                    date_joined: custuser.date_joined
                  }}
                  validationSchema={UserSchema}
                  onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
                  render = {props => (
                    <Form>
                      <CommonUser
                        {...props}
                        add={this.addview}
                      />
                      <div className='submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5'>
                        {
                          !this.addview ?
                            <Button
                              color='danger'
                              onClick={() => {
                                this.toggleAreYouSureSetModal(
                                  `Are you sure you want to delete user ${this.user_name}?`,
                                  'Delete user',
                                  () => this.doDelete(props.values.username)
                                )
                              }}
                            >
                              Delete
                            </Button>
                          :
                            <div></div>
                        }
                        <Button
                          color='success'
                          id='submit-button'
                          type='submit'
                        >
                          Save
                        </Button>
                      </div>
                    </Form>
                  )}
                />
              </div>
            </React.Fragment>
          )
        }
      }
    }
  };
}


export class ChangePassword extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.user_name;
    this.location = props.locaation;
    this.history = props.history;
    this.backend = new Backend();

    this.state = {
      password: '',
      confirm_password: '',
      isTenantSchema: null,
      loading: false,
      areYouSureModal: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined,
      write_perm: false
    };

    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.onSubmitHandle = this.onSubmitHandle.bind(this);
    this.doChange = this.doChange.bind(this);
  };

  toggleAreYouSure() {
    this.setState(prevState =>
      ({areYouSureModal: !prevState.areYouSureModal}));
  };

  toggleAreYouSureSetModal(msg, title, onyes) {
    this.setState(prevState =>
      ({areYouSureModal: !prevState.areYouSureModal,
        modalFunc: onyes,
        modalMsg: msg,
        modalTitle: title,
      }));
  };

  onSubmitHandle(values, actions) {
    let msg = 'Are you sure you want to change password?';
    let title = 'Change password';

    this.toggleAreYouSureSetModal(
      msg, title, () => this.doChange(values, actions)
    );
  };

  async doChange(values, actions) {
    let response = await this.backend.changeObject(
      '/api/v2/internal/change_password/',
      {
        username: this.name,
        new_password: values.confirm_password
      }
    );
    if (!response.ok) {
      let change_msg = '';
      try {
        let json = await response.json();
        change_msg = json.detail;
      } catch(err) {
        change_msg = 'Error changing password';
      };
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: change_msg
      });
    } else {
      NotifyOk({
        msg: 'Password successfully changed',
        title: 'Changed',
        callback: () => this.history.push('/ui/administration/users')
      })
    }
  };

  async componentDidMount() {
    this.setState({ loading: true });

    let userdetails = await this.backend.isActiveSession(false);

    this.setState({
      write_perm: userdetails.userdetails.username === this.name,
      loading: false
    });
  };

  render() {
    const { loading, password, confirm_password, write_perm } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (!loading) {
      return (
        <BaseArgoView
          resourcename='password'
          location={this.location}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          history={false}
          submitperm={write_perm}
        >
          <Formik
            initialValues = {{
              password: password,
              confirm_password: confirm_password
            }}
            validationSchema = {ChangePasswordSchema}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            render = {props => (
              <Form>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Password</InputGroupAddon>
                      <Field
                      type="password"
                      name="password"
                      className={`form-control ${props.errors.password && 'border-danger'}`}
                      id="password"
                    />
                    </InputGroup>
                    {
                      props.errors.password &&
                        FancyErrorMessage(props.errors.password)
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
                        className={`form-control ${props.errors.confirm_password && 'border-danger'}`}
                        id='confirm_password'
                      />
                    </InputGroup>
                    {
                      props.errors.confirm_password &&
                        FancyErrorMessage(props.errors.confirm_password)
                    }
                  </Col>
                </Row>
                {
                  write_perm &&
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                      <div></div>
                      <Button
                        color='success'
                        id='submit-button'
                        type='submit'
                      >
                        Save
                      </Button>
                    </div>
                }
              </Form>
            )}
          />
        </BaseArgoView>
      )
    } else
      return null;
  };
};
