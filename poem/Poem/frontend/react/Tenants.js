import React, { useState, useEffect } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, ErrorComponent, BaseArgoView, ParagraphTitle } from './UIElements';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  InputGroup,
  InputGroupAddon,
  Card,
  CardText,
  CardGroup,
  CardFooter,
  Badge,
  CardTitle,
  CardSubtitle
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdBadge } from '@fortawesome/free-solid-svg-icons';


export const TenantList = (props) => {
  const [listTenants, setListTenants] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null)

  const location = props.location;
  const history = props.history;

  const backend = new Backend();

  useEffect(() => {
    setLoading(true);
    async function fetchData() {
      try {
        let json = await backend.fetchData('/api/v2/internal/tenants');
        setListTenants(json);
      } catch(err) {
        setError(err);
      };
      setLoading(false);
    };
    fetchData();
  }, [])

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && listTenants) {
    let groups = [];
    for (let i = 0; i < listTenants.length; i = i + 3) {
      let cards = []
      for (let j = 0; j < 3; j++) {
        if ((i + j) < listTenants.length)
          cards.push(
            <Card className='mr-3' key={j + 1} tag='a' onClick={() => history.push(`/ui/tenants/${listTenants[i + j].name}`)} style={{cursor: 'pointer'}}>
              <CardTitle className='text-center'>
                <h3>{listTenants[i + j].name}</h3>
              </CardTitle>
              <CardSubtitle className='mb-4 mt-3 text-center'>
                <FontAwesomeIcon icon={faIdBadge} size='5x'/>
              </CardSubtitle>
              <CardFooter>
                <CardText className='mb-1'>
                  <b>Schema name:</b> {listTenants[i + j].schema_name}
                </CardText>
                <CardText>
                  <b>POEM url:</b> {listTenants[i + j].domain_url}
                </CardText>
                <div className='mb-1'>
                  <Badge color='info' className='mr-2'>
                    {`Metric${listTenants[i + j].schema_name == 'public' ? ' templates ' : 's '
                    }`}
                    <Badge style={{fontSize: '10pt'}} color='light'>{listTenants[i + j].nr_metrics}</Badge>
                  </Badge>
                </div>
                <div>
                  <Badge color='success'>
                    Probes <Badge style={{fontSize: '10pt'}} color='light'>{listTenants[i + j].nr_probes}</Badge>
                  </Badge>
                </div>
              </CardFooter>
            </Card>
          )
      }
      let group_width = '100%';
      if (cards.length == 1)
        group_width = '33.3333%'

      if (cards.length == 2)
        group_width = '66.6666%'

      groups.push(
        <CardGroup key={i} className='mb-3' style={{width: group_width}}>
          {
            cards.map((card, k) => card)
          }
        </CardGroup>
      )
    }

    return (
      <BaseArgoView
        resourcename='tenant'
        location={location}
        listview={true}
        addnew={false}
      >
        {
          groups.map((group, k) => group)
        }
      </BaseArgoView>
    );
  } else
    return null;
};


export const TenantChange = (props) => {
  const [tenant, setTenant] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const name = props.match.params.name;
  const location = props.location;

  const backend = new Backend();

  useEffect(() => {
    setLoading(true);
    async function fetchData() {
      try {
        let json = await backend.fetchData(
          `/api/v2/internal/tenants/${name.trim().split(' ').join('_')}`
        );
        setTenant(json)
      } catch(err) {
        setError(err);
      };
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && tenant) {
    return (
      <BaseArgoView
        resourcename='Tenant details'
        location={location}
        history={false}
        infoview={true}
      >
        <Formik
          initialValues = {{
            name: tenant.name,
            schema: tenant.schema_name,
            url: tenant.domain_url,
            created_on: tenant.created_on,
            nr_metrics: tenant.nr_metrics,
            nr_probes: tenant.nr_probes
          }}
          render = {props => (
            <Form>
              <FormGroup>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
                      <Field
                        type='text'
                        name='name'
                        id='name'
                        readOnly
                        className='form-control form-control-lg'
                      />
                    </InputGroup>
                  </Col>
                </Row>
              </FormGroup>
              <FormGroup>
                <ParagraphTitle title='basic info'/>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Schema</InputGroupAddon>
                      <Field
                        type='text'
                        name='schema'
                        id='schema'
                        readOnly
                        className='form-control'
                      />
                    </InputGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>POEM URL</InputGroupAddon>
                      <Field
                        type='text'
                        name='url'
                        id='url'
                        readOnly
                        className='form-control'
                      />
                    </InputGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Created on</InputGroupAddon>
                      <Field
                        type='text'
                        name='created_on'
                        id='created_on'
                        readOnly
                        className='form-control'
                      />
                    </InputGroup>
                  </Col>
                </Row>
              </FormGroup>
            </Form>
          )}
        />
      </BaseArgoView>
    );
  } else
    return null;
};