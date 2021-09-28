import React, { useState } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, ErrorComponent, BaseArgoView, ParagraphTitle, NotifyError, NotifyOk } from './UIElements';
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
  CardSubtitle,
  Button
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdBadge } from '@fortawesome/free-solid-svg-icons';
import { useMutation, useQuery, useQueryClient } from 'react-query';


export const TenantList = (props) => {
  const location = props.location;
  const history = props.history;

  const backend = new Backend();

  const { data: tenants, error, status } = useQuery(
    'tenant', async () => {
      return await backend.fetchData('/api/v2/internal/tenants');
    }
  );

  if (status === 'loading')
    return (<LoadingAnim/>);

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (tenants) {
    let groups = [];
    for (let i = 0; i < tenants.length; i = i + 3) {
      let cards = []
      for (let j = 0; j < 3; j++) {
        if ((i + j) < tenants.length)
          cards.push(
            <Card data-testid={`${tenants[i + j].name}-card`} className='mr-3' key={j + 1} tag='a' onClick={() => history.push(`/ui/tenants/${tenants[i + j].name}`)} style={{cursor: 'pointer'}}>
              <CardTitle className='text-center'>
                <h3>{tenants[i + j].name}</h3>
              </CardTitle>
              <CardSubtitle className='mb-4 mt-3 text-center'>
                <FontAwesomeIcon icon={faIdBadge} size='5x'/>
              </CardSubtitle>
              <CardFooter>
                <CardText data-testid={`${tenants[i + j].name}-schema`} className='mb-1'>
                  <b>Schema name:</b> {tenants[i + j].schema_name}
                </CardText>
                <CardText data-testid={`${tenants[i + j].name}-poem`}>
                  <b>POEM url:</b> {tenants[i + j].domain_url}
                </CardText>
                <div className='mb-1'>
                  <Badge color='info' className='mr-2' data-testid={`${tenants[i + j].name}-metrics`}>
                    {`Metric${tenants[i + j].schema_name == 'public' ? ' templates ' : 's '
                    }`}
                    <Badge style={{fontSize: '10pt'}} color='light'>{tenants[i + j].nr_metrics}</Badge>
                  </Badge>
                </div>
                <div>
                  <Badge color='success' data-testid={`${tenants[i + j].name}-probes`}>
                    Probes <Badge style={{fontSize: '10pt'}} color='light'>{tenants[i + j].nr_probes}</Badge>
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
            cards.map((card) => card)
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
          groups.map((group) => group)
        }
      </BaseArgoView>
    );
  } else
    return null;
};


export const TenantChange = (props) => {
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);

  const name = props.match.params.name;
  const location = props.location;
  const history = props.history;

  const backend = new Backend();

  const queryClient = useQueryClient();
  const deleteMutation = useMutation(
    () => backend.deleteObject(`/api/v2/internal/tenants/${name.trim().split(' ').join('_')}`)
  );

  const { data: tenant, error, status } = useQuery(
    ['tenant', name], async () => {
      return await backend.fetchData(`/api/v2/internal/tenants/${name.trim().split(' ').join('_')}`);
    },
    {
      initialData: () => {
        return queryClient.getQueryData('tenant')?.find(ten => ten.name === name)
      }
    }
  )

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  async function doDelete() {
    try {
      await deleteMutation.mutateAsync(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries('tenant');
          NotifyOk({
            msg: 'Tenant successfully deleted',
            title: 'Deleted',
            callback: () => history.push('/ui/tenants')
          })
        }
      })
    } catch(error) {
      NotifyError({
        title: 'Error', msg: error.message ? error.message : 'Error deleting tenant.'
      })
    }
  }

  if (status === 'loading')
    return (<LoadingAnim/>);

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (tenant) {
    return (
      <BaseArgoView
        resourcename='Tenant details'
        location={location}
        history={false}
        infoview={true}
        modal={true}
        state={{
          areYouSureModal,
          modalTitle,
          modalMsg,
          modalFunc: doDelete
        }}
        toggle={toggleAreYouSure}
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
        >
          {() => (
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
                        data-testid='name'
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
                        data-testid='schema'
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
                        data-testid='url'
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
                        data-testid='created_on'
                        readOnly
                        className='form-control'
                      />
                    </InputGroup>
                  </Col>
                </Row>
              </FormGroup>
              <>
                <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                  <Button
                    color='danger'
                    onClick={() => {
                      setModalMsg('Are you sure you want to delete tenant?');
                      setModalTitle('Delete tenant');
                      toggleAreYouSure();
                    }}
                  >
                    Delete
                  </Button>
                </div>
                <div></div>
              </>
            </Form>
          )}
        </Formik>
      </BaseArgoView>
    );
  } else
    return null;
};