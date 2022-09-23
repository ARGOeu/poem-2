import React from 'react';
import { useQuery } from 'react-query';
import { Backend } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  ErrorComponent,
  BaseArgoTable,
  DefaultColumnFilter
} from './UIElements';


export const DefaultPortsList = () => {
  const backend = new Backend();

  const { data: defaultPorts, error, status } = useQuery(
    "defaultports", async () => {
      return await backend.fetchData("/api/v2/internal/default_ports")
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
        Header: "Port name",
        accessor: 'name',
        column_width: '45%',
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Port value',
        accessor: 'value',
        column_width: '45%',
        Filter: DefaultColumnFilter
      }
    ], []
  )

  if (status === 'loading')
    return (<LoadingAnim/>);

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (defaultPorts) {
    return (
      <BaseArgoView
        resourcename='Default ports'
        infoview={true}
      >
        <BaseArgoTable
          columns={columns}
          data={defaultPorts}
          filter={true}
          resourcename='default ports'
          page_size={15}
        />
      </BaseArgoView>
    )
  }
}
