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
  FormGroup} from 'reactstrap';
import {Formik, Field, Form, ErrorMessage} from 'formik';
import ArgoLogo from './argologo_color.svg';

import './App.css';


class App extends Component {
  render() {
    return (
      <Container>
        <Row className="login-first-row">
          <Col sm={{size: 4, offset: 4}}>
            <Card>
              <CardHeader className="mt-2">
                <img alt="logo" src={ArgoLogo}/>
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
                      <Button className="btn-block" color="primary">Login using username and password</Button>
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
