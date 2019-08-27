import React, { Component, PureComponent } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';
import { Alert, FormGroup, Label, FormText, Row, Col, Button } from 'reactstrap';
import { Formik, Form, Field } from 'formik';
import ReactDiffViewer from 'react-diff-viewer';


const DiffElement = ({title, item1, item2}) => (
  <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
    <h6 className='mt-4 font-weight-bold text-uppercase'>{title}</h6>
    <ReactDiffViewer
      oldValue={item2}
      newValue={item1}
      showDiffOnly={true}
      splitView={true}
      hideLineNumbers={true}
      disableWordDiff={true}
    />
  </div>
)


export class ProbeList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_probe: null,
      search_name: '',
      search_description: ''
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
          search_name: ''
        }))
  }

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
        minWidth: 80,
        accessor: e => 
          <Link to={'/ui/probes/' + e.name}>
            {e.name}
          </Link>,
        filterable: true,
        Filter: (
          <input 
            value={this.state.search_name}
            onChange={e => this.setState({search_name: e.target.value})}
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
        Filter: (
          <input 
            type='text'
            placeholder='Search probes by description'
            value={this.state.search_description}
            onChange={e=> this.setState({search_description: e.target.value})}
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

    if (this.state.search_name) {
      list_probe = list_probe.filter(row => 
        row.name.toLowerCase().includes(this.state.search_name.toLowerCase())
      )
    }

    if (this.state.search_description) {
      list_probe = list_probe.filter(row =>
        row.description.toLowerCase().includes(this.state.search_description.toLowerCase())  
      )
    }

    if (loading)
      return (<LoadingAnim />)

    else if (!loading && list_probe) {
      return (
        <React.Fragment>
          <div className="d-flex align-items-center justify-content-between">
            <React.Fragment>
              <h2 className="ml-3 mt-1 mb-4">{'Select probe for details'}</h2>
            </React.Fragment>
          </div>
          <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
            <ReactTable
              data={list_probe}
              columns={columns}
              className='-striped -highlight'
              defaultPageSize={50}
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


export class ProbeHistory extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.history = props.history;

    this.state = {
      loading: false,
      list_versions: null,
      compare1: '',
      compare2: ''
    };

    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchVersions('probe', this.name)
      .then((json) => {
        if (json.length > 1) {
          this.setState({
            list_versions: json,
            loading: false,
            compare1: json[0].version,
            compare2: json[1].version
          })
        } else {
          this.setState({
            list_versions: json,
            loading: false
          })
        }
      }
    )
  }

  render() {
    const { loading, list_versions } = this.state; 

    if (loading)
      return (<LoadingAnim />);
    
    else if (!loading && list_versions) {
      return (
        <BaseArgoView
          resourcename='Change history'
          infoview={true}>
            <table className='table table-sm'>
              <thead className='table-active'>
                <tr>
                  { list_versions.length === 1 ?
                    <th scope='col'>Compare</th>
                  :
                    <th scope='col'>
                      <Button
                        color='info'
                        onClick={() => 
                          this.history.push(
                            '/ui/probes/' + this.name + '/history/compare/' + this.state.compare1 + '/' + this.state.compare2,
                          )
                        }
                      >
                        Compare
                      </Button>
                    </th>
                  }
                  <th scope='col'>Version</th>
                  <th scope='col'>Date/time</th>
                  <th scope='col'>User</th>
                  <th scope='col'>Comment</th>
                </tr>
              </thead>
              <tbody>
                {
                  list_versions.map((e, i) =>
                    <tr key={i}>
                      {
                        list_versions.length === 1 ?
                          <td>-</td>
                        :
                          i === 0 ?
                          <td>
                            <input
                              type='radio'
                              name='radio-1'
                              value={e.version}
                              checked={true}
                              onChange={e => this.setState({compare1: e.target.value})}
                            />
                          </td>
                          :
                          <td>
                            <input
                              type='radio'
                              name='radio-1'
                              value={e.version}
                              onChange={e => this.setState({compare1: e.target.value})}
                            /> 
                            {' '}
                            <input
                              type='radio'
                              name='radio-2'
                              value={e.version}
                              checked={i===1}
                              onChange={e => this.setState({compare2: e.target.value})}
                            />
                          </td>
                      }
                      {e.version && 
                        <td>
                          {e.version}
                        </td>
                      }
                      {e.date_created && 
                        <td>
                          {e.date_created}
                        </td>
                      }
                      {e.user && 
                        <td>
                          {e.user}
                        </td>
                      }
                      {e.comment && 
                        <td>
                          {e.comment}
                        </td>
                      }
                    </tr>
                  )
                }
              </tbody>
            </table>
          </BaseArgoView>
      )
    }
    else
      return null
  }
}


export class ProbeVersionCompare extends Component{
  constructor(props) {
    super(props);

    this.version1 = props.match.params.id1;
    this.version2 = props.match.params.id2;
    this.name = props.match.params.name;

    this.state = {
      loading: false,
      name1: '',
      version1: '',
      description1: '',
      repository1: '',
      docurl1: '',
      comment1: '',
      name2: '',
      version2: '',
      description2: '',
      repository2: '',
      docurl2: '',
      comment2: ''
    };

    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchVersions('probe', this.name)
      .then((json) => {
        let name1 = '';
        let version1 = '';
        let description1 = '';
        let repository1 = '';
        let docurl1 = '';
        let comment1 = '';
        let name2 = ''
        let version2 = '';
        let description2 = '';
        let repository2 = '';
        let docurl2 = '';
        let comment2 = '';

        json.forEach((e) => {
          if (e.version == this.version1) {
            name1 = e.fields.name;
            version1 = e.fields.version;
            description1 = e.fields.description;
            repository1 = e.fields.repository;
            docurl1 = e.fields.docurl;
            comment1 = e.fields.comment;
          } else if (e.version === this.version2) {
            name2 = e.fields.name;
            version2 = e.fields.version;
            description2 = e.fields.description;
            repository2 = e.fields.repository;
            docurl2 = e.fields.docurl;
            comment2 = e.fields.comment;
          }
        })

        this.setState({
          name1: name1,
          version1: version1,
          description1: description1,
          repository1: repository1,
          docurl1: docurl1,
          comment1: comment1,
          name2: name2,
          version2: version2,
          description2: description2,
          repository2: repository2,
          docurl2: docurl2,
          comment2: comment2,
          loading: false
        })
      }
    )
  }

  render() {
    var { name1, name2, version1, version2, description1, description2,
    repository1, repository2, docurl1, docurl2, comment1, comment2, loading } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (!loading && name1 && name2) {
      return (
        <React.Fragment>
          <div className="d-flex align-items-center justify-content-between">
            <h2 className='ml-3 mt-1 mb-4'>{'Compare ' + this.name}</h2>
          </div>
          {
            (name1 !== name2) && 
              <DiffElement title='name' item1={name1} item2={name2}/>
          }

          {
            (version1 !== version2) &&
              <DiffElement title='version' item1={version1} item2={version2}/>
          }

          {
            (description1 !== description2) &&
              <DiffElement title='description' item1={description1} item2={description2}/>
          }

          {
            (repository1 !== repository2) &&
              <DiffElement title='repository' item1={repository1} item2={repository2}/>
          }

          {
            (docurl1 !== docurl2) &&
              <DiffElement title={'documentation'} item1={docurl1} item2={docurl2}/>
          }
          {
            (comment1 !== comment2) &&
              <DiffElement title={'comment'} item1={comment1} item2={comment2}/>
          }
        </React.Fragment>
      )
    }
    else
      return null
  }
}
