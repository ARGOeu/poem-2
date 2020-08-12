import React from 'react';
import { Form } from 'formik';
import { Card, CardBody, Row } from 'reactstrap';
import { CustomCardHeader } from './Administration';
import { Icon } from './UIElements';
import { Link } from 'react-router-dom';

const Home = (props) =>
(
  <div>
    "I'm Home"
  </div>
)

export default Home;


export const PublicHome = (props) => (
  <Form className='ml-2 mb-2 mt-2'>
    <h2 className='ml-3 mt-1 mb-4'>Public pages</h2>
    <Card className='mb-2'>
      <CustomCardHeader title='Shared resources'/>
      <CardBody>
        <Row className='p-1 align-items-center'>
          <Icon i='probes'/> <Link to={'/ui/public_probes'}>Probes</Link>
        </Row>
        <Row className='p-1 align-items-center'>
          <Icon i='metrictemplates'/> <Link to={'/ui/public_metrictemplates'}>Metric templates</Link>
        </Row>
      </CardBody>
    </Card>
    <Card className='mb-2'>
      <CustomCardHeader title='Tenant resources'/>
      <CardBody>
        <Row className='p-1 align-items-center'>
          <Icon i='metrics'/> <Link to={'/ui/public_metrics'}>Metrics</Link>
        </Row>
        <Row className='p-1 align-items-center'>
          <Icon i='metricprofiles'/> <Link to={'/ui/public_metricprofiles'}>Metric profiles</Link>
        </Row>
        <Row className='p-1 align-items-center'>
          <Icon i='aggregationprofiles'/> <Link to={'/ui/public_aggregationprofiles'}>Aggregation profiles</Link>
        </Row>
        <Row className='p-1 align-items-center'>
          <Icon i='thresholdsprofiles'/> <Link to={'/ui/public_thresholdsprofiles'}>Thresholds profiles</Link>
        </Row>
      </CardBody>
    </Card>
  </Form>
);
