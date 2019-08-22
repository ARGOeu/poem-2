import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim } from './UIElements';
import ReactTable from 'react-table';
import { Alert, FormGroup, Label, FormText, Row, Col } from 'reactstrap';
import { Formik, Form, Field } from 'formik';


export class ProbeList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_probe: null,
      search: ''
    };

    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchAllProbes()
      .then(json =>
        this.setState({
          list_probe: json,
          loading: false,
          search: ''
        }))
  }

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name', 
        minWidth: 80,
        accessor: e => 
          <Link to={'/ui/probes/' + e.name}>
            {e.name}
          </Link>,
        filterable: true,
        Filter: (
          <input 
            value={this.state.search}
            onChange={e => this.setState({search: e.target.value})}
            placeholder='Search probes by name'
            style={{width: "100%"}}
          />
        )
      },
      {
        Header: '#versions',
        minWidth: 25,
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        accessor: 'nv'
      },
      {
        Header: 'Description',
        minWidth: 300,
        accessor: 'description',
        filterable: true,
        Filter: ({filter, onChange}) => (
          <input 
            type='text'
            placeholder='Search probes by description'
            value={filter ? filter.value : ''}
            onChange={event => onChange(event.target.value)}
            style={{width: '100%'}}
          />
        ),
        filterMethod: 
          (filter, row) =>
            row[filter.id] !== undefined ? String(row[filter.id]).toLowerCase().includes(filter.value.toLowerCase()) : true
      }
    ];

    const { loading } = this.state;
    var { list_probe } = this.state;

    if (this.state.search) {
      list_probe = list_probe.filter(row => 
        row.name.toLowerCase().includes(this.state.search.toLowerCase())
      )
    }

    if (loading)
      return (<LoadingAnim />)

    else if (!loading && list_probe) {
      return (
        <React.Fragment>
          <div className="d-flex align-items-center justify-content-between">
            <React.Fragment>
              <h2 className="ml-3 mt-1 mb-4">{'Select probe to see details'}</h2>
            </React.Fragment>
          </div>
          <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
            <ReactTable
              data={list_probe}
              columns={columns}
              className='-striped -highlight'
              defaultPageSize={20}
            />
          </div>
        </React.Fragment>
      )
    }
    else
      return null;
  }
}


export class ProbeDetails extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.location = props.location;
    this.backend = new Backend();

    this.state = {
      probe: {},
      loading: false
    };
  }

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchProbeByName(this.name)
      .then((json) => {
        this.setState({
          probe: json,
          loading: false
        });
      });
  }

  render() {
    const { probe, loading } = this.state;

    if (loading)
      return(<LoadingAnim/>)

    else if (!loading) {
      return (
        <React.Fragment>
          <div className="d-flex align-items-center justify-content-between">
          <React.Fragment>
            <h2 className="ml-3 mt-1 mb-4">{'Probe details'}</h2>
            <Link className='btn btn-secondary' to={this.location.pathname + '/history'} role='button'>History</Link>
          </React.Fragment>
          </div>
          <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
            {
              <Alert color='info'>
                <center>
                  This is a read-only instance. Probes can be changed only by super admin.
                </center>
              </Alert>
            }
            <Formik
              initialValues = {{
                name: probe.name,
                version: probe.version,
                repository: probe.repository,
                docurl: probe.docurl,
                description: probe.description,
                comment: probe.comment
              }}
              render = {props => (
                <Form>
                  <FormGroup>
                    <Row>
                      <Col md={6}>
                        <Label for='name'>Name</Label>
                        <Field
                          type='text'
                          name='name'
                          className='form-control'
                          id='name'
                          disabled={true}
                        />
                        <FormText color="muted">
                          Name of this probe.
                        </FormText>
                      </Col>
                      <Col md={2}>
                        <Label for='version'>Version</Label>
                        <Field
                          type='text'
                          name='version'
                          className='form-control'
                          id='version'
                          disabled={true}
                        />
                        <FormText color="muted">
                          Version of the probe.
                        </FormText>
                      </Col>
                    </Row>
                  </FormGroup>
                  <FormGroup>
                    <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Probe metadata</h4>
                    <Row className='mt-4 mb-3 align-items-top'>
                      <Col md={1}>
                        <Label for='repository'>Repository</Label>
                      </Col>
                      <Col md={7}>
                        <Field
                          type='text'
                          name='repository'
                          className='form-control'
                          id='repository'
                          disabled={true}
                        />
                        <FormText color='muted'>
                          Probe repository URL.
                        </FormText>
                      </Col>
                    </Row>
                    <Row className='mb-3 align-items-top'>
                      <Col md={1}>
                        <Label for='docurl'>Documentation</Label>
                      </Col>
                      <Col md={7}>
                        <Field
                          type='text'
                          name='docurl'
                          className='form-control'
                          id='docurl'
                          disabled={true}
                        />
                        <FormText color='muted'>
                          Documentation URL.
                        </FormText>
                      </Col>
                    </Row>
                    <Row className='mb-3 align-items-top'>
                      <Col md={1}>
                        <Label for='description'>Description</Label>
                      </Col>
                      <Col md={7}>
                        <Field
                          component='textarea'
                          name='description'
                          className='form-control'
                          id='description'
                          disabled={true}
                        />
                        <FormText color='muted'>
                          Free text description outlining the purpose of this probe.
                        </FormText>
                      </Col>
                    </Row>
                    <Row className='mb-3 align-items-top'>
                      <Col md={1}>
                        <Label for='comment'>Comment</Label>
                      </Col>
                      <Col md={7}>
                        <Field 
                          component='textarea'
                          name='comment'
                          className='form-control'
                          id='comment'
                          disabled={true}
                        />
                        <FormText color='muted'>
                          Short comment about this version.
                        </FormText>
                      </Col>
                    </Row>
                  </FormGroup>
                </Form>
              )}
            />
          </div>
        </React.Fragment>
      )
    }
  }
}
