import React, { Component } from 'react';
import {
  Alert,
  Container,
  Button, 
  Row, 
  Col, 
  Nav,
  NavItem,
  NavLink,
  NavbarBrand,
  Navbar,
  NavbarToggler,
  Collapse} from 'reactstrap';
import Cookies from 'universal-cookie';
import {NavigationBar, NavigationLinks} from './UIElements';


class Administration extends Component {
  constructor(props) {
    super(props);

    this.props = props;
  }

  render() {
    return (
      <Container>
        <Row>
          <Col md="12">
            <NavigationBar props={this.props} />
          </Col>
        </Row>
        <Row>
          <Col sm={{size: 3, order: 0}}>
            <NavigationLinks active='administration' />
          </Col>
        </Row>
      </Container>
    )
  }
}

export default Administration;
