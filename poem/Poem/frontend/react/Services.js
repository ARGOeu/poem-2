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
      rows: null,
      rowspan: null,
    }
  }

  componentDidMount() {
    this.setState({loading: true})
    fetch('/api/v2/internal/services')
      .then(response => response.json())
      .then(json =>
        this.setState({
          rows: json.result.rows, 
          rowspan: json.result.rowspan, 
          loading: false})
      )
  }

  render() {
    const {loading, rows, rowspan} = this.state

    return (
      (loading)
      ?
        <div>Loading...</div>
      :
        <table className="table table-bordered table-sm">
          <thead className="table-info">
            <tr>
              <th scope="col">Service area</th>
              <th scope="col">Service name</th>
              <th scope="col">Service type</th>
              <th scope="col">Metric</th>
              <th scope="col">Probe</th>
            </tr>
          </thead>
          <tbody>
            {
              rows && rows.map((e, i) =>
                <tr key={i}>
                  <td className="table-light">
                    {e.service_area}
                  </td>
                  <td className="table-light">
                    {e.service_name}
                  </td>
                  <td className="table-light">
                    {e.service_type}
                  </td>
                  <td className="table-light">
                    {e.metric}
                  </td>
                  <td className="table-light">
                    {e.probe}
                  </td>
                </tr>
              )
            }
          </tbody>
        </table>
    )

  }
}

export default Services;
