import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { LoadingAnim, BaseArgoView, NotifyOk, Checkbox } from './UIElements';
import ReactTable from 'react-table';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  Label,
  FormText,
  Button,
  InputGroup,
  InputGroupAddon,
  Toast,
  ToastBody,
  ToastHeader
} from 'reactstrap';


export class APIKeyList extends Component {
  constructor(props) {
    super(props);

    this.location = props.location;

    this.state = {
      list_keys: null,
      loading: false,
    };

    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({ loading: true });

    this.backend.fetchTokens()
      .then(json => 
        this.setState({
          list_keys: json,
          loading: false
        })  
      );
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

    const { loading, list_keys } = this.state;

    if (loading)
      return (<LoadingAnim/>);

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
            className='-striped -highlight'
            defaultPageSize={5}
          />          
        </BaseArgoView>
      )
    }
    else
      return null
  }
}


export class APIKeyChange extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.location = props.location;
    this.addview = props.addview;
    this.history = props.history;

    this.state = {
      key: {},
      loading: false,
      write_perm: false,
      areYouSureModal: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined
    };

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

  onSubmitHandle(values, actions) {
    let msg = undefined;
    let title = undefined;

    if (this.addview) {
      msg = 'Are you sure you want to add API key?';
      title = 'Add API key';
    } else {
      msg = 'Are you sure you want to change API key?';
      title = 'Change API key';
    }
    this.toggleAreYouSureSetModal(msg, title,
      () => this.doChange(values, actions))
  }

  doChange(values, actions) {
    if (!this.addview) {
      this.backend.changeToken({
        id: this.state.key.id,
        revoked: values.revoked,
        name: values.name,
      }).then(response => response.ok ? 
        NotifyOk({
          msg: 'API key successfully changed',
          title: 'Changed',
          callback: () => this.history.push('/ui/administration/apikey')
        }) 
        : alert('Something went wrong: ' + response.statusText))
    } else {
      this.backend.addToken({
        name: values.name
      }).then(response => response.ok ?
        NotifyOk({
          msg: 'API key successfully added',
          title: 'Added',
          callback: () => this.history.push('/ui/administration/apikey')
        })
        : 
        alert('Something went wrong: ' + response.statusText))
    }
  }

  doDelete(name) {
    this.backend.deleteToken(name)
      .then(response => response.ok
        ?
          NotifyOk({
            msg: 'API key successfully deleted',
            title: 'Deleted',
            callback: () => this.history.push('/ui/administration/apikey')
          })  
        :
          alert('Something went wrong: ' + response.statusText)
      )
  }

  componentDidMount() {
    this.setState({ loading: true });

    if (!this.addview) {
      this.backend.fetchTokenByName(this.name)
        .then((json) =>
          this.setState({
            key: json,
            loading: false,
            write_perm: localStorage.getItem('authIsSuperuser') === 'true'
          })
        );
    } else {
      this.setState({
        key: {
          name: '',
          revoked: false,
          token: ''
        },
        loading: false,
        write_perm: localStorage.getItem('authIsSuperuser') === 'true'
      })
    }
  }

  render() {
    const { key, loading, write_perm } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (!loading && key) {
      return (
        <BaseArgoView
          resourcename='API key'
          location={this.location}
          addview={this.addview}
          history={false}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}>
            <Formik
              initialValues = {{
                name: key.name,
                revoked: key.revoked,
                token: key.token
              }}
              onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
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
                  <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Credentials</h4>
                  <Row>
                    <Col sm={6}>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>Token</InputGroupAddon>
                        <Field
                          type='text'
                          name='token'
                          id='token'
                          disabled={true}
                          className='form-control'
                        />
                      </InputGroup>
                      <FormText color='muted'>
                        A public, unique identifier for this API key.
                      </FormText>
                    </Col>
                  </Row>
                  {
                    this.addview &&
                    <Toast className='mt-3'>
                      <ToastHeader icon='info'>
                        Info
                      </ToastHeader>
                      <ToastBody>
                        Token will be generated when clicking save.
                      </ToastBody>
                    </Toast>
                  }
                  </FormGroup>
                  {
                    (write_perm) &&
                      <div className={!this.addview ? "submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5" : "submit-row d-flex align-items-center justify-content-end bg-light p-3 mt-5"}>
                        {
                          (!this.addview) &&
                          <Button 
                            color='danger'
                            onClick={() => {
                              this.toggleAreYouSureSetModal(
                                'Are you sure you want to delete API key?',
                                'Delete API key',
                                () => this.doDelete(props.values.name)
                              )
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
}
