import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Backend } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  NotifyError,
  ModalAreYouSure,
  ErrorComponent,
  ParagraphTitle,
  BaseArgoTable,
  CustomError,
  CustomReactSelect
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
  InputGroupText,
  Input
} from "reactstrap";
import * as Yup from 'yup';
import './Users.css';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { fetchUserGroups, fetchUsers } from './QueryFunctions';
import { fetchUserDetails } from './QueryFunctions';


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


const CommonUser = ({add, ...props}) =>
  <>
    {
      (add) ?
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Username</InputGroupText>
                <Field
                  type="text"
                  name="username"
                  data-testid="username"
                  className={`form-control ${props.errors.username && 'border-danger'}`}
                  id="userUsername"
                />
              </InputGroup>
              <CustomError error={props.errors.username} />
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Password</InputGroupText>
                <Field
                  type="password"
                  name="password"
                  data-testid="password"
                  className={`form-control ${props.errors.password && 'border-danger'}`}
                  id="password"
                />
              </InputGroup>
              <CustomError error={props.errors.password} />
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Confirm password</InputGroupText>
                <Field
                  type='password'
                  name='confirm_password'
                  data-testid='confirm_password'
                  className={`form-control ${props.errors.confirm_password && 'border-danger'}`}
                  id='confirm_password'
                />
              </InputGroup>
              <CustomError error={props.errors.confirm_password} />
            </Col>
          </Row>
        </FormGroup>
      :
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Username</InputGroupText>
                <Field
                  type="text"
                  name='username'
                  data-testid='username'
                  className={`form-control ${props.errors.username && 'border-danger'}`}
                  id='userUsername'
                />
              </InputGroup>
              <CustomError error={props.errors.username} />
            </Col>
          </Row>
        </FormGroup>
    }
    <FormGroup>
      <ParagraphTitle title='Personal info'/>
      <Row>
        <Col md={6}>
          <InputGroup>
            <InputGroupText>First name</InputGroupText>
            <Field
              type="text"
              name="first_name"
              data-testid="first_name"
              className="form-control"
              id="userFirstName"
            />
          </InputGroup>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <InputGroup>
            <InputGroupText>Last name</InputGroupText>
            <Field
              type="text"
              name="last_name"
              data-testid="last_name"
              className="form-control"
              id="userLastName"
            />
          </InputGroup>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <InputGroup>
            <InputGroupText>Email</InputGroupText>
            <Field
              type="text"
              name="email"
              data-testid="email"
              className={`form-control ${props.errors.email && 'border-danger'}`}
              id="userEmail"
            />
          </InputGroup>
          <CustomError error={props.errors.email} />
        </Col>
      </Row>
      {
        (!add) &&
          <>
            <Row>
              <Col md={6}>
                <InputGroup>
                  <InputGroupText>Last login</InputGroupText>
                  <Field
                    type='text'
                    name='last_login'
                    data-testid='last_login'
                    className='form-control'
                    disabled={true}
                  />
                </InputGroup>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <InputGroup>
                  <InputGroupText>Date joined</InputGroupText>
                  <Field
                    type='text'
                    name='date_joined'
                    data-testid='date_joined'
                    className='form-control'
                    disabled={true}
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
          <Row>
            <FormGroup check inline className='ms-3'>
              <Input
                type='checkbox'
                id='is_superuser'
                name='is_superuser'
                onChange={e => props.setFieldValue('is_superuser', e.target.checked)}
                checked={props.values.is_superuser}
              />
              <Label check for='is_superuser'>Superuser status</Label>
            </FormGroup>
          </Row>
          <Row>
            <FormText color="muted">
              Designates that this user has all permissions without explicitly assigning them.
            </FormText>
          </Row>
        </Col>
      </Row>
      <Row>
        <Col md={6}>
          <Row>
            <FormGroup check inline className='ms-3'>
              <Input
                type='checkbox'
                id='is_active'
                name='is_active'
                onChange={e => props.setFieldValue('is_active', e.target.checked)}
                checked={props.values.is_active}
              />
              <Label check for='is_active'>Active</Label>
            </FormGroup>
          </Row>
          <Row className='mt-0'>
            <FormText color="muted">
              Designates whether this user should be treated as active. Unselect this instead of deleting accounts.
            </FormText>
          </Row>
        </Col>
      </Row>
    </FormGroup>
  </>;



const fetchUser = async (username) => {
  const backend = new Backend();
  return await backend.fetchData(`/api/v2/internal/users/${username}`)
}


const fetchUserProfile = async (isTenantSchema, username) => {
  const backend = new Backend();
  if (isTenantSchema)
    return await backend.fetchData(`/api/v2/internal/userprofile/${username}`)
}


const fetchGroupsForUser = async (isTenantSchema, username) => {
  const backend = new Backend();
  if (isTenantSchema) {
    let usergroups = await backend.fetchResult(`/api/v2/internal/usergroups/${username}`);

    return usergroups;
  }
}


export const UsersList = (props) => {
    const location = props.location;
    const isTenantSchema = props.isTenantSchema;

    const queryClient = useQueryClient();

    const { data: listUsers, error: error, isLoading: loading } = useQuery(
      'user', () => fetchUsers()
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
      Cell: row =>
        <div style={{textAlign: "center"}}>
          {
            row.value ?
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
      Cell: row =>
        <div style={{textAlign: "center"}}>
          {
            row.value ?
              <FontAwesomeIcon icon={faCheckCircle} style={{color: "#339900"}}/>
            :
              <FontAwesomeIcon icon={faTimesCircle} style={{color: "#CC0000"}}/>
          }
        </div>
    }
  ], [isTenantSchema, queryClient]);

  if (loading)
    return (<LoadingAnim />);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && listUsers) {
    return (
      <BaseArgoView
        resourcename='user'
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


const GroupSelect = ({ name, label, options, initValues, ...props }) => {
  const getOptions = ( options ) => {
    return options.map(
      option => new Object({ label: option, value: option })
    )
  }

  const getInitValues = ( values ) => {
    return values.map(
      value => new Object({ label: value, value: value })
    )
  }

  return (
    <CustomReactSelect
      name={name}
      id={name}
      label={label}
      isMulti={ true }
      onChange={ e => {
        let selectedValues = new Array()
        e.forEach(e => selectedValues.push(e.value))
        props.setFieldValue(name, selectedValues)
      }}
      options={getOptions(options)}
      value={getInitValues(initValues)}
    />
  )
}


export const UserChange = (props) => {
  const user_name = props.match.params.user_name;
  const addview = props.addview;
  const isTenantSchema = props.isTenantSchema;
  const location = props.location;
  const history = props.history;

  const queryClient = useQueryClient();

  const backend = new Backend();

  const changeUserMutation = useMutation(async(values) => backend.changeObject('/api/v2/internal/users/', values));
  const changeUserProfileMutation = useMutation(async(values) => backend.changeObject('/api/v2/internal/userprofile/', values));
  const addUserMutation = useMutation(async(values) => backend.addObject('/api/v2/internal/users/', values));
  const addUserProfileMutation = useMutation(async(values) => backend.addObject('/api/v2/internal/userprofile/', values));
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/users/${user_name}`));

  const { data: userDetails, error: errorUserDetails, status: statusUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(isTenantSchema)
  );

  const { data: user, error: errorUser, status: statusUser } = useQuery(
    ['user', user_name], () => fetchUser(user_name),
    {
      enabled: !addview && !!userDetails,
      initialData: () => {
        if (!addview)
          return queryClient.getQueryData('user')?.find(usr => usr.name === user_name)
      }
    }
  );

  const { data: userProfile, error: errorUserProfile, status: statusUserProfile } = useQuery(
    ['userprofile', user_name], () => fetchUserProfile(isTenantSchema, user_name),
    { enabled: !addview && isTenantSchema }
  );

  const { data: userGroups, error: errorUserGroups, status: statusUserGroups } = useQuery(
    ['usergroups', user_name], () => fetchGroupsForUser(isTenantSchema, user_name),
    { enabled: isTenantSchema && !addview }
  );

  const { data: allGroups, error: errorAllGroups, status: statusAllGroups } = useQuery(
    'usergroups', () => fetchUserGroups(isTenantSchema),
    { enabled: isTenantSchema }
  );

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onSubmitHandle(values) {
    let msg = `Are you sure you want to ${addview ? 'add' : 'change'} user?`;
    let title = `${addview ? 'Add' : 'Change'} user`;

    setModalMsg(msg);
    setModalTitle(title);
    setFormValues(values);
    setModalFlag('submit');
    toggleAreYouSure();
  }

  function doChange() {
    const sendValues = new Object({
      username: formValues.username,
      first_name: formValues.first_name,
      last_name: formValues.last_name,
      email: formValues.email,
      is_superuser: formValues.is_superuser,
      is_active: formValues.is_active
    });

    const sendValues2 = new Object({
      username: formValues.username,
      displayname: formValues.displayname,
      subject: formValues.subject,
      egiid: formValues.egiid,
      groupsofaggregations: formValues.groupsofaggregations,
      groupsofmetrics: formValues.groupsofmetrics,
      groupsofmetricprofiles: formValues.groupsofmetricprofiles,
      groupsofthresholdsprofiles: formValues.groupsofthresholdsprofiles,
      groupsofreports: formValues.groupsofreports
    })

    if (!addview) {
      changeUserMutation.mutate({ ...sendValues, pk: formValues.pk }, {
        onSuccess: () => {
          queryClient.invalidateQueries('user');
          if (isTenantSchema) {
            changeUserProfileMutation.mutate(sendValues2, {
              onSuccess: () => {
                queryClient.invalidateQueries('userprofile');
                NotifyOk({
                  msg: 'User successfully changed',
                  title: 'Changed',
                  callback: () => history.push('/ui/administration/users')
                })
              },
              onError: (error) => {
                NotifyError({
                  title: 'Error',
                  msg: error.message ? error.message : 'Error changing user profile'
                })
              }
            })
          } else {
            NotifyOk({
              msg: 'User successfully changed',
              title: 'Changed',
              callback: () => history.push('/ui/administration/users')
            })
          }
        },
        onError: (error) => {
          NotifyError({
            title: 'Error',
            msg: error.message ? error.message : 'Error changing user'
          })
        }
      })
    } else {
      addUserMutation.mutate({ ...sendValues, password: formValues.password }, {
        onSuccess: () => {
          queryClient.invalidateQueries('user');
          if (isTenantSchema) {
            addUserProfileMutation.mutate(sendValues2, {
              onSuccess: () => {
                queryClient.invalidateQueries('userprofile');
                NotifyOk({
                  msg: 'User successfully added',
                  title: 'Added',
                  callback: () => history.push('/ui/administration/users')
                })
              },
              onError: (error) => {
                NotifyError({
                  title: 'Error',
                  msg: error.message ? error.message : 'Error adding user profile'
                })
              }
            })
          } else {
            NotifyOk({
              msg: 'User successfully added',
              title: 'Added',
              callback: () => history.push('/ui/administration/users')
            })
          }
        },
        onError: (error) => {
          NotifyError({
            title: 'Error',
            msg: error.message ? error.message : 'Error adding user'
          })
        }
      })
    }
  }

  function doDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries('user');
        if (isTenantSchema)
          queryClient.invalidateQueries('userprofile');
        NotifyOk({
          msg: 'User successfully deleted',
          title: 'Deleted',
          callback: () => history.push('/ui/administration/users')
        })
      },
      onError: (error) => {
        NotifyError({
          title: 'Error',
          msg: error.message ? error.message : 'Error deleting user'
        })
      }
    })
  }

  if (statusUser === 'loading' || statusUserProfile === 'loading' || statusUserGroups === 'loading' || statusAllGroups === 'loading' || statusUserDetails === 'loading')
    return(<LoadingAnim />)

  else if (statusUser === 'error')
    return (<ErrorComponent error={errorUser}/>);

  else if (statusUserProfile === 'error')
    return (<ErrorComponent error={errorUserProfile}/>);

  else if (statusUserGroups === 'error')
    return (<ErrorComponent error={errorUserGroups}/>);

  else if (statusAllGroups === 'error')
    return (<ErrorComponent error={errorAllGroups}/>);

  else if (statusUserDetails === 'error')
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (addview || (user) && (!isTenantSchema || allGroups && (addview || (userProfile && userGroups)))) {
    if (isTenantSchema) {
      return (
        <BaseArgoView
          resourcename="user"
          location={location}
          addview={addview}
          history={false}
          modal={true}
          state={{
            areYouSureModal,
            modalTitle,
            modalMsg,
            'modalFunc': modalFlag === 'submit' ?
              doChange
            :
              modalFlag === 'delete' ?
                doDelete
              :
                undefined
          }}
          toggle={toggleAreYouSure}
        >
          <Formik
            initialValues = {{
              addview: addview,
              pk: user ? user.pk : '',
              first_name: user ? user.first_name : '',
              last_name: user ? user.last_name : '',
              username: user ? user.username : '',
              password: '',
              confirm_password: '',
              is_active: user ? user.is_active : true,
              is_superuser: user ? user.is_superuser : false,
              email: user ? user.email : '',
              last_login: user ? user.last_login : '',
              date_joined: user ? user.date_joined : '',
              groupsofaggregations: userGroups ? userGroups.aggregations : [],
              groupsofmetrics: userGroups ? userGroups.metrics : [],
              groupsofmetricprofiles: userGroups ? userGroups.metricprofiles : [],
              groupsofthresholdsprofiles: userGroups ? userGroups.thresholdsprofiles : [],
              groupsofreports: userGroups ? userGroups.reports : [],
              displayname: userProfile ? userProfile.displayname : '',
              subject: userProfile ? userProfile.subject : '',
              egiid: userProfile ? userProfile.egiid : ''
            }}
            validationSchema={UserSchema}
            enableReinitialize={true}
            onSubmit = {(values) => onSubmitHandle(values)}
          >
            {props => (
              <Form data-testid='form'>
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
                          <Col md={5}>
                            <GroupSelect
                              {...props}
                              name='groupsofreports'
                              label='Groups of reports'
                              options={allGroups.reports}
                              initValues={props.values.groupsofreports}
                            />
                            <FormText color="muted">
                              The groups of reports that user will control.
                            </FormText>
                          </Col>
                          <Col md={5}>
                            <GroupSelect
                              {...props}
                              name='groupsofmetrics'
                              label='Groups of metrics'
                              options={allGroups.metrics}
                              initValues={props.values.groupsofmetrics}
                            />
                            <FormText color="muted">
                              The groups of metrics that user will control.
                            </FormText>
                          </Col>
                        </Row>
                        <Row className='mt-3'>
                          <Col md={5}>
                            <GroupSelect
                              {...props}
                              name='groupsofmetricprofiles'
                              label='Groups of metric profiles'
                              options={allGroups.metricprofiles}
                              initValues={props.values.groupsofmetricprofiles}
                            />
                            <FormText color="muted">
                              The groups of metric profiles that user will control.
                            </FormText>
                          </Col>
                          <Col md={5}>
                            <GroupSelect
                              {...props}
                              name='groupsofaggregations'
                              label='Groups of aggregations'
                              options={allGroups.aggregations}
                              initValues={props.values.groupsofaggregations}
                            />
                            <FormText color="muted">
                              The groups of aggregations that user will control.
                            </FormText>
                          </Col>
                        </Row>
                        <Row className='mt-3'>
                          <Col md={5}>
                            <GroupSelect
                              {...props}
                              name='groupsofthresholdsprofiles'
                              label='Groups of thresholds profiles'
                              options={allGroups.thresholdsprofiles}
                              initValues={props.values.groupsofthresholdsprofiles}
                            />
                            <FormText color="muted">
                              The groups of thresholds profiles that user will control.
                            </FormText>
                          </Col>
                        </Row>
                      </FormGroup>
                      <FormGroup>
                        <ParagraphTitle title='Additional information'/>
                        <Row>
                          <Col md={12}>
                            <InputGroup>
                              <InputGroupText>distinguishedName</InputGroupText>
                              <Field
                                type="text"
                                name="subject"
                                required={false}
                                className="form-control"
                                id="distinguishedname"
                                data-testid="subject"
                              />
                            </InputGroup>
                          </Col>
                        </Row>
                      </FormGroup>
                      <FormGroup>
                        <Row>
                          <Col md={8}>
                            <InputGroup>
                              <InputGroupText>eduPersonUniqueId</InputGroupText>
                              <Field
                                type="text"
                                name="egiid"
                                required={false}
                                className="form-control"
                                id='eduid'
                                data-testid="egiid"
                              />
                            </InputGroup>
                          </Col>
                        </Row>
                      </FormGroup>
                      <FormGroup>
                        <Row>
                          <Col md={6}>
                            <InputGroup>
                              <InputGroupText>displayName</InputGroupText>
                              <Field
                                type="text"
                                name="displayname"
                                required={false}
                                className="form-control"
                                id="displayname"
                                data-testid="displayname"
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
          </Formik>
        </BaseArgoView>
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
            <h2 className='ms-3 mt-1 mb-4'>{`${addview ? 'Add' : 'Change'} user`}</h2>
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
          <div id='argo-contentwrap' className='ms-2 mb-2 mt-2 p-3 border rounded'>
            <Formik
              initialValues = {{
                addview: addview,
                pk: user ? user.pk : '',
                first_name: user ? user.first_name : '',
                last_name: user ? user.last_name : '',
                username: user ? user.username : '',
                password: '',
                confirm_password: '',
                is_active: user ? user.is_active : true,
                is_superuser: user ? user.is_superuser : false,
                email: user ? user.email : '',
                last_login: user ? user.last_login : '',
                date_joined: user ? user.date_joined : ''
              }}
              validationSchema={UserSchema}
              enableReinitialize={true}
              onSubmit = {(values, actions) => onSubmitHandle(values, actions)}
            >
              {props => (
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
            </Formik>
          </div>
        </React.Fragment>
      )
    }
  } else
    return null
}


export const ChangePassword = (props) => {
  const name = props.match.params.user_name;
  const location = props.locaation;
  const history = props.history;

  const backend = new Backend();

  const { data: userDetails, isLoading: loading} = useQuery(
    'userdetails', () => fetchUserDetails(false)
  );

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onSubmitHandle(values) {
    let msg = 'Are you sure you want to change password?';
    let title = 'Change password';

    setModalMsg(msg);
    setModalTitle(title);
    setFormValues(values);
    toggleAreYouSure();
  }

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
      }
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: change_msg
      });
    } else {
      // eslint-disable-next-line no-unused-vars
      let _response = await fetch('/dj-rest-auth/login/', {
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
    }
  }

  if (loading)
    return (<LoadingAnim/>);

  else if (userDetails) {
    return (
      <BaseArgoView
        resourcename='password'
        location={location}
        history={false}
        submitperm={userDetails.username === name}
        modal={true}
        state={{areYouSureModal, modalTitle, modalMsg, 'modalFunc': doChange}}
        toggle={toggleAreYouSure}
      >
        <Formik
          initialValues = {{
            password: '',
            confirm_password: ''
          }}
          validationSchema = {ChangePasswordSchema}
          onSubmit = {(values) => onSubmitHandle(values)}
        >
          {props => (
            <Form>
              <Row>
                <Col md={6}>
                  <InputGroup>
                    <InputGroupText>New password</InputGroupText>
                    <Field
                      type="password"
                      name="password"
                      className={`form-control ${props.errors.password && 'border-danger'}`}
                      id="password"
                      data-testid="password"
                    />
                  </InputGroup>
                  <CustomError error={ props.errors.password } />
                </Col>
              </Row>
              <Row>
                <Col md={6}>
                  <InputGroup>
                    <InputGroupText>Confirm password</InputGroupText>
                    <Field
                      type='password'
                      name='confirm_password'
                      className={`form-control ${props.errors.confirm_password && 'border-danger'}`}
                      id='confirm_password'
                      data-testid='confirm_password'
                    />
                  </InputGroup>
                  <CustomError error={ props.errors.confirm_password } />
                </Col>
              </Row>
              {
                (userDetails.username === name) &&
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
        </Formik>
      </BaseArgoView>
    )
  } else
    return null;
};
