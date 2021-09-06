import React, { useState } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import{
  LoadingAnim,
  BaseArgoView,
  AutocompleteField,
  NotifyOk,
  NotifyError,
  ErrorComponent,
  NotifyWarn,
  ParagraphTitle,
  DefaultColumnFilter,
  SelectColumnFilter,
  BaseArgoTable,
  CustomErrorMessage
} from './UIElements';
import {
  FormGroup,
  FormText,
  Row,
  Col,
  Button,
  InputGroup,
  InputGroupAddon,
  Alert
} from 'reactstrap';
import { Formik, Form, Field } from 'formik';
import { useQuery, useQueryClient } from 'react-query';
import { fetchPackages, fetchProbeVersions, fetchYumRepos } from './QueryFunctions';


const packageValidate = (values) => {
  const errors = {};

  if (!values.name)
    errors.name = 'Required';

  else if (!/^\S*$/.test(values.name))
    errors.name = 'Name cannot contain white spaces';

  if (!values.present_version) {
    if (!values.version)
      errors.version = 'Required';

    else if (!/^\S*$/.test(values.version))
      errors.version = 'Version cannot contain white spaces'
  }

  if (!values.repo_6 && !values.repo_7) {
    errors.repo_6 = 'You must provide at least one repo!';
    errors.repo_7 = 'You must provide at least one repo!';
  }

  return errors;
}


export const PackageList = (props) => {
  const location = props.location;
  const isTenantSchema = props.isTenantSchema;

  const { data: packages, error: errorPackages, status: statusPackages } = useQuery(
    'package', () => fetchPackages()
  );

  const { data: repos, error: errorRepos, status: statusRepos } = useQuery(
    'yumrepo', () => fetchYumRepos()
  );

  if (repos)
    var listRepos = repos.map(repo => `${repo.name} (${repo.tag})`)

  const columns = React.useMemo(() => [
    {
      Header: '#',
      accessor: null,
      column_width: '2%',
    },
    {
      Header: 'Name',
      accessor: 'name',
      column_width: '44%',
      Cell: e =>
        <Link to={`/ui/${isTenantSchema ? 'administration/' : ''}packages/${e.value}-${e.row.original.version}`}>{e.value}</Link>,
      Filter: DefaultColumnFilter
    },
    {
      Header: 'Version',
      accessor: 'version',
      column_width: '10%',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>,
      disableFilters: true
    },
    {
      Header: 'Repo',
      accessor: 'repos',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value.join(', ')}
        </div>,
      Filter: SelectColumnFilter,
      filterList: listRepos
    }
  ], [isTenantSchema, listRepos]);

  if (statusPackages === 'loading' || statusRepos === 'loading')
    return (<LoadingAnim/>);

  else if (statusPackages === 'error')
    return (<ErrorComponent error={errorPackages}/>);

  else if (statusRepos === 'error')
    return (<ErrorComponent error={errorRepos}/>);

  else if (packages) {
    return (
      <BaseArgoView
        resourcename='package'
        location={location}
        listview={true}
        addnew={!isTenantSchema}
      >
        <BaseArgoTable
          data={packages}
          columns={columns}
          page_size={30}
          resourcename='packages'
          filter={true}
        />
      </BaseArgoView>
    );
  } else
    return null;
};


export const PackageComponent = (props) => {
  const nameversion = props.match.params.nameversion;
  const addview = props.addview;
  const cloneview = props.cloneview;
  const disabled = props.disabled;
  const location = props.location;
  const history = props.history;

  const backend = new Backend();

  const queryClient = useQueryClient();

  const { data: pkg, error: errorPkg, status: statusPkg } = useQuery(
    ['package', nameversion], async () => {
      let pkg = await backend.fetchData(`/api/v2/internal/packages/${nameversion}`);
      let [repo6, repo7] = splitRepos(pkg.repos);
      pkg.initial_version = pkg.version;
      pkg.repo_6 = repo6;
      pkg.repo_7 = repo7;
      return pkg;
    },
    {
      enabled: !addview,
      initialData: () => {
        let pkgs = queryClient.getQueryData('package');
        if (pkgs) {
          let pkg = pkgs.find(pkg => nameversion == `${pkg.name}-${pkg.version}`)
          let [repo6, repo7] = splitRepos(pkg.repos);
          pkg.initial_version = pkg.version;
          pkg.repo_6 = repo6;
          pkg.repo_7 = repo7;
          return pkg;
        }
      }
    }
  );

  const { data: repos, error: errorRepos, status: statusRepos } = useQuery(
    'yumrepo', () => fetchYumRepos()
  );

  const { data: probes, error: errorProbes, status: statusProbes } = useQuery(
    ['version', 'probe'], () => fetchProbeVersions(),
    { enabled: !addview}
  );

  const { data: packageVersions, error: errorPackageVersions, status: statusPackageVersions } = useQuery(
    ['package', 'versions', nameversion], async () => {
      let pkg_versions = []
      if (!addview)
        pkg_versions = await backend.fetchData(`/api/v2/internal/packageversions/${pkg.name}`);

      return pkg_versions
    },
    { enabled: !!pkg }
  );

  const [disabledButton, setDisabledButton] = useState(true);
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function splitRepos(repos) {
    let repo6 = '';
    let repo7 = '';
    for (let i = 0; i < repos.length; i++) {
      if (repos[i].split('(')[1].slice(0, -1) === 'CentOS 6')
        repo6 = repos[i];

      if (repos[i].split('(')[1].slice(0, -1) === 'CentOS 7')
        repo7 = repos[i];
    }

    return [repo6, repo7];
  }

  function onVersionSelect(props, value) {
    let initial_version = pkg.initial_version;
    packageVersions.forEach(pkgv => {
      if (pkgv.version === value) {
        let [repo6, repo7] = splitRepos(pkgv.repos);
        props.setFieldValue('name', pkgv.name);
        props.setFieldValue('version', pkgv.version);
        props.setFieldValue('repo_6', repo6);
        props.setFieldValue('repo_7', repo7);
        props.setFieldValue('present_version', pkgv.use_present_version);

        setDisabledButton(value === initial_version);
      }
    });
  }

  function onSubmitHandle(values) {
    let msg = `Are you sure you want to ${addview || cloneview ? 'add' : 'change'} package?`;
    let title = `${addview || cloneview ? 'Add' : 'Change'} package`;

    setFormValues(values);
    setModalMsg(msg);
    setModalTitle(title);
    setModalFlag('submit');
    toggleAreYouSure();
  }

  async function onTenantSubmitHandle(values) {
    try {
      let response = await fetch(
        `/api/v2/internal/updatemetricsversions/${values.name}-${values.version}`,
      )

      if (response.ok) {
        let json = await response.json();
        let msgs = [];
        if ('updated' in json)
          msgs.push(json['updated']);

        if ('deleted' in json)
          msgs.push(json['deleted']);

        if ('warning' in json)
          msgs.push(json['warning']);

        let title = 'Update metrics';

        msgs.push('ARE YOU SURE you want to update metrics?')

        setModalMsg(<div>{msgs.map((msg, i) => <p key={i}>{msg}</p>)}</div>);
        setModalTitle(title);
        setFormValues(values);
        setModalFlag('update');
        toggleAreYouSure();
      } else {
        let error_msg = '';
        try {
          let json = await response.json()
          error_msg = `${response.status} ${response.statusText} ${json.detail}`;
        } catch(err1) {
          error_msg = `${response.status} ${response.statusText}`;
        }
        NotifyError({
          title: 'Error',
          msg: error_msg
        });
      }
    } catch(err) {
      NotifyError({
        title: 'Error',
        msg: `Error fetching metrics data: ${err}`
      });
    }
  }

  async function updateMetrics() {
    let response = await backend.changeObject(
      '/api/v2/internal/updatemetricsversions/',
      {
        name: formValues.name,
        version: formValues.version
      }
    );
    if (!response.ok) {
      let err_msg = '';
      try {
        let json = await response.json();
        err_msg = json.detail;
      } catch(err) {
        err_msg = 'Error updating metrics';
      }
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: err_msg
      });
    } else {
      let json = await response.json();
      if ('updated' in json)
        NotifyOk({
          msg: json.updated,
          title: 'Updated',
          callback: () => history.push('/ui/administration/packages')
        });
      if ('warning' in json)
        NotifyWarn({msg: json.warning, title: 'Warning'});

      if ('deleted' in json)
        NotifyWarn({msg: json.deleted, title: 'Deleted'});
    }
  }

  async function doChange() {
    let repos = [];
    if (formValues.repo_6)
      repos.push(formValues.repo_6);

    if (formValues.repo_7)
      repos.push(formValues.repo_7);

    if (addview || cloneview) {
      let response = await backend.addObject(
        '/api/v2/internal/packages/',
        {
          name: formValues.name,
          version: formValues.version,
          use_present_version: formValues.present_version,
          repos: repos
        }
      );
      if (!response.ok) {
        let add_msg = '';
        try {
          let json = await response.json();
          add_msg = json.detail;
        } catch(err) {
          add_msg = 'Error adding package';
        }
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: add_msg
        });
      } else {
        NotifyOk({
          msg: 'Package successfully added',
          title: 'Added',
          callback: () => history.push('/ui/packages')
        });
      }
    } else {
      let response = await backend.changeObject(
        '/api/v2/internal/packages/',
        {
          id: formValues.id,
          name: formValues.name,
          version: formValues.version,
          use_present_version: formValues.present_version,
          repos: repos
        }
      );
      if (!response.ok) {
        let change_msg = '';
        try {
          let json = await response.json();
          change_msg = json.detail;
        } catch(err) {
          change_msg = 'Error changing package';
        }
        NotifyError({
          title: `Error: ${response.status} ${response.statusText}`,
          msg: change_msg
        });
      } else {
        NotifyOk({
          msg: 'Package successfully changed',
          title: 'Changed',
          callback: () => history.push('/ui/packages')
        });
      }
    }
  }

  async function doDelete() {
    let response = await backend.deleteObject(`/api/v2/internal/packages/${nameversion}`);
    if (!response.ok) {
      let msg = '';
      try {
        let json = await response.json();
        msg = json.detail;
      } catch(err) {
        msg = 'Error deleting package';
      }
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    } else {
      NotifyOk({
        msg: 'Package successfully deleted',
        title: 'Deleted',
        callback: () => history.push('/ui/packages')
      });
    }
  }

  if (statusPkg === 'loading' || statusRepos === 'loading' || statusProbes === 'loading' || statusPackageVersions === 'loading')
    return (<LoadingAnim/>);

  else if (statusPkg === 'error')
    return (<ErrorComponent error={errorPkg}/>);

  else if (statusRepos === 'error')
    return (<ErrorComponent error={errorRepos}/>);

  else if (statusProbes === 'error')
    return (<ErrorComponent error={errorProbes}/>);

  else if (statusPackageVersions === 'error')
    return (<ErrorComponent error={errorPackageVersions}/>);

  else if (repos) {
    var listRepos6 = [];
    var listRepos7 = [];

    repos.forEach(e => {
      if (e.tag === 'CentOS 6')
        listRepos6.push(`${e.name} (${e.tag})`)

      else if (e.tag === 'CentOS 7')
        listRepos7.push(`${e.name} (${e.tag})`)
    })

    var listProbes = [];
    let presentVersion = false;
    if (pkg) {
      if (pkg.version === 'present')
        presentVersion = true;

      if (probes) {
        probes.forEach(probe => {
          if (probe.fields.package === `${pkg.name} (${pkg.version})`)
            listProbes.push(probe.fields.name);
        });
      }
    }

    return (
      <BaseArgoView
        resourcename={disabled ? 'Package details' : 'package'}
        infoview={disabled}
        location={location}
        addview={addview}
        cloneview={cloneview}
        clone={true}
        history={false}
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
              modalFlag === 'update' ?
                updateMetrics
              :
                undefined
        }}
        toggle={toggleAreYouSure}
      >
        <Formik
          initialValues = {{
            id: `${pkg ? pkg.id : ''}`,
            name: `${pkg ? pkg.name : ''}`,
            version: `${pkg ? pkg.version : ''}`,
            repo_6: `${pkg ? pkg.repo_6 : ''}`,
            repo_7: `${pkg ? pkg.repo_7 : ''}`,
            present_version: presentVersion
          }}
          onSubmit = {(values) => onSubmitHandle(values)}
          validate={packageValidate}
          enableReinitialize={true}
        >
          {props => (
            <Form>
              <FormGroup>
                <Row className='align-items-center'>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
                      <Field
                        type='text'
                        name='name'
                        className={`form-control ${props.errors.name && props.touched.name && 'border-danger'}`}
                        id='name'
                        data-testid='name'
                        disabled={disabled}
                      />
                    </InputGroup>
                    <CustomErrorMessage name='name' />
                    <FormText color='muted'>
                      Package name.
                    </FormText>
                  </Col>
                  <Col md={2}>
                    <Row>
                      <Col md={12}>
                        <InputGroup>
                          <InputGroupAddon addonType='prepend'>Version</InputGroupAddon>
                          {
                            disabled ?
                              <Field
                                component='select'
                                name='version'
                                className='form-control custom-select'
                                id='version'
                                data-testid='version'
                                onChange={e => onVersionSelect(props, e.target.value)}
                              >
                                {
                                  packageVersions.map((version, i) =>
                                    <option key={i} value={version.version}>{version.version}</option>
                                  )
                                }
                              </Field>
                            :
                              <Field
                                type='text'
                                name='version'
                                data-testid='version'
                                value={props.values.present_version ? 'present' : props.values.version}
                                disabled={props.values.present_version}
                                className={`form-control ${props.errors.version && props.touched.version && 'border-danger'}`}
                                id='version'
                              />
                          }
                        </InputGroup>
                        <CustomErrorMessage name='version' />
                        <FormText color='muted'>
                          Package version.
                        </FormText>
                      </Col>
                    </Row>
                  </Col>
                  {
                    !disabled &&
                      <Col md={3}>
                        <label>
                          <Field
                            type='checkbox'
                            name='present_version'
                            className='mr-1'
                          />
                          Use version which is present in repo
                        </label>
                      </Col>
                  }
                </Row>
              </FormGroup>
              <FormGroup>
                <ParagraphTitle title='YUM repo'/>
                {
                  (!disabled && (props.errors.repo_6 || props.errors.repo_7)) &&
                    <Alert color='danger'>
                      <center>
                        You must provide at least one repo!
                      </center>
                    </Alert>
                }
                <Row>
                  <Col md={8}>
                    {
                      disabled ?
                        <InputGroup>
                          <InputGroupAddon addonType='prepend'>CentOS 6 repo</InputGroupAddon>
                          <Field
                            type='text'
                            className='form-control'
                            name='repo_6'
                            data-testid='repo_6'
                            id='repo_6'
                            disabled={true}
                          />
                        </InputGroup>
                      :
                        <AutocompleteField
                          {...props}
                          lists={listRepos6}
                          icon='yumrepos'
                          field='repo_6'
                          onselect_handler={!addview ? (_, newValue) => props.setFieldValue('repo_6', newValue) : undefined}
                          label='CentOS 6 repo'
                          hide_error={true}
                        />
                    }
                    <FormText color='muted'>
                      Package is part of selected CentOS 6 repo.
                    </FormText>
                  </Col>
                </Row>
                <Row className='mt-4'>
                  <Col md={8}>
                    {
                      disabled ?
                        <InputGroup>
                          <InputGroupAddon addonType='prepend'>CentOS 7 repo</InputGroupAddon>
                          <Field
                            type='text'
                            className='form-control'
                            name='repo_7'
                            data-testid='repo_7'
                            id='repo_7'
                            disabled={true}
                          />
                        </InputGroup>
                      :
                        <AutocompleteField
                          {...props}
                          lists={listRepos7}
                          icon='yumrepos'
                          field='repo_7'
                          onselect_handler={!addview ? (_, newValue) => props.setFieldValue('repo_7', newValue) : undefined}
                          label='CentOS 7 repo'
                          hide_error={true}
                        />
                    }
                    <FormText color='muted'>
                      Package is part of selected CentOS 7 repo.
                    </FormText>
                  </Col>
                </Row>
                {
                  (!addview && !cloneview && listProbes.length > 0) &&
                    <Row className='mt-3'>
                      <Col md={8}>
                        Probes:
                        <div>
                          {
                            listProbes
                              .map((e, i) => <Link key={i} to={`/ui/probes/${e}/history/${props.values.version}`}>{e}</Link>)
                              .reduce((prev, curr) => [prev, ', ', curr])
                          }
                        </div>
                      </Col>
                    </Row>
                }
              </FormGroup>
              {
                <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                  {
                    (!addview && !cloneview && !disabled) ?
                      <Button
                        color="danger"
                        onClick={() => {
                          setModalMsg('Are you sure you want to delete package?');
                          setModalTitle('Delete package')
                          setModalFlag('delete');
                          toggleAreYouSure();
                        }}
                      >
                        Delete
                      </Button>
                    :
                      <div></div>
                  }
                  {
                    disabled ?
                      <Button
                        color='success'
                        id='import-metrics-button'
                        disabled={disabled && disabledButton}
                        onClick={() => onTenantSubmitHandle(props.values)}
                      >
                        Update metrics
                      </Button>
                    :
                      <Button
                        color="success"
                        id="submit-button"
                        type="submit"
                      >
                        Save
                      </Button>
                  }
                </div>
              }
            </Form>
          )}
        </Formik>
      </BaseArgoView>
    )
  } else
    return null;
};
