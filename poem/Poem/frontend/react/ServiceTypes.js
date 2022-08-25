import React from 'react';
import { useQuery } from 'react-query';
import { Backend } from './DataManager';
import { Table } from 'reactstrap';
import {
  LoadingAnim,
  BaseArgoView,
  ErrorComponent,
  Icon,
  BaseArgoTable,
  DefaultColumnFilter
} from './UIElements';
import {
  fetchUserDetails,
} from './QueryFunctions';
import { useTable, usePagination } from 'react-table';


const ServiceTypesCRUDTable = ({columns, data}) => {
  const {
    headerGroups,
    rows,
    prepareRow
  } = useTable({ columns, data })

  return (
    <Table className="table table-bordered table-hover">
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
        {rows.map((row, row_index) => {
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
    </Table>
  )
}


export const ServiceTypesList = (props) => {
  const publicView = props.publicView;

  const backend = new Backend();

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true),
    { enabled: !publicView }
  );

  const { data: serviceTypesDescriptions, errorServiceTypesDescriptions, isLoading: loadingServiceTypesDescriptions} = useQuery(
    `${publicView ? 'public_' : ''}servicetypedesc`, async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}servicetypesdesc`);
    }
  )

  const columns = React.useMemo(
    () => [
      {
        Header: '#',
        accessor: null,
        column_width: '2%'
      },
      {
        Header: <div><Icon i="servicetypes"/> Service type</div>,
        accessor: 'name',
        column_width: '25%',
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Description',
        accessor: 'description',
        column_width: '73%',
        Filter: DefaultColumnFilter
      }
    ], []
  )

  const columnsCRUD = React.useMemo(
    () => [
      {
        Header: '#',
        accessor: null,
        column_width: '2%'
      },
      {
        Header: <div><Icon i="servicetypes"/> Service type</div>,
        accessor: 'name',
        column_width: '25%',
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Description',
        accessor: 'description',
        column_width: '63%',
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Action',
        accessor: 'action',
        column_width: '10%',
      }
    ], []
  )

  if (loadingUserDetails || loadingServiceTypesDescriptions)
    return (<LoadingAnim/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (errorServiceTypesDescriptions)
    return (<ErrorComponent error={errorServiceTypesDescriptions}/>);

  else if (serviceTypesDescriptions && !userDetails?.is_superuser) {
    return (
      <BaseArgoView
        resourcename='Services types'
        infoview={true}>
        <BaseArgoTable
          columns={columns}
          data={serviceTypesDescriptions}
          filter={true}
          resourcename='service types'
          page_size={15}
        />
      </BaseArgoView>
    )
  }
  else if (serviceTypesDescriptions &&  userDetails?.is_superuser)
    return (
      <BaseArgoView
        resourcename='Services types'
        infoview={true}>
        <ServiceTypesCRUDTable
          columns={columnsCRUD}
          data={serviceTypesDescriptions}
        >
        </ServiceTypesCRUDTable>
      </BaseArgoView>
    )
  else
    return null
}
