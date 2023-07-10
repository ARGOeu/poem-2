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
  FormGroup,
  Form,
  Input
} from 'reactstrap';
import ArgoLogo from './argologo_color.svg';
import { Footer } from './UIElements.js';
import { Backend } from './DataManager.js';

import './Login.css';
import { Controller, useForm } from 'react-hook-form';


const Login = (props) => {
  const [samlIdpString, setSamlIdpString] = useState(null);
  const [loginFailedVisible, setLoginFailedVisible] = useState(false);
  const [isTenantSchema, setIsTenantSchema] = useState(null);
  const [loading, setLoading] = useState(false);
  const [privacyLink, setPrivacyLink] = useState(undefined);
  const [termsLink, setTermsLink] = useState(undefined);

  const backend = new Backend();
  const AppOnLogin = props.onLogin;

  const { control, getValues, handleSubmit, reset } = useForm({
    defaultValues: { username: '', password: '' }
  })

  useEffect(() => {
    setLoading(true);

    async function fetchData() {
      let response = await backend.isTenantSchema();
      let options = await backend.fetchConfigOptions();

      setPrivacyLink(options && options.result.terms_privacy_links.privacy);
      setTermsLink(options && options.result.terms_privacy_links.terms);

      if (response) {
        setIsTenantSchema(response);
        setSamlIdpString(options.result.saml_login_string);
      } else
        setIsTenantSchema(response);

      setLoading(false);
    }

    fetchData();
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

  const onSubmitHandle = async () => {
    let values = getValues()
    let response = await doUserPassLogin(values.username, values.password);
    if (response.active) {
      AppOnLogin(response)
    }
    else {
      setLoginFailedVisible(true);
      reset()
    }
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
                <Form onSubmit={ handleSubmit(onSubmitHandle) }>
                  <FormGroup>
                    <Label for="username">Username: </Label>
                    <Controller
                      name="username"
                      control={ control }
                      render={ ({ field }) => 
                        <Input
                          { ...field }
                          id="username"
                          className="form-control"
                        />
                      }
                    />
                  </FormGroup>
                  <FormGroup>
                    <Label for="password">Password: </Label>
                    <Controller
                      name="password"
                      control={ control }
                      render={ ({ field }) =>
                        <Input
                          { ...field }
                          id="password"
                          type="password"
                          className="form-control"
                        />
                      }
                    />
                  </FormGroup>
                  <FormGroup>
                    <Alert color="danger" isOpen={loginFailedVisible} toggle={() => setLoginFailedVisible(false)} fade={false}>
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
