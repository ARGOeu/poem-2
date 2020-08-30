import React, { useState, useEffect } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, BaseArgoView, ErrorComponent } from './UIElements';
import { useTable, usePagination } from 'react-table';
import {
  Pagination,
  PaginationItem,
  PaginationLink
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
      initialState: { pageIndex: 0 }
    },
    usePagination
  )

  // Render the UI for your table
  return (
    <React.Fragment>
      <table className="table table-bordered table-sm table-hover">
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
      <Pagination>
        <PaginationItem>
          <PaginationLink first onClick={() => gotoPage(0)} disabled={!canPreviousPage}/>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink previous onClick={() => previousPage()} disabled={!canPreviousPage}/>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink next onClick={() => nextPage()} disabled={!canNextPage}/>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink last onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}/>
        </PaginationItem>
        <span>
          Page{' '}
          <strong>
            {pageIndex + 1} of {pageOptions.length}
          </strong>{' '}
        </span>
        <select
          value={pageSize}
          onChange={e => {
            setPageSize(Number(e.target.value))
          }}
        >
          {[10, 20, 30, 40, 50].map(pageSize => (
            <option key={pageSize} value={pageSize}>
              Show {pageSize}
            </option>
          ))}
        </select>
      </Pagination>
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
