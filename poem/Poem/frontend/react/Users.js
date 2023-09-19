import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Backend } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  BaseArgoTable,
  CustomReactSelect
} from './UIElements';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import {
  Form,
  FormGroup,
  Row,
  Col,
  Label,
  FormText,
  Button,
  InputGroup,
  InputGroupText,
  Input,
  FormFeedback
} from "reactstrap";
import * as Yup from 'yup';
import './Users.css';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { fetchUserGroups, fetchUsers, fetchUserDetails  } from './QueryFunctions';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ErrorMessage } from '@hookform/error-message';
import { CustomButton, CustomHeadline, CustomInput, CustomProfilesList, CustomSpan, CustomSubtitle } from './CustomPlaceholders';


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
    return (<CustomProfilesList />);

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


const GroupSelect = ({ forwardedRef=undefined, ...props }) => {
  return (
    <CustomReactSelect
      name={ props.name }
      forwardedRef={ forwardedRef ? forwardedRef : null }
      id={ props.id ? props.id : props.name }
      label={ props.label }
      isMulti={ true }
      onChange={ props.onChange }
      options={ props.options.map(option => new Object({ label: option, value: option })) }
      value={
        props.values.length > 0 ?
          props.values.map(value => new Object({ label: value, value: value }))
        :
      undefined
      }
    />
  )
}


const UserChangeForm = ({
  user_name=undefined,
  addview=false,
  user=undefined,
  userProfile=undefined,
  userGroups=undefined,
  allGroups=undefined,
  userDetails=undefined,
  isTenantSchema=undefined,
  location=undefined,
  history=undefined
}) => {
  const queryClient = useQueryClient()
  const backend = new Backend()

  const changeUserMutation = useMutation(async(values) => backend.changeObject('/api/v2/internal/users/', values))
  const changeUserProfileMutation = useMutation(async(values) => backend.changeObject('/api/v2/internal/userprofile/', values))
  const addUserMutation = useMutation(async(values) => backend.addObject('/api/v2/internal/users/', values))
  const addUserProfileMutation = useMutation(async(values) => backend.addObject('/api/v2/internal/userprofile/', values))
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/users/${user_name}`))

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalFlag, setModalFlag] = useState(undefined)
  const [modalTitle, setModalTitle] = useState(undefined)
  const [modalMsg, setModalMsg] = useState(undefined)

  const { control, handleSubmit, setValue, getValues, formState: { errors } } = useForm({
    defaultValues: {
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
      groupsofaggregations: isTenantSchema && userGroups ? userGroups.aggregations : [],
      groupsofmetrics: isTenantSchema && userGroups ? userGroups.metrics : [],
      groupsofmetricprofiles: isTenantSchema && userGroups ? userGroups.metricprofiles : [],
      groupsofthresholdsprofiles: isTenantSchema && userGroups ? userGroups.thresholdsprofiles : [],
      groupsofreports: isTenantSchema && userGroups ? userGroups.reports : [],
      displayname: isTenantSchema && userProfile ? userProfile.displayname : '',
      subject: isTenantSchema && userProfile ? userProfile.subject : '',
      egiid: isTenantSchema && userProfile ? userProfile.egiid : ''
    },
    mode: "all",
    resolver: yupResolver(UserSchema)
  })

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal)
  }

  function onSubmitHandle() {
    let msg = `Are you sure you want to ${addview ? 'add' : 'change'} user?`
    let title = `${addview ? 'Add' : 'Change'} user`

    setModalMsg(msg)
    setModalTitle(title)
    setModalFlag('submit')
    toggleAreYouSure()
  }

  function doChange() {
    let formValues = getValues()

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
      extra_button={
        !isTenantSchema && !addview && userDetails.username == user_name &&
          <Link
            className='btn btn-secondary'
            to={location.pathname + '/change_password'}
            role='button'
          >
            Change password
          </Link>
      }
    >
      <Form onSubmit={ handleSubmit(onSubmitHandle) } data-testid="form">
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Username</InputGroupText>
                <Controller
                  name="username"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="username"
                      className={`form-control ${errors?.username && "is-invalid"}`}
                    />
                  }
                />
                <ErrorMessage
                  errors={ errors }
                  name="username"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </InputGroup>
            </Col>
          </Row>
          {
            addview &&
              <>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupText>Password</InputGroupText>
                      <Controller
                        name="password"
                        control={ control }
                        render={ ({ field }) =>
                          <input
                            { ...field }
                            type="password"
                            data-testid="password"
                            className={ `form-control ${errors?.password && "is-invalid"}` }
                          />
                        }
                      />
                      <ErrorMessage
                        errors={ errors }
                        name="password"
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                    </InputGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupText>Confirm password</InputGroupText>
                      <Controller
                        name="confirm_password"
                        control={ control }
                        render={ ({ field }) =>
                          <input
                            { ...field }
                            type="password"
                            data-testid="confirm_password"
                            className={ `form-control ${errors?.confirm_password && "is-invalid"}` }
                          />
                        }
                      />
                      <ErrorMessage
                        errors={ errors }
                        name="confirm_password"
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                    </InputGroup>
                  </Col>
                </Row>
              </>
          }
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title='Personal info'/>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>First name</InputGroupText>
                <Controller
                  name="first_name"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="first_name"
                      className="form-control"
                    />
                  }
                />
              </InputGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Last name</InputGroupText>
                <Controller
                  name="last_name"
                  control={ control }
                  render={ ({field}) =>
                    <Input
                      { ...field }
                      data-testid="last_name"
                      className="form-control"
                    />
                  }
                />
              </InputGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Email</InputGroupText>
                <Controller
                  name="email"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      name="email"
                      data-testid="email"
                      className={ `form-control ${errors?.email && "is-invalid"}` }
                    />
                  }
                />
                <ErrorMessage
                  errors={ errors }
                  name="email"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </InputGroup>
            </Col>
          </Row>
          {
            !addview &&
              <>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupText>Last login</InputGroupText>
                      <Controller
                        name="last_login"
                        control={ control }
                        render={ ({ field }) =>
                          <Input
                            { ...field }
                            data-testid="last_login"
                            className="form-control"
                            disabled={ true }
                          />
                        }
                      />
                    </InputGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupText>Date joined</InputGroupText>
                      <Controller
                        name="date_joined"
                        control={ control }
                        render={ ({ field }) =>
                          <Input
                            { ...field }
                            data-testid="date_joined"
                            className="form-control"
                            disabled={ true }
                          />
                        }
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
                  <Controller
                    name="is_superuser"
                    control={ control }
                    render={ ({ field }) =>
                      <Input
                        { ...field }
                        type='checkbox'
                        onChange={ e => setValue("is_superuser", e.target.checked) }
                        checked={ field.value }
                      />
                    }
                  />
                  <Label check for="is_superuser">Superuser status</Label>
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
                  <Controller
                    name="is_active"
                    control={ control }
                    render={ ({ field }) =>
                      <Input
                        { ...field }
                        type='checkbox'
                        onChange={ e => setValue("is_active", e.target.checked) }
                        checked={ field.value }
                      />
                    }
                  />
                  <Label check for="is_active">Active</Label>
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
        {
          isTenantSchema &&
            <>
              <FormGroup>
                <ParagraphTitle title='POEM user permissions'/>
                <Row>
                  <Col md={5}>
                    <Controller
                      name="groupsofreports"
                      control={ control }
                      render={ ({ field }) =>
                        <GroupSelect
                          forwardedRef={ field.ref }
                          label="Groups of reports"
                          options={ allGroups.reports }
                          values={ field.value }
                          onChange={ e => {
                            let selectedValues = new Array()
                            e.forEach(e => selectedValues.push(e.value))
                            setValue("groupsofreports", selectedValues)
                          }}
                        />
                      }
                    />
                    <FormText color="muted">
                      The groups of reports that user will control.
                    </FormText>
                  </Col>
                  <Col md={5}>
                    <Controller
                      name="groupsofmetrics"
                      control={ control }
                      render={ ({ field }) =>
                        <GroupSelect
                          forwardedRef={ field.ref }
                          label="Groups of metrics"
                          options={ allGroups.metrics }
                          values={ getValues("groupsofmetrics") }
                          onChange={ e => {
                            let selectedValues = new Array()
                            e.forEach(e => selectedValues.push(e.value))
                            setValue("groupsofmetrics", selectedValues)
                          }}
                        />
                      }
                    />
                    <FormText color="muted">
                      The groups of metrics that user will control.
                    </FormText>
                  </Col>
                </Row>
                <Row className='mt-3'>
                  <Col md={5}>
                    <Controller
                      name="groupsofmetricprofiles"
                      control={ control }
                      render={ ({ field }) =>
                        <GroupSelect
                          forwardedRef={ field.ref }
                          label="Groups of metric profiles"
                          options={ allGroups.metricprofiles }
                          values={ getValues("groupsofmetricprofiles") }
                          onChange={ e => {
                            let selectedValues = new Array()
                            e.forEach(e => selectedValues.push(e.value))
                            setValue("groupsofmetricprofiles", selectedValues)
                          }}
                        />
                      }
                    />
                    <FormText color="muted">
                      The groups of metric profiles that user will control.
                    </FormText>
                  </Col>
                  <Col md={5}>
                    <Controller
                      name="groupsofaggregations"
                      control={ control }
                      render={ ({ field }) =>
                        <GroupSelect
                          forwardedRef={ field.ref }
                          label="Groups of aggregations"
                          options={ allGroups.aggregations }
                          values={ getValues("groupsofaggregations") }
                          onChange={ e => {
                            let selectedValues = new Array()
                            e.forEach(e => selectedValues.push(e.value))
                            setValue("groupsofaggregations", selectedValues)
                          }}
                        />
                      }
                    />
                    <FormText color="muted">
                      The groups of aggregations that user will control.
                    </FormText>
                  </Col>
                </Row>
                <Row className='mt-3'>
                  <Col md={5}>
                    <Controller
                      name="groupsofthresholdsprofiles"
                      control={ control }
                      render={ ({ field }) =>
                        <GroupSelect
                          forwardedRef={ field.ref }
                          label="Groups of thresholds profiles"
                          options={ allGroups.thresholdsprofiles }
                          values={ getValues("groupsofthresholdsprofiles") }
                          onChange={ e => {
                            let selectedValues = new Array()
                            e.forEach(e => selectedValues.push(e.value))
                            setValue("groupsofthresholdsprofiles", selectedValues)
                          }}
                        />
                      }
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
                      <Controller
                        name="subject"
                        control={ control }
                        render={ ({ field }) =>
                          <Input
                            { ...field }
                            className="form-control"
                            data-testid="subject"
                          />
                        }
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
                      <Controller
                        name="egiid"
                        control={ control }
                        render={ ({ field }) =>
                          <Input
                            { ...field }
                            className="form-control"
                            data-testid="egiid"
                          />
                        }
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
                      <Controller
                        name="displayname"
                        control={ control }
                        render={ ({ field }) =>
                          <Input
                            { ...field }
                            className="form-control"
                            data-testid="displayname"
                          />
                        }
                      />
                    </InputGroup>
                  </Col>
                </Row>
              </FormGroup>
            </>
        }
        <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
          {
            !addview ?
              <Button
                color="danger"
                onClick={() => {
                  setModalMsg('Are you sure you want to delete user?')
                  setModalTitle('Delete user')
                  setModalFlag('delete')
                  toggleAreYouSure()
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
      </Form>
    </BaseArgoView>
  )
}


export const UserChange = (props) => {
  const user_name = props.match.params.user_name;
  const addview = props.addview;
  const isTenantSchema = props.isTenantSchema;
  const location = props.location;
  const history = props.history;

  const queryClient = useQueryClient();

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

  if (statusUser === 'loading' || statusUserProfile === 'loading' || statusUserGroups === 'loading' || statusAllGroups === 'loading' || statusUserDetails === 'loading')
    return(
      <>
        <CustomHeadline width="184px" height="38.4px"/>
        <Form className='ms-2 mb-2 mt-2 p-3 border placeholder-glow rounded d-flex flex-column'>
          <CustomInput height="37.6px" width="50%" custStyle="mb-3" />
          <CustomSubtitle height="37.6px" custStyle="mb-2" />
          <CustomInput height="37.6px" width="50%" custStyle="mb-2" />
          <CustomInput height="37.6px" width="50%" custStyle="mb-2" />
          <CustomInput height="37.6px" width="50%" custStyle="mb-2" />
          <CustomInput height="37.6px" width="50%" custStyle="mb-2" />
          <CustomInput height="37.6px" width="50%" custStyle="mb-3" />
          <CustomSubtitle height="37.6px" custStyle="mb-3" />
          <CustomInput height="24px" width="122px" />
          <CustomSpan custStyle="mt-1 mb-2" height="10px" width="35%" />
          <CustomInput height="24px" width="80px" />
          <CustomSpan custStyle="mt-1 mb-3" height="10px" width="45%" />
          <CustomSubtitle height="37.6px" custStyle="mb-3" />
          <Row className='d-flex flex-row align-items-center'>
            <Col md={5} className='d-flex flex-column'>
              <CustomSpan custStyle="mt-1 mb-1" height="24px" width="45%" />
              <CustomInput height="37.6px" />
              <CustomSpan custStyle="mt-1 mb-3" height="14.4px" width="45%" />
            </Col>
            <Col md={5} className='d-flex flex-column'>
              <CustomSpan custStyle="mt-1 mb-1" height="24px" width="45%" />
              <CustomInput height="37.6px" />
              <CustomSpan custStyle="mt-1 mb-3" height="14.4px" width="45%" />
            </Col>
            <Col md={5} className='d-flex flex-column'>
              <CustomSpan custStyle="mt-1 mb-1" height="24px" width="45%" />
              <CustomInput height="37.6px" />
              <CustomSpan custStyle="mt-1 mb-3" height="14.4px" width="45%" />
            </Col>
            <Col md={5} className='d-flex flex-column'>
              <CustomSpan custStyle="mt-1 mb-1" height="24px" width="45%" />
              <CustomInput height="37.6px" />
              <CustomSpan custStyle="mt-1 mb-3" height="14.4px" width="45%" />
            </Col>
            <Col md={5} className='d-flex flex-column'>
              <CustomSpan custStyle="mt-1 mb-1" height="24px" width="45%" />
              <CustomInput height="37.6px" />
              <CustomSpan custStyle="mt-1 mb-2" height="14.4px" width="45%" />
            </Col>
          </Row>
          <CustomSubtitle height="37.6px" custStyle="mb-1" />
          <CustomInput height="37.6px" custStyle="mb-2" />
          <CustomInput height="37.6px" width="65%" custStyle="mb-2"/>
          <CustomInput height="37.6px" width="50%" />
          {window.location.pathname === "/ui/administration/users/add" ? 
            <div className='ms-2 mb-2 mt-5 p-3 border placeholder-glow rounded d-flex justify-content-end'>
              <CustomButton height="37.6px" width="70px" />
            </div>
          :
            <div className='ms-2 mb-2 mt-5 p-3 border placeholder-glow rounded d-flex justify-content-between'>
              <CustomButton height="37.6px" width="100px" />
              <CustomButton height="37.6px" width="100px" />
            </div>
          }
        </Form>
      </>
    )


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

  else if (addview || user && (!isTenantSchema || allGroups && (addview || (userProfile && userGroups)))) {
    return (
      <UserChangeForm
        user_name={ user_name }
        addview={ addview }
        user={ user }
        userProfile={ userProfile }
        userGroups={ userGroups }
        allGroups={ allGroups }
        userDetails={ userDetails }
        isTenantSchema={ isTenantSchema }
        location={ location }
        history={ history }
      />
    )
  } else
    return null
}


const ChangePasswordForm = ({
  name=undefined,
  userDetails=undefined,
  location=undefined,
  history=undefined
}) => {

  const backend = new Backend()

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);

  const { control, handleSubmit, getValues, formState: { errors } } = useForm({
    defaultValues: {
      password: "",
      confirm_password: ""
    },
    mode: "all",
    resolver: yupResolver(ChangePasswordSchema)
  })

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onSubmitHandle() {
    let msg = 'Are you sure you want to change password?';
    let title = 'Change password';

    setModalMsg(msg);
    setModalTitle(title);
    toggleAreYouSure();
  }

  async function doChange() {
    let formValues = getValues()

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

  return (
    <BaseArgoView
      resourcename='password'
      location={location}
      history={false}
      submitperm={userDetails.username === name}
      modal={true}
      state={{
        areYouSureModal,
        modalTitle,
        modalMsg,
        'modalFunc': doChange
      }}
      toggle={toggleAreYouSure}
    >
      <Form onSubmit={ handleSubmit(onSubmitHandle) }>
        <Row>
          <Col md={6}>
            <InputGroup>
              <InputGroupText>New password</InputGroupText>
              <Controller
                name="password"
                control={ control }
                render={ ({ field }) =>
                  <input
                    { ...field }
                    type="password"
                    className={ `form-control ${errors?.password && "is-invalid"}` }
                    data-testid="password"
                  />
                }
              />
              <ErrorMessage
                errors={ errors }
                name="password"
                render={ ({ message }) =>
                  <FormFeedback invalid="true" className="end-0">
                    { message }
                  </FormFeedback>
                }
              />
            </InputGroup>
          </Col>
        </Row>
        <Row>
          <Col md={6}>
            <InputGroup>
              <InputGroupText>Confirm password</InputGroupText>
              <Controller
                name="confirm_password"
                control={ control }
                render={ ({ field }) =>
                  <input
                    { ...field }
                    type="password"
                    className={ `form-control ${errors?.confirm_password && "is-invalid"}`}
                    data-testid="confirm_password"
                  />
                }
              />
              <ErrorMessage
                errors={ errors }
                name="confirm_password"
                render={ ({ message }) =>
                  <FormFeedback invalid="true" className="end-0">
                    { message }
                  </FormFeedback>
                }
              />
            </InputGroup>
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
    </BaseArgoView>
  )
}


export const ChangePassword = (props) => {
  const name = props.match.params.user_name;
  const location = props.locaation;
  const history = props.history;

  const { data: userDetails, isLoading: loading} = useQuery(
    'userdetails', () => fetchUserDetails(false)
  ); 

  if (loading)
    return (
      <>
        <CustomHeadline height="38.4px" width="260px" />
        <Form className='ms-2 mb-2 mt-2 p-3 border placeholder-glow rounded d-flex flex-column'>
          <CustomInput height="37.6px" width="50%" custStyle="mb-2" />
          <CustomInput height="37.6px" width="50%" custStyle="mb-4" />
          <div className='mb-2 mt-4 p-3 border placeholder-glow rounded d-flex justify-content-end'>
            <CustomButton height="37.6px" width="60px" />
          </div>
        </Form>
      </>
    );

  else if (userDetails) {
    return (
      <ChangePasswordForm
        userDetails={ userDetails }
        name={ name }
        location={ location }
        history={ history }
      />
    )
  } else
    return null;
};
