import React, { useState } from 'react';
import { WebApi } from './DataManager';
import { useQuery } from 'react-query';
import { LoadingAnim, ErrorComponent, BaseArgoView } from './UIElements';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import ReactTable from 'react-table';


export const ReportsList = (props) => {
  const location = props.location;

  const webapi = new WebApi({
    token: props.webapitoken,
    reportsConfigurations: props.webapireports
  });

  const [searchName, setSearchName] = useState('');
  const [searchDescription, setSearchDescription] = useState('');

  const { data: listReports, error: error, isLoading: loading } = useQuery(
    'reports_listview', async () => {
      let json = await webapi.fetchReports();
      let reports = [];
      json.forEach(e => reports.push({
        'name': e.info.name,
        'description': e.info.description,
        'disabled': e.disabled
      }))
      return reports;
    }
  );

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else {
    const columns = [
      {
        Header: '#',
        id: 'row',
        minWidth: 12,
        Cell: (row) =>
          <div style={{textAlign: 'center'}}>
            {row.index + 1}
          </div>
      },
      {
        Header: 'Name',
        id: 'name',
        minWidth: 80,
        accessor: e =>
          <Link to={`/ui/reports/${e.name}`}>
            {e.name}
          </Link>,
        filterable: true,
        Filter: (
          <input
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder='Search by name'
            style={{width: '100%'}}
          />
        )
      },
      {
        Header: 'Description',
        accessor: 'description',
        minWidth: 200,
        filterable: true,
        Filter: (
          <input
            value={searchDescription}
            onChange={e => setSearchDescription(e.target.value)}
            placeholder='Search by description'
            style={{width: '100%'}}
          />
        )
      },
      {
        Header: 'Enabled',
        id: 'disabled',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        accessor: e =>
          e.disabled ?
            <FontAwesomeIcon icon={faTimesCircle} style={{color: '#CC0000'}}/>
          :
            <FontAwesomeIcon icon={faCheckCircle} style={{color: '#339900'}}/>
      }
    ];

    var reports = listReports;
    if (searchName)
      reports = reports.filter(
        row => row.name.toLowerCase().includes(searchName.toLowerCase())
      );

    if (searchDescription)
      reports = reports.filter(
        row => row.description.toLowerCase().includes(searchDescription.toLowerCase())
      );

    return (
      <BaseArgoView
        resourcename='report'
        location={location}
        listview={true}
      >
        <ReactTable
          data={reports}
          columns={columns}
          className='-highlight'
          defaultPageSize={12}
          rowsText='profiles'
          getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
        />
      </BaseArgoView>
    )
  };
};