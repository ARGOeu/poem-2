import React, { useState, useEffect } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  AutocompleteField,
  DiffElement,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  DefaultColumnFilter,
  BaseArgoTable,
  CustomErrorMessage
} from './UIElements';
import {
  FormGroup,
  Label,
  FormText,
  Row,
  Col,
  Button,
  InputGroup,
  InputGroupAddon } from 'reactstrap';
import { Formik, Form, Field, useFormikContext, useField } from 'formik';
import * as Yup from 'yup';
import { useQuery } from 'react-query';


const ProbeSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  pkg: Yup.string()
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
  field: { value }
}) => (
  <div className='form-control' style={{backgroundColor: '#e9ecef', overflow: 'hidden', textOverflow: 'ellipsis'}}>
    <a href={value} style={{'whiteSpace': 'nowrap'}}>{value}</a>
  </div>
)


const VersionField = (props) => {
  const {
    values: { pkg },
    setFieldValue
  } = useFormikContext();

  const [field] = useField(props);

  useEffect(() => {
    if (pkg !== '') {
      let version = undefined;
      try {
        version = pkg.split('(')[1].slice(0, -1);
      } catch(err) {
        version = '';
      }
      setFieldValue(props.name, version);
    }
  }, [pkg, setFieldValue, props.name]);

  return (<input {...field} {...props} />)
}


const ProbeForm = ({
  isTenantSchema=false,
  isHistory=false,
  publicView=false,
  addview=false,
  cloneview=false,
  list_packages=[],
  metrictemplatelist=[],
  ...props
}) =>
  <>
    <FormGroup>
      <Row>
        <Col md={6}>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
            <Field
              type='text'
              data-testid='name'
              name='name'
              className={
                `form-control ${props.errors.name && props.touched.name && 'border-danger'}`}
              disabled={isTenantSchema || isHistory || publicView}
            />
          </InputGroup>
          <CustomErrorMessage name='name' />
          <FormText color="muted">
            Name of this probe.
          </FormText>
        </Col>
        <Col md={2}>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Version</InputGroupAddon>
            <VersionField
              type='text'
              data-testid='version'
              name='version'
              className='form-control'
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
              <label>
                <Field
                  type='checkbox'
                  name='update_metrics'
                  className='mr-1'
                />
                Update metric templates
              </label>
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
                  name='pkg'
                  data-testid='pkg'
                  className='form-control'
                  disabled={true}
                />
              </InputGroup>
            :
              <>
                <AutocompleteField
                  {...props}
                  lists={list_packages}
                  icon='packages'
                  field='pkg'
                  label='Package'
                />
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
                  disabled={true}
                />
              :
                <Field
                  type='text'
                  data-testid='repository'
                  name='repository'
                  className={`form-control ${props.errors.repository && props.touched.repository && 'border-danger'}`}
                />
            }
          </InputGroup>
          <CustomErrorMessage name='repository' />
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
                  disabled={true}
                />
              :
                <Field
                  type='text'
                  name='docurl'
                  data-testid='docurl'
                  className={`form-control ${props.errors.docurl && props.touched.docurl && 'border-danger'}`}
                />
            }
          </InputGroup>
          <CustomErrorMessage name='docurl' />
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
            id='description'
            rows='15'
            className={`form-control ${props.errors.description && props.touched.description && 'border-danger'}`}
            disabled={isTenantSchema || isHistory || publicView}
          />
          <CustomErrorMessage name='description' />
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
            id='comment'
            rows='5'
            className={`form-control ${props.errors.comment && props.touched.comment && 'border-danger'}`}
            disabled={isTenantSchema || isHistory || publicView}
          />
          <CustomErrorMessage name='comment' />
          <FormText color='muted'>
            Short comment about this version.
          </FormText>
        </Col>
      </Row>
      {
        (!isHistory && !addview && !cloneview) &&
          <Row>
            <Col md={8}>
              {
                metrictemplatelist.length > 0 &&
                <div>
                  Metric templates:
                  <div>
                    {
                      metrictemplatelist
                        .map((met, i) => <Link
                          key={i}
                          to={
                            publicView ?
                              `/ui/public_metrictemplates/${met}`
                            :
                              isTenantSchema ?
                                `/ui/probes/${props.values.name}/${met}`
                              :
                                `/ui/metrictemplates/${met}`
                            }>
                          {met}
                        </Link>
                        ).reduce((prev, curr) => [prev, ', ', curr])
                    }
                  </div>
                </div>
              }
            </Col>
          </Row>
      }
    </FormGroup>
  </>


export const ProbeList = (props) => {
  const location = props.location;
  const publicView = props.publicView;
  const isTenantSchema = props.isTenantSchema;

  const backend = new Backend();

  const { data: probes, error, isLoading: loading } = useQuery(
    `${publicView ? 'public_' : ''}probe`, async () => {
      let probes = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}probes`);
      return probes;
    }
  );

  const columns = React.useMemo(() => [
    {
      Header: '#',
      accessor: null,
      column_width: '2%'
    },
    {
      Header: 'Name',
      column_width: '20%',
      accessor: 'name',
      Cell: e =>
        <Link to={`/ui/${publicView ? 'public_' : ''}probes/${e.value}`}>
          {e.value}
        </Link>,
      Filter: DefaultColumnFilter
    },
    {
      Header: '#versions',
      accessor: 'nv',
      column_width: '3%',
      Cell: e =>
        <div style={{textAlign: 'center'}}>
          <Link to={`/ui/${publicView ? 'public_' : ''}probes/${e.row.original.name}/history`}>
            {e.value}
          </Link>
        </div>,
      disableFilters: true
    },
    {
      Header: 'Package',
      column_width: '20%',
      accessor: 'package',
      Filter: DefaultColumnFilter
    },
    {
      Header: 'Description',
      column_width: '55%',
      accessor: 'description',
      Filter: DefaultColumnFilter
    }
  ], [publicView]);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error.message}/>);

  else if (!loading && probes) {
    return (
      <BaseArgoView
        resourcename='probe'
        location={location}
        listview={true}
        addnew={!isTenantSchema && !publicView}
      >
        <BaseArgoTable
          data={probes}
          columns={columns}
          page_size={50}
          resourcename='probes'
          filter={true}
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
  const querykey = `probe_${addview ? `addview` : `${name}_${cloneview ? 'cloneview' : `${publicView ? 'publicview' : 'changeview'}`}`}`;

  const apiListPackages = `/api/v2/internal/${publicView ? 'public_' : ''}packages`;
  const apiProbeName = `/api/v2/internal/${publicView ? 'public_' : ''}probes`;
  const apiMetricsForProbes = `/api/v2/internal/${publicView ? 'public_' : ''}metricsforprobes`;

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  const { data: probe, error: probeError, isLoading: probeLoading } = useQuery(
    `${querykey}_probe`, async () => {
      if (!addview) {
        let prb = await backend.fetchData(`${apiProbeName}/${name}`);
        return prb;
      }
    },
    {enabled: !addview}
  );

  const { data: isTenantSchema, isLoading: isTenantSchemaLoading } = useQuery(
    `${querykey}_schema`, async () => {
      let schema = await backend.isTenantSchema();
      return schema;
    }
  );

  const { data: metricTemplateList, error: metricTemplateListError, isLoading: metricTemplateListLoading } = useQuery(
    `${querykey}_metrictemplates`, async () => {
      let metrics = await backend.fetchData(`${apiMetricsForProbes}/${probe.name}(${probe.version})`);
      return metrics;
    },
    { enabled: !!probe }
  );

  const { data: listPackages, error: listPackagesError, isLoading: listPackagesLoading } = useQuery(
    `${querykey}_packages`, async () => {
      let pkgs = await backend.fetchData(apiListPackages);
      let list_packages = [];
      pkgs.forEach(pkg => list_packages.push(`${pkg.name} (${pkg.version})`));
      return list_packages;
    }
  );

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onSubmitHandle(values) {
    let msg = `Are you sure you want to ${addview || cloneview ? 'add' : 'change'} probe?`;
    let title = `${addview || cloneview ? 'Add' : 'Change'} probe`;

    setFormValues(values);
    setModalMsg(msg);
    setModalTitle(title);
    setModalFlag('submit');
    toggleAreYouSure();
  }

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
          package: formValues.pkg,
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
      }
    } else {
      let response = await backend.changeObject(
        '/api/v2/internal/probes/',
        {
          id: formValues.id,
          name: formValues.name,
          package: formValues.pkg,
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
        }
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
      }
    }
  }

  async function doDelete() {
    let response = await backend.deleteObject(`/api/v2/internal/probes/${name}`);
    if (!response.ok) {
      let msg = '';
      try {
        let json = await response.json();
        msg = json.detail;
      } catch(err) {
        msg = 'Error deleting probe';
      }
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
    }
  }

  if (probeLoading || isTenantSchemaLoading || metricTemplateListLoading || listPackagesLoading)
    return(<LoadingAnim/>)

  else if (probeError)
    return (<ErrorComponent error={probeError.message}/>);

  else if (metricTemplateListError)
    return (<ErrorComponent error={metricTemplateListError.message}/>);

  else if (listPackagesError)
    return (<ErrorComponent error={listPackagesError}/>);

  else {
    if (!isTenantSchema) {
      return (
        <BaseArgoView
          resourcename={`${publicView ? 'Probe details' : 'probe'}`}
          location={location}
          addview={addview}
          cloneview={cloneview}
          clone={true}
          publicview={publicView}
          modal={true}
          state={{
            areYouSureModal,
            modalTitle,
            modalMsg,
            'modalFunc': modalFlag === 'submit' ?
              doChange
            :
              modalFlag === 'delete' ?
                doDelete
              :
                undefined
          }}
          toggle={toggleAreYouSure}
        >
          <Formik
            initialValues = {{
              id: `${probe ? probe.id : ''}`,
              name: `${probe ? probe.name : ''}`,
              version: `${probe ? probe.version : ''}`,
              pkg: `${probe ? probe.package : ''}`,
              repository: `${probe ? probe.repository : ''}`,
              docurl: `${probe ? probe.docurl : ''}`,
              description: `${probe ? probe.description : ''}`,
              comment: `${probe ? probe.comment : ''}`,
              update_metrics: false
            }}
            validationSchema={ProbeSchema}
            enableReinitialize={true}
            onSubmit = {(values) => onSubmitHandle(values)}
          >
            {props => (
              <Form>
                <ProbeForm
                  {...props}
                  addview={addview}
                  cloneview={cloneview}
                  publicView={publicView}
                  list_packages={listPackages}
                  metrictemplatelist={metricTemplateList}
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
              id: `${probe ? probe.id : ''}`,
              name: `${probe ? probe.name : ''}`,
              version: `${probe ? probe.version : ''}`,
              pkg: `${probe ? probe.package : ''}`,
              repository: `${probe ? probe.repository : ''}`,
              docurl: `${probe ? probe.docurl : ''}`,
              description: `${probe ? probe.description : ''}`,
              comment: `${probe ? probe.comment : ''}`
            }}
          >
            {props => (
              <ProbeForm
                {...props}
                isTenantSchema={true}
                publicView={publicView}
                metrictemplatelist={metricTemplateList}
              />
            )}
          </Formik>
        </BaseArgoView>
      );
    }
  }
};


export const ProbeVersionCompare = (props) => {
  const version1 = props.match.params.id1;
  const version2 = props.match.params.id2;
  const name = props.match.params.name;
  const publicView = props.publicView;

  const [loading, setLoading] = useState(false);
  const [probe1, setProbe1] = useState({});
  const [probe2, setProbe2] = useState({});
  const [error, setError] = useState(null);


  useEffect(() => {
    const backend = new Backend();
    setLoading(true);

    async function fetchVersions() {
      try {
        let json = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}version/probe/${name}`);

        json.forEach((e) => {
          if (e.version == version1)
            setProbe1(e.fields);
          else if (e.version === version2)
            setProbe2(e.fields);
        });
      } catch(err) {
        setError(err);
      }
      setLoading(false);
    }

    fetchVersions();
  }, [name, publicView, version1, version2]);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && probe1 && probe2) {
    return (
      <React.Fragment>
        <div className="d-flex align-items-center justify-content-between">
          <h2 className='ml-3 mt-1 mb-4'>{`Compare ${name}`}</h2>
        </div>
        {
          (probe1.name !== probe2.name) &&
            <DiffElement title='name' item1={probe1.name} item2={probe2.name}/>
        }

        {
          (probe1.version !== probe2.version) &&
            <DiffElement title='version' item1={probe1.version} item2={probe2.version}/>
        }

        {
          (probe1.package !== probe2.package) &&
            <DiffElement title='package' item1={probe1.package} item2={probe2.package}/>
        }

        {
          (probe1.description !== probe2.description) &&
            <DiffElement title='description' item1={probe1.description} item2={probe2.description}/>
        }

        {
          (probe1.repository !== probe2.repository) &&
            <DiffElement title='repository' item1={probe1.repository} item2={probe2.repository}/>
        }

        {
          (probe1.docurl !== probe2.docurl) &&
            <DiffElement title={'documentation'} item1={probe1.docurl} item2={probe2.docurl}/>
        }
        {
          (probe1.comment !== probe2.comment) &&
            <DiffElement title={'comment'} item1={probe1.comment} item2={probe2.comment}/>
        }
      </React.Fragment>
    );
  }
  else
    return null;
};


export const ProbeVersionDetails = (props) => {
  const name = props.match.params.name;
  const version = props.match.params.version;
  const publicView = props.publicView;

  const apiUrl = `/api/v2/internal/${publicView ? 'public_' : ''}version/probe`;

  const [probe, setProbe] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const backend = new Backend();
    setLoading(true);

    async function fetchProbeVersion() {
      try {
        let json = await backend.fetchData(`${apiUrl}/${name}`);
        json.forEach((e) => {
          if (e.version === version)
            setProbe(e.fields);
        });
      } catch(err) {
        setError(err);
      }
      setLoading(false);
    }

    fetchProbeVersion();
  }, [apiUrl, name, version]);

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
            name: probe.name,
            version: probe.version,
            pkg: probe.package,
            repository: probe.repository,
            docurl: probe.docurl,
            description: probe.description,
            comment: probe.comment
          }}
          >
          {props => (
            <ProbeForm
              {...props}
              version={probe.version}
              isHistory={true}
            />
          )}
        </Formik>
      </BaseArgoView>
    );
  }
  else
    return null;
};
