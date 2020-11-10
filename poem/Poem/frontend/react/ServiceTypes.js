import React, { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);
  const [serviceTypesDescriptions, setServiceTypesDescriptions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const fetchData = async () => {
        setLoading(true);
        let json = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}servicetypesdesc`);
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
