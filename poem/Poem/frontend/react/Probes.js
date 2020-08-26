import React, { Component, useState, useEffect } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  Checkbox,
  FancyErrorMessage,
  AutocompleteField,
  DiffElement,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  ModalAreYouSure
} from './UIElements';
import ReactTable from 'react-table-6';
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
import * as Yup from 'yup';


const ProbeSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  package: Yup.string()
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
  <div className='form-control' style={{backgroundColor: '#e9ecef', overflow: 'hidden', textOverflow: 'ellipsis'}}>
    <a href={value} style={{'whiteSpace': 'nowrap'}}>{value}</a>
  </div>
)


const ProbeForm = ({
  isTenantSchema=false,
  isHistory=false,
  publicView=false,
  errors={
    name: undefined,
    package: undefined,
    repository: undefined,
    docurl: undefined,
    comment: undefined
  },
  addview=false,
  cloneview=false,
  list_packages=[],
  setFieldValue=undefined,
  values=undefined,
  onSelect=undefined,
  metrictemplatelist=[],
  version=undefined
}) =>
  <>
    <FormGroup>
      <Row>
        <Col md={6}>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
            <Field
              type='text'
              name='name'
              className={`form-control ${errors.name && 'border-danger'}`}
              id='name'
              disabled={isTenantSchema || isHistory || publicView}
            />
          </InputGroup>
          {
            errors.name &&
              FancyErrorMessage(errors.name)
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
              className='form-control'
              value={version}
              id='version'
              disabled={true}
            />
          </InputGroup>
          <FormText color="muted">
            Version of the probe.
          </FormText>
        </Col>
        {
          (!addview && !cloneview && !isTenantSchema && !isHistory && !publicView) &&
            <Col md={2}>
              <Field
                component={Checkbox}
                name='update_metrics'
                className='form-control'
                id='checkbox'
                label='Update metric templates'
              />
              <FormText color='muted'>
                Update all associated metric templates.
              </FormText>
            </Col>
        }
      </Row>
      <Row className='mt-3'>
        <Col md={8}>
          {
            (isTenantSchema || isHistory || publicView) ?
              <InputGroup>
                <InputGroupAddon addonType='prepend'>Package</InputGroupAddon>
                <Field
                  type='text'
                  name='package'
                  className='form-control'
                  id='package'
                  disabled={true}
                />
              </InputGroup>
            :
              <>
                <AutocompleteField
                  setFieldValue={setFieldValue}
                  lists={list_packages}
                  icon='packages'
                  field='package'
                  val={values.package}
                  onselect_handler={onSelect}
                  req={errors.package}
                  label='Package'
                />
                {
                  errors.package &&
                    FancyErrorMessage(errors.package)
                }
              </>
          }
          <FormText color='muted'>
            Probe is part of selected package.
          </FormText>
        </Col>
      </Row>
    </FormGroup>
    <FormGroup>
      <ParagraphTitle title='Probe metadata'/>
      <Row className='mt-4 mb-3 align-items-top'>
        <Col md={8}>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Repository</InputGroupAddon>
            {
              (isTenantSchema || isHistory || publicView) ?
                <Field
                  component={LinkField}
                  name='repository'
                  className='form-control'
                  id='repository'
                  disabled={true}
                />
              :
                <Field
                  type='text'
                  name='repository'
                  className={`form-control ${errors.repository && 'border-danger'}`}
                  id='repository'
                />
            }
          </InputGroup>
          {
            errors.repository &&
              FancyErrorMessage(errors.repository)
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
            {
              (isTenantSchema || isHistory || publicView) ?
                <Field
                  component={LinkField}
                  name='docurl'
                  className='form-control'
                  id='docurl'
                  disabled={true}
                />
              :
                <Field
                  type='text'
                  name='docurl'
                  className={`form-control ${errors.docurl && 'border-danger'}`}
                  id='docurl'
                />
            }
          </InputGroup>
          {
            errors.docurl &&
              FancyErrorMessage(errors.docurl)
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
            className={`form-control ${errors.description && 'border-danger'}`}
            id='description'
            disabled={isTenantSchema || isHistory || publicView}
          />
          {
            errors.description &&
              FancyErrorMessage(errors.description)
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
            className={`form-control ${errors.comment && 'border-danger'}`}
            id='comment'
            disabled={isTenantSchema || isHistory || publicView}
          />
          {
            errors.comment &&
              FancyErrorMessage(errors.comment)
          }
          <FormText color='muted'>
            Short comment about this version.
          </FormText>
        </Col>
      </Row>
      {
        (!isHistory && !addview && !cloneview) &&
          <Row>
            <Col md={8}>
              <div>
                Metric templates:
                {
                  metrictemplatelist.length > 0 &&
                    <div>
                      {
                        metrictemplatelist
                          .map((e, i) => <Link
                            key={i}
                            to={
                              publicView ?
                                `/ui/public_metrictemplates/${e}`
                              :
                                isTenantSchema ?
                                  `/ui/probes/${values.name}/${e}`
                                :
                                  `/ui/metrictemplates/${e}`
                            }>
                              {e}
                            </Link>
                          ).reduce((prev, curr) => [prev, ', ', curr])
                      }
                    </div>
                }
              </div>
            </Col>
          </Row>
      }
    </FormGroup>
  </>


export const ProbeList = (props) => {
  const location = props.location;
  const publicView = props.publicView;

  const [loading, setLoading] = useState(false);
  const [listProbes, setListProbes] = useState(null);
  const [isTenantSchema, setIsTenantSchema] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [searchDescription, setSearchDescription] = useState('');
  const [searchPackage, setSearchPackage] = useState('');
  const [error, setError] = useState(null);

  const backend = new Backend();

  useEffect(() => {
    setLoading(true);

    async function fetchProbes() {
      try {
        let json = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}probes`);
        let schema = await backend.isTenantSchema();
        setListProbes(json);
        setIsTenantSchema(schema)
      } catch(err) {
        setError(err);
      };
      setLoading(false);
    };

    fetchProbes();
  }, []);

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
        <Link to={`/ui/${publicView ? 'public_' : ''}probes/${e.name}`}>
          {e.name}
        </Link>,
      filterable: true,
      Filter: (
        <input
          value={searchName}
          onChange={e => setSearchName(e.target.value)}
          placeholder='Search by name'
          style={{width: "100%"}}
        />
      )
    },
    {
      Header: '#versions',
      id: 'nv',
      minWidth: 25,
      accessor: e =>
        <Link to={`/ui/${publicView ? 'public_' : ''}probes/${e.name}/history`}>
          {e.nv}
        </Link>,
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>
    },
    {
      Header: 'Package',
      minWidth: 120,
      accessor: 'package',
      filterable: true,
      Filter: (
        <input
          type='text'
          placeholder='Search by package'
          value={searchPackage}
          onChange={e => setSearchPackage(e.target.value)}
          style={{width: '100%'}}
        />
      ),
      filterMethod:
        (filter, row) =>
          row[filter.id] !== undefined ? String(row[filter.id]).toLowerCase().includes(filter.value.toLowerCase()) : true
    },
    {
      Header: 'Description',
      minWidth: 200,
      accessor: 'description',
      filterable: true,
      Filter: (
        <input
          type='text'
          placeholder='Search by description'
          value={searchDescription}
          onChange={e=> setSearchDescription(e.target.value)}
          style={{width: '100%'}}
        />
      ),
      filterMethod:
        (filter, row) =>
          row[filter.id] !== undefined ? String(row[filter.id]).toLowerCase().includes(filter.value.toLowerCase()) : true
    }
  ];

  var list_probe = listProbes;
  if (searchName) {
    list_probe = list_probe.filter(row =>
      row.name.toLowerCase().includes(searchName.toLowerCase())
    );
  };

  if (searchDescription) {
    list_probe = list_probe.filter(row =>
      row.description.toLowerCase().includes(searchDescription.toLowerCase())
    );
  };

  if (searchPackage) {
    list_probe = list_probe.filter(row =>
      row.package.toLowerCase().includes(searchPackage.toLowerCase())
    );
  };

  if (loading)
    return (<LoadingAnim />);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && listProbes) {
    return (
      <BaseArgoView
        resourcename='probe'
        location={location}
        listview={true}
        addnew={!isTenantSchema && !publicView}
      >
        <ReactTable
          data={list_probe}
          columns={columns}
          className='-highlight'
          defaultPageSize={50}
          rowsText='probes'
          getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
        />
      </BaseArgoView>
    );
  } else
    return null;
};


export const ProbeComponent = (props) => {
  const name = props.match.params.name;
  const addview = props.addview;
  const cloneview = props.cloneview;
  const location = props.location;
  const history = props.history;
  const publicView = props.publicView;
  const backend = new Backend();

  const apiListPackages = `/api/v2/internal/${publicView ? 'public_' : ''}packages`;
  const apiProbeName = `/api/v2/internal/${publicView ? 'public_' : ''}probes`;
  const apiMetricsForProbes = `/api/v2/internal/${publicView ? 'public_' : ''}metricsforprobes`;

  const [probe, setProbe] = useState({
    'id': '',
    'name': '',
    'version': '',
    'package': '',
    'repository': '',
    'docurl': '',
    'description': '',
    'comment': ''
  });
  const [isTenantSchema, setIsTenantSchema] = useState(null);
  const [metricTemplateList, setMetricTemplateList] = useState([]);
  const [listPackages, setListPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);
  const [error, setError] = useState(null);

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  };

  function onSubmitHandle(values, actions) {
    let msg = `Are you sure you want to ${addview || cloneview ? 'add' : 'change'} probe?`;
    let title = `${addview || cloneview ? 'Add' : 'Change'} probe`;

    setFormValues(values);
    setModalMsg(msg);
    setModalTitle(title);
    setModalFlag('submit');
    toggleAreYouSure();
  };

  async function doChange() {
    if (addview || cloneview) {
      let cloned_from = undefined;
      if (cloneview) {
        cloned_from = formValues.id;
      } else {
        cloned_from = '';
      }

      let response = await backend.addObject(
        '/api/v2/internal/probes/',
        {
          name: formValues.name,
          package: formValues.package,
          repository: formValues.repository,
          docurl: formValues.docurl,
          description: formValues.description,
          comment: formValues.comment,
          cloned_from: cloned_from
        }
      );
      if (!response.ok) {
        let add_msg = '';
        try {
          let json = await response.json();
          add_msg = json.detail;
        } catch(err) {
          add_msg = 'Error adding probe';
        }
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: add_msg
        });
      } else {
        NotifyOk({
          msg: 'Probe successfully added',
          title: 'Added',
          callback: () => history.push('/ui/probes')
        });
      };
    } else {
      let response = await backend.changeObject(
        '/api/v2/internal/probes/',
        {
          id: formValues.id,
          name: formValues.name,
          package: formValues.package,
          repository: formValues.repository,
          docurl: formValues.docurl,
          description: formValues.description,
          comment: formValues.comment,
          update_metrics: formValues.update_metrics
        }
      );
      if (!response.ok) {
        let change_msg = '';
        try {
          let json = await response.json();
          change_msg = json.detail;
        } catch(err) {
          change_msg = 'Error changing probe';
        };
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: change_msg
        });
      } else {
        NotifyOk({
          msg: 'Probe successfully changed',
          title: 'Changed',
          callback: () => history.push('/ui/probes')
        });
      };
    };
  };

  async function doDelete() {
    let response = await backend.deleteObject(`/api/v2/internal/probes/${name}`);
    if (!response.ok) {
      let msg = '';
      try {
        let json = await response.json();
        msg = json.detail;
      } catch(err) {
        msg = 'Error deleting probe';
      };
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    } else {
      NotifyOk({
        msg: 'Probe successfully deleted',
        title: 'Deleted',
        callback: () => history.push('/ui/probes')
      });
    };
  };

  function onSelect(field, value) {
    let selectedProbe = probe;
    selectedProbe[field] = value;
    try {
      selectedProbe['version'] = value.split(' ')[1].slice(1, -1);
    } catch(err) {
      if (err instanceof TypeError)
        selectedProbe['version'] = '';
    };
    setProbe(selectedProbe);
  };

  useEffect(() => {
    setLoading(true);

    async function fetchProbe() {
      try {
        let schema = await backend.isTenantSchema();
        let pkgs = await backend.fetchData(apiListPackages);
        let list_packages = [];
        pkgs.forEach(e => list_packages.push(`${e.name} (${e.version})`));
        setListPackages(list_packages);
        setIsTenantSchema(schema);
        if (!addview) {
          let prb = await backend.fetchData(`${apiProbeName}/${name}`);
          let metrics = await backend.fetchData(`${apiMetricsForProbes}/${prb.name}(${prb.version})`);
          setProbe(prb);
          setMetricTemplateList(metrics);
        };
      } catch(err) {
        setError(err);
      };

      setLoading(false);
    };

    fetchProbe();
  }, []);

  if (loading)
    return(<LoadingAnim/>)

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading) {
    if (!isTenantSchema) {
      return (
        <React.Fragment>
          <ModalAreYouSure
            isOpen={areYouSureModal}
            toggle={toggleAreYouSure}
            title={modalTitle}
            msg={modalMsg}
            onYes={modalFlag === 'submit' ? doChange : modalFlag === 'delete' ? doDelete : undefined}
          />
          <BaseArgoView
            resourcename={`${publicView ? 'Probe details' : 'probe'}`}
            location={location}
            addview={addview}
            cloneview={cloneview}
            clone={true}
            publicview={publicView}
          >
            <Formik
              initialValues = {{
                id: probe.id,
                name: probe.name,
                version: probe.version,
                package: probe.package,
                repository: probe.repository,
                docurl: probe.docurl,
                description: probe.description,
                comment: probe.comment,
                update_metrics: false
              }}
              validationSchema={ProbeSchema}
              onSubmit = {(values, actions) => onSubmitHandle(values, actions)}
            >
              {props => (
                <Form>
                  <ProbeForm
                    {...props}
                    addview={addview}
                    cloneview={cloneview}
                    publicView={publicView}
                    list_packages={listPackages}
                    onSelect={onSelect}
                    metrictemplatelist={metricTemplateList}
                    version={probe.version}
                  />
                  {
                    !publicView &&
                      <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                        {
                          (!addview && !cloneview && !publicView) ?
                            <Button
                              color='danger'
                              onClick={() => {
                                setModalMsg('Are you sure you want to delete probe?');
                                setModalTitle('Delete probe');
                                setModalFlag('delete');
                                toggleAreYouSure();
                                }}
                            >
                              Delete
                            </Button>
                          :
                            <div></div>
                        }
                        <Button
                          color='success'
                          id='submit-button'
                          type='submit'
                        >
                          Save
                        </Button>
                      </div>
                }
                </Form>
              )}
            </Formik>
          </BaseArgoView>
        </React.Fragment>
      )
    } else {
      return (
        <BaseArgoView
          resourcename='Probe details'
          location={location}
          tenantview={true}
          history={true}
        >
          <Formik
            initialValues = {{
              id: probe.id,
              name: probe.name,
              version: probe.version,
              package: probe.package,
              repository: probe.repository,
              docurl: probe.docurl,
              description: probe.description,
              comment: probe.comment
            }}
            render = {props => (
              <ProbeForm
                {...props}
                isTenantSchema={true}
                publicView={publicView}
                metrictemplatelist={metricTemplateList}
                version={probe.version}
              />
            )}
          />
        </BaseArgoView>
      );
    };
  };
};


export class ProbeVersionCompare extends Component{
  constructor(props) {
    super(props);
    this.version1 = props.match.params.id1;
    this.version2 = props.match.params.id2;
    this.name = props.match.params.name;
    this.publicView = props.publicView

    this.state = {
      loading: false,
      name1: '',
      version1: '',
      package1: '',
      description1: '',
      repository1: '',
      docurl1: '',
      comment1: '',
      name2: '',
      version2: '',
      package2: '',
      description2: '',
      repository2: '',
      docurl2: '',
      comment2: '',
      error: null
    };

    if (this.publicView)
      this.apiUrl = '/api/v2/internal/public_version/probe/'
    else
      this.apiUrl = '/api/v2/internal/version/probe/'

    this.backend = new Backend();
  }

  async componentDidMount() {
    this.setState({loading: true});

    try {
      let json = await this.backend.fetchData(`${this.apiUrl}/${this.name}`);
      let name1 = '';
      let version1 = '';
      let package1 = '';
      let description1 = '';
      let repository1 = '';
      let docurl1 = '';
      let comment1 = '';
      let name2 = ''
      let version2 = '';
      let package2 = '';
      let description2 = '';
      let repository2 = '';
      let docurl2 = '';
      let comment2 = '';

      json.forEach((e) => {
        if (e.version == this.version1) {
          name1 = e.fields.name;
          version1 = e.fields.version;
          package1 = e.fields.package;
          description1 = e.fields.description;
          repository1 = e.fields.repository;
          docurl1 = e.fields.docurl;
          comment1 = e.fields.comment;
        } else if (e.version === this.version2) {
          name2 = e.fields.name;
          version2 = e.fields.version;
          package2 = e.fields.package;
          description2 = e.fields.description;
          repository2 = e.fields.repository;
          docurl2 = e.fields.docurl;
          comment2 = e.fields.comment;
        }
      });

      this.setState({
        name1: name1,
        version1: version1,
        package1: package1,
        description1: description1,
        repository1: repository1,
        docurl1: docurl1,
        comment1: comment1,
        name2: name2,
        version2: version2,
        package2: package2,
        description2: description2,
        repository2: repository2,
        docurl2: docurl2,
        comment2: comment2,
        loading: false
      });
    } catch(err) {
      this.setState({
        error: err,
        loading: false
      });
    };
  }

  render() {
    var { name1, name2, version1, version2, package1, package2,
      description1, description2, repository1, repository2,
      docurl1, docurl2, comment1, comment2, loading, error } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (error)
      return (<ErrorComponent error={error}/>);

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
            (package1 !== package2) &&
              <DiffElement title='package' item1={package1} item2={package2}/>
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
      );
    }
    else
      return null;
  }
}


export class ProbeVersionDetails extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.version = props.match.params.version;
    this.publicView = props.publicView

    this.backend = new Backend();

    if (this.publicView)
      this.apiUrl = '/api/v2/internal/public_version/probe/'
    else
      this.apiUrl = '/api/v2/internal/version/probe/'

    this.state = {
      name: '',
      version: '',
      pkg: '',
      description: '',
      repository: '',
      docurl: '',
      comment: '',
      loading: false,
      error: null
    };
  }

  async componentDidMount() {
    this.setState({loading: true});

    try {
      let json = await this.backend.fetchData(`${this.apiUrl}/${this.name}`);
      json.forEach((e) => {
        if (e.version === this.version)
          this.setState({
            name: e.fields.name,
            version: e.fields.version,
            pkg: e.fields.package,
            description: e.fields.description,
            repository: e.fields.repository,
            docurl: e.fields.docurl,
            comment: e.fields.comment,
            loading: false
          });
      });
    } catch(err) {
      this.setState({
        error: err,
        loading: false
      });
    };
  }

  render() {
    const { name, version, pkg, description, repository,
      docurl, comment, loading, error } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (error)
      return (<ErrorComponent error={error}/>);

    else if (!loading && name) {
      return (
        <BaseArgoView
          resourcename={`${name} (${version})`}
          infoview={true}
        >
          <Formik
            initialValues = {{
              name: name,
              version: version,
              package: pkg,
              repository: repository,
              docurl: docurl,
              description: description,
              comment: comment
            }}
            render = {props => (
              <ProbeForm
                {...props}
                state={this.state}
                isHistory={true}
              />
            )}
          />
        </BaseArgoView>
      );
    }
    else
      return null;
  }
}
