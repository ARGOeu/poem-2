import React, { useState, useEffect } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, ErrorComponent } from './UIElements';
import { useTable } from 'react-table';

function Table({ columns, data }) {
  // Use the state and functions returned from useTable to build your UI
  const {
    headerGroups,
    rows,
    prepareRow,
  } = useTable({
    columns,
    data,
  })

  // Render the UI for your table
  return (
    <table className="table table-bordered table-hover">
      <thead className="table-active align-middle text-center">
        {headerGroups.map(headerGroup => (
          <tr>
            {headerGroup.headers.map(column => (
              <th>{column.render('Header')}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {rows.map((row, row_index) => {
          prepareRow(row)
          return (
            <tr>
              {row.cells.map((cell, cell_index) => {
                if (cell_index === 0)
                  return <td className="align-middle text-center table-light">{row_index + 1}</td>
                else
                  return <td className="align-middle table-light">{cell.render('Cell')}</td>
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
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
      <Table columns={columns} data={serviceTypesDescriptions}/>
    )
  }
}
