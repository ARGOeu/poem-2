import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { LoadingAnim, BaseArgoView, Checkbox } from './UIElements';
import ReactTable from 'react-table';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  Label,
  FormText
} from 'reactstrap';
import './APIKey.css';


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

  componentDidMount() {
    this.setState({ loading: true });

    this.backend.fetchTokenByName(this.name)
      .then((json) =>
        this.setState({
          key: json,
          loading: false,
          write_perm: localStorage.getItem('authIsSuperuser') === 'true'
        })
      );
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
          infoview={true}
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
                    <Row>
                      <Col md={6}>
                        <Field
                          component={Checkbox}
                          name='revoked'
                          className='form-control'
                          id='checkbox'
                          label='Revoked'
                        />
                      </Col>
                    </Row>
                  </FormGroup>
                  <FormGroup>
                  <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Credentials</h4>
                  <Row>
                    <Label for='token' sm={1}>Token</Label>
                    <Col sm={10}>
                      <Field
                        type='text'
                        name='token'
                        id='token'
                        className='form-control'
                      />
                      <FormText className='pl-3' color='muted'>
                        A public, unique identifier for this API key.
                      </FormText>
                    </Col>
                  </Row>
                  </FormGroup>
                </Form>
              )}
            />
          </BaseArgoView>
      )
    }
  }
}
