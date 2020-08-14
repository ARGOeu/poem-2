import React, { useState, useEffect } from 'react';
import { WebApi } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, ErrorComponent, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';


export const OperationsProfilesList = (props) => {
  const [loading, setLoading] = useState(false);
  const [listProfiles, setListProfiles] = useState(null);
  const [error, setError] = useState(null);

  const location = props.location;
  const webapi = new WebApi({
    token: props.webapitoken,
    operationsProfiles: props.webapioperations
  });

  useEffect(() => {
    setLoading(true);
    async function fetchData() {
      try {
          let json = await webapi.fetchOperationsProfiles();
          setListProfiles(json);
      } catch(err) {
        setError(err);
      };
      setLoading(false);
    };
    fetchData();
  }, []);

  const columns = [
    {
      Header: 'Name',
      id: 'name',
      accessor: e =>
        <Link to={`/ui/operationsprofiles/${e.name}`}>
          {e.name}
        </Link>
    }
  ];

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
        <ReactTable
          data={listProfiles}
          columns={columns}
          className='-highlight'
          defaultPageSize={12}
          rowsText='profiles'
          getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
        />
      </BaseArgoView>
    )

  else
    return null;
};
