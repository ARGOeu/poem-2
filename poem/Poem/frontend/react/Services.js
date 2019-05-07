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
import {NavigationBar, NavigationLinks} from './UIElements';


class Services extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      services: null
    }
  }

  componentDidMount() {
    this.setState({loading: true})
    fetch('/api/v2/internal/services')
      .then(response => response.json())
      .then(json =>
          this.setState({services: json.tree, loading: false})
      )
  }

  render() {
    const {loading, services} = this.state

    return (
      (loading)
      ?
        <div>Loading...</div>
      :
        <div>I'm services</div>
    )

  }
}

export default Services;
