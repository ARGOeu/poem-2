import React, { useState, useEffect } from 'react';
import { WebApi } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, ErrorComponent, BaseArgoView, ParagraphTitle } from './UIElements';
import { useTable, usePagination } from 'react-table';
import {
  FormGroup,
  Row,
  Col,
  InputGroup,
  InputGroupAddon,
  FormText,
  Table,
  Pagination,
  PaginationItem,
  PaginationLink
} from 'reactstrap';
import { Formik, Form, Field } from 'formik';
import { useQuery } from 'react-query';


function OperationsProfilesListTable({ columns, data }) {
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
          <Table className='table table-bordered table-hover'>
            <thead className='table-active align-middle text-center'>
              {
                headerGroups.map((headerGroup, thi) => (
                  <React.Fragment key={thi}>
                    <tr>
                      {
                        headerGroup.headers.map((column, tri) => {
                          let width = undefined;

                          if (tri === 0)
                            width = '2%'

                          if (tri === 1)
                            width = '20%'

                          else if (tri === 2)
                            width = '78%'

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
                    <tr key={row_index} style={{height: '49px'}}>
                      {
                        row.cells.map((cell, cell_index) => {
                          if (cell_index === 0)
                            return <td key={cell_index} className='align-middle text-center'>{(row_index + 1) + (pageIndex * pageSize)}</td>
                          else if (cell_index === row.cells.length - 1)
                            return <td key={cell_index} className='align-middle text-center'>{cell.render('Cell')}</td>
                          else
                            return <td key={cell_index} className='align-middle'>{cell.render('Cell')}</td>
                        })
                      }
                    </tr>
                  )
                })
              }
            </tbody>
          </Table>
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
                    {pageSize} operations profiles
                  </option>
                ))}
              </select>
            </PaginationItem>
          </Pagination>
        </Col>
      </Row>
    </>
  );
};


export const OperationsProfilesList = (props) => {
  const location = props.location;
  const publicView = props.publicView;
  const webapi = new WebApi({
    token: props.webapitoken,
    operationsProfiles: props.webapioperations
  });

  const { data: listProfiles, error: error, isLoading: loading } = useQuery(
    'operationsprofiles_listview', async () => {
      let profiles = await webapi.fetchOperationsProfiles();
      let n_elem = 10 - (profiles.length % 10);

      for (let i = 0; i < n_elem; i++)
        profiles.push({'name': '', 'description': ''});

      return profiles;
    }
  );

  const columns = React.useMemo(() => [
    {
      Header: '#',
      accessor: null
    },
    {
      Header: 'Name',
      id: 'name',
      accessor: e =>
        <Link to={`/ui/${publicView ? 'public_' : ''}operationsprofiles/${e.name}`}>
          {e.name}
        </Link>
    },
    {
      Header: 'Description',
      accessor: 'description'
    }
  ]);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && listProfiles)
    return (
      <BaseArgoView
        resourcename='operations profile'
        location={location}
        listview={true}
        addnew={false}
      >
        <OperationsProfilesListTable
          data={listProfiles}
          columns={columns}
        />
      </BaseArgoView>
    );

  else
    return null;
};


export const OperationsProfileDetails = (props) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const name = props.match.params.name;

  const webapi = new WebApi({
    token: props.webapitoken,
    operationsProfiles: props.webapioperations
  });

  useEffect(() => {
    setLoading(true);

    async function fetchData() {
      try {
          let json = await webapi.fetchOperationProfile(name);
          setProfile(json);
      } catch(err) {
        setError(err);
      };
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && profile)
    return (
      <BaseArgoView
        resourcename='Operations profile details'
        infoview={true}
      >
        <Formik
          initialValues = {{
            name: profile.name
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
                        readOnly
                      />
                    </InputGroup>
                    <FormText color='text-muted'>
                      Name of operations profile.
                    </FormText>
                  </Col>
                </Row>
              </FormGroup>
              <ParagraphTitle title='States'/>
              <Row>
                <Col md={4}>
                  <Table bordered size='sm'>
                    <thead>
                      <tr>
                        <th style={{backgroundColor: '#ececec'}}>#</th>
                        <th style={{backgroundColor: '#ececec'}}>Available states</th>
                      </tr>
                    </thead>
                    <tbody>
                      {
                        profile.available_states.map((state, index) =>
                          <tr key={index}>
                            <th scope='row'>{index + 1}</th>
                            <td>{state}</td>
                          </tr>
                        )
                      }
                    </tbody>
                  </Table>
                </Col>
                <Col md={5}>
                  <Table bordered>
                    <thead>
                      <tr>
                        <th style={{backgroundColor: '#ececec'}}>Default</th>
                        <th style={{backgroundColor: '#ececec'}}>State to be used</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>default_downtime</td>
                        <td>{profile.defaults.down}</td>
                      </tr>
                      <tr>
                        <td>default_missing</td>
                        <td>{profile.defaults.missing}</td>
                      </tr>
                      <tr>
                        <td>default_unknown</td>
                        <td>{profile.defaults.unknown}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>
              <ParagraphTitle title='Operations'/>
              <Row>
                {
                  profile.operations.map((operation, oi) =>
                    <Col md={5} key={oi}>
                      <h3 className='text-center'>{operation.name}</h3>
                      <Table bordered size='sm'>
                        <thead>
                          <tr>
                            <th style={{backgroundColor: '#ececec'}}>State A</th>
                            <th style={{backgroundColor: '#ececec'}}>State B</th>
                            <th style={{backgroundColor: '#c1e3ca'}}>Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            operation.truth_table.map((row, index) =>
                              <tr key={index}>
                                <td>{row.a}</td>
                                <td>{row.b}</td>
                                <td>{row.x}</td>
                              </tr>
                            )
                          }
                        </tbody>
                      </Table>
                    </Col>
                  )
                }
              </Row>
            </Form>
          )}
        />
      </BaseArgoView>
    );
  else
    return null;
};
