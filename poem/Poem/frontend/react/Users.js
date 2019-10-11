import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView, Checkbox, NotifyOk, FancyErrorMessage } from './UIElements';
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

const UsernamePassword = ({add, errors}) => 
  (add) ?
   <FormGroup>
    <Row>
      <Col md={6}>
        <InputGroup>
          <InputGroupAddon addonType='prepend'>Username</InputGroupAddon>
          <Field
            type="text"
            name="username"
            className={errors.username ? 'form-control border-danger' : 'form-control'}
            id="userUsername"
          />
        </InputGroup>
        {
          errors.username ?
            FancyErrorMessage(errors.username)
          :
            null
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
          className={errors.password ? 'form-control border-danger' : 'form-control'}
          id="password"
        />
        </InputGroup>
        {
          errors.password ?
            FancyErrorMessage(errors.password)
          :
            null
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
            className={errors.confirm_password ? 'form-control border-danger' : 'form-control'}
            id='confirm_password'
          />
        </InputGroup>
        {
          errors.confirm_password ? 
            FancyErrorMessage(errors.confirm_password)
          :
            null
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
              required={true}
              className="form-control"
              id='userUsername'
            />
          </InputGroup>
        </Col>
      </Row>
    </FormGroup>


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
              defaultPageSize={20}
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
    this.location = props.location;
    this.history = props.history;

    this.state = {
      custuser: {},
      userprofile: {},
      usergroups: {},
      password: '',
      allgroups: {'metrics': [], 'aggregations': [], 'metricprofiles': []},
      write_perm: false,
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
      msg = 'Are you sure you want to add User?';
      title = 'Add user';
    }
    else {
      msg = 'Are you sure you want to change User?';
      title = 'Change user';
    }
    this.toggleAreYouSureSetModal(msg, title,
      () => this.doChange(values, action))
  }

  doChange(values, action) {
    if (!this.addview) {
      this.backend.changeUser({
        username: values.username,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        is_superuser: values.is_superuser,
        is_staff: values.is_staff,
        is_active: values.is_active
      })
      .then(r => {
        this.backend.changeUserProfile({
          username: values.username,
          displayname: values.displayname,
          subject: values.subject,
          egiid: values.egiid,
          groupsofaggregations: values.groupsofaggregations,
          groupsofmetrics: values.groupsofmetrics,
          groupsofmetricprofiles: values.groupsofmetricprofiles
        })
          .then(() => NotifyOk({
            msg: 'User successfully changed',
            title: 'Changed',
            callback: () => this.history.push('/ui/administration/users')
          },
          ))
          .catch(err => alert('Something went wrong: ' + err))
      })
      .catch(err => alert('Something went wrong: ' + err))
    }
    else {
      this.backend.addUser({
        username: values.username,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        is_superuser: values.is_superuser,
        is_staff: values.is_staff,
        is_active: values.is_active
      })
        .then(r => {
          this.backend.addUserProfile({
            username: values.username,
            displayname: values.displayname,
            subject: values.subject,
            egiid: values.egiid,
            groupsofaggregations: values.groupsofaggregations,
            groupsofmetrics: values.groupsofmetrics,
            groupsofmetricprofiles: values.groupsofmetricprofiles
          })
        })
          .then(() => NotifyOk({
            msg: 'User successfully added',
            title: 'Added',
            callback: () => this.history.push('/ui/administration/users')
          },
          ))
          .catch(err => alert('Something went wrong: ' + err))
    }
  }

  doDelete(username) {
    this.backend.deleteUser(username)
      .then(() => NotifyOk({
        msg: 'User successfully deleted',
        title: 'Deleted',
        callback: () => this.history.push('/ui/administration/users')
      }))
      .catch(err => alert('Something went wrong: ' + err))
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
        write_perm: localStorage.getItem('authIsSuperuser') === 'true',
        loading: false
      });
    });
    }

    else {
      this.backend.fetchAllGroups().then(groups => 
        this.setState(
          {
            custuser: {
              'first_name': '', 
              'last_name': '', 
              'username': '',
              'is_active': true,
              'is_superuser': false,
              'is_staff': true,
              'email': ''
          },
            userprofile: {
              'displayname': '',
              'subject': '',
              'egiid': ''
            },
            usergroups: {
              'aggregations': [],
              'metrics': [],
              'metricprofiles': []
            },
            allgroups: groups,
            write_perm: localStorage.getItem('authIsSuperuser') === 'true',
            loading: false
          }
        ))
    }
  }
  
  render() {
    const {custuser, userprofile, usergroups, allgroups, loading, write_perm} = this.state;

    if (loading)
      return(<LoadingAnim />)

    else if (!loading) {
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
              addview: this.addview,
              first_name: custuser.first_name,
              last_name: custuser.last_name,
              username: custuser.username,
              password: '',
              confirm_password: '',
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
            validationSchema={UserSchema}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            render = {props => (
              <Form> 
                <UsernamePassword
                  {...props}
                  add={this.addview}
                />
                <FormGroup>
                  <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Personal info</h4>
                  <Row>
                    <Col md={6}>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>First name</InputGroupAddon>
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
                        <InputGroupAddon addonType='prepend'>Last name</InputGroupAddon>
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
                        <InputGroupAddon addonType='prepend'>Email</InputGroupAddon>
                        <Field
                          type="text"
                          name="email"
                          className={props.errors.email ? 'form-control border-danger' : 'form-control'}
                          id="userEmail"
                        />
                      </InputGroup>
                      {
                        props.errors.email ? 
                          FancyErrorMessage(props.errors.email)
                        :
                          null
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
                        name="is_staff"
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
                {
                  (write_perm) &&
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
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
                      <Button color="success" id="submit-button" type="submit">Save</Button>
                    </div>
                }
              </Form>
            )}
          />
        </BaseArgoView>
      )
    }
  }
}


export class SuperAdminUserChange extends Component {
  constructor(props) {
    super(props);

    this.user_name = props.match.params.user_name;
    this.addview = props.addview;
    this.location = props.location;
    this.history = props.history;

    this.state = {
      custuser: {},
      password: '',
      write_perm: false,
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
      msg = 'Are you sure you want to add User?';
      title = 'Add user';
    }
    else {
      msg = 'Are you sure you want to change User?';
      title = 'Change user';
    }
    this.toggleAreYouSureSetModal(msg, title,
      () => this.doChange(values, action))
  }

  doChange(values, action) {
    if (!this.addview) {
      this.backend.changeUser({
        username: values.username,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        is_superuser: values.is_superuser,
        is_staff: values.is_staff,
        is_active: values.is_active
      })
        .then(() => NotifyOk({
          msg: 'User successfully changed',
          title: 'Changed',
          callback: () => this.history.push('/ui/administration/users')
        },
        ))
        .catch(err => alert('Something went wrong: ' + err))
    }
    else {
      this.backend.addUser({
        username: values.username,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        is_superuser: values.is_superuser,
        is_staff: values.is_staff,
        is_active: values.is_active
      })
        .then(() => NotifyOk({
          msg: 'User successfully added',
          title: 'Added',
          callback: () => this.history.push('/ui/administration/users')
        },
        ))
        .catch(err => alert('Something went wrong: ' + err))
    }
  }

  doDelete(username) {
    this.backend.deleteUser(username)
      .then(() => NotifyOk({
        msg: 'User successfully deleted',
        title: 'Deleted',
        callback: () => this.history.push('/ui/administration/users')
      }))
      .catch(err => alert('Something went wrong: ' + err))
  }

  componentDidMount() {
    this.setState({loading: true})

    if (!this.addview) {
      this.backend.fetchUserByUsername(this.user_name)
      .then((user) => {
        this.setState({
          custuser: user,
          write_perm: localStorage.getItem('authIsSuperuser') === 'true',
          loading: false
        });
      });
    }

    else {
      this.backend.fetchPoemVersion()
      .then(r => {
        this.setState(
          {
            custuser: {
              'first_name': '', 
              'last_name': '', 
              'username': '',
              'is_active': true,
              'is_superuser': false,
              'is_staff': true,
              'email': ''
          },
            write_perm: localStorage.getItem('authIsSuperuser') === 'true',
            loading: false
          }
        )
      })
    }
  }
  
  render() {
    const {custuser, loading, write_perm} = this.state;

    if (loading)
      return(<LoadingAnim />)

    else if (!loading) {
      return (
        <BaseArgoView
          resourcename="Users"
          location={this.location}
          addview={this.addview}
          infoview={!this.addview}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}>
          <Formik
            initialValues = {{
              first_name: custuser.first_name,
              last_name: custuser.last_name,
              username: custuser.username,
              password: '',
              is_active: custuser.is_active,
              is_superuser: custuser.is_superuser,
              is_staff: custuser.is_staff,
              email: custuser.email,
            }}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            render = {props => (
              <Form> 
                <UsernamePassword
                  {...props}
                  add={this.addview}
                />
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
                {
                  (write_perm) &&
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
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
                      <Button color="success" id="submit-button" type="submit">Save</Button>
                    </div>
                }
              </Form>
            )}
          />
        </BaseArgoView>
      )
    }
  }
}
