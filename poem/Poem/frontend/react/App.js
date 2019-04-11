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
                    onSubmit = {(values) => alert(JSON.stringify(values, null, 2))}
                    render = {props => (
                      <Form>
                        <FormGroup>
                          <Label for="username">Username: </Label>
                          <Field name="username" className="form-control"/>
                        </FormGroup>
                        <FormGroup>
                          <Label for="password">Password: </Label>
                          <Field name="password" className="form-control"/>
                        </FormGroup>
                        <Button outline color="primary" block>Login using username and password</Button>
                        <a className="btn btn-outline-primary btn-block" role="button" href="/saml2/login">{this.state.samlIdpString}</a>
                      </Form>
                    )}
                  >
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
