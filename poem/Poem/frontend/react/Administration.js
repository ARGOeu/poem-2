import React from 'react';
import {
  Row,
  Card,
  CardHeader,
  CardBody
} from 'reactstrap';
import { Icon } from './UIElements';
import { Link } from 'react-router-dom';


export const CustomCardHeader = ({title}) => (
  <CardHeader className="mt-1 sm-5 p-2 text-uppercase font-weight-bold rounded" style={{'backgroundColor': "#c4ccd4"}}>
    {title}
  </CardHeader>
)


export const TenantAdministration = () =>
(
  <>
    <h2 className='ml-3 mt-1 mb-4'>Administration</h2>
    <Card className='mb-2'>
      <CustomCardHeader title='Poem'/>
      <CardBody>
        <Row className="p-1 align-items-center">
          <Icon i="metrics"/> <Link className='pl-1' to={'/ui/metrics'}>Metrics</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="reports"/> <Link className='pl-1' to={'/ui/reports'}>Reports</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="metricprofiles"/> <Link className='pl-1' to={'/ui/metricprofiles'}>Metric profiles</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="aggregationprofiles"/> <Link className='pl-1' to={'/ui/aggregationprofiles'}>Aggregation profiles</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="thresholdsprofiles"/> <Link className='pl-1' to={'/ui/thresholdsprofiles'}>Thresholds profiles</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="operationsprofiles"/> <Link className='pl-1' to={'/ui/operationsprofiles'}>Operations profiles</Link>
        </Row>
      </CardBody>
    </Card>
    <Card className='mb-2'>
      <CustomCardHeader title='Authentication and authorization'/>
      <CardBody>
        <Row className="p-1 align-items-center">
          <Icon i="groupofaggregationprofiles"/> <Link to={'/ui/administration/groupofaggregations'}>Groups of aggregations</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="groupofmetrics"/> <Link to={'/ui/administration/groupofmetrics'}>Groups of metrics</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="groupofmetricprofiles"/> <Link to={'/ui/administration/groupofmetricprofiles'}>Groups of metric profiles</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i='groupofthresholdsprofiles'/> <Link to={'/ui/administration/groupofthresholdsprofiles'}>Groups of thresholds profiles</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="users"/> <Link to={'/ui/administration/users'}>Users</Link>
        </Row>
      </CardBody>
    </Card>
    <Card className='mb-2'>
      <CustomCardHeader title='SuperAdmin POEM data'/>
      <CardBody>
        <Row className='p-1 align-items-center'>
          <Icon i="yumrepos"/> <Link to={'/ui/administration/yumrepos'}>YUM repos</Link>
        </Row>
        <Row className='p-1 align-items-center'>
          <Icon i="packages"/> <Link to={'/ui/administration/packages'}>Packages</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="metrics"/> <Link to={'/ui/administration/metrictemplates'}>Metric templates</Link>
        </Row>
      </CardBody>
    </Card>
    <Card>
      <CustomCardHeader title='API key permissions'/>
      <CardBody>
        <Row className="p-1 align-items-center">
          <Icon i="apikey"/> <Link to={'/ui/administration/apikey'}>API keys</Link>
        </Row>
      </CardBody>
    </Card>
  </>
)


export const SuperAdminAdministration = () =>
(
  <>
    <h2 className='ml-3 mt-1 mb-4'>Administration</h2>
    <Card className='mb-2'>
      <CustomCardHeader title='Poem'/>
      <CardBody>
        <Row className="p-1 align-items-center">
          <Icon i="tenants"/> <Link to={"/ui/tenants"}>Tenants</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="yumrepos"/> <Link className='pl-1' to={'/ui/yumrepos'}>YUM repos</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="packages"/> <Link className='pl-1' to={'/ui/packages'}>Packages</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="probes"/> <Link className='pl-1' to={'/ui/probes'}>Probes</Link>
        </Row>
        <Row className="p-1 align-items-center">
          <Icon i="metrictemplates"/> <Link className='pl-1' to={'/ui/metrictemplates'}>Metric templates</Link>
        </Row>
      </CardBody>
    </Card>
    <Card className='mb-2'>
      <CustomCardHeader title='Authentication and authorization'/>
      <CardBody>
        <Row className="p-1 align-items-center">
          <Icon i='users'/> <Link to={'/ui/administration/users'}>Users</Link>
        </Row>
      </CardBody>
    </Card>
    <Card>
      <CustomCardHeader title='API key permissions'/>
      <CardBody>
        <Row className="p-1 align-items-center">
          <Icon i="apikey"/> <Link to={'/ui/administration/apikey'}>API keys</Link>
        </Row>
      </CardBody>
    </Card>
  </>
)
