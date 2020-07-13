import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, ErrorComponent, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';
import { Formik, Form, Field } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  FormText,
  Button,
  InputGroup,
  InputGroupAddon
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
            accessor: e =>
              <Link to={`/ui/tenants/${e.name.trim().split(' ').join('_')}`}>
                {e.name}
              </Link>
        },
        {
          Header: 'Schema name',
          accessor: 'schema_name'
        },
        {
          Header: 'Tenant POEM URL',
          accessor: 'domain_url'
        }
      ];

      const { loading, list_tenants, error } = this.state;

      if (loading)
        return (<LoadingAnim/>);

      else if (error)
        return (<ErrorComponent error={error}/>);

      else if (!loading && list_tenants) {
        return (
          <BaseArgoView
            resourcename='tenant'
            location={this.location}
            listview={true}
            addnew={false}
          >
            <ReactTable
              data={list_tenants}
              columns={columns}
              className='-highlight'
              defaultPageSize={10}
              rowsText='tenants'
              getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
            />
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
          resourcename='tenant'
          location={this.location}
          history={false}
        >
          <Formik
            initialValues = {{
              name: tenant.name,
              schema: tenant.schema_name,
              url: tenant.domain_url,
              created_on: tenant.created_on
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