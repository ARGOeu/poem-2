import React, { useState, useRef } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
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
  Form
} from 'reactstrap';
import { faClipboard } from '@fortawesome/free-solid-svg-icons';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import { fetchAPIKeys } from './QueryFunctions';
import { Controller, useForm } from 'react-hook-form';


const fetchAPIKey = async(name) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/apikeys/${name}`);
}


export const APIKeyList = (props) => {
  const location = props.location;

  const queryClient = useQueryClient();

  const { data: keys, error: error, status: status } = useQuery(
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
        column_width: '73%'
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
      }
    ], [queryClient]
  );

  if (status === 'loading')
    return (<LoadingAnim/>);

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

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
          page_size={5}
          resourcename='API keys'
        />
      </BaseArgoView>
    )
  }
  else
    return null;
}


const APIKeyForm = ({ name, data, addview, history, location }) => {
  const backend = new Backend();

  const queryClient = useQueryClient();

  const changeMutation = useMutation(async (values) => backend.changeObject('/api/v2/internal/apikeys/', values));
  const addMutation = useMutation(async (values) => backend.addObject('/api/v2/internal/apikeys/', values));
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/apikeys/${name}`));

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalTitle, setModalTitle] = useState(undefined)
  const [modalMsg, setModalMsg] = useState(undefined)
  const [onYes, setOnYes] = useState('')
  const refToken = useRef(null);

  const { control, handleSubmit, setValue, getValues } = useForm({
    defaultValues: !addview ? data : { name: "", revoked: false, token: "" }
  })

  const doChange = (values) => {
    if (!addview) {
      changeMutation.mutate(
        { id: values.id, revoked: values.revoked, name: values.name }, {
          onSuccess: () => {
            queryClient.invalidateQueries('apikey');
            NotifyOk({
              msg: 'API key successfully changed',
              title: 'Changed',
              callback: () => history.push('/ui/administration/apikey')
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
      addMutation.mutate({ name: values.name, token: values.token }, {
        onSuccess: () => {
          queryClient.invalidateQueries('apikey');
          NotifyOk({
            msg: 'API key successfully added',
            title: 'Added',
            callback: () => history.push('/ui/administration/apikey')
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
  };

  const onSubmitHandle = () => {
    let msg = `Are you sure you want to ${addview ? 'add' : 'change'} API key?`;
    let title = `${addview ? 'Add' : 'Change'}`;

    setAreYouSureModal(!areYouSureModal);
    setModalMsg(msg)
    setModalTitle(title)
    setOnYes('change')
  }

  const doDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries('apikey');
        NotifyOk({
          msg: 'API key successfully deleted',
          title: 'Deleted',
          callback: () => history.push('/ui/administration/apikey')
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

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(name);
    else if (onYes === 'change')
      doChange(getValues());
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
                    className="form-control"
                  />
                }
              />
              <FormText color='muted'>
                A free-form unique identifier of the client. 50 characters max.
              </FormText>
            </Col>
          </Row>
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
                          onChange={e => setValue("revoked", e.target.checked)}
                          checked={field.value}
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
  const name = props.match.params.name;
  const location = props.location;
  const addview = props.addview;
  const history = props.history;


  const { data: key, error: error, status: status } = useQuery(
    ['apikey', name], () => fetchAPIKey(name),
    { enabled: !addview }
  )

  if (status === 'loading')
    return (<LoadingAnim/>);

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (key || addview)
    return (
      <APIKeyForm data={key} name={name} history={history} location={location} addview={addview} />
    )
  else
    return null
}
