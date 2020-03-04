import React, { Component } from 'react';
import {
  Alert,
  Container,
  Button,
  Row,
  Col,
  Card,
  CardHeader,
  CardBody,
  Label,
  CardFooter,
  FormGroup } from 'reactstrap';
import {Formik, Field, Form} from 'formik';
import ArgoLogo from './argologo_color.svg';
import './Login.css';
import {Footer} from './UIElements.js';
import Cookies from 'universal-cookie';
import {Backend} from './DataManager.js';


class Login extends Component {
  constructor(props) {
    super(props);

    this._isMounted = false;

    this.state = {
      samlIdpString: null,
      loginFailedVisible: false,
      isTenantSchema: null
    };

    this.backend = new Backend()
    this.dismissLoginAlert = this.dismissLoginAlert.bind(this);
  }

  isSaml2Logged() {
    return fetch('/api/v2/internal/saml2login', {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  flushSaml2Cache() {
    let cookies = new Cookies();

    return fetch('/api/v2/internal/saml2login', {
      method: 'DELETE',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': cookies.get('csrftoken'),
        'Referer': 'same-origin'
      }});
  }

  fetchSamlButtonString() {
    return fetch('/api/v2/internal/config_options')
      .then(response => response.json())
      .then(json => this._isMounted &&
        this.setState({samlIdpString: json.result.saml_login_string}))
      .catch(err => console.log('Something went wrong: ' + err));
  }

  fetchIsTenantSchema() {
    return fetch('/api/v2/internal/istenantschema')
      .then(response => response.ok ? response.json() : null)
      .then(json => json['isTenantSchema'])
      .catch(err => console.log('Something went wrong: ' + err))
  }

  componentDidMount() {
    this._isMounted = true;

    this.fetchIsTenantSchema().then(response => {
      if (response !== null)
        this._isMounted && this.setState({isTenantSchema: response})

      if (response) {
        this.fetchSamlButtonString().then(
          this.isSaml2Logged().then(response => {
            response.ok && response.json().then(
              json => {
                if (Object.keys(json).length > 0) {
                  this.flushSaml2Cache().then(
                    response => response.ok &&
                      this.props.onLogin(json, this.props.history)
                  )
                }
              }
            )
          })
        )
      }
    })
      .catch(err => console.log('Something went wrong: ' + err))
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  fetchUserDetails(username) {
    return fetch('/api/v2/internal/users/' + username, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  doUserPassLogin(username, password)
  {
    return fetch('/rest-auth/login/', {
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
        'username': username,
        'password': password
      })
    }).then(response => this.backend.isActiveSession());
  }

  dismissLoginAlert() {
    this._isMounted && this.setState({loginFailedVisible: false});
  }

  render() {

    if (this.state.isTenantSchema !== null) {
      return (
        <Container>
          <Row className="login-first-row">
            <Col sm={{size: 4, offset: 4}}>
              <Card>
                <CardHeader
                  id='argo-loginheader'
                  className="d-sm-inline-flex align-items-center justify-content-around">
                  <img src={ArgoLogo} id="argologo" alt="ARGO logo"/>
                  <h4 className="text-light"><strong>ARGO</strong> POEM</h4>
                </CardHeader>
                <CardBody>
                  <Formik
                    initialValues = {{username: '', password: ''}}
                    onSubmit = {
                      (values) => this.doUserPassLogin(values.username, values.password)
                        .then(response =>
                          {
                            if (response.active) {
                              this.props.onLogin(response.userdetails, this.props.history)
                            }
                            else {
                              this.setState({loginFailedVisible: true});
                            }
                          })
                    }>
                    <Form>
                      <FormGroup>
                        <Label for="username">Username: </Label>
                        <Field name="username" className="form-control"/>
                      </FormGroup>
                      <FormGroup>
                        <Label for="password">Password: </Label>
                        <Field name="password" className="form-control" type="password"/>
                      </FormGroup>
                      <FormGroup>
                        <Alert color="danger" isOpen={this.state.loginFailedVisible} toggle={this.dismissLoginAlert} fade={false}>
                          <p className="text-center">
                            Login failed, invalid username and password provided
                          </p>
                        </Alert>
                      </FormGroup>
                      <div className="pt-3">
                      </div>
                      <FormGroup>
                        <Button color="success" type="submit" block>Log in using username and password</Button>
                        {this.state.isTenantSchema && <a className="btn btn-success btn-block" role="button" href="/saml2/login">{this.state.samlIdpString}</a>}
                      </FormGroup>
                    </Form>
                  </Formik>
                </CardBody>
                <CardFooter id="argo-loginfooter">
                  <Footer loginPage={true}/>
                </CardFooter>
              </Card>
            </Col>
          </Row>
        </Container>
      );
    }
    else {
      return null;
    }
  }
}

export default Login;

