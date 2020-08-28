import React, { useState } from 'react';
import { WebApi } from './DataManager';
import { useQuery } from 'react-query';
import { LoadingAnim, ErrorComponent, BaseArgoView, ParagraphTitle } from './UIElements';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import ReactTable from 'react-table';
import { Formik, Field } from 'formik';
import { Form, FormGroup, Row, Col, InputGroup, InputGroupAddon, FormText, Label } from 'reactstrap';


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

  const webapi = new WebApi({
    token: props.webapitoken,
    reportsConfigurations: props.webapireports
  });

  const { data: report, error: error, isLoading: loading } = useQuery(
    `report_${name}_changeview`, async () => {
      let report = webapi.fetchReport(name);
      return report;
    }
  );

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

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
            operationsProfile: operationsProfile
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
                <ParagraphTitle title='profiles' className='mt-3'/>
                <FormGroup>
                  <Row className='mt-2'>
                    <Col md={6}>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>Metric profile</InputGroupAddon>
                        <Field
                          id='metricProfile'
                          className='form-control'
                          name='metricProfile'
                        />
                      </InputGroup>
                    </Col>
                  </Row>
                  <Row className='mt-2'>
                    <Col md={6}>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>Aggregation profile</InputGroupAddon>
                        <Field
                          id='aggregationProfile'
                          className='form-control'
                          name='aggregationProfile'
                        />
                      </InputGroup>
                    </Col>
                  </Row>
                  <Row className='mt-2'>
                    <Col md={6}>
                      <InputGroup>
                        <InputGroupAddon addonType='prepend'>Operations profile</InputGroupAddon>
                        <Field
                          id='operationsProfile'
                          className='form-control'
                          name='operationsProfile'
                        />
                      </InputGroup>
                    </Col>
                  </Row>
                </FormGroup>
              </FormGroup>
            </Form>
          )}
        />
      </BaseArgoView>
    )
  }
};
