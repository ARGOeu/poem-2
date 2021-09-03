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
import { Formik, Form, Field } from 'formik';
import {
  Alert,
  FormGroup,
  Row,
  Col,
  Label,
  FormText,
  Button,
  InputGroup,
  InputGroupAddon,
} from 'reactstrap';
import { faClipboard } from '@fortawesome/free-solid-svg-icons';
import { useQuery, useQueryClient } from 'react-query';


export const APIKeyList = (props) => {
  const location = props.location;

  const backend = new Backend();

  const { data: keys, error: error, status: status } = useQuery(
    'apikey', async () => {
      return await backend.fetchData('/api/v2/internal/apikeys');
    }
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
          <Link to={'/ui/administration/apikey/' + e.name}>
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
    ], []
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


export const APIKeyChange = (props) => {
  const name = props.match.params.name;
  const location = props.location;
  const addview = props.addview;
  const history = props.history;

  const backend = new Backend();

  const queryClient = useQueryClient();

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalTitle, setModalTitle] = useState(undefined)
  const [modalMsg, setModalMsg] = useState(undefined)
  const [onYes, setOnYes] = useState('')
  const [formikValues, setFormikValues] = useState({})
  const refToken = useRef(null);

  const { data: key, error: error, status: status } = useQuery(
    ['apikey', name], async () => {
      return await backend.fetchData(`/api/v2/internal/apikeys/${name}`);
    },
    {
      enabled: !addview,
      initialData: () => {
        return queryClient.getQueryData('apikey')?.find(key => key.name === name)
      }
    }
  )

  const doChange = async (values) => {
    if (!addview) {
      let response = await backend.changeObject(
        '/api/v2/internal/apikeys/',
        {
          id: key.id,
          revoked: values.revoked,
          name: values.name,
        }
      );
      if (response.ok) {
        NotifyOk({
          msg: 'API key successfully changed',
          title: 'Changed',
          callback: () => history.push('/ui/administration/apikey')
        });
      } else {
        let change_msg = '';
        try {
          let json = await response.json();
          change_msg = `${json.detail ? json.detail : 'Error changing API key'}`;
        } catch(err) {
          change_msg = 'Error changing API key';
        }

        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: change_msg
        });
      }
    } else {
      let response = await backend.addObject(
        '/api/v2/internal/apikeys/',
        {
          name: values.name,
          token: values.token
        }
      );
      if (response.ok) {
        NotifyOk({
          msg: 'API key successfully added',
          title: 'Added',
          callback: () => history.push('/ui/administration/apikey')
        })
      } else {
        let add_msg = '';
        try {
          let json = await response.json();
          add_msg = `${json.detail ? json.detail : 'Error adding API key'}`;
        } catch(err) {
          add_msg = 'Error adding API key';
        }
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: add_msg
        });
      }
    }
  };

  const onSubmitHandle = (values) => {
    let msg = `Are you sure you want to ${addview ? 'add' : 'change'} API key?`;
    let title = `${addview ? 'Add' : 'Change'}`;

    setAreYouSureModal(!areYouSureModal);
    setModalMsg(msg)
    setModalTitle(title)
    setOnYes('change')
    setFormikValues(values)
  }

  const doDelete = async () => {
    let response = await backend.deleteObject(`/api/v2/internal/apikeys/${name}`);
    if (response.ok) {
      NotifyOk({
        msg: 'API key successfully deleted',
        title: 'Deleted',
        callback: () => history.push('/ui/administration/apikey')
      })
    } else {
      let msg = '';
      try {
        let json = await response.json();
        msg = `${json.detail ? json.detail : 'Error deleting API key'}`;
      } catch(error) {
        msg = 'Error deleting API key';
      }
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    }
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(name);
    else if (onYes === 'change')
      doChange(formikValues);
  }

  const copyToClipboard = (e) => {
    navigator.clipboard.writeText(refToken.current.value);
    e.target.focus();
    NotifyOk({
      msg: 'API token copied to clipboard',
      title: 'Copied',
    });
  }

  if (status === 'loading')
    return (<LoadingAnim/>);

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else
    return (
      <BaseArgoView
        resourcename='API key'
        location={location}
        addview={addview}
        history={false}
        modal={true}
        state={{areYouSureModal, 'modalFunc': onYesCallback, modalTitle, modalMsg}}
        toggle={() => setAreYouSureModal(!areYouSureModal)}>
        <Formik
          initialValues = {{
            name: key ? key.name : '',
            revoked: key ? key.revoked : false,
            token: key ? key.token : ''
          }}
          onSubmit = {(values) => onSubmitHandle(values)}
        >
          {() => (
            <Form>
              <FormGroup>
                <Row>
                  <Col md={6}>
                    <Label for='name'>Name</Label>
                    <Field
                      type='text'
                      name='name'
                      id='name'
                      required={true}
                      className='form-control'
                    />
                    <FormText color='muted'>
                      A free-form unique identifier of the client. 50 characters max.
                    </FormText>
                  </Col>
                </Row>
                <Row className='mt-2'>
                  <Col md={6}>
                    <label>
                      <Field
                        type='checkbox'
                        name='revoked'
                        id='checkbox'
                      />
                      Revoked
                    </label>
                    <FormText color='muted'>
                      If the API key is revoked, clients cannot use it any more. (This cannot be undone.)
                    </FormText>
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
                <Row className="no-gutters">
                  <Col sm={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Token</InputGroupAddon>
                      <Field
                        type='text'
                        name='token'
                        data-testid='token'
                        id='token'
                        disabled={addview ? false : true}
                        className='form-control'
                        innerRef={refToken}
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
          )}
        </Formik>
      </BaseArgoView>
    )
}
