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
  render() {
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
                      <a className="btn btn-outline-primary btn-block" role="button" href="/saml2/login">Login using EGI CHECK-IN</a>
                    </Form>
                  )}
                >
                </Formik>
              </CardBody> 
              <CardFooter>Footer</CardFooter>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }
}

export default App;
