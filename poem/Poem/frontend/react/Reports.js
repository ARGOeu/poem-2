import React from 'react';
import { Backend, WebApi } from './DataManager';

import { useQuery } from 'react-query';
import {
  LoadingAnim,
  ErrorComponent,
  BaseArgoView,
  ParagraphTitle,
  BaseArgoTable,
  DropDown,
 } from './UIElements';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { Formik, Field, FieldArray } from 'formik';
import {
  Button,
  Form,
  FormGroup,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  CardText,
  CardTitle,
  CardSubtitle,
  InputGroup,
  InputGroupAddon,
  FormText,
  Label
} from 'reactstrap';
import Select, { components } from 'react-select';


export const ReportsList = (props) => {
  const location = props.location;
  const backend = new Backend();

  const webapi = new WebApi({
    token: props.webapitoken,
    reportsConfigurations: props.webapireports
  });

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    `session_userdetails`, async () => {
      const sessionActive = await backend.isActiveSession()
      if (sessionActive.active) {
        return sessionActive.userdetails
      }
    }
  );

  const { data: listReports, error: error, isLoading: loading } = useQuery(
    'reports_listview', async () => {
      let json = await webapi.fetchReports();
      let reports = [];
      json.forEach(e => reports.push({
        'name': e.info.name,
        'description': e.info.description,
        'disabled': e.disabled
      }))

      return reports;
    },
    {
      enabled: userDetails
    }
  );

  const columns = React.useMemo(
    () => [
      {
        Header: '#',
        accessor: null,
        column_width: '2%'
      },
      {
        Header: 'Name',
        id: 'name',
        accessor: e =>
          <Link to={`/ui/reports/${e.name}`}>
            {e.name}
          </Link>,
        column_width: '20%'
      },
      {
        Header: 'Description',
        accessor: 'description',
        column_width: '70%'
      },
      {
        Header: 'Enabled',
        id: 'disabled',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        accessor: e =>
          e.disabled === '' ?
            ''
          :
            e.disabled ?
              <FontAwesomeIcon icon={faTimesCircle} style={{color: '#CC0000'}}/>
            :
              <FontAwesomeIcon icon={faCheckCircle} style={{color: '#339900'}}/>,
        column_width: '8%'
      }
    ], []
  );

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loadingUserDetails && listReports) {
    return (
      <BaseArgoView
        resourcename='report'
        location={location}
        listview={true}
        addnew={false}
      >
        <BaseArgoTable
          data={listReports}
          columns={columns}
          resourcename='reports'
          page_size={10}
        />
      </BaseArgoView>
    )
  }
  else
    return null
};

const TopologyTag = ({ push, form }) => {
  return (
    <React.Fragment>
      {
        form.values.topologyTags.map((tags, i) => (
          <React.Fragment key={i}>
            <span>
              {tags[0]}
            </span>
            <span>
              {tags[1]}
            </span>
          </React.Fragment>
        ))
      }
      <Button color="success"
        type="button"
        onClick={() => {push(['foo', 'bar'])}}>
        Add new tag
      </Button>
    </React.Fragment>
  )
}


export const ReportsComponent = (props) => {
  const name = props.match.params.name;
  const location = props.location;
  const querykey = `report_${name}_changeview`;
  const backend = new Backend();
  const topologyTypes = ['Sites', 'ServiceGroups']

  const webapi = new WebApi({
    token: props.webapitoken,
    reportsConfigurations: props.webapireports,
    metricProfiles: props.webapimetric,
    aggregationProfiles: props.webapiaggregation,
    operationsProfiles: props.webapioperations
  });

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    `session_userdetails`, async () => {
      const sessionActive = await backend.isActiveSession()
      if (sessionActive.active) {
        return sessionActive.userdetails
      }
    }
  );

  const { data: report, error: reportError, isLoading: reportLoading } = useQuery(
    `${querykey}_report`, async () => {
      let report = webapi.fetchReport(name);
      return report;
    },
    {
      enabled: userDetails
    }
  );

  const { data: listMetricProfiles, error: listMetricProfilesError, isLoading: listMetricProfilesLoading } = useQuery(
    `${querykey}_metricprofiles`, async () => {
      let mp = await webapi.fetchMetricProfiles();
      let metricprofiles = [];
      mp.forEach(profile => metricprofiles.push(profile.name));
      return metricprofiles;
    },
    {
      enabled: userDetails
    }
  );

  const { data: listAggregationProfiles, error: listAggregationProfilesError, isLoading: listAggregationProfilesLoading } = useQuery(
    `${querykey}_aggregationprofiles`, async () => {
      let ap = await webapi.fetchAggregationProfiles();
      let aggregations = [];
      ap.forEach(profile => aggregations.push(profile.name));
      return aggregations;
    },
    {
      enabled: userDetails
    }
  );

  const { data: listOperationsProfiles, error: listOperationsProfilesError, isLoading: listOperationsProfilesLoading } = useQuery(
    `${querykey}_operationsprofiles`, async () => {
      let op = await webapi.fetchOperationsProfiles();
      let operations = [];
      op.forEach(profile => operations.push(profile.name));
      return operations;
    },
    {
      enabled: userDetails
    }
  );

  const { data: topologyTags, error: topologyTagsError, isLoading: isLoadingTopologyTags} = useQuery(
    `${querykey}_topologytags`, async () => {
      let tags = await webapi.fetchReportsToplogyTags();
      return tags
    },
    {
      enabled: report
    }
  );

  const whichTopologyType = (schema) => {
    if (schema.group.group.type.toLowerCase() === topologyTypes[0].toLowerCase())
      return topologyTypes[0]
    else
      return topologyTypes[1]
  }

  const extractTags = (which, tags) => {
    let found = tags.filter(element => element.name === which)
    return found[0].values
  }

  if (reportLoading || listMetricProfilesLoading || listAggregationProfilesLoading || listOperationsProfilesLoading)
    return (<LoadingAnim/>);

  else if (reportError)
    return (<ErrorComponent error={reportError}/>);

  else if (listMetricProfilesError)
    return (<ErrorComponent error={listMetricProfilesError}/>);

  else if (listAggregationProfilesError)
    return (<ErrorComponent error={listAggregationProfilesError}/>);

  else if (listOperationsProfilesError)
    return (<ErrorComponent error={listOperationsProfilesError}/>);

  else if (report && topologyTags)  {
    let metricProfile = '';
    let aggregationProfile = '';
    let operationsProfile = '';
    report.profiles.forEach(profile => {
      if (profile.type === 'metric')
        metricProfile = profile.name;

      if (profile.type === 'aggregation')
        aggregationProfile = profile.name;

      if (profile.type === 'operations')
        operationsProfile = profile.name;
    })
    return (
      <BaseArgoView
        resourcename='report'
        location={location}
        history={false}
      >
        <Formik
          initialValues = {{
            id: report.id,
            disabled: report.disabled,
            name: report.info.name,
            description: report.info.description,
            metricProfile: metricProfile,
            aggregationProfile: aggregationProfile,
            operationsProfile: operationsProfile,
            availabilityThreshold: report.thresholds.availability,
            reliabilityThreshold: report.thresholds.reliability,
            uptimeThreshold: report.thresholds.uptime,
            unknownThreshold: report.thresholds.unknown,
            downtimeThreshold: report.thresholds.downtime,
            topologyType: whichTopologyType(report.topology_schema),
            topologyTags: new Array()
          }}
        >
          {(props) => (
            <Form>
              <FormGroup>
                <Row className='align-items-center'>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
                      <Field
                        type='text'
                        name='name'
                        className='form-control form-control-lg'
                      />
                    </InputGroup>
                    <FormText color='muted'>
                      Report name
                    </FormText>
                  </Col>
                  <Col md={2}>
                    <label>
                      <Field
                        type='checkbox'
                        name='disabled'
                        className='mr-1'
                      />
                      Disabled
                    </label>
                    <FormText color='muted'>
                      Mark report as disabled.
                    </FormText>
                  </Col>
                </Row>
                <Row className='mt-3'>
                  <Col md={10}>
                    <Label for='description'>Description:</Label>
                    <Field
                      id='description'
                      className='form-control'
                      component='textarea'
                      name='description'
                    />
                    <FormText color='muted'>
                      Free text report description.
                    </FormText>
                  </Col>
                </Row>
              </FormGroup>
              <FormGroup className='mt-4'>
                <ParagraphTitle title='profiles'/>
                <Row className='mt-2'>
                  <Col md={4}>
                    <Label to='metricProfile'>Metric profile:</Label>
                    <Field
                      id='metricProfile'
                      component='select'
                      className='form-control custom-select'
                      name='metricProfile'
                    >
                      {
                        listMetricProfiles.map((name, i) =>
                          <option key={i} value={name}>{name}</option>
                        )
                      }
                    </Field>
                  </Col>
                  <Col md={4}>
                    <Label to='aggregationProfile'>Aggregation profile:</Label>
                    <Field
                        component='select'
                        id='aggregationProfile'
                        className='form-control custom-select'
                        name='aggregationProfile'
                      >
                      {
                          listAggregationProfiles.map((name, i) =>
                            <option key={i} value={name}>{name}</option>
                          )
                        }
                    </Field>
                  </Col>
                  <Col md={4}>
                    <Label to='operationsProfile'>Operations profile:</Label>
                    <Field
                      component='select'
                      id='operationsProfile'
                      className='form-control custom-select'
                      name='operationsProfile'
                    >
                      {
                        listOperationsProfiles.map((name, i) =>
                          <option key={i} value={name}>{name}</option>
                        )
                      }
                    </Field>
                  </Col>
                </Row>
              </FormGroup>
              <FormGroup className='mt-4'>
                <ParagraphTitle title='Thresholds'/>
                <Row>
                  <Col md={2} className='mr-4'>
                    <Label to='availabilityThreshold'>Availability:</Label>
                    <Field
                      id='availabilityThreshold'
                      name='availabilityThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='reliabilityThreshold'>Reliability:</Label>
                    <Field
                      id='reliabilityThreshold'
                      name='reliabilityThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='uptimeThreshold'>Uptime:</Label>
                    <Field
                      id='uptimeThreshold'
                      name='uptimeThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='unknownThreshold'>Unknown:</Label>
                    <Field
                      id='unknownThreshold'
                      name='unknownThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='downtimeThreshold'>Downtime:</Label>
                    <Field
                      id='downtimeThreshold'
                      name='downtimeThreshold'
                      className='form-control'
                    />
                  </Col>
                </Row>
              </FormGroup>
              <FormGroup className='mt-4'>
                <ParagraphTitle title='Topology configuration'/>
                <Row>
                  <Col md={2}>
                    <Label for='topologyType'>Topology type:</Label>
                    <Field
                        name='topologyType'
                        component={DropDown}
                        data={['Select one', ...topologyTypes]}
                        required={true}
                        class_name='custom-select'
                      />
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Card className="mt-3">
                      <CardHeader>
                        <strong>Group of groups</strong>
                      </CardHeader>
                      <CardBody>
                        <CardTitle tag="h5" className="mb-2">Tags</CardTitle>
                        <CardText>
                          <FieldArray
                            name="topologyTags"
                            render={props => (
                              <TopologyTag {...props}/>
                            )}
                          />
                        </CardText>
                        <CardTitle tag="h5" className="mb-2">Entities</CardTitle>
                        <CardText>
                          Bar
                        </CardText>
                      </CardBody>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="mt-3">
                      <CardBody>
                        <CardTitle tag="h5">Group of endpoints</CardTitle>
                        <CardSubtitle tag="h6" className="mb-2 mt-2 text-muted">Tags</CardSubtitle>
                        <CardText>
                          Foo
                        </CardText>
                        <CardSubtitle tag="h6" className="mb-2 mt-2 text-muted">Entities</CardSubtitle>
                        <CardText>
                          Bar
                        </CardText>
                      </CardBody>
                    </Card>
                  </Col>
                </Row>
              </FormGroup>
            </Form>
          )}
        </Formik>
      </BaseArgoView>
    )
  }

  else
    return null
};
