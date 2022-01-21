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
  FormGroup
} from 'reactstrap';
import { Formik, Field, Form } from 'formik';
import ArgoLogo from './argologo_color.svg';
import { Footer } from './UIElements.js';
import { Backend } from './DataManager.js';

import './Login.css';


const Login = (props) => {
  var _isMounted = false
  const [samlIdpString, setSamlIdpString] = useState(null);
  const [loginFailedVisible, setLoginFailedVisible] = useState(false);
  const [isTenantSchema, setIsTenantSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [privacyLink, setPrivacyLink] = useState(undefined);
  const [termsLink, setTermsLink] = useState(undefined);

  const backend = new Backend();
  const AppOnLogin = props.onLogin;

  useEffect(() => {
    _isMounted = true;
    setLoading(true);

    async function fetchData() {
      let response = await backend.isTenantSchema();
      let options = await backend.fetchConfigOptions();

      setPrivacyLink(options && options.result.terms_privacy_links.privacy);
      setTermsLink(options && options.result.terms_privacy_links.terms);

      if (response) {
        if (_isMounted) {
          setIsTenantSchema(response);
          setSamlIdpString(options.result.saml_login_string);
        }
      } else
        if (_isMounted)
          setIsTenantSchema(response);

      setLoading(false);
    }

    fetchData();

    return function cleanup() {
      _isMounted = false;
    };
  }, []);

  async function doUserPassLogin(username, password) {
    await fetch('/dj-rest-auth/login/', {
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
  }

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
                      }
                  }}>
                  <Form>
                    <FormGroup>
                      <Label for="username">Username: </Label>
                      <Field name="username" id="username" className="form-control"/>
                    </FormGroup>
                    <FormGroup>
                      <Label for="password">Password: </Label>
                      <Field name="password" id="password" className="form-control" type="password"/>
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
                    <FormGroup className='justify-content-center'>
                      <Button color="success" type="submit" block className='mb-2'>Login using username and password</Button>
                      {isTenantSchema && <a className="btn btn-success btn-block" role="button" href="/saml2/login" style={{width: '100%'}}>{samlIdpString}</a>}
                    </FormGroup>
                  </Form>
                </Formik>
              </CardBody>
              <CardFooter id="argo-loginfooter">
                <Footer privacyLink={privacyLink} termsLink={termsLink} loginPage={true}/>
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
