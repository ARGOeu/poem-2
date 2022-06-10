import React from 'react';
import {
  Card,
  CardHeader,
  CardBody
} from 'reactstrap';
import { Icon } from './UIElements';
import { Link } from 'react-router-dom';


export const CustomCardHeader = ({title}) => (
  <CardHeader className="mt-1 sm-5 p-2 text-uppercase fw-bold rounded" style={{'backgroundColor': "#c4ccd4"}}>
    {title}
  </CardHeader>
)


export const TenantAdministration = () =>
(
  <>
    <h2 className='ms-3 mt-1 mb-4'>Administration</h2>
    <Card className='mb-2'>
      <CustomCardHeader title='Poem'/>
      <CardBody>
        <div className="p-1 align-items-center">
          <Icon i='metrics' /> <Link className='ps-1' to={'/ui/metrics'}>Metrics</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i='reports' /> <Link className='ps-1' to={'/ui/reports'}>Reports</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i='metricprofiles' /> <Link className='ps-1' to={'/ui/metricprofiles'}>Metric profiles</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i='aggregationprofiles' /> <Link className='ps-1' to={'/ui/aggregationprofiles'}>Aggregation profiles</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i='thresholdsprofiles' /> <Link className='ps-1' to={'/ui/thresholdsprofiles'}>Thresholds profiles</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i='operationsprofiles' /> <Link className='ps-1' to={'/ui/operationsprofiles'}>Operations profiles</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i='metrics' /> <Link className='ps-1' to={'/ui/administration/metricoverrides'}>Metric configuration overrides</Link>
        </div>
      </CardBody>
    </Card>
    <Card className='mb-2'>
      <CustomCardHeader title='Authentication and authorization'/>
      <CardBody>
        <div className="p-1 align-items-center">
          <Icon i="groupofreports"/> <Link to={'/ui/administration/groupofreports'}>Groups of reports</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i="groupofaggregationprofiles"/> <Link to={'/ui/administration/groupofaggregations'}>Groups of aggregations</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i="groupofmetrics"/> <Link to={'/ui/administration/groupofmetrics'}>Groups of metrics</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i="groupofmetricprofiles"/> <Link to={'/ui/administration/groupofmetricprofiles'}>Groups of metric profiles</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i='groupofthresholdsprofiles'/> <Link to={'/ui/administration/groupofthresholdsprofiles'}>Groups of thresholds profiles</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i="users"/> <Link to={'/ui/administration/users'}>Users</Link>
        </div>
      </CardBody>
    </Card>
    <Card className='mb-2'>
      <CustomCardHeader title='SuperAdmin POEM data'/>
      <CardBody>
        <div className='p-1 align-items-center'>
          <Icon i="yumrepos"/> <Link to={'/ui/administration/yumrepos'}>YUM repos</Link>
        </div>
        <div className='p-1 align-items-center'>
          <Icon i="packages"/> <Link to={'/ui/administration/packages'}>Packages</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i="metrics"/> <Link to={'/ui/administration/metrictemplates'}>Metric templates</Link>
        </div>
      </CardBody>
    </Card>
    <Card>
      <CustomCardHeader title='API key permissions'/>
      <CardBody>
        <div className="p-1 align-items-center">
          <Icon i="apikey"/> <Link to={'/ui/administration/apikey'}>API keys</Link>
        </div>
      </CardBody>
    </Card>
  </>
)


export const SuperAdminAdministration = () =>
(
  <>
    <h2 className='ms-3 mt-1 mb-4'>Administration</h2>
    <Card className='mb-2'>
      <CustomCardHeader title='Poem'/>
      <CardBody>
        <div className="p-1 align-items-center">
          <Icon i="tenants"/> <Link to={"/ui/tenants"}>Tenants</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i="yumrepos"/> <Link className='ps-1' to={'/ui/yumrepos'}>YUM repos</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i="packages"/> <Link className='ps-1' to={'/ui/packages'}>Packages</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i="probes"/> <Link className='ps-1' to={'/ui/probes'}>Probes</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i="metrictags"/> <Link className='ps-1' to={'/ui/metrictags'}>Metric tags</Link>
        </div>
        <div className="p-1 align-items-center">
          <Icon i="metrictemplates"/> <Link className='ps-1' to={'/ui/metrictemplates'}>Metric templates</Link>
        </div>
      </CardBody>
    </Card>
    <Card className='mb-2'>
      <CustomCardHeader title='Authentication and authorization'/>
      <CardBody>
        <div className="p-1 align-items-center">
          <Icon i='users'/> <Link to={'/ui/administration/users'}>Users</Link>
        </div>
      </CardBody>
    </Card>
    <Card>
      <CustomCardHeader title='API key permissions'/>
      <CardBody>
        <div className="p-1 align-items-center">
          <Icon i="apikey"/> <Link to={'/ui/administration/apikey'}>API keys</Link>
        </div>
      </CardBody>
    </Card>
  </>
)
