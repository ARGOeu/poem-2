import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, BaseArgoView, NotifyOk, Checkbox, FancyErrorMessage } from './UIElements';
import ReactTable from 'react-table';
import {
  FormGroup, 
  Label, 
  FormText, 
  Row, 
  Col, 
  Button, 
  InputGroup, 
  InputGroupAddon } from 'reactstrap';
import { Formik, Form, Field } from 'formik';
import ReactDiffViewer from 'react-diff-viewer';
import { NotificationManager } from 'react-notifications';
import * as Yup from 'yup';


export const ProbeHistory = HistoryComponent('probe')


export const DiffElement = ({title, item1, item2}) => {
  item1 = item1.split('\r\n')
  item2 = item2.split('\r\n')

  let n = Math.max(item1.length, item2.length)

  if (item1.length > item2.length) {
    for (let i=item2.length; i < item1.length; i++) {
      item2.push(' ');
    }
  } else if (item2.length > item1.length) {
    for (let i=item1.length; i < item2.length; i++) {
      item1.push(' ');
    }
  }

  const elements = [];
  for (let i = 0; i < n; i++) {
    elements.push(
    <ReactDiffViewer 
      oldValue={item2[i]}   
      newValue={item1[i]}
      showDiffOnly={true}
      splitView={false}
      hideLineNumbers={true}
      disableWordDiff={true}
      key={'diff-' + i}
    />
    )
  }

  return (
  <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
    <h6 className='mt-4 font-weight-bold text-uppercase'>{title}</h6>
    {elements}
  </div>
  )
}


const ProbeSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  version: Yup.string()
    .matches(/^\S*$/, 'Version cannot contain white spaces')
    .required('Required'),
  repository: Yup.string()
    .url('Invalid url')
    .required('Required'),
  docurl: Yup.string()
    .url('Invalid url')
    .required('Required'),
  description: Yup.string()
    .required('Required'),
  comment: Yup.string()
    .required('Required')
});


const LinkField = ({
  field: { value },
  ...props
}) => (
  <div className='form-control' style={{backgroundColor: '#e9ecef'}}>
    <a href={value}>{value}</a>
  </div>
)


const ProbeForm = () =>
  <>
    <FormGroup>
      <Row>
        <Col md={6}>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
            <Field
              type='text'
              name='name'
              className='form-control'
              id='name'
              disabled={true}
            />          
          </InputGroup>
          <FormText color="muted">
            Name of this probe.
          </FormText>
        </Col>
        <Col md={2}>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Version</InputGroupAddon>
            <Field
              type='text'
              name='version'
              className='form-control'
              id='version'
              disabled={true}
            />
          </InputGroup>
          <FormText color="muted">
            Version of the probe.
          </FormText>
        </Col>
      </Row>
    </FormGroup>
    <FormGroup>
      <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Probe metadata</h4>
      <Row className='mt-4 mb-3 align-items-top'>
        <Col md={8}>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Repository</InputGroupAddon>
            <Field
              component={LinkField}
              name='repository'
              className='form-control'
              id='repository'
              disabled={true}
            />
          </InputGroup>
          <FormText color='muted'>
            Probe repository URL.
          </FormText>
        </Col>
      </Row>
      <Row className='mb-3 align-items-top'>
        <Col md={8}>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Documentation</InputGroupAddon>
            <Field
              component={LinkField}
              name='docurl'
              className='form-control'
              id='docurl'
              disabled={true}
            />
          </InputGroup>
          <FormText color='muted'>
            Documentation URL.
          </FormText>
        </Col>
      </Row>
      <Row className='mb-3 align-items-top'>
        <Col md={8}>
          <Label for='description'>Description</Label>
          <Field
            component='textarea'
            name='description'
            rows='15'
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
        <Col md={8}>
          <Label for='comment'>Comment</Label>
          <Field 
            component='textarea'
            name='comment'
            rows='5'
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
  </>


export class ProbeList extends Component {
  constructor(props) {
    super(props);

    this.location = props.location;

    this.state = {
      loading: false,
      list_probe: null,
      poemversion: null,
      search_name: '',
      search_description: ''
    };

    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true});

    Promise.all([
      this.backend.fetchAllProbes(),
      this.backend.fetchPoemVersion()
    ])
      .then(([json, ver]) =>
        this.setState({
          list_probe: json,
          poemversion: ver,
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
        id: 'nv',
        minWidth: 25,
        accessor: e =>
          <Link to={'/ui/probes/' + e.name + '/history'}>
            {e.nv}
          </Link>,
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>
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

    var { poemversion, list_probe, loading } = this.state;

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
            {
              poemversion === 'tenant' ?
                <React.Fragment>
                  <h2 className="ml-3 mt-1 mb-4">{'Select probe for details'}</h2>
                </React.Fragment>
              :
                <React.Fragment>
                  <h2 className="ml-3 mt-1 mb-4">{'Select probe to change'}</h2>
                  <Link className="btn btn-secondary" to={this.location.pathname + "/add"} role="button">Add</Link>
                </React.Fragment>
            }
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


export class ProbeChange extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.addview = props.addview;
    this.location = props.location;
    this.history = props.history;
    this.backend = new Backend();

    this.state = {
      probe: {},
      poemversion: null,
      metrictemplatelist: [],
      validationVisible: true,
      new_version: true,
      update_metrics: false,
      loading: false,
      write_perm: false,
      areYouSureModal: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined
    };

    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.onSubmitHandle = this.onSubmitHandle.bind(this);
    this.doDelete = this.doDelete.bind(this);
    this.onDismiss = this.onDismiss.bind(this);
  }

  toggleAreYouSure() {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal}));
  }

  toggleAreYouSureSetModal(msg, title, onyes) {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal,
        modalFunc: onyes,
        modalMsg: msg,
        modalTitle: title,
      }));
  }

  onSubmitHandle(values, actions) {
    let msg = undefined;
    let title = undefined;

    if (this.addview) {
      msg = 'Are you sure you want to add Probe?';
      title = 'Add probe';
    } else {
      if (values.new_version && values.version === this.state.probe.version) {
        NotificationManager.error(
          'Version number should be changed.',
          'Version error'
        )
      } else {
        msg = 'Are you sure you want to change Probe?';
        title = 'Change probe';
      }
    }

    if (msg && title) {
      this.toggleAreYouSureSetModal(msg, title,
        () => this.doChange(values, actions))
    }
  }

  doChange(values, actions) {
    if (!this.addview) {
      this.backend.changeProbe({
        id: values.id,
        name: values.name,
        version: values.version,
        repository: values.repository,
        docurl: values.docurl,
        description: values.description,
        comment: values.comment,
        new_version: values.new_version,
        update_metrics: values.update_metrics
      })
        .then(response => {
          if (!response.ok) {
            response.json()
              .then(json => {
                NotificationManager.error(json.detail, 'Error');
              });
          } else {
            NotifyOk({
              msg: 'Probe successfully changed',
              title: 'Changed',
              callback: () => this.history.push('/ui/probes')
            });
          }
        })
        .catch(err => alert('Something went wrong: ' + err))
    } else {
      this.backend.addProbe({
        name: values.name,
        version: values.version,
        repository: values.repository,
        docurl: values.docurl,
        description: values.description,
        comment: values.comment
      })
        .then(response => {
          if (!response.ok) {
            response.json()
              .then(json => {
                NotificationManager.error(json.detail, 'Error');
              });
          } else {
            NotifyOk({
              msg: 'Probe successfully added',
              title: 'Added',
              callback: () => this.history.push('/ui/probes')
            });
          }
        })
        .catch(err => alert('Something went wrong: ' + err))
    }
  }

  doDelete(name) {
    this.backend.deleteProbe(name)
      .then(response => {
        if (!response.ok) {
          response.json()
            .then(json => {
              NotificationManager.error(json.detail, 'Error');
            });
        } else {
          NotifyOk({
            msg: 'Probe successfully deleted',
            title: 'Deleted',
            callback: () => this.history.push('/ui/probes')
          })
        }
      })
      .catch(err => alert('Something went wrong: ' + err))
  }

  onDismiss() {
    this.setState({ validationVisible: false });
  }

  componentDidMount() {
    this.setState({loading: true});

    if (!this.addview) {
      Promise.all([
        this.backend.fetchProbeByName(this.name),
        this.backend.fetchPoemVersion()
      ])
          .then(([probe, ver]) => {
            this.backend.fetchMetricTemplatesByProbeVersion(probe.name + '(' + probe.version + ')')
            .then(metrics => {
              this.setState({
                probe: probe,
                poemversion: ver,
                metrictemplatelist: metrics,
                write_perm: localStorage.getItem('authIsSuperuser') === 'true',
                loading: false
              });
            })
          });
    } else {
      this.backend.fetchPoemVersion()
        .then((ver) => {
          this.setState({
            probe: {
              id: '',
              name: '',
              version: '',
              repository: '',
              docurl: '',
              description: '',
              comment: ''
            },
            poemversion: ver,
            write_perm: localStorage.getItem('authIsSuperuser') === 'true',
            loading: false
          })
        })
    }
  }

  render() {
    const { probe, new_version, update_metrics, poemversion, metrictemplatelist, write_perm, loading } = this.state;

    if (loading)
      return(<LoadingAnim/>)

    else if (!loading) {
      if (poemversion === 'superadmin') {
        return (
          <BaseArgoView
            resourcename='Probes'
            location={this.location}
            addview={this.addview}
            modal={true}
            state={this.state}
            toggle={this.toggleAreYouSure}
            submitperm={write_perm}>
            <Formik
              initialValues = {{
                id: probe.id,
                name: probe.name,
                version: probe.version,
                repository: probe.repository,
                docurl: probe.docurl,
                description: probe.description,
                comment: probe.comment,
                new_version: new_version,
                update_metrics: update_metrics
              }}
              validationSchema={ProbeSchema}
              onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            >
              {({errors, touched, values}) => (
                <Form>
                  <FormGroup>
                    <Row>
                      <Col md={6}>
                        <InputGroup>
                          <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
                          <Field
                            type='text'
                            name='name'
                            className={errors.name ? 'form-control border-danger' : 'form-control'}
                            id='name'
                          />          
                        </InputGroup>
                          {
                            errors.name ? 
                              FancyErrorMessage(errors.name)
                            : 
                              null
                          }
                        <FormText color="muted">
                          Name of this probe.
                        </FormText>
                      </Col>
                      <Col md={2}>
                        <InputGroup>
                          <InputGroupAddon addonType='prepend'>Version</InputGroupAddon>
                          <Field
                            type='text'
                            name='version'
                            className={errors.version ? 'form-control border-danger' : 'form-control'}
                            id='version'
                          />
                        </InputGroup>
                          {
                            errors.version ? 
                              FancyErrorMessage(errors.version)
                            : 
                              null
                          }
                        <FormText color="muted">
                          Version of the probe.
                        </FormText>
                      </Col>
                      {
                        !this.addview &&
                          <>
                            <Col md={2}>
                              <Field
                                component={Checkbox}
                                name='new_version'
                                className='form-control'
                                id='checkbox-1'
                                label='New version'
                              />
                              <FormText color='muted'>
                                Create version for changes.
                              </FormText>
                            </Col>
                            <Col md={2}>
                              <Field
                                component={Checkbox}
                                name='update_metrics'
                                className='form-control'
                                id='checkbox-2'
                                label='Update metric templates'
                              />
                              <FormText color='muted'>
                                Update all associated metric templates.
                              </FormText>
                            </Col>
                          </>
                      }
                    </Row>
                  </FormGroup>
                  <FormGroup>
                    <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Probe metadata</h4>
                    <Row className='mt-4 mb-3 align-items-top'>
                      <Col md={8}>
                        <InputGroup>
                          <InputGroupAddon addonType='prepend'>Repository</InputGroupAddon>
                          <Field
                            type='text'
                            name='repository'
                            className={errors.repository ? 'form-control border-danger' : 'form-control'}
                            id='repository'
                          />
                        </InputGroup>
                          {
                            errors.repository ? 
                              FancyErrorMessage(errors.repository)
                            : 
                              null
                          }
                        <FormText color='muted'>
                          Probe repository URL.
                        </FormText>
                      </Col>
                    </Row>
                    <Row className='mb-3 align-items-top'>
                      <Col md={8}>
                        <InputGroup>
                          <InputGroupAddon addonType='prepend'>Documentation</InputGroupAddon>
                          <Field
                            type='text'
                            name='docurl'
                            className={errors.docurl ? 'form-control border-danger' : 'form-control'}
                            id='docurl'
                          />
                        </InputGroup>
                          {
                            errors.docurl ? 
                              FancyErrorMessage(errors.docurl)
                            : 
                              null
                          }
                        <FormText color='muted'>
                          Documentation URL.
                        </FormText>
                      </Col>
                    </Row>
                    <Row className='mb-3 align-items-top'>
                      <Col md={8}>
                        <Label for='description'>Description</Label>
                        <Field
                          component='textarea'
                          name='description'
                          rows='15'
                          className={errors.description? 'form-control border-danger' : 'form-control'} 
                          id='description'
                        />
                          {
                            errors.description ? 
                              FancyErrorMessage(errors.description)
                            : 
                              null
                          }
                        <FormText color='muted'>
                          Free text description outlining the purpose of this probe.
                        </FormText>
                      </Col>
                    </Row>
                    <Row className='mb-3 align-items-top'>
                      <Col md={8}>
                        <Label for='comment'>Comment</Label>
                        <Field 
                          component='textarea'
                          name='comment'
                          rows='5'
                          className={errors.comment? 'form-control border-danger' : 'form-control'}
                          id='comment'
                        />
                          {
                            errors.comment ? 
                              FancyErrorMessage(errors.comment)
                            : 
                              null
                          }
                        <FormText color='muted'>
                          Short comment about this version.
                        </FormText>
                      </Col>
                    </Row>
                    {
                      !this.addview &&
                      <Row>
                        <Col md={8}>
                          <div>
                            Metric templates: 
                            {
                              metrictemplatelist.length > 0 && 
                              <div>
                                {
                                  metrictemplatelist
                                    .map((e, i) => <Link key={i} to={'/ui/metrictemplates/' + e}>{e}</Link>)
                                    .reduce((prev, curr) => [prev, ', ', curr])
                                }
                            </div>
                            }
                          </div>
                        </Col>
                      </Row>
                    }
                  </FormGroup>
                  {
                    (write_perm) &&
                      <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                        <Button 
                        color='danger'
                        onClick={() => {
                          this.toggleAreYouSureSetModal(
                            'Are you sure you want to delete Probe?',
                            'Delete probe',
                            () => this.doDelete(values.name)
                          )
                        }}>
                          Delete
                        </Button>
                        <Button color='success' id='submit-button' type='submit'>
                          Save
                        </Button>
                      </div>  
                }
                </Form>
              )}
            </Formik>
          </BaseArgoView>
        )
      } else {
        return (
          <React.Fragment>
            <div className="d-flex align-items-center justify-content-between">
              <h2 className="ml-3 mt-1 mb-4">{'Probe details'}</h2>
              <Link className='btn btn-secondary' to={this.location.pathname + '/history'} role='button'>History</Link>
            </div>
            <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
              <Formik
                initialValues = {{
                  id: probe.id,
                  name: probe.name,
                  version: probe.version,
                  repository: probe.repository,
                  docurl: probe.docurl,
                  description: probe.description,
                  comment: probe.comment
                }}
                render = {props => (
                  <ProbeForm/> 
                )}
              />
            </div>
          </React.Fragment>
        )
      }
    }
  }
}


export function HistoryComponent(obj) {
  return class extends Component {
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

      this.backend.fetchVersions(obj, this.name)
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
                                '/ui/'+obj+'s/' + this.name + '/history/compare/' + this.state.compare1 + '/' + this.state.compare2,
                              )
                            }
                          >
                            Compare
                          </Button>
                        </th>
                      }
                      {obj === 'probe' && <th scope='col'>Version</th>}
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
                                  value={obj === 'probe' ? e.version : e.date_created}
                                  defaultChecked={true}
                                  onChange={e => this.setState({compare1: e.target.value})}
                                />
                              </td>
                              :
                              <td>
                                <input
                                  type='radio'
                                  name='radio-1'
                                  value={obj === 'probe' ? e.version : e.date_created}
                                  onChange={e => this.setState({compare1: e.target.value})}
                                /> 
                                {' '}
                                <input
                                  type='radio'
                                  name='radio-2'
                                  value={obj === 'probe' ? e.version : e.date_created}
                                  defaultChecked={i===1}
                                  onChange={e => this.setState({compare2: e.target.value})}
                                />
                              </td>
                          }
                          {
                            obj === 'probe' &&
                              <td>
                                {e.version ? <Link to={'/ui/' + obj +'s/' + e.fields.name + '/history/' + e.version}>{e.version}</Link> : ''}
                              </td>
                          }
                          <td>
                            {e.date_created ? 
                              (obj === 'metrictemplate') ? 
                                  <Link to={'/ui/metrictemplates/' + e.fields.name + '/history/' + e.version}>{e.date_created}</Link> 
                                  : 
                                    (obj === 'metric') ?
                                      <Link to={'/ui/metrics/' + e.fields.name + '/history/' + e.version}>{e.date_created}</Link>
                                    :
                                      e.date_created 
                              : 
                                ''
                               }
                          </td>
                          <td>
                            {e.user ? e.user : ''}
                          </td>
                          <td className={obj === 'probe' ? 'col-md-6' : 'col-md-8'}>
                            {e.comment ? e.comment : ''}
                          </td>
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


export class ProbeVersionDetails extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.version = props.match.params.version;

    this.backend = new Backend();

    this.state = {
      name: '',
      version: '',
      description: '',
      repository: '',
      docurl: '',
      comment: '',
      loading: false
    };
  }

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchVersions('probe', this.name)
      .then((json) => {
        json.forEach((e) => {
          if (e.version === this.version) 
            this.setState({
              name: e.fields.name,
              version: e.fields.version,
              description: e.fields.description,
              repository: e.fields.repository,
              docurl: e.fields.docurl,
              comment: e.fields.comment,
              loading: false
            });
        });
      }
    )
  }

  render() {
    const { name, version, description, repository, docurl, comment, loading} = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (!loading && name) {
      return (
        <React.Fragment>
          <div className='d-flex align-items-center justify-content-between'>
            <React.Fragment>
              <h2 className='ml-3 mt-1 mb-4'>{name + ' (' + version + ')'}</h2>
            </React.Fragment>
          </div>
          <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
            <Formik
              initialValues = {{
                name: name,
                version: version,
                repository: repository,
                docurl: docurl,
                description: description,
                comment: comment
              }}
              render = {props => (
                <ProbeForm/>
              )}
              />
          </div>
        </React.Fragment>
      )
    }
    else
      return null
  }
}
