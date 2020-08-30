import React, { useState, useEffect } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView, ErrorComponent } from './UIElements';
import { useTable, usePagination } from 'react-table';
import {
  Pagination,
  PaginationItem,
  PaginationLink,
  Row,
  Col
} from 'reactstrap';


function Table({ columns, data }) {
  // Use the state and functions returned from useTable to build your UI
  const {
    headerGroups,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    pageCount,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    state: { pageIndex, pageSize },
  } = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 15 }
    },
    usePagination
  )

  // Render the UI for your table
  return (
    <React.Fragment>
      <Row>
        <Col>
          <table className="table table-bordered table-hover">
            <thead className="table-active align-middle text-center">
              {headerGroups.map((headerGroup, thi) => (
                <tr key={thi}>
                  {headerGroup.headers.map((column, tri) => (
                    <th key={tri}>{column.render('Header')}</th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {page.map((row, row_index) => {
                prepareRow(row)
                return (
                  <tr key={row_index}>
                    {row.cells.map((cell, cell_index) => {
                      if (cell_index === 0)
                        return <td key={cell_index} className="align-middle text-center table-light">{row_index + 1}</td>
                      else
                        return <td key={cell_index} className="align-middle table-light">{cell.render('Cell')}</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Col>
      </Row>
      <Row >
        <Col className="d-flex justify-content-center">
          <Pagination>
            <PaginationItem disabled={!canPreviousPage}>
              <PaginationLink first onClick={() => gotoPage(0)}/>
            </PaginationItem>
            <PaginationItem disabled={!canPreviousPage}>
              <PaginationLink previous onClick={() => previousPage()}/>
            </PaginationItem>
            {
              [...Array(pageCount)].map((e, i) =>
                <PaginationItem active={ pageIndex === i ? true : false } key={i}>
                  <PaginationLink onClick={() => gotoPage(i)}>
                    { i + 1}
                  </PaginationLink>
                </PaginationItem>
              )
            }
            <PaginationItem disabled={!canNextPage}>
              <PaginationLink next onClick={() => nextPage()}/>
            </PaginationItem>
            <PaginationItem disabled={!canNextPage}>
              <PaginationLink last onClick={() => gotoPage(pageCount - 1)}/>
            </PaginationItem>
            <PaginationItem>
              <select
                style={{width: '180px'}}
                className="custom-select text-primary"
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value))
                }}
              >
                {[15, 30, 50, 100].map(pageSize => (
                  <option key={pageSize} value={pageSize}>
                    {pageSize} service types
                  </option>
                ))}
              </select>
            </PaginationItem>
          </Pagination>
        </Col>
      </Row>
    </React.Fragment>
  )
}

export const ServiceTypesList = (props) => {
  const location = props.location;
  const backend = new Backend();
  const [loading, setLoading] = useState(false);
  const [serviceTypesDescriptions, setServiceTypesDescriptions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const fetchData = async () => {
        setLoading(true);
        let json = await backend.fetchData('/api/v2/internal/servicetypesdesc');
        setServiceTypesDescriptions(json);
        setLoading(false);
      }
      fetchData();
    }
    catch (err) {
      setError(err)
      setLoading(false)
    }
  }, [])

  const columns = React.useMemo(
    () => [
      {
        Header: '#',
        accessor: null
      },
      {
        Header: 'Service type',
        accessor: 'name'
      },
      {
        Header: 'Description',
        accessor: 'description'
      }
    ]
  )

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && serviceTypesDescriptions) {
    return (
      <BaseArgoView
        resourcename='Services types'
        infoview={true}>
        <Table columns={columns} data={serviceTypesDescriptions}/>
      </BaseArgoView>
    )
  }
}
