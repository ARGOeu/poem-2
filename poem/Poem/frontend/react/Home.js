import React from 'react';
import { Card, CardBody, CardTitle, CardSubtitle, CardGroup } from 'reactstrap';
import { CustomCardHeader } from './Administration';
import { Icon, ErrorComponent, ParagraphTitle } from './UIElements';
import { Link } from 'react-router-dom';
import { Backend } from './DataManager';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdBadge } from '@fortawesome/free-solid-svg-icons';
import { useQuery } from 'react-query';


const Home = () =>
(
  <div>
    &quot;I am Home&quot;
  </div>
)

export default Home;


export const PublicHome = (props) => {
  const isSuperAdmin = props.isSuperAdmin;

  const backend = new Backend();

  const { data: tenants, error: error, isLoading: loading } = useQuery(
    'public_home_tenants', async () => {
      let json = await backend.fetchData('/api/v2/internal/public_tenants');
      let tenants_without_SP = []
      json.forEach(e => {
        if (e.name !== 'SuperPOEM Tenant')
          tenants_without_SP.push(e);
      })
      return tenants_without_SP;
    },
    { enabled: isSuperAdmin }
  )

  if (isSuperAdmin) {
    if (loading)
      return (
        <div className="placeholder-glow">
          <h2 className='ms-3 mt-1 mb-4'>Public pages</h2>
          <Card className='mb-2'>
            <CustomCardHeader title='Shared resources'/>
            <CardBody>
              <div className='p-1 align-items-center'>
                <Icon i='probes'/> <Link to={'/ui/public_probes'}>Probes</Link>
              </div>
              <div className='p-1 align-items-center'>
                <Icon i='metrictemplates'/> <Link to={'/ui/public_metrictemplates'}>Metric templates</Link>
              </div>
              <div className="p-1 align-items-center">
                <Icon i="default_ports" /> <Link to={ "/ui/public_default_ports" }>Default ports</Link>
              </div>
            </CardBody>
          </Card>
          <ParagraphTitle title='Tenants'/>
          <CardGroup style={{ width: "66.6666%" }}>
            <Card className="me-3">
              <CardSubtitle className='mb-4 mt-3 text-center'>
                <FontAwesomeIcon icon={faIdBadge} size='5x'/>
              </CardSubtitle>
              <CardBody>
                <span className="placeholder rounded" style={{ height: "152px", width: "100%" }} />
              </CardBody>
            </Card>
            <Card>
              <CardSubtitle className='mb-4 mt-3 text-center'>
                <FontAwesomeIcon icon={faIdBadge} size='5x'/>
              </CardSubtitle>
              <CardBody>
                <span className="placeholder rounded" style={{ height: "152px", width: "100%" }} />
              </CardBody>
            </Card>
          </CardGroup>
        </div>
      )

    else if (error)
      return (<ErrorComponent error={error}/>);

    else if (!loading && tenants) {
      let groups = [];
      for (let i = 0; i < tenants.length; i = i + 3) {
        let cards = [];
        for (let j = 0; j < 3; j++) {
          if ((i + j) < tenants.length)
            cards.push(
              <Card className='me-3' key={j + 1}>
                <CardTitle className='text-center'><h3>{tenants[i + j].name}</h3></CardTitle>
                <CardSubtitle className='mb-4 mt-3 text-center'>
                  <FontAwesomeIcon icon={faIdBadge} size='5x'/>
                </CardSubtitle>
                <CardBody>
                  <Card>
                    <CustomCardHeader title='Tenant resources'/>
                    <CardBody>
                      <div className='p-1 align-items-center'>
                        <Icon i='metrics'/> <a href={`https://${tenants[i + j].domain_url}/ui/public_metrics`}>Metrics</a>
                      </div>
                      <div className='p-1 align-items-center'>
                        <Icon i='reports'/> <a href={`https://${tenants[i + j].domain_url}/ui/public_reports`}>Reports</a>
                      </div>
                      <div className='p-1 align-items-center'>
                        <Icon i='metricprofiles'/> <a href={`https://${tenants[i + j].domain_url}/ui/public_metricprofiles`}>Metric profiles</a>
                      </div>
                      <div className='p-1 align-items-center'>
                        <Icon i='aggregationprofiles'/> <a href={`https://${tenants[i + j].domain_url}/ui/public_aggregationprofiles`}>Aggregation profiles</a>
                      </div>
                      <div className='p-1 align-items-center'>
                        <Icon i='thresholdsprofiles'/> <a href={`https://${tenants[i + j].domain_url}/ui/public_thresholdsprofiles`}>Thresholds profiles</a>
                      </div>
                      <div className='p-1 align-items-center'>
                        <Icon i='operationsprofiles'/> <a href={`https://${tenants[i + j].domain_url}/ui/public_operationsprofiles`}>Operations profiles</a>
                      </div>
                    </CardBody>
                  </Card>
                </CardBody>
              </Card>
            )
        }
        let group_width = '100%';
        if (cards.length == 1)
          group_width = '33.3333%';

        if (cards.length == 2)
          group_width = '66.6666%';

        groups.push(
          <CardGroup key={i} className='mb-3' style={{width: group_width}}>
            {
              cards.map((card) => card)
            }
          </CardGroup>
        )
      }
      return (
        <>
          <h2 className='ms-3 mt-1 mb-4'>Public pages</h2>
          <Card className='mb-2'>
            <CustomCardHeader title='Shared resources'/>
            <CardBody>
              <div className='p-1 align-items-center'>
                <Icon i='probes'/> <Link to={'/ui/public_probes'}>Probes</Link>
              </div>
              <div className='p-1 align-items-center'>
                <Icon i='metrictemplates'/> <Link to={'/ui/public_metrictemplates'}>Metric templates</Link>
              </div>
              <div className="p-1 align-items-center">
                <Icon i="default_ports" /> <Link to={ "/ui/public_default_ports" }>Default ports</Link>
              </div>
            </CardBody>
          </Card>
          <ParagraphTitle title='Tenants'/>
          {
            groups.map((group) => group)
          }
        </>
      )
    } else
      return null;
  } else {
    return (
      <>
        <h2 className='ms-3 mt-1 mb-4'>Public pages</h2>
        <Card className='mb-2'>
          <CustomCardHeader title='Shared resources'/>
          <CardBody>
            <div className='p-1 align-items-center'>
              <Icon i='probes'/> <Link to={'/ui/public_probes'}>Probes</Link>
            </div>
            <div className='p-1 align-items-center'>
              <Icon i='metrictemplates'/> <Link to={'/ui/public_metrictemplates'}>Metric templates</Link>
            </div>
            <div className="p-1 align-items-center">
              <Icon i="default_ports" /> <Link to={ "/ui/public_default_ports" }>Default ports</Link>
            </div>
          </CardBody>
        </Card>
        <Card className='mb-2'>
          <CustomCardHeader title='Tenant resources'/>
          <CardBody>
            <div className='p-1 align-items-center'>
              <Icon i='metrics'/> <Link to={'/ui/public_metrics'}>Metrics</Link>
            </div>
            <div className='p-1 align-items-center'>
              <Icon i='reports'/> <Link to={'/ui/public_reports'}>Reports</Link>
            </div>
            <div className='p-1 align-items-center'>
              <Icon i='servicetypes'/> <Link to={'/ui/public_servicetypes'}>Service types</Link>
            </div>
            <div className='p-1 align-items-center'>
              <Icon i='metricprofiles'/> <Link to={'/ui/public_metricprofiles'}>Metric profiles</Link>
            </div>
            <div className='p-1 align-items-center'>
              <Icon i='aggregationprofiles'/> <Link to={'/ui/public_aggregationprofiles'}>Aggregation profiles</Link>
            </div>
            <div className='p-1 align-items-center'>
              <Icon i='thresholdsprofiles'/> <Link to={'/ui/public_thresholdsprofiles'}>Thresholds profiles</Link>
            </div>
            <div className='p-1 align-items-center'>
              <Icon i='operationsprofiles'/> <Link to={'/ui/public_operationsprofiles'}>Operations profiles</Link>
            </div>
          </CardBody>
        </Card>
      </>
    );
  }
};
