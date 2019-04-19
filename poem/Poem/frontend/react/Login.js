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

class Login extends Component {
  constructor(props) {
    super(props);

    this.state = {
      samlIdpString: null,
      loginFailedVisible: false,
    };

    this.dismissLoginAlert = this.dismissLoginAlert.bind(this);
  }

  componentDidMount() {
    fetch('/api/v2/internal/saml_idp_string')
      .then(response => response.json())
      .then(json => this.setState({samlIdpString: json.result}))
      .catch(err => console.log('Something went wrong: ' + err));
  }

  dismissLoginAlert() {
    this.setState({loginFailedVisible: false});
  }

  doLogin(username, password) {
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
    });
  }

  render() {
    if (this.state.samlIdpString) {
      return (
        <Container>
          <Row className="login-first-row">
            <Col sm={{size: 4, offset: 4}}>
              <Card>
                <CardHeader className="d-sm-inline-flex align-items-center justify-content-around">
                    <img src={ArgoLogo} id="argologo" alt="ARGO logo"/>
                    <h4>ARGO Admin UI</h4>
                </CardHeader>
                <CardBody>
                  <Formik
                    initialValues = {{ username: '', password: ''}}
                    onSubmit = {
                      (values) => this.doLogin(values.username, values.password)
                        .then(response => 
                          {
                            if (response.ok) {
                              this.props.history.push('/ui/home');
                              localStorage.setItem('auth_username', values.username);
                              localStorage.setItem('auth_logged', true);
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
                      <FormGroup>
                        <Button outline color="secondary" type="submit" block>Login using username and password</Button>
                        <a className="btn btn-outline-secondary btn-block" role="button" href="/saml2/login">{this.state.samlIdpString}</a>
                      </FormGroup>
                    </Form>
                  </Formik>
                </CardBody> 
                <CardFooter>
                  <p className="text-center">
                    <small>
                      ARGO Admin is a service jointly developed and maintained by CNRS,
                      GRNET and SRCE co-funded by EOSC-Hub and EGI Foundation
                    </small>
                  </p>
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

