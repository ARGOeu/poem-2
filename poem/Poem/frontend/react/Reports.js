import React from 'react';
import { WebApi } from './DataManager';
import { useQuery } from 'react-query';
import {
  LoadingAnim,
  ErrorComponent,
  BaseArgoView,
  ParagraphTitle,
  Checkbox
 } from './UIElements';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { Formik, Field } from 'formik';
import {
  Form,
  FormGroup,
  Row,
  Col,
  InputGroup,
  InputGroupAddon,
  FormText,
  Label,
  Pagination,
  PaginationItem,
  PaginationLink
} from 'reactstrap';
import { useTable, usePagination } from 'react-table';


function ReportsTable({ columns, data }) {
  const {
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10 }
    },
    usePagination
  );

  return (
    <>
      <Row>
        <Col>
          <table className='table table-bordered table-hover'>
            <thead className='table-active align-middle text-center'>
              {
                headerGroups.map((headerGroup, thi) => (
                  <React.Fragment key={thi}>
                    <tr>
                      {
                        headerGroup.headers.map((column, tri) => {
                          let width = undefined;

                          if (tri === 0)
                            width = '2%';

                          if (tri === 1)
                            width = '20%';

                          if (tri === 2)
                            width = '70%';

                          if (tri === 3)
                            width = '8%';

                          return (
                            <th style={{width: width}} className='p-1 m-1' key={tri}>
                              {column.render('Header')}
                            </th>
                          )
                        })
                      }
                    </tr>
                  </React.Fragment>
                ))
              }
            </thead>
            <tbody>
              {
                page.map((row, row_index) => {
                  prepareRow(row);
                  return (
                    <tr key={row_index}>
                      {
                        row.cells.map((cell, cell_index) => {
                          if (cell_index === 0)
                            return <td key={cell_index} className='align-middle text-center'>{(row_index + 1) + (pageIndex * pageSize)}</td>

                          else
                            return <td key={cell_index} className='align-middle'>{cell.render('Cell')}</td>
                        })
                      }
                    </tr>
                  )
                })
              }
            </tbody>
          </table>
        </Col>
      </Row>
      <Row>
        <Col className='d-flex justify-content-center'>
          <Pagination>
            <PaginationItem disabled={!canPreviousPage}>
              <PaginationLink first onClick={() => gotoPage(0)}/>
            </PaginationItem>
            <PaginationItem disabled={!canPreviousPage}>
              <PaginationLink previous onClick={() => previousPage()}/>
            </PaginationItem>
            {
              [...Array(pageCount)].map((e, i) =>
                <PaginationItem key={i} active={pageIndex === i ? true : false}>
                  <PaginationLink onClick={() => gotoPage(i)}>
                    { i + 1 }
                  </PaginationLink>
                </PaginationItem>
              )
            }
            <PaginationItem disabled={!canNextPage}>
              <PaginationLink next onClick={() => nextPage()}/>
            </PaginationItem>
            <PaginationItem disabled={!canNextPage}>
              <PaginationLink last onClick={() => gotoPage(pageCount + 1)}/>
            </PaginationItem>
            <PaginationItem className='pl-2'>
              <select
                style={{width: '180px'}}
                className='custom-select text-primary'
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
              >
                {[10, 20, 50].map(pageSize => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize} reports
                  </option>
                ))}
              </select>
            </PaginationItem>
          </Pagination>
        </Col>
      </Row>
    </>
  );
}


export const ReportsList = (props) => {
  const location = props.location;

  const webapi = new WebApi({
    token: props.webapitoken,
    reportsConfigurations: props.webapireports
  });

  const { data: listReports, error: error, isLoading: loading } = useQuery(
    'reports_listview', async () => {
      let json = await webapi.fetchReports();
      let reports = [];
      json.forEach(e => reports.push({
        'name': e.info.name,
        'description': e.info.description,
        'disabled': e.disabled
      }))

      // 10 is minimal pageSize and these numbers should be aligned
      let n_elem = 10 - (reports.length % 10)
      for (let i = 0; i < n_elem; i++)
        reports.push(
          {'description': '', 'groupname': '', 'name': '', 'disabled': ''}
        )

      return reports;
    }
  );

  const columns = React.useMemo(
    () => [
      {
        Header: '#',
        accessor: null
      },
      {
        Header: 'Name',
        id: 'name',
        accessor: e =>
          <Link to={`/ui/reports/${e.name}`}>
            {e.name}
          </Link>
      },
      {
        Header: 'Description',
        accessor: 'description'
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
              <FontAwesomeIcon icon={faCheckCircle} style={{color: '#339900'}}/>
      }
    ]
  );

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else {
    return (
      <BaseArgoView
        resourcename='report'
        location={location}
        listview={true}
        addnew={false}
      >
        <ReportsTable
          data={listReports}
          columns={columns}
        />
      </BaseArgoView>
    )
  }
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
            downtimeThreshold: report.thresholds.downtime,
            disabled: report.disabled
          }}
          render = {props => (
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
                    <Field
                      component={Checkbox}
                      name='disabled'
                      className='form-control'
                      id='checkbox'
                      label='Disabled'
                    />
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
            </Form>
          )}
        />
      </BaseArgoView>
    )
  }
};
