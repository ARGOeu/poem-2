import React, { useState, useRef } from 'react';
import { Backend } from './DataManager';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  BaseArgoTable
} from './UIElements';
import {
  Alert,
  FormGroup,
  Row,
  Col,
  Label,
  FormText,
  Button,
  InputGroup,
  InputGroupText,
  Input,
  Form,
  Badge,
  FormFeedback
} from 'reactstrap';
import { faClipboard } from '@fortawesome/free-solid-svg-icons';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import { fetchAPIKeys } from './QueryFunctions';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from "yup";
import { ErrorMessage } from "@hookform/error-message"
import { CustomButton, CustomHeadline, CustomInput, CustomProfilesList, CustomSpan, CustomSubtitle } from './CustomPlaceholders';

const validationSchema = yup.object().shape({
  name: yup.string().required("Name field is required")
    .when("used_by", {
      is: (value) => value === "poem",
      then: yup.string().test("must_not_start", "Name can contain alphanumeric characters, dash and underscore, must always begin with a letter, but not with WEB-API-", function (value) {
        if (!value.startsWith("WEB-API-") && value.match(/^[a-zA-Z][A-Za-z0-9\-_]*$/))
          return true
        else
          return false
      }),
      otherwise: yup.string().matches(/^WEB-API-\S*(-RO)?$/, "Name must have form WEB-API-<tenant_name> or WEB-API-<tenant_name>-RO")
    })
})


const fetchAPIKey = async(name) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/apikeys/${name}`);
}


export const APIKeyList = (props) => {
  const location = useLocation();

  const queryClient = useQueryClient();

  const { data: keys, error, isLoading: loading } = useQuery(
    'apikey', () => fetchAPIKeys()
  )

  const columns = React.useMemo(
    () => [
      {
        Header: '#',
        accessor: null,
        column_width: '2%'
      },
      {
        Header: 'Name',
        id: 'name',
        accessor: e =>
          <Link
            to={'/ui/administration/apikey/' + e.name}
            onMouseEnter={ async () => {
              await queryClient.prefetchQuery(
                ['apikey', e.name], () => fetchAPIKey(e.name)
              );
            } }
          >
            {e.name}
          </Link>,
        column_width: '70%'
      },
      {
        Header: 'Created',
        accessor: 'created',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        column_width: '20%'
      },
      {
        Header: 'Revoked',
        id: 'revoked',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        accessor: e =>
          e.revoked === '' ?
            ''
          :
            e.revoked ?
              <FontAwesomeIcon icon={faCheckCircle} style={{color: "#339900"}}/>
            :
              <FontAwesomeIcon icon={faTimesCircle} style={{color: "#CC0000"}}/>,
        column_width: '5%'
      },
      {
        Header: "Used by",
        id: "used_by",
        accessor: e =>
          <Badge color={ `${e.used_by === "poem" ? "success" : "secondary"}` }>
            { e.used_by }
          </Badge>,
        column_width: "3%"
      }
    ], [queryClient]
  );

  if (loading)
    return (<CustomProfilesList />)

  else if (error)
    return (<ErrorComponent error={ error } />)

  else if (keys) {
    return (
      <BaseArgoView
        resourcename='API key'
        location={location}
        listview={true}
      >
        <BaseArgoTable
          data={keys}
          columns={columns}
          page_size={10}
          resourcename='API keys'
        />
      </BaseArgoView>
    )
  }
  else
    return null;
}


const APIKeyForm = ({
  data,
  doChange,
  doDelete,
  ...props
}) => {
  const { name } = useParams();
  const isTenantSchema = props.isTenantSchema
  const location = useLocation();
  const addview = props.addview;

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalTitle, setModalTitle] = useState(undefined)
  const [modalMsg, setModalMsg] = useState(undefined)
  const [onYes, setOnYes] = useState('')
  const refToken = useRef(null);

  const { control, handleSubmit, setValue, getValues, trigger, formState: { errors } } = useForm({
    defaultValues: !addview ? data : { name: "", revoked: false, token: "", used_by: "poem" },
    mode: "all",
    resolver: yupResolver(validationSchema)
  })

  const onSubmitHandle = () => {
    let msg = `Are you sure you want to ${addview ? 'add' : 'change'} API key?`;
    let title = `${addview ? 'Add' : 'Change'}`;

    setAreYouSureModal(!areYouSureModal);
    setModalMsg(msg)
    setModalTitle(title)
    setOnYes('change')
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(`${getValues("used_by")}_${name}`)
    else if (onYes === 'change')
      doChange(getValues())
  }

  const copyToClipboard = (e) => {
    navigator.clipboard.writeText(refToken.current.value);
    e.target.focus();
    NotifyOk({
      msg: 'API token copied to clipboard',
      title: 'Copied',
    });
  }

  return (
    <BaseArgoView
      resourcename='API key'
      location={location}
      addview={addview}
      history={false}
      modal={true}
      state={{areYouSureModal, 'modalFunc': onYesCallback, modalTitle, modalMsg}}
      toggle={() => setAreYouSureModal(!areYouSureModal)}>
      <Form onSubmit={ handleSubmit(onSubmitHandle) }>
        <FormGroup>
          <Row>
            <Col md={6}>
              <Label for='name'>Name</Label>
              <Controller
                name="name"
                control={ control }
                render={ ({ field }) =>
                  <Input
                    {...field}
                    data-testid="name"
                    className={ `form-control ${errors?.name && "is-invalid"}` }
                    disabled={ !addview }
                  />
                }
              />
              <ErrorMessage
                errors={ errors }
                name="name"
                render={ ({ message }) =>
                  <FormFeedback invalid="true" className="end-0">
                    { message }
                  </FormFeedback>
                }
              />
              <FormText color='muted'>
                A free-form unique identifier of the client. 50 characters max.
              </FormText>
            </Col>
          </Row>
          {
            (addview && !isTenantSchema) &&
              <Row className='mt-2'>
                <Col md={6}>
                  <Row>
                    <FormGroup check inline className='ms-3'>
                      <Controller
                        name="used_by"
                        control={control}
                        render={ ({ field }) => {
                          return (
                            <Input
                              {...field}
                              type='checkbox'
                              data-testid="used_by"
                              id="used_by"
                              onChange={ e => {
                                setValue("used_by", e.target.checked ? "webapi" : "poem")
                                trigger("name")
                              }}
                              checked={ field.value === "webapi" }
                            />
                          )
                        }}
                      />
                      <Label check for="used_by">Web API key</Label>
                    </FormGroup>
                  </Row>
                  <Row>
                    <FormText color="muted">
                      Mark this checkbox if the key being saved is going to be used for web API authentication.
                    </FormText>
                  </Row>
                </Col>
              </Row>
          }
          <Row className='mt-2'>
            <Col md={6}>
              <Row>
                <FormGroup check inline className='ms-3'>
                  <Controller
                    name="revoked"
                    control={control}
                    render={ ({ field }) => {
                      return (
                        <Input
                          {...field}
                          type='checkbox'
                          data-testid="revoked"
                          onChange={e => setValue("revoked", e.target.checked)}
                          checked={field.value}
                          disabled={ isTenantSchema && getValues("used_by") === "webapi" }
                        />
                      )
                    }}
                  />
                  <Label check for='revoked'>Revoked</Label>
                </FormGroup>
              </Row>
              <Row>
                <FormText color='muted'>
                  If the API key is revoked, clients cannot use it any more. (This cannot be undone.)
                </FormText>
              </Row>
            </Col>
          </Row>
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title='Credentials'/>
          {
            addview &&
              <Alert color="info" className="text-center">
                If token field is <b>left empty</b>, value will be automatically generated on save.
              </Alert>
          }
          <Row className="g-0">
            <Col sm={6}>
              <InputGroup>
                <InputGroupText>Token</InputGroupText>
                <Controller
                  name="token"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      {...field}
                      data-testid="token"
                      className="form-control"
                      disabled={ addview ? false : true }
                      innerRef={ refToken }
                    />
                  }
                />
              </InputGroup>
              <FormText color='muted'>
                A public, unique identifier for this API key.
              </FormText>
            </Col>
            {
              !addview &&
              <Col sm={2}>
                <Button className="btn" color="success" onClick={(e) => copyToClipboard(e)}>
                  <FontAwesomeIcon icon={faClipboard} size="lg" color='white'/>
                </Button>
              </Col>
            }
          </Row>
        </FormGroup>
        {
          !(isTenantSchema && getValues("used_by") === "webapi") &&
            <div className={!addview ? "submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5" : "submit-row d-flex align-items-center justify-content-end bg-light p-3 mt-5"}>
              {
                (!addview) &&
                <Button
                  color='danger'
                  onClick={() => {
                    setModalMsg('Are you sure you want to delete API key?')
                    setModalTitle('Delete API key')
                    setAreYouSureModal(!areYouSureModal);
                    setOnYes('delete')
                  }}
                >
                  Delete
                </Button>
              }
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


export const APIKeyChange = (props) => {
  const { name } = useParams();
  const addview = props.addview;
  const navigate = useNavigate()

  const queryClient = useQueryClient()

  const backend = new Backend()

  const changeMutation = useMutation(async (values) => backend.changeObject('/api/v2/internal/apikeys/', values));
  const addMutation = useMutation(async (values) => backend.addObject('/api/v2/internal/apikeys/', values));
  const deleteMutation = useMutation(async (prefix_name) => await backend.deleteObject(`/api/v2/internal/apikeys/${prefix_name}`));

  const { data: key, error: error, status: status } = useQuery(
    ['apikey', name], () => fetchAPIKey(name),
    { enabled: !addview }
  ) 

  const doChange = (values) => {
    if (!addview) {
      changeMutation.mutate(
        { id: values.id, revoked: values.revoked, name: values.name, used_by: values.used_by }, {
          onSuccess: () => {
            queryClient.invalidateQueries('apikey');
            NotifyOk({
              msg: 'API key successfully changed',
              title: 'Changed',
              callback: () => navigate('/ui/administration/apikey')
            });
          },
          onError: (error) => {
            NotifyError({
              title: 'Error',
              msg: error.message ? error.message : 'Error changing API key'
            })
          }
        }
      )
    } else {
      addMutation.mutate({ name: values.name, token: values.token, used_by: values.used_by }, {
        onSuccess: () => {
          queryClient.invalidateQueries('apikey');
          NotifyOk({
            msg: 'API key successfully added',
            title: 'Added',
            callback: () => navigate('/ui/administration/apikey')
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Error',
            msg: error.message ? error.message : 'Error adding API key'
          })
        }
      })
    }
  }

  const doDelete = (prefix_name) => {
    deleteMutation.mutate(prefix_name, {
      onSuccess: () => {
        queryClient.invalidateQueries('apikey');
        NotifyOk({
          msg: 'API key successfully deleted',
          title: 'Deleted',
          callback: () => navigate('/ui/administration/apikey')
        })
      },
      onError: (error) => {
        NotifyError({
          title: 'Error',
          msg: error.message ? error.message : 'Error deleting API key'
        })
      }
    })
  }

  if (status === 'loading')
    return (
      <>
        <CustomHeadline width="229px" height="38.4px"  />
        <Form className='ms-2 mb-2 mt-2 p-3 border placeholder-glow rounded d-flex flex-column'>
          <CustomSpan custStyle="mt-1 mb-1" height="24px" width="42px" />
          <CustomInput height="37.6px" width="50%" />
          <CustomSpan custStyle="mt-1 mb-1" height="15x" width="355px" />
          <div className='d-flex flex-row mt-3'>
            <CustomSpan custStyle="mt-1 mb-1 me-2" height="24px" width="24px" /> 
            <CustomSpan custStyle='mt-1 mb-1' height="24px" width="62px" />
          </div>
          <CustomSpan custStyle='mt-1 mb-1' height="15px" width="490px" />
          <CustomSubtitle height="36.8px" custStyle="mt-2" />
          <div className='d-flex flex-row'>
            <CustomInput height="37.6px" width="501px" />
            <CustomButton height="37.6px" width="41px" />
          </div>
          <CustomSpan custStyle='mt-1 mb-1' height="14.5px" width="243px" />
          <div className='ms-1 mt-5 p-3 border placeholder-glow rounded d-flex justify-content-between'>
            <CustomButton height="37.6px" width="74px" />
            <CustomButton height="37.6px" width="59px" />
          </div>
        </Form>
      </>
    );

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (key || addview)
    return (
      <APIKeyForm
        { ...props }
        data={ key }
        doChange={ doChange }
        doDelete={ doDelete }
      />
    )
  else
    return null
}
