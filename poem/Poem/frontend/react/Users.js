import React, { useState } from 'react';
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
  ParagraphTitle,
  BaseArgoTable
} from './UIElements';
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
import { useQuery } from 'react-query';


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


export const UsersList = (props) => {
    const location = props.location;
    const backend = new Backend();

    const { data: listUsers, error: error, isLoading: loading } = useQuery(
      'users_listview', async () => {
        let json = await backend.fetchData('/api/v2/internal/users');
        return json;
      }
    );

  const columns = React.useMemo(() => [
    {
      Header: '#',
      accessor: null,
      column_width: '2%'
    },
    {
      Header: 'Username',
      accessor: 'username',
      column_width: '26%',
      Cell: e =>
      <Link to={`/ui/administration/users/${e.value}`}>
        {e.value}
      </Link>
    },
    {
      Header: 'First name',
      accessor: 'first_name',
      column_width: '26%',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>
    },
    {
      Header: 'Last name',
      accessor: 'last_name',
      column_width: '26%',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>
    },
    {
      Header: 'Email address',
      accessor: 'email',
      column_width: '26%',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>
    },
    {
      accessor: 'is_superuser',
      Header: 'Superuser',
      column_width: '10%',
      Cell: d =>
        <div style={{textAlign: "center"}}>
          {
            d.value ?
              <FontAwesomeIcon icon={faCheckCircle} style={{color: "#339900"}}/>
            :
              <FontAwesomeIcon icon={faTimesCircle} style={{color: "#CC0000"}}/>
          }
        </div>
    },
    {
      Header: 'Active',
      accessor: 'is_active',
      column_width: '10%',
      Cell: d =>
        <div style={{textAlign: "center"}}>
          {
            d.value ?
              <FontAwesomeIcon icon={faCheckCircle} style={{color: "#339900"}}/>
            :
              <FontAwesomeIcon icon={faTimesCircle} style={{color: "#CC0000"}}/>
          }
        </div>
    }
  ]);

  if (loading)
    return (<LoadingAnim />);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && listUsers) {
    return (
      <BaseArgoView
        resourcename='users'
        location={location}
        listview={true}>
          <BaseArgoTable
            data={listUsers}
            columns={columns}
            page_size={20}
            resourcename='users'
          />
        </BaseArgoView>
    );
  }
  else
    return null;
};


export const UserChange = (props) => {
  const user_name = props.match.params.user_name;
  const addview = props.addview;
  const isTenantSchema = props.isTenantSchema;
  const location = props.location;
  const history = props.history;
  const querykey = `user_${addview ? 'addview' : `${user_name}_changeview`}`;

  const backend = new Backend();

  const { data: user, error: errorUser, isLoading: loadingUser } = useQuery(
    `${querykey}`, async () => {
      let user = {
        'pk': '',
        'first_name': '',
        'last_name': '',
        'username': '',
        'is_active': true,
        'is_superuser': false,
        'email': '',
        'last_login': '',
        'date_joined': ''
      };

      if (!addview)
        user = await backend.fetchData(`/api/v2/internal/users/${user_name}`);

      return user;
    }
  );

  const { data: userProfile, error: errorUserProfile, isLoading: loadingUserProfile } = useQuery(
    `${querykey}_userprofile`, async () => {
      let userprofile = {
        'displayname': '',
        'subject': '',
        'egiid': ''
      };
      if (isTenantSchema && !addview)
        userprofile = await backend.fetchData(`/api/v2/internal/userprofile/${user_name}`);

      return userprofile;
    }
  );

  const { data: userGroups, error: errorUserGroups, isLoading: loadingUserGroups } = useQuery(
    `${querykey}_usergroups`, async () => {
      let usergroups = {
        'aggregations': [],
        'metrics': [],
        'metricprofiles': [],
        'thresholdsprofiles': []
      };

      if (isTenantSchema && !addview)
        usergroups = await backend.fetchResult(`/api/v2/internal/usergroups/${user_name}`);

      return usergroups;
    }
  );

  const { data: allGroups, error: errorAllGroups, isLoading: loadingAllGroups } = useQuery(
    'user_listview_allgroups', async () => {
      let allgroups = {
        'metrics': [],
        'aggregations': [],
        'metricprofiles': [],
        'thresholdsprofiles': []
      };

      if (isTenantSchema)
       allgroups = await backend.fetchResult('/api/v2/internal/usergroups');

      return allgroups;
    }
  );

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'session_userdetails', async () => {
      let arg = isTenantSchema ? true : false;
      let session = await backend.isActiveSession(arg);

      if (session.active)
        return session.userdetails;
    }
  );

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  };

  function onSubmitHandle(values, action) {
    let msg = `Are you sure you want to ${addview ? 'add' : 'change'} user?`;
    let title = `${addview ? 'Add' : 'Change'} user`;

    setModalMsg(msg);
    setModalTitle(title);
    setFormValues(values);
    setModalFlag('submit');
    toggleAreYouSure();
  };

  async function doChange() {
    if (!addview) {
      let response = await backend.changeObject(
        '/api/v2/internal/users/',
        {
          pk: formValues.pk,
          username: formValues.username,
          first_name: formValues.first_name,
          last_name: formValues.last_name,
          email: formValues.email,
          is_superuser: formValues.is_superuser,
          is_active: formValues.is_active
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
          let profile_response = await backend.changeObject(
            '/api/v2/internal/userprofile/',
            {
              username: formValues.username,
              displayname: formValues.displayname,
              subject: formValues.subject,
              egiid: formValues.egiid,
              groupsofaggregations: formValues.groupsofaggregations,
              groupsofmetrics: formValues.groupsofmetrics,
              groupsofmetricprofiles: formValues.groupsofmetricprofiles,
              groupsofthresholdsprofiles: formValues.groupsofthresholdsprofiles
            }
          );
          if (profile_response.ok) {
            NotifyOk({
              msg: 'User successfully changed',
              title: 'Changed',
              callback: () => history.push('/ui/administration/users')
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
            callback: () => history.push('/ui/administration/users')
          });
        }
      };
    } else {
      let response = await backend.addObject(
        '/api/v2/internal/users/',
        {
          username: formValues.username,
          password: formValues.password,
          first_name: formValues.first_name,
          last_name: formValues.last_name,
          email: formValues.email,
          is_superuser: formValues.is_superuser,
          is_active: formValues.is_active
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
          let profile_response = await backend.addObject(
            '/api/v2/internal/userprofile/',
            {
              username: formValues.username,
              displayname: formValues.displayname,
              subject: formValues.subject,
              egiid: formValues.egiid,
              groupsofaggregations: formValues.groupsofaggregations,
              groupsofmetrics: formValues.groupsofmetrics,
              groupsofmetricprofiles: formValues.groupsofmetricprofiles,
              groupsofthresholdsprofiles: formValues.groupsofthresholdsprofiles
            }
          );
          if (profile_response.ok) {
            NotifyOk({
              msg: 'User successfully added',
              title: 'Added',
              callback: () => history.push('/ui/administration/users')
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
            callback: () => history.push('/ui/administration/users')
          });
        };
      };
    };
  };

  async function doDelete() {
    let response = await backend.deleteObject(`/api/v2/internal/users/${user_name}`);
    if (response.ok) {
      NotifyOk({
        msg: 'User successfully deleted',
        title: 'Deleted',
        callback: () => history.push('/ui/administration/users')
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
  };

  if (loadingUser || loadingUserProfile || loadingUserGroups || loadingAllGroups || loadingUserDetails)
    return(<LoadingAnim />)

  else if (errorUser)
    return (<ErrorComponent error={errorUser}/>);

  else if (errorUserProfile)
    return (<ErrorComponent error={errorUserProfile}/>);

  else if (errorUserGroups)
    return (<ErrorComponent error={errorUserGroups}/>);

  else if (errorAllGroups)
    return (<ErrorComponent error={errorAllGroups}/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (!loadingUser && !loadingUserProfile && !loadingUserGroups && !loadingAllGroups && !loadingUserDetails && user) {
    if (isTenantSchema) {
      return (
        <>
          <ModalAreYouSure
            isOpen={areYouSureModal}
            toggle={toggleAreYouSure}
            title={modalTitle}
            msg={modalMsg}
            onYes={modalFlag === 'submit' ? doChange : modalFlag === 'delete' ? doDelete : undefined}
          />
          <BaseArgoView
            resourcename="users"
            location={location}
            addview={addview}
            history={false}
          >
            <Formik
              initialValues = {{
                addview: addview,
                pk: user.pk,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                password: '',
                confirm_password: '',
                is_active: user.is_active,
                is_superuser: user.is_superuser,
                email: user.email,
                last_login: user.last_login,
                date_joined: user.date_joined,
                groupsofaggregations: userGroups.aggregations,
                groupsofmetrics: userGroups.metrics,
                groupsofmetricprofiles: userGroups.metricprofiles,
                groupsofthresholdsprofiles: userGroups.thresholdsprofiles,
                displayname: userProfile.displayname,
                subject: userProfile.subject,
                egiid: userProfile.egiid
              }}
              validationSchema={UserSchema}
              enableReinitialize={true}
              onSubmit = {(values, actions) => onSubmitHandle(values, actions)}
              render = {props => (
                <Form>
                  <CommonUser
                    {...props}
                    add={addview}
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
                                {allGroups.metrics.map( s => (
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
                                {allGroups.metricprofiles.map( s => (
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
                                {allGroups.aggregations.map( s => (
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
                                {allGroups.thresholdsprofiles.map( s => (
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
                        !addview ?
                          <Button
                            color="danger"
                            onClick={() => {
                              setModalMsg('Are you sure you want to delete user?');
                              setModalTitle('Delete user');
                              setModalFlag('delete');
                              toggleAreYouSure();
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
        </>
      )
    } else {
      return (
        <React.Fragment>
          {
            <ModalAreYouSure
              isOpen={areYouSureModal}
              toggle={toggleAreYouSure}
              title={modalTitle}
              msg={modalMsg}
              onYes={modalFlag === 'submit' ? doChange : modalFlag === 'delete' ? doDelete : undefined}
            />
          }
          <div className='d-flex align-items-center justify-content-between'>
            <h2 className='ml-3 mt-1 mb-4'>{`${addview ? 'Add' : 'Change'} user`}</h2>
            {
              (!addview && userDetails.username === user_name) &&
                <Link
                  className='btn btn-secondary'
                  to={location.pathname + '/change_password'}
                  role='button'
                >
                  Change password
                </Link>
            }
          </div>
          <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
            <Formik
              initialValues = {{
                addview: addview,
                pk: user.pk,
                first_name: user.first_name,
                last_name: user.last_name,
                username: user.username,
                password: '',
                confirm_password: '',
                is_active: user.is_active,
                is_superuser: user.is_superuser,
                email: user.email,
                last_login: user.last_login,
                date_joined: user.date_joined
              }}
              validationSchema={UserSchema}
              enableReinitialize={true}
              onSubmit = {(values, actions) => onSubmitHandle(values, actions)}
              render = {props => (
                <Form>
                  <CommonUser
                    {...props}
                    add={addview}
                  />
                  <div className='submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5'>
                    {
                      !addview ?
                        <Button
                          color='danger'
                          onClick={() => {
                            setModalMsg(`Are you sure you want to delete user ${user_name}?`);
                            setModalTitle('Delete user');
                            setModalFlag('delete');
                            toggleAreYouSure();
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
    };
  };
};


export const ChangePassword = (props) => {
  const name = props.match.params.user_name;
  const location = props.locaation;
  const history = props.history;

  const backend = new Backend();

  const { data: userDetails, isLoading: loading} = useQuery(
    'session_userdetails', async () => {
      let session = await backend.isActiveSession(false);
      if (session.active)
        return session.userdetails;
    }
  );

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  };

  function onSubmitHandle(values, actions) {
    let msg = 'Are you sure you want to change password?';
    let title = 'Change password';

    setModalMsg(msg);
    setModalTitle(title);
    setFormValues(values);
    toggleAreYouSure();
  };

  async function doChange() {
    let response = await backend.changeObject(
      '/api/v2/internal/change_password/',
      {
        username: name,
        new_password: formValues.confirm_password
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
      let response = await fetch('/rest-auth/login/', {
        method: 'POST',
        mode: 'cors',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Referer': 'same-origin'
        },
        body: JSON.stringify({
          'username': name,
          'password': formValues.confirm_password
        })
      });
      NotifyOk({
        msg: 'Password successfully changed',
        title: 'Changed',
        callback: () => history.push('/ui/administration/users')
      });
    };
  };

  if (loading)
    return (<LoadingAnim/>);

  else if (!loading && userDetails) {
    let write_perm = userDetails.username === name;

    return (
      <>
        <ModalAreYouSure
          isOpen={areYouSureModal}
          toggle={toggleAreYouSure}
          title={modalTitle}
          msg={modalMsg}
          onYes={doChange}
        />
        <BaseArgoView
          resourcename='password'
          location={location}
          history={false}
          submitperm={write_perm}
        >
          <Formik
            initialValues = {{
              password: '',
              confirm_password: ''
            }}
            validationSchema = {ChangePasswordSchema}
            onSubmit = {(values, actions) => onSubmitHandle(values, actions)}
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
      </>
    )
  } else
    return null;
};
