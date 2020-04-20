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
    this.AppOnLogin = props.onLogin
  }

  async fetchSamlButtonString() {
    try {
      let response = await fetch('/api/v2/internal/config_options');
      let json = await response.json();
      return json;
    } catch(err) {
      alert(`Something went wrong: ${err}`);
    }
  }

  async componentDidMount() {
    this._isMounted = true;

    let response = await this.backend.isTenantSchema();
    if (response === true) {
      let json = await this.fetchSamlButtonString();
      if (this._isMounted)
        this.setState({
          isTenantSchema: response,
          samlIdpString: json.result.saml_login_string
        })
    } else if (response === false)
      if (this._isMounted)
        this.setState({
          isTenantSchema: response,
        });
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async doUserPassLogin(username, password) {
    let response = await fetch('/rest-auth/login/', {
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
    return this.backend.isActiveSession(this.state.isTenantSchema);
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
                      async (values) => {
                        let response = await this.doUserPassLogin(values.username, values.password);
                        if (response.active) {
                          this.AppOnLogin(response.userdetails)
                        }
                        else {
                          this.setState({loginFailedVisible: true});
                        };
                      }
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
                        <Button color="success" type="submit" block>Login using username and password</Button>
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
