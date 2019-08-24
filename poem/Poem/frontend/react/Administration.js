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
  Collapse,
  Card,
  CardHeader,
  CardBody} from 'reactstrap';
import Cookies from 'universal-cookie';
import { NavigationBar, NavigationLinks, Icon } from './UIElements';
import { Form } from 'formik';
import { Link } from 'react-router-dom';


const Administration = (props) =>
(
  <Form className='ml-2 mb-2 mt-2'>
    <h2 className='ml-3 mt-1 mb-4'>Administration</h2>
    <Card className='mb-2 pb-1 pt-1'>
      <CardHeader className="sm-5 p-2 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>
        Poem
      </CardHeader>
      <CardBody>
        <Row className="p-1 align-items-center">
          <Icon i="reports"/><Link className='pl-1' to={'/ui/reports'}>Reports</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="metrics"/> <Link className='pl-1' to={'/ui/metrics'}>Metrics</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="metricprofiles"/> <Link className='pl-1' to={'/ui/metricprofiles'}>Metric profiles</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="aggregationprofiles"/> <Link className='pl-1' to={'/ui/aggregationprofiles'}>Aggregation profiles</Link>
        </Row>
      </CardBody>
    </Card>
    <Card className='mb-2'>
      <CardHeader className="mt-2 p-2 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>
        Authentication and authorization
      </CardHeader>
      <CardBody> 
        <Row className="p-1 align-items-center">
          <Link to={'/ui/administration/groupofaggregations'}>Groups of aggregations</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Link to={'/ui/administration/groupofmetrics'}>Groups of metrics</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Link to={'/ui/administration/groupofmetricprofiles'}>Groups of metric profiles</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Link to={'/ui/administration/users'}>Users</Link>
        </Row>
      </CardBody>
    </Card>
    <Card>
      <CardHeader className="mt-2 p-2 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>
        API key permissions
      </CardHeader>
      <CardBody> 
        <Row className="p-1 align-items-center">
          <Link to={'/ui/administration/apikey'}>API keys</Link>
        </Row>
      </CardBody>
    </Card>
  </Form>
)

export default Administration;
