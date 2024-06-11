import React, { useEffect, useRef, useState } from 'react';
import { Backend } from './DataManager';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import{
  BaseArgoView,
  NotifyOk,
  NotifyError,
  ErrorComponent,
  NotifyWarn,
  ParagraphTitle,
  DefaultColumnFilter,
  SelectColumnFilter,
  BaseArgoTable,
  DropdownWithFormText
} from './UIElements';
import {
  FormGroup,
  FormText,
  Row,
  Col,
  Button,
  InputGroup,
  InputGroupText,
  Input,
  Label,
  Form,
  FormFeedback,
  Alert
} from 'reactstrap';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { fetchPackages, fetchProbeVersions, fetchYumRepos } from './QueryFunctions';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from "yup";
import { 
  ChangeViewPlaceholder,
  InputPlaceholder, 
  ListViewPlaceholder 
} from './Placeholders';

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required("This field is required")
    .matches(/^\S+$/, "Name cannot contain white spaces"),
  presentVersion: Yup.boolean(),
  version: Yup.string()
    .required("This field is required")
    .matches(/^\S+$/, "Version cannot contain white spaces"),
  repo_6: Yup.string().test("repo", "You must provide at least one repo", function () {
    return this.parent.repo_6 === "" && this.parent.repo_7 === "" && this.parent.repo_9 === "" ? false : true
  }),
  repo_7: Yup.string().test("repo", "You must provide at least one repo", function () {
    return this.parent.repo_6 === "" && this.parent.repo_7 === "" && this.parent.repo_9 === "" ? false : true
  }),
  repo_9: Yup.string().test("repo", "You must provide at least one repo", function () {
    return this.parent.repo_6 === "" && this.parent.repo_7 === "" && this.parent.repo_9 === "" ? false : true
  })
})


export const PackageList = (props) => {
  const location = useLocation();
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
    return (
      <ListViewPlaceholder
        resourcename="package"
        infoview={ isTenantSchema }
      />
    )

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
}


function splitRepos(repos) {
  let repo6 = '';
  let repo7 = '';
  let repo9 = ""
  for (let i = 0; i < repos.length; i++) {
    if (repos[i].split('(')[1].slice(0, -1) === 'CentOS 6')
      repo6 = repos[i];

    if (repos[i].split('(')[1].slice(0, -1) === 'CentOS 7')
      repo7 = repos[i];

    if (repos[i].split("(")[1].slice(0, -1) === "Rocky 9")
      repo9 = repos[i]
  }

  return [repo6, repo7, repo9];
}


const PackageForm = ({
  nameversion, addview, cloneview, disabled, location, pkg={}, probes=[], repos6=[], repos7=[], repos9=[], packageVersions=[]
}) => {
  const navigate = useNavigate()
  const backend = new Backend()
  const queryClient = useQueryClient()

  // this ref is used to skip the version validation on the first render (in useEffect)
  const didMountRef = useRef(false)

  const { control, getValues, setValue, handleSubmit, trigger, formState: { errors } } = useForm({
    defaultValues: {
      id: `${pkg?.id ? pkg.id : ''}`,
      name: `${pkg?.name ? pkg.name : ''}`,
      version: `${pkg?.version ? pkg.version : ''}`,
      initialVersion: `${pkg?.version ? pkg.version : ""}`,
      repo_6: `${pkg?.repos ? splitRepos(pkg.repos)[0] : ''}`,
      repo_7: `${pkg?.repos ? splitRepos(pkg.repos)[1] : ''}`,
      repo_9: `${pkg?.repos ? splitRepos(pkg.repos)[2] : ""}`,
      present_version: pkg?.version === "present"
    },
    resolver: yupResolver(validationSchema),
    mode: "all"
  })

  const presentVersion = useWatch({ control, name: "present_version" })

  useEffect(() => {
    if (presentVersion)
      setValue("version", "present")

    if (didMountRef.current)
      trigger("version")

    didMountRef.current = true
  }, [presentVersion, setValue])

  const changePackage = useMutation( async (values) => await backend.changeObject('/api/v2/internal/packages/', values) );
  const addPackage = useMutation( async (values) => await backend.addObject('/api/v2/internal/packages/', values) );
  const deletePackage = useMutation( async () => await backend.deleteObject(`/api/v2/internal/packages/${nameversion}`));
  const updateMetricsMutation = useMutation( async (values) => await backend.changeObject('/api/v2/internal/updatemetricsversions/', values) );

  const [disabledButton, setDisabledButton] = useState(true);
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onVersionSelect(value) {
    let initial_version = getValues("initialVersion")
    packageVersions.forEach(pkgv => {
      if (pkgv.version === value) {
        let [repo6, repo7, repo9] = splitRepos(pkgv.repos)
        setValue('name', pkgv.name)
        setValue('version', pkgv.version)
        setValue('repo_6', repo6)
        setValue('repo_7', repo7)
        setValue("repo_9", repo9)
        setValue('present_version', pkgv.use_present_version)

        setDisabledButton(value === initial_version)
      }
    })
  }

  function onSubmitHandle() {
    let msg = `Are you sure you want to ${addview || cloneview ? 'add' : 'change'} package?`
    let title = `${addview || cloneview ? 'Add' : 'Change'} package`

    setModalMsg(msg)
    setModalTitle(title)
    setModalFlag('submit')
    toggleAreYouSure()
  }

  async function onTenantSubmitHandle() {
    let values = getValues()

    try {
      let json = await backend.fetchData(
        `/api/v2/internal/updatemetricsversions/${values.name}-${values.version}`
      )

      let msgs = []
      if ('updated' in json)
        msgs.push(json['updated'])

      if ('deleted' in json)
        msgs.push(json['deleted'])

      if ('warning' in json)
        msgs.push(json['warning'])

      let title = 'Update metrics'

      msgs.push('ARE YOU SURE you want to update metrics?')

      setModalMsg(<div>{msgs.map((msg, i) => <p key={i}>{msg}</p>)}</div>)
      setModalTitle(title)
      setModalFlag('update')
      toggleAreYouSure()
    } catch(error) {
      NotifyError({ title: 'Error', msg: error.message })
    }
  }

  function updateMetrics() {
    let formValues = getValues()

    const sendValues = new Object({
      name: formValues.name,
      version: formValues.version
    })
    updateMetricsMutation.mutate(sendValues, {
      onSuccess: async (data) => {
        queryClient.invalidateQueries('metric')
        let json = await data.json()
        if ('updated' in json)
          NotifyOk({
            msg: json.updated,
            title: 'Updated',
            callback: () => navigate('/ui/administration/packages')
          });
        if ('warning' in json)
          NotifyWarn({msg: json.warning, title: 'Warning'})

        if ('deleted' in json)
          NotifyWarn({msg: json.deleted, title: 'Deleted'})
      },
      onError: (error) => NotifyError({ title: 'Error', msg: error.message })
    })
  }

  function doChange() {
    let formValues = getValues()
    let repos = [];

    if (formValues.repo_6)
      repos.push(formValues.repo_6);

    if (formValues.repo_7)
      repos.push(formValues.repo_7);

    if (formValues.repo_9)
      repos.push(formValues.repo_9)

    const sendValues = new Object({
      name: formValues.name,
      version: formValues.version,
      use_present_version: formValues.present_version,
      repos: repos
    })

    if (addview || cloneview) {
      addPackage.mutate(sendValues, {
        onSuccess: () => {
          queryClient.invalidateQueries('package');
          NotifyOk({
            msg: 'Package successfully added',
            title: 'Added',
            callback: () => navigate('/ui/packages')
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Error',
            msg: error.message ? error.message : 'Error adding package'
          })
        }
      })
    } else {
      changePackage.mutate({ ...sendValues, id: formValues.id }, {
        onSuccess: () => {
          NotifyOk({
            msg: 'Package successfully changed',
            title: 'Changed',
            callback: () => navigate('/ui/packages')
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Error',
            msg: error.message ? error.message : 'Error changing package'
          })
        }
      })
    }
  }

  function doDelete() {
    deletePackage.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries('package');
        NotifyOk({
          msg: 'Package successfully deleted',
          title: 'Deleted',
          callback: () => navigate('/ui/packages')
        })
      },
      onError: (error) => {
        NotifyError({
          title: 'Error',
          msg: error.message ? error.message : 'Error deleting package'
        })
      }
    })
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
      <Form onSubmit={ handleSubmit(onSubmitHandle) } data-testid="form">
        <FormGroup>
          <Row className='align-items-center'>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Name</InputGroupText>
                <Controller
                  name="name"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      className={`form-control ${errors?.name && 'is-invalid'}`}
                      data-testid="name"
                      disabled={disabled}
                    />
                  }
                />
                <ErrorMessage
                  errors={ errors }
                  name="name"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </InputGroup>
              <FormText color='muted'>
                Package name.
              </FormText>
            </Col>
            <Col md={2}>
              <Row>
                <Col md={12}>
                  <InputGroup>
                    <InputGroupText>Version</InputGroupText>
                    <Controller
                      name="version"
                      control={ control }
                      render={ ({ field }) =>
                        disabled ?
                          <DropdownWithFormText
                            forwardedRef={ field.ref }
                            error={ errors.version }
                            onChange={ e => onVersionSelect(e.value) }
                            options={ packageVersions.map(ver => ver.version) }
                            value={ field.value }
                          />
                        :
                          <Input
                            { ...field }
                            data-testid="version"
                            disabled={ getValues("present_version") }
                            className={ `form-control ${errors?.version && 'is-invalid'}` }
                          />
                      }
                    />
                    <ErrorMessage
                      errors={errors}
                      name="version"
                      render={ ({ message }) =>
                        <FormFeedback invalid="true" className="end-0">
                          { message }
                        </FormFeedback>
                      }
                    />
                  </InputGroup>
                  <FormText color='muted'>
                    Package version.
                  </FormText>
                </Col>
              </Row>
            </Col>
            {
              !disabled &&
                <Col md={3}>
                  <FormGroup check inline className='ms-3'>
                    <Controller
                      name="present_version"
                      control={ control }
                      render={ ({ field }) =>
                        <Input
                          { ...field }
                          type='checkbox'
                          onChange={ e => {
                            setValue("present_version", e.target.checked)
                          }}
                          checked={ field.value }
                        />
                      }
                    />
                    <Label check for='present_version'>Use version which is present in repo</Label>
                  </FormGroup>
                </Col>
            }
          </Row>
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title='YUM repo'/>
          {
            (!disabled && (errors.repo_6 || errors.repo_7 || errors.repo_9)) &&
              <Alert color='danger'>
                <center>
                  You must provide at least one repo
                </center>
              </Alert>
          }
          <Row>
            <Col md={8}>
              <InputGroup>
                <InputGroupText>CentOS 6 repo</InputGroupText>
                <Controller
                  name="repo_6"
                  control={ control }
                  render={ ({ field }) =>
                    disabled ?
                      <Input
                        { ...field }
                        className="form-control"
                        data-testid="repo_6"
                        disabled={true}
                      />
                    :
                      <DropdownWithFormText
                        forwardedRef={ field.ref }
                        error={ errors.repo_6 }
                        isClearable={ true }
                        onChange={ e => {
                          setValue("repo_6", e ? e.value : '')
                          trigger()
                        }}
                        options={ repos6 }
                        value={ field.value }
                      />
                    }
                />
              </InputGroup>
              <FormText color='muted'>
                Package is part of selected CentOS 6 repo.
              </FormText>
            </Col>
          </Row>
          <Row className='mt-4'>
            <Col md={8}>
              <InputGroup>
                <InputGroupText>CentOS 7 repo</InputGroupText>
                <Controller
                  name="repo_7"
                  control={ control }
                  render={ ({ field }) =>
                    disabled ?
                      <Input
                        { ...field }
                        className="form-control"
                        data-testid="repo_7"
                        disabled={true}
                      />
                    :
                      <DropdownWithFormText
                        forwardedRef={ field.ref }
                        error={ errors.repo_7 }
                        isClearable={ true }
                        onChange={ e => {
                          setValue("repo_7", e ? e.value : '')
                          trigger()
                        }}
                        options={ repos7 }
                        value={ field.value }
                      />
                    }
                />
              </InputGroup>
              <FormText color='muted'>
                Package is part of selected CentOS 7 repo.
              </FormText>
            </Col>
          </Row>
          <Row className='mt-4'>
            <Col md={8}>
              <InputGroup>
                <InputGroupText>Rocky 9 repo</InputGroupText>
                <Controller
                  name="repo_9"
                  control={ control }
                  render={ ({ field }) =>
                    disabled ?
                      <Input
                        { ...field }
                        className="form-control"
                        data-testid="repo_9"
                        disabled={ true }
                      />
                    :
                      <DropdownWithFormText
                        forwardedRef={ field.ref }
                        error={ errors.repo_9 }
                        isClearable={ true }
                        onChange={ e => {
                          setValue("repo_9", e ? e.value : '')
                          trigger()
                        }}
                        options={ repos9 }
                        value={ field.value }
                      />
                    }
                />
              </InputGroup>
              <FormText color='muted'>
                Package is part of selected Rocky 9 repo.
              </FormText>
            </Col>
          </Row>
          {
            (!addview && !cloneview && probes.length > 0) &&
              <Row className='mt-3'>
                <Col md={8}>
                  Probes:
                  <div>
                    {
                      probes
                        .map((e, i) => <Link key={i} to={`/ui/probes/${e}/history/${getValues("version")}`}>{e}</Link>)
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
                  onClick={() => onTenantSubmitHandle()}
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
    </BaseArgoView>
  )
}


export const PackageComponent = (props) => {
  const { nameversion } = useParams();
  const addview = props.addview;
  const cloneview = props.cloneview;
  const disabled = props.disabled;
  const location = useLocation();

  const backend = new Backend();
  const queryClient = useQueryClient();

  const { data: pkg, error: errorPkg, status: statusPkg } = useQuery(
    ['package', nameversion], async () => {
      return await backend.fetchData(`/api/v2/internal/packages/${nameversion}`);
    },
    {
      enabled: !addview,
      initialData: () => {
        if (!addview) {
          let pkgs = queryClient.getQueryData('package');
          if (pkgs) {
            return pkgs.find(pkg => nameversion == `${pkg.name}-${pkg.version}`)
          }
        }
      }
    }
  )

  const { data: repos, error: errorRepos, status: statusRepos } = useQuery(
    'yumrepo', () => fetchYumRepos()
  )

  const { data: probes, error: errorProbes, status: statusProbes } = useQuery(
    ['probe', 'version'], () => fetchProbeVersions(),
    { enabled: !!pkg }
  )

  const { data: packageVersions, error: errorPackageVersions, status: statusPackageVersions } = useQuery(
    ['package', 'versions', nameversion], async () => {
      return await backend.fetchData(`/api/v2/internal/packageversions/${pkg.name}`);
    },
    { enabled: !!pkg }
  )

  if (statusPkg === 'loading' || statusRepos === 'loading' || statusProbes === 'loading' || statusPackageVersions === 'loading')
    return (
      <ChangeViewPlaceholder
        resourcename={ disabled ? 'Package details' : 'package' }
        infoview={ disabled }
        addview={ addview }
        cloneview={ cloneview }
        buttons={
          (!disabled && !addview && !cloneview) && <Button color="secondary" disabled>Clone</Button>
        }
      >
        <FormGroup>
          <Row className='align-items-center'>
            <Col md={6}>
              <InputPlaceholder />
              <FormText color='muted'>
                Package name.
              </FormText>
            </Col>
            <Col md={2}>
              <Row>
                <Col md={12}>
                  <InputPlaceholder />
                  <FormText color='muted'>
                    Package version.
                  </FormText>
                </Col>
              </Row>
            </Col>
            {
              !disabled &&
                <Col md={3}>
                  <InputPlaceholder />
                </Col>
            }
          </Row>
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title='YUM repo'/>
          <Row>
            <Col md={8}>
              <InputPlaceholder />
              <FormText color='muted'>
                Package is part of selected CentOS 6 repo.
              </FormText>
            </Col>
          </Row>
          <Row className='mt-4'>
            <Col md={8}>
              <InputPlaceholder />
              <FormText color='muted'>
                Package is part of selected CentOS 7 repo.
              </FormText>
            </Col>
          </Row>
          <Row className='mt-4'>
            <Col md={8}>
              <InputPlaceholder />
              <FormText color='muted'>
                Package is part of selected Rocky 9 repo.
              </FormText>
            </Col>
          </Row>
        </FormGroup>
        {
          (!addview && !cloneview) &&
            <Row className='mt-3'>
              <Col md={8}>
                Probes:
              </Col>
            </Row>
        }
      </ChangeViewPlaceholder>
    )

  else if (statusPkg === 'error')
    return (<ErrorComponent error={errorPkg}/>);

  else if (statusRepos === 'error')
    return (<ErrorComponent error={errorRepos}/>);

  else if (statusProbes === 'error')
    return (<ErrorComponent error={errorProbes}/>);

  else if (statusPackageVersions === 'error')
    return (<ErrorComponent error={errorPackageVersions}/>);

  else if (repos && (addview || (pkg && probes && packageVersions))) {
    let repos6 = new Array()
    let repos7 = new Array()
    let repos9 = new Array()
    let listProbes = new Array()

    repos.forEach(repo => {
      if (repo.tag === 'CentOS 6')
        repos6.push(`${repo.name} (${repo.tag})`)

      else if (repo.tag === 'CentOS 7')
        repos7.push(`${repo.name} (${repo.tag})`)

      else if (repo.tag === "Rocky 9")
        repos9.push(`${repo.name} (${repo.tag})`)
    })

    if (probes && pkg && pkg.name) {
      probes.forEach(probe => {
        if (probe.fields.package === `${pkg.name} (${pkg.version})` )
          listProbes.push(probe.fields.name)
      })
    }

    return (
      <PackageForm
        nameversion={nameversion}
        pkg={pkg}
        probes={listProbes}
        repos6={repos6}
        repos7={repos7}
        repos9={ repos9 }
        packageVersions={packageVersions}
        addview={addview}
        cloneview={cloneview}
        disabled={disabled}
        location={location}
      />
    )

  } else
    return null
}
