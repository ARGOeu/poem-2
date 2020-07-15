import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, ErrorComponent, BaseArgoView } from './UIElements';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  InputGroup,
  InputGroupAddon,
  Card,
  CardHeader,
  CardBody,
  CardText,
  CardGroup
} from 'reactstrap';


export class TenantList extends Component {
  constructor(props) {
    super(props);

    this.location = props.location;

    this.state = {
        list_tenants: null,
        loading: false,
        error: null
    };

    this.backend = new Backend();
    };

    async componentDidMount() {
      this.setState({ loading: true });

      try {
        let json = await this.backend.fetchData('/api/v2/internal/tenants');
        this.setState({
            list_tenants: json,
            loading: false
        });
      } catch(err) {
        this.setState({
            error: err,
            loading: false
        });
      };
    };

    render() {
      const { loading, list_tenants, error } = this.state;

      if (loading)
        return (<LoadingAnim/>);

      else if (error)
        return (<ErrorComponent error={error}/>);

      else if (!loading && list_tenants) {
        let groups = [];
        for (let i = 0; i < list_tenants.length; i = i + 3) {
          let cards = []
          for (let j = 0; j < 3; j++) {
            if ((i + j) < list_tenants.length)
              cards.push(
                <Card className='mr-2' key={j + 1}>
                  <CardHeader>
                    <Link  to={`/ui/tenants/${list_tenants[i + j].name.trim().split(' ').join('_')}`}>
                      {list_tenants[i + j].name}
                    </Link>
                  </CardHeader>
                  <CardBody>
                    <CardText>
                      <b>Schema name:</b> {list_tenants[i + j].schema_name}
                    </CardText>
                    <CardText>
                      <b>POEM url:</b> {list_tenants[i + j].domain_url}
                    </CardText>
                  </CardBody>
                </Card>
              )
          }
          let group_width = '100%';
          if (cards.length == 1)
            group_width = '33.3333%'

          if (cards.length == 2)
            group_width = '66.6666%'

          groups.push(
            <CardGroup key={i} className='mb-2' style={{width: group_width}}>
              {
                cards.map((card, k) => card)
              }
            </CardGroup>
          )
        }

        return (
          <BaseArgoView
            resourcename='tenant'
            location={this.location}
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
};


export class TenantChange extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.location = props.location;
    this.history = props.history;

    this.state = {
      tenant: {},
      loading: false,
      error: null
    };

    this.backend = new Backend();
  };

  async componentDidMount() {
    this.setState({ loading: true });

    try {
      let json = await this.backend.fetchData(
        `/api/v2/internal/tenants/${this.name.trim().split(' ').join('_')}`
        );

      this.setState({
        tenant: json,
        loading: false
      });
    } catch(err) {
      this.setState({
        error: err,
        loading: false
      });
    };
  };

  render() {
    const { tenant, loading, error } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (error)
      return (<ErrorComponent error={error}/>);

    else if (!loading && tenant) {
      return (
        <BaseArgoView
          resourcename='Tenant details'
          location={this.location}
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
                  <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Basic info</h4>
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
};