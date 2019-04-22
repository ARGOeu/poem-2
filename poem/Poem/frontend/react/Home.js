import React, { Component } from 'react';
import {
  Alert,
  Container,
  Button, 
  Row, 
  Col, 
  Nav,
  NavbarBrand,
  Navbar,
  NavbarToggler,
  Collapse,
  NavItem} from 'reactstrap';
import Cookies from 'universal-cookie';

const doLogout = ({history}) =>
{
  let cookies = new Cookies();

  localStorage.removeItem('auth_username');
  localStorage.removeItem('auth_logged');

  return fetch('/rest-auth/logout/', {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-CSRFToken': cookies.get('csrftoken'),
      'Referer': 'same-origin'
    }}).then(response => history.push('/ui/login'));
}

class Home extends Component {
  constructor(props) {
    super(props);

    this.props = props;
  }

  render() {
    return (
      <Container>
        <Row>
          <Col md="12">
            <Navbar color="light" dark expand="lg">
              <NavbarBrand>ARGO POEM</NavbarBrand>
              <NavbarToggler/>
              <Collapse navbar>
                <Nav className='ml-auto' navbar>
                  <NavItem>
                    <Button 
                      color="danger" 
                      size="sm"
                      outline
                      onClick={() => doLogout(this.props)}>
                      Logout
                    </Button>
                  </NavItem>
                </Nav>
              </Collapse>
            </Navbar>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default Home;
