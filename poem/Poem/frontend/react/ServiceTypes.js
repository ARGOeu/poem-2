import React from 'react';
import { useQuery } from 'react-query';
import { Backend } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  ErrorComponent,
  Icon,
  BaseArgoTable,
  DefaultColumnFilter
} from './UIElements';


export const ServiceTypesList = (props) => {
  const publicView = props.publicView;

  const backend = new Backend();

  const { data: serviceTypesDescriptions, error, status } = useQuery(
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
        column_width: '20%',
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Description',
        accessor: 'description',
        column_width: '78%',
        Filter: DefaultColumnFilter
      }
    ], []
  )

  if (status === 'loading')
    return (<LoadingAnim/>);

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (serviceTypesDescriptions) {
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
}
