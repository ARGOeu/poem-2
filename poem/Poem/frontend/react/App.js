import React, { Component } from 'react';
import {
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

import './App.css';


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      samlIdpString: null,
    };
  }

  componentDidMount() {
    fetch('/api/v2/internal/saml_idp_string')
      .then(response => response.json())
      .then(json => this.setState({samlIdpString: json.result}))
      .catch(err => console.log('Something went wrong: ' + err));
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
                        .then(response => response.ok ? 
                          alert('Login success') 
                          : alert('Login wrong')) 
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
                      <Button outline color="secondary" type="submit" block>Login using username and password</Button>
                      <a className="btn btn-outline-secondary btn-block" role="button" href="/saml2/login">{this.state.samlIdpString}</a>
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

export default App;
