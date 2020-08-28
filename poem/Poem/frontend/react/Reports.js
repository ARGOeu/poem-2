import React, { useState } from 'react';
import { WebApi } from './DataManager';
import { useQuery } from 'react-query';
import { LoadingAnim, ErrorComponent, BaseArgoView, ParagraphTitle } from './UIElements';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import ReactTable from 'react-table';
import { Formik, Field } from 'formik';
import {
  Form,
  FormGroup,
  Row,
  Col,
  InputGroup,
  InputGroupAddon,
  FormText,
  Label
} from 'reactstrap';


export const ReportsList = (props) => {
  const location = props.location;

  const webapi = new WebApi({
    token: props.webapitoken,
    reportsConfigurations: props.webapireports
  });

  const [searchName, setSearchName] = useState('');
  const [searchDescription, setSearchDescription] = useState('');

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
    }
  );

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else {
    const columns = [
      {
        Header: '#',
        id: 'row',
        minWidth: 12,
        Cell: (row) =>
          <div style={{textAlign: 'center'}}>
            {row.index + 1}
          </div>
      },
      {
        Header: 'Name',
        id: 'name',
        minWidth: 80,
        accessor: e =>
          <Link to={`/ui/reports/${e.name}`}>
            {e.name}
          </Link>,
        filterable: true,
        Filter: (
          <input
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder='Search by name'
            style={{width: '100%'}}
          />
        )
      },
      {
        Header: 'Description',
        accessor: 'description',
        minWidth: 200,
        filterable: true,
        Filter: (
          <input
            value={searchDescription}
            onChange={e => setSearchDescription(e.target.value)}
            placeholder='Search by description'
            style={{width: '100%'}}
          />
        )
      },
      {
        Header: 'Enabled',
        id: 'disabled',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        accessor: e =>
          e.disabled ?
            <FontAwesomeIcon icon={faTimesCircle} style={{color: '#CC0000'}}/>
          :
            <FontAwesomeIcon icon={faCheckCircle} style={{color: '#339900'}}/>
      }
    ];

    var reports = listReports;
    if (searchName)
      reports = reports.filter(
        row => row.name.toLowerCase().includes(searchName.toLowerCase())
      );

    if (searchDescription)
      reports = reports.filter(
        row => row.description.toLowerCase().includes(searchDescription.toLowerCase())
      );

    return (
      <BaseArgoView
        resourcename='report'
        location={location}
        listview={true}
      >
        <ReactTable
          data={reports}
          columns={columns}
          className='-highlight'
          defaultPageSize={12}
          rowsText='profiles'
          getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
        />
      </BaseArgoView>
    )
  };
};


export const ReportsComponent = (props) => {
  const name = props.match.params.name;
  const location = props.location;
  const querykey = `report_${name}_changeview`;

  const webapi = new WebApi({
    token: props.webapitoken,
    reportsConfigurations: props.webapireports,
    metricProfiles: props.webapimetric,
    aggregationProfiles: props.webapiaggregation,
    operationsProfiles: props.webapioperations
  });

  const { data: report, error: reportError, isLoading: reportLoading } = useQuery(
    `${querykey}_report`, async () => {
      let report = webapi.fetchReport(name);
      return report;
    }
  );

  const { data: listMetricProfiles, error: listMetricProfilesError, isLoading: listMetricProfilesLoading } = useQuery(
    `${querykey}_metricprofiles`, async () => {
      let mp = await webapi.fetchMetricProfiles();
      let metricprofiles = [];
      mp.forEach(p => metricprofiles.push(p.name));
      return metricprofiles;
    }
  );

  const { data: listAggregationProfiles, error: listAggregationProfilesError, isLoading: listAggregationProfilesLoading } = useQuery(
    `${querykey}_aggregationprofiles`, async () => {
      let ap = await webapi.fetchAggregationProfiles();
      let aggregations = [];
      ap.forEach(p => aggregations.push(p.name));
      return aggregations;
    }
  );

  const { data: listOperationsProfiles, error: listOperationsProfilesError, isLoading: listOperationsProfilesLoading } = useQuery(
    `${querykey}_operationsprofiles`, async () => {
      let op = await webapi.fetchOperationsProfiles();
      let operations = [];
      op.forEach(p => operations.push(p.name));
      return operations;
    }
  );

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

  else {
    let metricProfile = '';
    let aggregationProfile = '';
    let operationsProfile = '';
    report.profiles.forEach(p => {
      if (p.type === 'metric')
        metricProfile = p.name;

      if (p.type === 'aggregation')
        aggregationProfile = p.name;

      if (p.type === 'operations')
        operationsProfile = p.name;
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
            downtimeThreshold: report.thresholds.downtime
          }}
          render = {props => (
            <Form>
              <FormGroup>
                <Row>
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
                    <Label to='metricProfile'>Metric profile</Label>
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
                      <Label to='aggregationProfile'>Aggregation profile</Label>
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
                    <Label to='operationsProfile'>Operations profile</Label>
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
                    <Label to='availabilityThreshold'>Availability</Label>
                    <Field
                      id='availabilityThreshold'
                      name='availabilityThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='reliabilityThreshold'>Reliability</Label>
                    <Field
                      id='reliabilityThreshold'
                      name='reliabilityThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='uptimeThreshold'>Uptime</Label>
                    <Field
                      id='uptimeThreshold'
                      name='uptimeThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='unknownThreshold'>Unknown</Label>
                    <Field
                      id='unknownThreshold'
                      name='unknownThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='downtimeThreshold'>Downtime</Label>
                    <Field
                      id='downtimeThreshold'
                      name='downtimeThreshold'
                      className='form-control'
                    />
                  </Col>
                </Row>
              </FormGroup>
            </Form>
          )}
        />
      </BaseArgoView>
    )
  }
};
