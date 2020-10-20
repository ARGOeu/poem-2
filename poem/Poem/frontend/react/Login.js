import React, { useEffect, useState } from 'react';
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
import { Formik, Field, Form } from 'formik';
import ArgoLogo from './argologo_color.svg';
import './Login.css';
import { Footer } from './UIElements.js';
import { Backend } from './DataManager.js';


const Login = (props) => {
  var _isMounted = false
  const [samlIdpString, setSamlIdpString] = useState(null);
  const [loginFailedVisible, setLoginFailedVisible] = useState(false);
  const [isTenantSchema, setIsTenantSchema] = useState(null);
  const [tenantName, setTenantName] = useState(null);
  const [loading, setLoading] = useState(false);

  const backend = new Backend();
  const AppOnLogin = props.onLogin;

  async function fetchSamlButtonString() {
    try {
      let response = await fetch('/api/v2/internal/config_options');
      let json = await response.json();
      return json;
    } catch(err) {
      alert(`Something went wrong: ${err}`);
    };
  };

  useEffect(() => {
    _isMounted = true;
    setLoading(true);

    async function fetchData() {
      let response = await backend.isTenantSchema();
      if (response) {
        let json = await fetchSamlButtonString();
        if (_isMounted) {
          setIsTenantSchema(response);
          setSamlIdpString(json.result.saml_login_string);
          setTenantName(json.result.tenant_name);
        };
      } else
        if (_isMounted)
          setIsTenantSchema(response);

      setLoading(false);
    };

    fetchData();

    return function cleanup() {
      _isMounted = false;
    };
  }, []);

  async function doUserPassLogin(username, password) {
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
    return backend.isActiveSession(isTenantSchema);
  }

  function dismissLoginAlert() {
    _isMounted && setLoginFailedVisible(false);
  };

  if (isTenantSchema !== null && !loading) {
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
                      let response = await doUserPassLogin(values.username, values.password);
                      if (response.active) {
                        AppOnLogin(response.userdetails)
                      }
                      else {
                        setLoginFailedVisible(true);
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
                      <Alert color="danger" isOpen={loginFailedVisible} toggle={dismissLoginAlert} fade={false}>
                        <p className="text-center">
                          Login failed, invalid username and password provided
                        </p>
                      </Alert>
                    </FormGroup>
                    <div className="pt-3">
                    </div>
                    <FormGroup>
                      <Button color="success" type="submit" block>Login using username and password</Button>
                      {isTenantSchema && <a className="btn btn-success btn-block" role="button" href="/saml2/login">{samlIdpString}</a>}
                    </FormGroup>
                  </Form>
                </Formik>
              </CardBody>
              <CardFooter id="argo-loginfooter">
                <Footer loginPage={true} tenantName={tenantName}/>
              </CardFooter>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }
  else if (isTenantSchema === null && !loading) {
    return (
      <React.Fragment>
        <h1>Something went wrong</h1>
        <p>Cannot obtain schema</p>
      </React.Fragment>
    )
  }
  else
    return null;
};

export default Login;
