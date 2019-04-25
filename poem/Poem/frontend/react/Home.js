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
import {NavigationBar} from './UIElements';

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
            <NavigationBar props={this.props} />
          </Col>
        </Row>
        <Row>
          <Col sm={{size: 4, order: 0}}>
            <Nav vertical>
              {
                localStorage.getItem('authIsSuperuser') ?
                  <NavItem>
                    <NavLink href='/ui/administration'>Administration</NavLink>
                  </NavItem>
                  : '' 
              }
              <NavItem>
                <NavLink href='/ui/reports'>Reports</NavLink>
              </NavItem>
              <NavItem>
                <NavLink href='/ui/metricprofiles' active={true}>Metric profiles</NavLink>
              </NavItem>
              <NavItem>
                <NavLink href='/ui/aggregationprofiles'>Aggregation profiles</NavLink>
              </NavItem>
            </Nav>
          </Col>
        </Row>
      </Container>
    )
  }
}

export default Home;
