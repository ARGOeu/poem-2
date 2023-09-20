import React, { useState } from 'react';
import { Backend } from './DataManager';
import { 
  LoadingAnim, 
  ErrorComponent, 
  BaseArgoView, 
  ParagraphTitle, 
  NotifyError, 
  NotifyOk 
} from './UIElements';
import {
  FormGroup,
  Row,
  Col,
  InputGroup,
  InputGroupText,
  Card,
  CardText,
  CardGroup,
  CardFooter,
  Badge,
  CardTitle,
  CardSubtitle,
  Button,
  Form,
  Input
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faIdBadge } from '@fortawesome/free-solid-svg-icons';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { fetchTenants } from './QueryFunctions';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CustomButton, CustomHeadline, CustomInput, CustomSubtitle, CustomTable } from './CustomPlaceholders';

export const TenantList = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { data: tenants, error, status } = useQuery(
    'tenant', () => fetchTenants()
  );

  if (status === 'loading')
    return (
      <>
        <CustomHeadline height="38.4px" width="358px" />
        <Form className='ms-2 mb-2 mt-2 p-3 border placeholder-glow rounded d-flex flex-column'>
          <Row>
            <Col md={4}>
              <CustomTable height="322px" />
            </Col>
            <Col md={4}>
              <CustomTable height="322px" />
            </Col>
          </Row>
        </Form>
      </>
    );

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (tenants) {
    let groups = [];
    for (let i = 0; i < tenants.length; i = i + 3) {
      let cards = []
      for (let j = 0; j < 3; j++) {
        if ((i + j) < tenants.length)
          cards.push(
            <Card data-testid={`${tenants[i + j].name}-card`} className='me-3' key={ j + 1 }>
              <CardTitle className='text-center' onClick={() => navigate(`/ui/tenants/${tenants[i + j].name}`)} style={{cursor: 'pointer', color: 'black'}}>
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
                  <b>POEM url:</b> <a href={`https://${tenants[i + j].domain_url}`}>{ tenants[i + j].domain_url }</a>
                </CardText>
                {
                  tenants[i + j].combined &&
                    <>
                      <CardText data-testid={`${tenants[i + j].name}-combined`} className="mb-1">
                        <b>Combined tenant</b>
                      </CardText>
                      <CardText data-testid={`${tenants[i + j].name}-combined_from`}>
                        <b>Combined from:</b> { tenants[i + j].combined_from.join(", ") }
                      </CardText>
                    </>

                }
                <div className='mb-1'>
                  <Badge 
                    color='info' 
                    className='me-2' 
                    data-testid={`${tenants[i + j].name}-metrics`}
                    href={ `https://${tenants[i + j].domain_url}/ui/public_metrics` }
                  >
                    { `Metric${tenants[i + j].schema_name == 'public' ? ' templates ' : 's ' }` }
                    <Badge style={{fontSize: '10pt', color: 'black'}} color='light'>{tenants[i + j].nr_metrics}</Badge>
                  </Badge>
                </div>
                <div>
                  <Badge 
                    color='success' 
                    data-testid={`${tenants[i + j].name}-probes`}
                    href={ `https://${tenants[i + j].domain_url}/ui/public_probes` }
                  >
                    Probes <Badge style={{fontSize: '10pt', color: 'black'}} color='light'>{tenants[i + j].nr_probes}</Badge>
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


const TenantForm = ({
  initialValues=undefined,
  doDelete=undefined,
  ...props
}) => {
  const location = props.location

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);

  const { control } = useForm({
    defaultValues: initialValues
  })

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

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
      <Form>
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Name</InputGroupText>
                <Controller
                  name="name"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="name"
                      disabled={ true }
                      className="form-control form-control-lg"
                    />
                  }
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
                <InputGroupText>Schema</InputGroupText>
                <Controller
                  name="schema"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="schema"
                      disabled={ true }
                      className="form-control"
                    />
                  }
                />
              </InputGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>POEM URL</InputGroupText>
                <Controller
                  name="url"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="url"
                      disabled={ true }
                      className="form-control"
                    />
                  }
                />
              </InputGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Created on</InputGroupText>
                <Controller
                  name="created_on"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="created_on"
                      disabled={ true }
                      className="form-control"
                    />
                  }
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
                setModalTitle('Delete tenant')
                toggleAreYouSure()
              }}
            >
              Delete
            </Button>
          </div>
          <div></div>
        </>
      </Form>
    </BaseArgoView>
  )
}


export const TenantChange = (props) => {
  const { name } = useParams();
  const navigate = useNavigate();

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

  async function doDelete() {
    try {
      await deleteMutation.mutateAsync(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries('tenant');
          NotifyOk({
            msg: 'Tenant successfully deleted',
            title: 'Deleted',
            callback: () => navigate('/ui/tenants')
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
    return (
      <>
        <CustomHeadline height="38.4px" width="211px" />

        <Form className='ms-2 mb-2 mt-2 p-3 border placeholder-glow rounded d-flex flex-column'>
          <CustomInput height="48px" width="50%" custStyle="mb-3" />
          <CustomSubtitle height="36.8px" custStyle="mb-2" />
          <CustomInput height="37.6px" width="50%" custStyle="mb-2" />
          <CustomInput height="37.6px" width="50%" custStyle="mb-2" />
          <CustomInput height="37.6px" width="50%" custStyle="mb-2" />

          <div className='ms-2 mb-2 mt-5 p-3 border placeholder-glow rounded d-flex justify-content-start'>
              <CustomButton height="37.6px" width="100px" />
          </div>
        </Form>
      </>
    );

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (tenant) {
    return (
      <TenantForm
        { ...props }
        initialValues={{
          name: tenant.name,
          schema: tenant.schema_name,
          url: tenant.domain_url,
          created_on: tenant.created_on,
          nr_metrics: tenant.nr_metrics,
          nr_probes: tenant.nr_probes
        }}
        doDelete={ doDelete }
      />
    )
  } else
    return null;
};