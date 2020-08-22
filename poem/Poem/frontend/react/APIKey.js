import React, { Component, useState, useEffect, useRef } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { LoadingAnim, BaseArgoView, NotifyOk, Checkbox, NotifyError, ErrorComponent, ParagraphTitle } from './UIElements';
import ReactTable from 'react-table';
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


export class APIKeyList extends Component {
  constructor(props) {
    super(props);

    this.location = props.location;

    this.state = {
      list_keys: null,
      loading: false,
      error: null
    };

    this.backend = new Backend();
  }

  async componentDidMount() {
    this.setState({ loading: true });

    try {
      let json = await this.backend.fetchData('/api/v2/internal/apikeys');
      this.setState({
        list_keys: json,
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
        Header: 'Name',
        id: 'name',
        accessor: e =>
          <Link to={'/ui/administration/apikey/' + e.name}>
            {e.name}
          </Link>
      },
      {
        Header: 'Created',
        accessor: 'created'
      },
      {
        Header: 'Revoked',
        id: 'revoked',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        accessor: e =>
          e.revoked ?
          <FontAwesomeIcon icon={faCheckCircle} style={{color: "#339900"}}/>
          :
          <FontAwesomeIcon icon={faTimesCircle} style={{color: "#CC0000"}}/>
      }
    ];

    const { loading, list_keys, error } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (error)
      return (<ErrorComponent error={error}/>);

    else if (!loading && list_keys) {
      return (
        <BaseArgoView
          resourcename='API key'
          location={this.location}
          listview={true}
        >
          <ReactTable
            data={list_keys}
            columns={columns}
            className='-highlight'
            defaultPageSize={5}
            rowsText='keys'
            getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
          />
        </BaseArgoView>
      )
    }
    else
      return null
  }
}


export const APIKeyChange = (props) => {
  const name = props.match.params.name;
  const location = props.location;
  const addview = props.addview;
  const history = props.history;
  const backend = new Backend();

  const [key, setKey] = useState({
    name: '',
    revoked: false,
    token: ''
  })
  const [loading, setLoading] = useState(false)
  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalTitle, setModalTitle] = useState(undefined)
  const [modalFunc, setModalFunc] = useState(undefined)
  const [modalMsg, setModalMsg] = useState(undefined)
  const [error, setError] = useState(null)
  const [onYes, setOnYes] = useState('')
  // TODO: useFormik hook with formik 2.x
  const [formikValues, setFormikValues] = useState({})
  const refToken = useRef(null);

  const doChange = async (values, action) => {
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
      };
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
      };
    };
  };

  const onSubmitHandle = (values, actions) => {
    let msg = undefined;
    let title = undefined;

    if (addview) {
      msg = 'Are you sure you want to add API key?';
      title = 'Add API key';
    } else {
      msg = 'Are you sure you want to change API key?';
      title = 'Change API key';
    }
    setAreYouSureModal(!areYouSureModal);
    setModalMsg(msg)
    setModalTitle(title)
    setOnYes('change')
    setFormikValues(values)
  }

  useEffect(() => {
    setLoading(true);

    try {
      if (!addview) {
        const fetchDataAndSet = async () => {
          let json = await backend.fetchData(`/api/v2/internal/apikeys/${name}`)
          setKey(json);
          setLoading(false);
        }
        fetchDataAndSet();
      }
      else {
        setKey({
          name: '',
          revoked: false,
          token: ''
        });
        setLoading(false);
      };
    }
    catch(err) {
      setError(err)
      setLoading(false)
    };
  }, []);

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
    };
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(name)
    else if (onYes === 'change')
      doChange(formikValues)
  }

  const copyToClipboard = (e) => {
    navigator.clipboard.writeText(refToken.current.value)
    e.target.focus();
  }

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && key) {
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
              name: key.name,
              revoked: key.revoked,
              token: key.token
            }}
            onSubmit = {(values, actions) => onSubmitHandle(values, actions)}
            render = {props => (
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
                      <Field
                        component={Checkbox}
                        name='revoked'
                        className='form-control'
                        id='checkbox'
                        label='Revoked'
                      />
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
                  <Row>
                    <Col sm={6}>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>Token</InputGroupAddon>
                        <Field
                          type='text'
                          name='token'
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
                    <Col sm={3}>
                      <Button className="btn" color="success" onClick={(e) => copyToClipboard(e)}>Clipboard</Button>
                    </Col>
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
          />
        </BaseArgoView>
    )
  }
}
