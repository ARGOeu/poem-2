import React, { useEffect, useState } from 'react';
import { Backend, WebApi } from './DataManager';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import {
  BaseArgoView,
  NotifyOk,
  DiffElement,
  NotifyWarn,
  NotifyError,
  ErrorComponent,
  ModalAreYouSure,
  ParagraphTitle,
  DefaultColumnFilter,
  SelectColumnFilter,
  BaseArgoTable,
  DropdownWithFormText,
  CustomDropdownIndicator,
  CustomReactSelect
 } from './UIElements';
import {
  Badge,
  Button,
  ButtonToolbar,
  Col,
  Form,
  FormGroup,
  FormFeedback,
  FormText,
  Input,
  InputGroup,
  InputGroupText,
  Label,
  Popover,
  PopoverBody,
  PopoverHeader,
  Row,
  Table
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import ReactDiffViewer from 'react-diff-viewer-continued';
import CreatableSelect from 'react-select/creatable';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  fetchMetricTags,
  fetchMetricTemplates,
  fetchMetricTemplateTypes,
  fetchMetricTemplateVersion,
  fetchOStags,
  fetchProbeVersion,
  fetchUserDetails,
  fetchUserGroups,
  fetchMetrics,
  fetchMetricProfiles,
  fetchTenants
} from './QueryFunctions';
import * as Yup from 'yup';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { yupResolver } from '@hookform/resolvers/yup';
import { 
  ListViewPlaceholder,
  MetricFormPlaceholder
} from './Placeholders';


const metricValidationSchema = Yup.object().shape({
  name: Yup.string()
    .matches(/^\S*$/, 'Name cannot contain white spaces')
    .required('Required'),
  type: Yup.string(),
  probeversion: Yup.string().when('type', {
    is: (val) => val === 'Active',
    then: (schema) => schema.required('Required')
  }),
  probeexecutable: Yup.string().when('type', {
    is: (val) => val === 'Active',
    then: (schema) => schema.required('Required')
  }),
  config: Yup.array().when("type", {
    is: (val) => val === "Active",
    then: (schema) => schema.of(
      Yup.object().shape({
        value: Yup.string().required("Required")
      })
    )
  })
})


const InlineDiffElement = ({title, item1, item2}) => {
  let n = Math.max(item1.length, item2.length);

  let elem1 = [];
  for (let i = 0; i < item1.length; i++) {
    elem1.push('key: ' + item1[i]['key'] + ', value: ' + item1[i]['value'])
  }

  let elem2 = [];
  for (let i = 0; i < item2.length; i++) {
    elem2.push('key: ' + item2[i]['key'] + ', value: ' + item2[i]['value'])
  }

  if (item1.length > item2.length) {
    for (let i = item2.length; i < item1.length; i++) {
      elem2.push(' ');
    }
  } else if (item2.length > item1.length) {
    for (let i = item1.length; i < item2.length; i++) {
      elem1.push(' ');
    }
  }

  const elements = [];
  for (let i = 0; i < n; i++) {
    elements.push(
      <ReactDiffViewer
        oldValue={elem2[i]}
        newValue={elem1[i]}
        showDiffOnly={true}
        splitView={false}
        hideLineNumbers={true}
        disableWordDiff={true}
        key={'diff-' + i}
      />
    )
  }

  return (
    <div id='argo-contentwrap' className='ms-2 mb-2 mt-2 p-3 border rounded'>
      <h6 className='mt-4 font-weight-bold text-uppercase'>{title}</h6>
      {elements}
    </div>
    )

}


function arraysEqual(arr1, arr2) {
    if(arr1.length !== arr2.length)
        return false;
    for(var i = arr1.length; i--;) {
        if(arr1[i]['key'] !== arr2[i]['key'] || arr1[i]['value'] !== arr2[i]['value'])
            return false;
    }

    return true;
}


const InlineFields = ({
  fieldname="",
  fields=undefined,
  insert=undefined,
  remove=undefined,
  control=undefined,
  readOnly=false,
  isPassive=false,
  isMetric=false,
  addnew=false,
  addview=false,
  errors=undefined
}) => {
  return (
    <>
      <h6 className='mt-4 font-weight-bold text-uppercase' hidden={ isPassive && fieldname !== 'flags' }>{ fieldname.replace('_', ' ') }</h6>
      {
        fields.map((entry, index) =>
          <React.Fragment key={entry.id}>
            <Row>
              <Col md={5}>
                { index === 0 && <Label for={ `${fieldname}.${index}.key` }>Key</Label> }
              </Col>
              <Col md={5}>
                { index === 0 && <Label for={ `${fieldname}.${index}.value` }>Value</Label> }
              </Col>
            </Row>
            <Row>
              <Col md={5}>
                <Controller
                  name={ `${fieldname}.${index}.key` }
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      id={ `${fieldname}.${index}.key` }
                      data-testid={ `${fieldname}.${index}.key` }
                      className={ `form-control ${entry.isNew && "border-success"}` }
                      disabled={ readOnly || fieldname === "config" || (isPassive && entry.key === "PASSIVE") }
                    />
                  }
                />
              </Col>
              <Col md={5}>
                <Controller
                  name={ `${fieldname}.${index}.value` }
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      id={ `${fieldname}.${index}.value` }
                      data-testid={ `${fieldname}.${index}.value` }
                      className={ `form-control ${entry.isNew && "border-success"} ${ errors?.config?.[index]?.value && "is-invalid" }` }
                      disabled={ readOnly || (isPassive && entry.key === "PASSIVE") || (fieldname === "config" && entry.key === "path" && isMetric) }
                    />
                  }
                />
                {
                  fieldname === "config" &&
                    <ErrorMessage
                      errors={ errors }
                      name={ `config.${index}.value` }
                      render={ ({ message }) =>
                        <FormFeedback invalid="true" className="end-0">
                          { message }
                        </FormFeedback>
                      }
                    />
                }
              </Col>
              <Col md={2}>
                {
                  (fieldname !== 'config' && (entry.key !== '' || entry.value !== '' || fields.length > 1) && !readOnly) &&
                    <Button
                      hidden={
                        (isPassive && fieldname !== "flags") || (fieldname === "flags" && entry.key === "PASSIVE")
                      }
                      size="sm"
                      color="danger"
                      data-testid={ `${fieldname}.${index}.remove` }
                      onClick={ () => {
                        remove(index)
                      }}
                    >
                      <FontAwesomeIcon icon={ faMinus } />
                    </Button>
                }
              </Col>
            </Row>
          </React.Fragment>
        )
      }
      {
        (addnew && !readOnly) &&
          <Row className={ isPassive ? "mt-0" : "mt-2" }>
            <Col md={2}>
              <Button
                hidden={ (isPassive && fieldname !== "flags") }
                size="sm"
                color="success"
                data-testid={ `${fieldname}.addnew` }
                onClick={ () => {
                  addview ?
                    insert(fields.length, { key: "", value: "" })
                  :
                    insert(fields.length, { key: "", value: "", isNew: true })
                }}
              >
                <FontAwesomeIcon icon={ faPlus } /> Add another {fieldname.slice(-1) === 's' ? fieldname.slice(0, -1).replace('_', ' '): fieldname.replace('_', ' ')}
              </Button>
            </Col>
          </Row>
      }
    </>
  )
}


export const ProbeVersionLink = ({probeversion, publicView=false}) => (
  <Link to={`/ui/${publicView ? 'public_' : ''}probes/` + probeversion.split(' ')[0] + '/history/' + probeversion.split(' ')[1].substring(1, probeversion.split(' ')[1].length - 1)}>
    {probeversion}
  </Link>
)


const MPColumnFilter = ({column: { filterValue, setFilter, filterList }}) => {
  const options = React.useMemo(() => filterList)

  return (
    <select
      className="form-control form-select"
      style={{width: "100%"}}
      value={filterValue}
      onChange={e => setFilter(e.target.value || undefined)}
    >
      <option value="">Show all</option>
      {
        options.map((option, i) => (
          <option key={i} value={option.value}>{option.label}</option>
        ))
      }
    </select>
  )
}


const sortMP = (a, b) => {
  if (a.label.toLowerCase() < b.label.toLowerCase()) return -1;
  if (a.label.toLowerCase() > b.label.toLowerCase()) return 1;
  if (a.label.toLowerCase() === b.label.toLowerCase()) return 0;
}


export const ListOfMetrics = (props) => {
  const location = useLocation();
  const type = props.type;
  const publicView = props.publicView;
  const isTenantSchema = props.isTenantSchema;

  const [selected, setSelected] = useState({});
  const [selectAll, setSelectAll] = useState(0);
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalVar, setModalVar] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);

  const backend = new Backend();
  const webapi = type === "metrics" ?
    new WebApi({
      token: props.webapitoken,
      metricProfiles: props.webapimetric
    })
  :
    undefined

  const queryClient = useQueryClient();

  const mutationDelete = useMutation(async (values) => await backend.bulkDeleteMetrics(values));

  const { data: userDetails, error: userDetailsError, isLoading: userDetailsLoading } = useQuery(
    'userdetails', () => fetchUserDetails(isTenantSchema),
    { enabled: !publicView }
  );

  const { data: metrics, error: metricsError, isLoading: metricsLoading } = useQuery(
    `${publicView ? 'public_' : ''}${type === 'metrics' ? 'metric' : 'metrictemplate'}`,
    () => type === 'metrics' ? fetchMetrics(publicView) : fetchMetricTemplates(publicView),
    { enabled: publicView || !!userDetails }
  );

  const { data: types, error: typesError, isLoading: typesLoading } = useQuery(
    `${publicView ? 'public_' : ''}metrictemplatestypes`, () => fetchMetricTemplateTypes(publicView)
  )

  const { data: tags, error: tagsError, isLoading: tagsLoading } = useQuery(
    `${publicView ? 'public_' : ''}metrictags`, () => fetchMetricTags(publicView)
  );

  const { data: OSGroups, error: OSGroupsError, isLoading: OSGroupsLoading } = useQuery(
    type === 'metrics' ? [`${publicView ? 'public_' : ''}metric`, 'usergroups'] : `${publicView ? 'public_' : ''}ostags`,
    () =>  type === 'metrics' ? fetchUserGroups(isTenantSchema, publicView, 'metrics') : fetchOStags(publicView),
    {
      onSuccess: (data) => {
        if (type === "metrics")
          return data["metrics"]
      }
    }
  );

  const { data: metricProfiles, error: errorMP, isLoading: loadingMP } = useQuery(
    [`${publicView ? "public_" : ""}metricprofile`, "webapi"],
    () => fetchMetricProfiles(webapi),
    { enabled: type === "metrics" && (publicView || !!userDetails) }
  )

  const { data: tenants, error: errorTenants, isLoading: loadingTenants } = useQuery(
    `${publicView ? "public_" : ""}tenant`, () => fetchTenants(publicView),
    { enabled: type === "metrictemplates" && !isTenantSchema }
  )

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onDelete() {
    let selectedMetrics = selected;
    // get only those metrics whose value is true
    let mt = Object.keys(selectedMetrics).filter(key => selectedMetrics[key]);
    if (mt.length > 0 ) {
      setModalMsg(`Are you sure you want to delete metric template${mt.length > 1 ? 's' : ''} ${mt.join(', ')}?`);
      setModalTitle(`Delete metric template${mt.length > 1 ? 's' : ''}`);
      setModalVar(mt);
      toggleAreYouSure();
    } else
      NotifyError({
        msg: 'No metric templates were selected!',
        title: 'Error'
      });
  }

  async function bulkDeleteMetrics(mt) {
    mutationDelete.mutate({ 'metrictemplates': mt }, {
      onSuccess: (data) => {
        if ('info' in data)
          NotifyOk({ msg: data.info, title: 'Deleted' })

        if ('warning' in data)
          NotifyWarn({ msg: data.warning, title: 'Deleted' })

        setSelectAll(0);
        queryClient.invalidateQueries('metrictemplate');
        queryClient.invalidateQueries('public_metrictemplate');
      },
      onError: (error) => {
        NotifyError({
          msg: error.message,
          title: `Error deleting metric template${mt.length > 0 ? 's' : ''}`
        })
      }
    })
  }

  function MP4metric(metric) {
    let mps = []

    metricProfiles.forEach(profile => {
      let metrics = []
      profile.services.forEach(service => {
        service.metrics.forEach(metric => metrics.push(metric))
      })
      if (metrics.includes(metric))
        mps.push(profile.name)
    })

    return mps
  }

  function metric4MP(profile) {
    let metrics = []

    metricProfiles.forEach(mprofile => {
      if (mprofile.name == profile) {
        mprofile.services.forEach(service => {
          service.metrics.forEach(metric => metrics.push(metric))
        })
      }
    })

    return metrics
  }

  let metriclink = `/ui/${(type === 'metrictemplates' && isTenantSchema && !publicView) ? 'administration/' : ''}${publicView ? 'public_' : ''}${type}/`;

  const memoized_columns = React.useMemo(() => {
    function toggleRow(name) {
      const newSelected = Object.assign({}, selected);
      newSelected[name] = !selected[name];
      setSelected(newSelected);
      setSelectAll(Object.keys(newSelected).every((key) => !newSelected[key]) ? 0 : 2);
    }

    function toggleSelectAll(instance) {
      var list_metric = [];

      instance.filteredFlatRows.forEach(row => {
        list_metric.push(row.original)
      })

      let newSelected = {};
      if (selectAll === 0) {
        list_metric.forEach(met => {
          newSelected[met.name] = true;
        });
      }

      setSelected(newSelected);
      setSelectAll(selectAll === 0 ? 1 : 0);
    }

    let columns = [
      {
        Header: 'Name',
        accessor: 'name',
        column_width: `${type === "metrics" ? "35%" : "39%"}`,
        Cell: row =>
          <Link to={`${metriclink}${row.value}`} >
            {row.value}
          </Link>,
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Probe version',
        column_width: '20%',
        accessor: 'probeversion',
        Cell: row => (
          <div style={{textAlign: 'center'}}>
            {
              (row.value) ?
                <ProbeVersionLink
                  publicView={publicView}
                  probeversion={row.value}
                />
              :
                ""
                }
          </div>
        ),
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Type',
        column_width: `${ type === "metrics" ? "10%" : "12%" }`,
        accessor: 'mtype',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        filterList: types,
        Filter: SelectColumnFilter
      },
      {
        Header: 'Tag',
        column_width: `${ type === "metrics" ? "10%" : "12%" }`,
        accessor: 'tags',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {
              row.value.length === 0 ?
                <Badge color='dark'>none</Badge>
              :
                row.value.map((tag, i) =>
                  <Badge className={'me-1'} key={i} color={tag === 'internal' ? 'success' : tag === 'deprecated' | tag === 'eol' ? 'danger' : 'secondary'}>
                    {tag}
                  </Badge>
                )
            }
          </div>,
        filterList: tags ? tags.map(tag => tag.name) : [],
        Filter: SelectColumnFilter
      }
    ];

    if (type == 'metrictemplates' && userDetails && userDetails.is_superuser && !isTenantSchema) {
        columns.splice(
          0,
          0,
          {
            id: 'checkbox',
            accessor: null,
            Cell: (row) => {
              let original = row.cell.row.original;
              return (
                <div style={{display: 'flex', justifyContent: 'center'}}>
                  <input
                    type='checkbox'
                    className='checkbox'
                    data-testid={`checkbox-${original.name}`}
                    checked={ selected[original.name] === true }
                    onChange={() => toggleRow(original.name)}
                  />
                </div>
              );
            },
            Header: "Delete",
            Filter: (instance) =>
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <input
                  type='checkbox'
                  data-testid='checkbox-select-all'
                  className='checkbox'
                  checked={selectAll === 1}
                  ref={input => {
                    if (input) {
                      input.indeterminate = selectAll === 2;
                    }
                  }}
                  onChange={() => toggleSelectAll(instance)}
                />
              </div>,
            column_width: '5%'
          }
        );
    } else {
      columns.splice(
        0,
        0,
        {
          Header: '#',
          id: 'row',
          column_width: '5%',
          Filter: ""
        }
      );
    }

    if (type === 'metrics') {
      columns.splice(
        4,
        0,
        {
          Header: 'Group',
          column_width: '10%',
          accessor: 'group',
          Cell: row =>
            <div style={{textAlign: 'center'}}>
              {row.value}
            </div>,
          filterList: OSGroups,
          Filter: SelectColumnFilter
        }
      );
      columns.splice(
        6,
        0,
        {
          Header: "Metric profile",
          column_width: "10%",
          accessor: "profiles",
          Cell: row => {
            let original = row.cell.row.original
            let mps = MP4metric(original.name)
            return (
              <div style={{textAlign: "center"}}>
                {
                  mps.length === 0 ?
                    <Badge color="dark">none</Badge>

                  :
                    mps.map((profile, i) =>
                      <Badge className="me-1" key={i} color="info">
                        {profile}
                      </Badge>
                    )
                }
              </div>
            )
          },
          filterList: metricProfiles ? metricProfiles.map(profile => Object({label: profile.name, value: metric4MP(profile.name)})).sort(sortMP) : [Object({label: "", value: ""})],
          // id needs to be declared, even though it's not used; filter doesn't work otherwise
          filter: (rows, id, filterValue) => {
            return rows.filter(row => {
              const rowValue = row.values.name
              return filterValue.includes(rowValue)
            })
          },
          Filter: MPColumnFilter
        }
      )
    } else {
      if (isTenantSchema) {
        columns.splice(
          4,
          0,
          {
            Header: 'OS',
            column_width: "12%",
            accessor: 'ostag',
            Cell: row =>
              <div style={{textAlign: 'center'}}>
                {row.value.join(', ')}
              </div>,
            filterList: OSGroups,
            Filter: SelectColumnFilter
          }
        );
      }

      if (!isTenantSchema && tenants) {
        var tenants_list = tenants.map(tenant => tenant.name)
        tenants_list.splice(tenants_list.indexOf("SuperPOEM Tenant"), 1)
        columns.splice(
          5,
          0,
          {
            Header: "Tenants",
            column_width: "10%",
            accessor: "tenants",
            Cell: row =>
              <div style={{ textAlign: "center" }}>
                {
                  row.value.length === 0 ?
                    <Badge color="dark">none</Badge>
                  :
                    row.value.map((tenant, i) =>
                      <Badge className={"me-1"} key={i} color="secondary">
                        { tenant }
                      </Badge>
                    )
                }
              </div>,
            filterList: tenants ? tenants_list : [],
            Filter: SelectColumnFilter
          }
        )
      }
    }

    return columns;
  })

  if (metricsLoading || typesLoading || tagsLoading || OSGroupsLoading || userDetailsLoading || loadingMP || loadingTenants)
    return (
      <ListViewPlaceholder
        resourcename={ type === "metrics" ? "metric" : "metric template" }
        infoview={ isTenantSchema && publicView && type === "metrics" }
        buttons={
          type === "metrics" ? 
            <></>
          :
            (isTenantSchema || publicView) ? 
              <></>
            :
              <div>
                <Button color="secondary" disabled>Add</Button>
                <Button className="ms-2" color="secondary" disabled>Delete</Button>
              </div>
        }
      />
    )

  else if (metricsError)
    return (<ErrorComponent error={metricsError.message}/>);

  else if (typesError)
    return (<ErrorComponent error={typesError.message}/>);

  else if (tagsError)
    return (<ErrorComponent error={tagsError.message}/>);

  else if (OSGroupsError)
    return (<ErrorComponent error={OSGroupsError.message}/>);

  else if (errorMP)
    return ( <ErrorComponent error={errorMP} /> )

  else if (userDetailsError)
    return (<ErrorComponent error={userDetailsError.message}/>);

  else if (errorTenants)
    return (<ErrorComponent error={ errorTenants.message } />)

  else if (metrics && types && tags && OSGroups && (type === "metrictemplates" || metricProfiles)) {
    if (type === 'metrics') {
      return (
        <BaseArgoView
          resourcename='metric'
          location={location}
          listview={true}
          addnew={false}
          title={ !publicView ? "Select metric to change" : undefined }
        >
          <BaseArgoTable
            data={metrics}
            columns={memoized_columns}
            page_size={50}
            resourcename='metrics'
            filter={true}
          />
        </BaseArgoView>
      )
    } else {
      if (isTenantSchema)
        return (
          <BaseArgoView
            resourcename="metric template"
            location={ location }
            listview={ true }
            addnew={ false }
          >
            <BaseArgoTable
              data={metrics}
              columns={memoized_columns}
              page_size={50}
              resourcename='metric templates'
              filter={true}
              selectable={ false }
            />
          </BaseArgoView>
        );
      else
        return (
          <>
            <ModalAreYouSure
              isOpen={areYouSureModal}
              toggle={toggleAreYouSure}
              title={modalTitle}
              msg={modalMsg}
              onYes={() => bulkDeleteMetrics(modalVar)}
            />
            <div className="d-flex align-items-center justify-content-between">
              <h2 className="ms-3 mt-1 mb-4">{`Select metric template ${publicView ? 'for details' : 'to change'}`}</h2>
              {
                !publicView &&
                  <ButtonToolbar>
                    <Link className={'btn btn-secondary me-2'} to={location.pathname + '/add'} role='button'>Add</Link>
                    {
                      !isTenantSchema &&
                        <Button
                          className='btn btn-secondary'
                          onClick={() => onDelete()}
                        >
                          Delete
                        </Button>
                    }
                  </ButtonToolbar>
              }
            </div>
            <div id='argo-contentwrap' className='ms-2 mb-2 mt-2 p-3 border rounded'>
              <BaseArgoTable
                data={metrics}
                columns={memoized_columns}
                page_size={50}
                resourcename='metric templates'
                filter={true}
                selectable={!publicView}
              />
            </div>
          </>
        );
    }
  } else
    return null;
};


const styles = {
  multiValue: (base, state) => {
    return (state.data.value === 'internal') ? { ...base, backgroundColor: '#d4edda' } : (state.data.value === 'deprecated' | state.data.value === 'eol') ? { ...base, backgroundColor: '#f8d7da' } : base;
  },
};


export const MetricForm =
  ({
    obj_label='',
    resourcename="",
    initValues=undefined,
    isHistory=false,
    isTenantSchema=false,
    probeversions=[],
    groups=[],
    metrictemplatelist=[],
    types=[],
    alltags=[],
    saveFormValues=undefined,
    doChange=undefined,
    doDelete=undefined,
    writePerm=undefined,
    ...props
  }) => {
    const addview = props.addview
    const cloneview = props.cloneview
    const tenantview = props.tenantview
    const publicView = props.publicView
    const probeview = props.probeview
    const location = useLocation()

    const resourcename_beautify = resourcename === "metric" ? "metric" : "metric template"

    let list_probes = [];
    probeversions.forEach(prv => list_probes.push(prv.object_repr));

    const [popoverOpen, setPopoverOpen] = useState(false);
    const [areYouSureModal, setAreYouSureModal] = useState(false);
    const [modalFlag, setModalFlag] = useState(undefined);
    const [modalTitle, setModalTitle] = useState(undefined);
    const [modalMsg, setModalMsg] = useState(undefined);

    const { control, setValue, getValues, handleSubmit, formState: { errors } } = useForm({
      defaultValues: {
        id: initValues.id ? initValues.id : "",
        name: initValues.name,
        profiles: initValues.profiles,
        probeversion: initValues.probeversion,
        type: initValues.type,
        group: initValues.group ? initValues.group: "",
        description: initValues.description,
        probeexecutable: initValues.probeexecutable,
        parent: initValues.parent,
        config: initValues.config,
        attributes: initValues.attributes,
        dependency: initValues.dependency,
        parameter: initValues.parameter,
        flags: initValues.flags,
        file_attributes: initValues.file_attributes,
        file_parameters: initValues.file_parameters,
        tags: initValues.tags,
        probe: initValues.probe,
        package: initValues.probe ? initValues.probe.package: ""
      },
      mode: "all",
      resolver: yupResolver(metricValidationSchema)
    })

    const probe = useWatch({ control, name: "probe" })
    const type = useWatch({ control, name: "type" })
    const watchAttributes = useWatch({ control, name: "attributes" })
    const watchDependency = useWatch({ control, name: "dependency" })
    const watchParameter = useWatch({ control, name: "parameter" })
    const watchFlags = useWatch({ control, name: "flags" })

    useEffect(() => {
      let pkg = ""
      if (type === "Active")
        pkg = probe?.package

      setValue("package", pkg)
    }, [probe])

    useEffect(() => {
      if (resourcename !== "metric") {
        if (type === "Passive")
          setValue("probeversion", "")

        else
          if (!getValues("probeversion") && "name" in probe)
            setValue("probeversion", `${probe.name} (${probe.version})`)
      }
    }, [type])

    useEffect(() => {
      if (attributes.length === 0)
        setValue("attributes", [{ key: "", value: "" }])
    }, [watchAttributes])

    useEffect(() => {
      if (dependency.length === 0)
        setValue("dependency", [{ key: "", value: "" }])
    }, [watchDependency])

    useEffect(() => {
      if (parameter.length === 0)
        setValue("parameter", [{ key: "", value: "" }])
    }, [watchParameter])

    useEffect(() => {
      if (flags.length === 0)
        setValue("flags", [{ key: "", value: "" }])
    }, [watchFlags])

    const { fields: config, insert: configInsert, remove: configRemove } = useFieldArray({
      control,
      name: "config"
    })

    const { fields: attributes, insert: attributesInsert, remove: attributesRemove } = useFieldArray({
      control,
      name: "attributes"
    })

    const { fields: dependency, insert: dependencyInsert, remove: dependencyRemove } = useFieldArray({
      control,
      name: "dependency"
    })

    const { fields: parameter, insert: parameterInsert, remove: parameterRemove } = useFieldArray({
      control,
      name: "parameter"
    })

    const { fields: flags, insert: flagsInsert, remove: flagsRemove } = useFieldArray({
      control,
      name: "flags"
    })

    function togglePopOver() {
      setPopoverOpen(!popoverOpen)
    }

    function toggleAreYouSure() {
      setAreYouSureModal(!areYouSureModal)
    }

    function onSubmitHandle(values) {
      setModalMsg(`Are you sure you want to ${addview || cloneview ? 'add' : 'change'} ${resourcename_beautify}?`)
      setModalTitle(`${addview || cloneview ? 'Add' : 'Change'} ${resourcename_beautify}`)
      setModalFlag('submit')
      saveFormValues(values)
      toggleAreYouSure()
    }

    function onDeleteHandle() {
      let profiles = getValues("profiles")
      let name = getValues("name")
      let msg = ""

      if (resourcename === "metric" && !isHistory && profiles.length > 0) {
        msg = <div>
          <p>Metric { name } is part of profile(s): { profiles.join(", ") }</p>
          <p>ARE YOU SURE you want to delete it?</p>
        </div>
      } else
        msg = `Are you sure you want to delete ${resourcename_beautify}?`

      setModalMsg(msg)
      setModalTitle(`Delete ${resourcename_beautify}`)
      setModalFlag('delete')
      toggleAreYouSure()
    }

    return (
      <BaseArgoView
        resourcename={ resourcename }
        location={ location }
        addview={ addview }
        tenantview={ tenantview }
        publicview={ publicView }
        history={ obj_label === "metric" ? !publicView : !probeview }
        cloneview={ cloneview }
        infoview={ isHistory }
        clone={ obj_label === "metric" ? false : !publicView }
        modal={ true }
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
        toggle={ toggleAreYouSure }
        submitperm={ writePerm }
      >
        <Form onSubmit={ handleSubmit(val => onSubmitHandle(val)) } data-testid="metric-form">
          <FormGroup>
            <Row className='mb-3'>
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
                        className={ `form-control ${errors?.name && 'is-invalid'}` }
                        disabled={ isHistory || isTenantSchema || publicView }
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
                  Metric name.
                </FormText>
              </Col>
              <Col md={4} className='mt-1'>
                <InputGroup>
                  <InputGroupText>Type</InputGroupText>
                  <Controller
                    name="type"
                    control={ control }
                    render={ ({ field }) =>
                      (isTenantSchema || isHistory || publicView) ?
                        <Input
                          { ...field }
                          className="form-control"
                          data-testid="mtype"
                          disabled={ true }
                        />
                      :
                        <DropdownWithFormText
                          forwardedRef={ field.ref }
                          onChange={ e => {
                            setValue('type', e.value)
                            let flags = getValues("flags")
                            if (e.value === 'Passive') {
                              let ind = getValues("flags").length;
                              if (ind === 1 && flags[0].key === '') {
                                flags = [{ key: "PASSIVE", value: "1" }]
                              } else {
                                flags[ind] = { key: "PASSIVE", value: "1" }
                              }
                              setValue("flags", flags)
                            } else if (e.value === 'Active') {
                              if (!getValues("probe"))
                                setValue('probe', {'package': ''})

                              if (getValues("config").length !== 5)
                                setValue(
                                  'config',
                                  [
                                    { key: 'maxCheckAttempts', value: '' },
                                    { key: 'timeout', value: '' },
                                    { key: 'path', value: '' },
                                    { key: 'interval', value: '' },
                                    { key: 'retryInterval', value: '' },
                                  ]
                                )

                              let ind = undefined;
                              flags.forEach((e, index) => {
                                if (e.key === 'PASSIVE') {
                                  ind = index;
                                }
                              });
                              if (flags.length === 1)
                                flags.splice(ind, 1, {'key': '', 'value': ''})
                              else
                                flags.splice(ind, 1)
                              setValue("flags", flags)
                            }
                          }}
                          options={ types }
                          value={ field.value }
                          error={ errors?.type }
                        />
                      }
                  />
                </InputGroup>
                <FormText color='muted'>
                  Metric is of given type.
                </FormText>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <InputGroup>
                  <InputGroupText>Probe</InputGroupText>
                  <Controller
                    name="probeversion"
                    control={ control }
                    render={ ({ field }) =>
                      type === 'Passive' ?
                        <input
                          { ...field }
                          className='form-control'
                          disabled={true}
                          data-testid='probeversion'
                        />
                      :
                        (isHistory || isTenantSchema || publicView) ?
                          <Input
                            { ...field }
                            data-testid='probeversion'
                            className='form-control'
                            disabled={true}
                          />
                        :
                          <DropdownWithFormText
                            forwardedRef={ field.ref }
                            error={ errors?.probeversion }
                            onChange={ e => {
                              setValue('probeversion', e.value)
                              let probeversion = probeversions.find(prv => prv.object_repr === e.value);
                              if (probeversion)
                                setValue('probe', probeversion.fields)
                              else
                                setValue('probe', {'package': ''})
                            }}
                            options={ list_probes }
                            value={ field.value }
                          />
                    }
                  />
                  <ErrorMessage
                    errors={ errors }
                    name="probeversion"
                    render={ ({ message }) =>
                      <FormFeedback invalid="true" className="end-0">
                        { message }
                      </FormFeedback>
                    }
                  />
                </InputGroup>
                {
                  type === 'Active' &&
                    <FormText color='muted'>
                      Probe name and version&nbsp;
                      {
                        !isHistory &&
                          <>
                            <FontAwesomeIcon
                              id='probe-popover'
                              hidden={getValues("mtype") === 'Passive' || addview}
                              icon={faInfoCircle}
                              style={{color: '#416090'}}
                            />
                            <Popover
                              placement='bottom'
                              isOpen={popoverOpen}
                              target='probe-popover'
                              toggle={togglePopOver}
                              trigger='hover'
                            >
                              <PopoverHeader>
                                <ProbeVersionLink
                                  probeversion={ getValues("probeversion") }
                                  publicView={ publicView }
                                />
                              </PopoverHeader>
                              <PopoverBody>{ getValues("probe").description }</PopoverBody>
                            </Popover>
                          </>
                      }
                    </FormText>
              }
              </Col>
              <Col md={4} className='mt-1'>
                <InputGroup>
                  <InputGroupText>Package</InputGroupText>
                  <Controller
                    name="package"
                    control={ control }
                    render={ ({ field }) =>
                      <Input
                        { ...field }
                        className="form-control"
                        disabled={ true }
                        data-testid="package"
                      />
                    }
                  />
                </InputGroup>
                <FormText color='muted'>
                  Package which contains probe.
                </FormText>
              </Col>
            </Row>
            {
              (obj_label === 'metrictemplate' && (!isHistory && !isTenantSchema && !publicView)) ?
                <Row className='mb-4 mt-2'>
                  <Col md={10}>
                    <Label for='tags'>Tags:</Label>
                    <Controller
                      name="tags"
                      control={ control }
                      render={ ({ field }) =>
                        <CreatableSelect
                          forwardedRef={ field.ref }
                          inputId='tags'
                          closeMenuOnSelect={false}
                          isMulti
                          onChange={ (value) => setValue('tags', value) }
                          options={ alltags }
                          components={{ CustomDropdownIndicator }}
                          defaultValue={ field.value }
                          styles={ styles }
                        />
                      }
                    />
                  </Col>
                </Row>
              :
                <Row className='mb-4 mt-2'>
                  <Col md={10}>
                    <Label>Tags:</Label>
                    <div>
                      {
                        getValues("tags").length === 0 ?
                          <Badge color='dark'>none</Badge>
                        :
                          (obj_label === 'metrictemplate' && !isHistory) ?
                            getValues("tags").map((tag, i) =>
                              <Badge className={'me-1'} key={i} color={tag.value === 'internal' ? 'success' : tag.value === 'deprecated' | tag.value === 'eol' ? 'danger' : 'secondary'}>
                                { tag.value }
                              </Badge>
                            )
                          :
                            getValues("tags").map((tag, i) =>
                              <Badge className='me-1' key={i} color={tag === 'internal' ? 'success' : tag === 'deprecated' | tag === 'eol' ? 'danger' : 'secondary'}>
                                { tag }
                              </Badge>
                            )
                      }
                    </div>
                  </Col>
                </Row>
            }
            <Row className='mb-4 mt-2'>
              <Col md={10}>
                <Label for='description'>Description:</Label>
                <Controller
                  name="description"
                  control={ control }
                  render={ ({ field }) =>
                    <textarea
                      { ...field }
                      className='form-control'
                      data-testid='description'
                      disabled={ isTenantSchema || isHistory || publicView }
                    />
                  }
                />
              </Col>
            </Row>
            {
              obj_label === 'metric' &&
                <Row className='mb-4'>
                  <Col md={3}>
                    <InputGroup>
                      <InputGroupText>Group</InputGroupText>
                      <Controller
                        name="group"
                        control={ control }
                        render={ ({ field }) =>
                          (isHistory || publicView) ?
                            <Input
                              { ...field }
                              data-testid='group'
                              className='form-control'
                              disabled={ true }
                            />
                          :
                            <DropdownWithFormText
                              forwardedRef={ field.ref }
                              options={ groups }
                              value={ field.value }
                              onChange={ e => setValue('group', e.value) }
                            />
                        }
                      />
                    </InputGroup>
                    <FormText color='muted'>
                      Metric is member of selected group.
                    </FormText>
                  </Col>
                </Row>
          }
          </FormGroup>
          <FormGroup>
            <ParagraphTitle title='Metric configuration'/>
            <h6 className='mt-4 font-weight-bold text-uppercase' hidden={ type === 'Passive'}>probe executable</h6>
            {
              type === 'Active' &&
                <>
                  <Row>
                    <Col md={5}>
                      <Controller
                        name="probeexecutable"
                        control={ control }
                        render={ ({ field }) =>
                          <Input
                            { ...field }
                            data-testid='probeexecutable'
                            className={ `form-control ${errors?.probeexecutable && "is-invalid"}` }
                            disabled={ isTenantSchema || isHistory || publicView }
                          />
                        }
                      />
                      <ErrorMessage
                        errors={ errors }
                        name="probeexecutable"
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                    </Col>
                  </Row>
                  <InlineFields
                    fieldname="config"
                    fields={ config }
                    insert={ configInsert }
                    remove={ configRemove }
                    control={ control }
                    readOnly={ publicView || isHistory || (resourcename !== "metric" && isTenantSchema) }
                    addview={ addview }
                    isMetric={ resourcename === "metric" }
                    isPassive={ type === "Passive" }
                    errors={ errors }
                  />
                  <InlineFields
                    fieldname='attributes'
                    fields={ attributes }
                    insert={ attributesInsert }
                    remove={ attributesRemove }
                    control={ control }
                    readOnly={ publicView || isHistory || isTenantSchema }
                    addnew={ true }
                    addview={ addview }
                    isPassive={ type === "Passive" }
                  />
                  <InlineFields
                    fieldname="dependency"
                    fields={ dependency }
                    insert={ dependencyInsert }
                    remove={ dependencyRemove }
                    control={ control }
                    readOnly={ publicView || isHistory || isTenantSchema }
                    addnew={ true }
                    addview={ addview }
                    isPassive={ type === "Passive" }
                  />
                  <InlineFields
                    fieldname="parameter"
                    fields={ parameter }
                    insert={ parameterInsert }
                    remove={ parameterRemove }
                    control={ control }
                    readOnly={ publicView || isHistory || isTenantSchema }
                    addnew={ true }
                    addview={ addview }
                    isPassive={ type === "Passive" }
                  />
                </>
            }
            <InlineFields
              fieldname="flags"
              fields={ flags }
              insert={ flagsInsert }
              remove={ flagsRemove }
              control={ control }
              readOnly={ publicView || isHistory || isTenantSchema }
              addnew={ true }
              addview={ addview }
              isPassive={ type === "Passive" }
            />
            <h6 className='mt-4 font-weight-bold text-uppercase'>parent</h6>
            <Row>
              <Col md={5}>
                <Controller
                  name="parent"
                  control={ control }
                  render={ ({ field }) =>
                    (isTenantSchema || isHistory || publicView) ?
                      <Input
                        { ...field }
                        className='form-control'
                        data-testid='parent'
                        disabled={true}
                      />
                    :
                      <CustomReactSelect
                        forwardedRef={ field.ref }
                        isClearable={ true }
                        onChange={ e => {
                          if (e)
                            setValue('parent', e.value)
                          else
                            setValue('parent', '')
                        }}
                        options={ metrictemplatelist.map(templ => new Object({ label: templ, value: templ })) }
                        value={ field.value ?
                          new Object({ label: field.value, value: field.value })
                          : undefined
                        }
                      />
                  }
                />
              </Col>
            </Row>
          </FormGroup>
          {
            ( obj_label === "metric" ? writePerm && !publicView : !tenantview && !publicView && !isHistory) &&
              <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                {
                  (!addview && !cloneview) ?
                    <Button
                      color="danger"
                      onClick={() => onDeleteHandle()}
                    >
                      Delete
                    </Button>
                  :
                    <div></div>
                }
                <Button color="success" id="submit-button" type="submit">Save</Button>
              </div>
          }
        </Form>
      </BaseArgoView>
    )
}


export const CompareMetrics = (props) => {
  const { name, id1: version1, id2: version2 } = useParams();
  const publicView = props.publicView;
  const type = props.type;

  const { data: metrics, error, isLoading: loading } = useQuery(
    [type, `${type === 'metric' ? 'tenant' : ''}version`, name],
    () => type === 'metric' ?
        fetchMetricVersions(publicView, name)
      :
        fetchMetricTemplateVersion(publicView, name)
  )

  if (loading)
    return (
      <>
        <h2 className='ms-3 mt-1 mb-4'>{`Compare ${name}`}</h2>
        <div className='ms-3 mt-4 placeholder-glow rounded'>
          <Table className="placeholder rounded" style={{ height: "250px" }} />
        </div>
      </>
    );

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (metrics) {
    const metric1 = metrics.find(met => met.version == version1).fields;
    const metric2 = metrics.find(met => met.version == version2).fields;

    return (
      <React.Fragment>
        <div className='d-flex align-items-center justify-content-between'>
          <h2 className='ms-3 mt-1 mb-4'>{`Compare ${name}`}</h2>
        </div>
        {
          (metric1.name !== metric2.name) &&
            <DiffElement title='name' item1={metric1.name} item2={metric2.name}/>
        }
        {
          (metric1.probeversion !== metric2.probeversion) &&
            <DiffElement title='probe version' item1={metric1.probeversion} item2={metric2.probeversion}/>
        }
        {
          (metric1.type !== metric2.type) &&
            <DiffElement title='type' item1={metric1.type} item2={metric2.type}/>
        }
        {
          (!arraysEqual(metric1.tags, metric2.tags)) &&
            <DiffElement title='tags' item1={metric1.tags} item2={metric2.tags}/>
        }
        {
          (type === 'metric' && metric1.group !== metric2.group) &&
            <DiffElement title='group' item1={metric1.group} item2={metric2.group}/>
        }
        {
          (metric1.description !== metric2.description) &&
            <DiffElement title='description' item1={metric1.description} item2={metric2.description}/>
        }
        {
          (metric1.probeexecutable !== metric2.probeexecutable) &&
            <DiffElement title='probe executable' item1={metric1.probeexecutable} item2={metric2.probeexecutable}/>
        }
        {
          (metric1.parent !== metric2.parent) &&
            <DiffElement title='parent' item1={metric1.parent} item2={metric2.parent}/>
        }
        {
          (!arraysEqual(metric1.config, metric2.config)) &&
            <InlineDiffElement title='config' item1={metric1.config} item2={metric2.config}/>
        }
        {
          (!arraysEqual(metric1.attribute, metric2.attribute)) &&
            <InlineDiffElement title='attribute' item1={metric1.attribute} item2={metric2.attribute}/>
        }
        {
          (type === 'metrictemplate' && !arraysEqual(metric1.dependency, metric2.dependency)) &&
            <InlineDiffElement title='dependency' item1={metric1.dependency} item2={metric2.dependency}/>
        }
        {
          (type === 'metric' && !arraysEqual(metric1.dependancy, metric2.dependancy)) &&
            <InlineDiffElement title='dependency' item1={metric1.dependancy} item2={metric2.dependancy}/>
        }
        {
          (!arraysEqual(metric1.parameter, metric2.parameter)) &&
            <InlineDiffElement title='parameter' item1={metric1.parameter} item2={metric2.parameter}/>
        }
        {
          (!arraysEqual(metric1.flags, metric2.flags)) &&
            <InlineDiffElement title='flags' item1={metric1.flags} item2={metric2.flags}/>
        }
      </React.Fragment>
    );
  } else
    return null;
};


export const MetricChange = (props) => {
  const { name } = useParams();
  const navigate = useNavigate()
  const publicView = props.publicView;

  const backend = new Backend();
  const queryClient = useQueryClient();

  const mutation = useMutation(async (values) => await backend.changeObject('/api/v2/internal/metric/', values));
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/metric/${name}`));

  const [formValues, setFormValues] = useState(undefined);

  const { data: userDetails, error: userDetailsError, isLoading: userDetailsLoading } = useQuery(
    'userdetails', () => fetchUserDetails(true), { enabled: !publicView }
  )

  const { data: metric, error: metricError, isLoading: metricLoading } = useQuery(
    [`${publicView ? 'public_' : ''}metric`, name], async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metric/${name}`);
    },
    {
      enabled: !publicView ? !!userDetails : true,
      initialData: () => {
        return queryClient.getQueryData(`${publicView ? 'public_' : ''}metric`)?.find(met => met.name === name)
      }
    }
  );

  const metricProbeVersion = metric?.probeversion.split(' ')[0];

  const { data: probes, error: probesError, isLoading: probesLoading } = useQuery(
    [`${publicView ? 'public_' : ''}probe`, 'version', metricProbeVersion],
    () => fetchProbeVersion(publicView, metricProbeVersion),
    { enabled: !!metricProbeVersion }
  );

  const saveFormValues = (values) => {
    setFormValues(values)
  }

  const handleInlineFields = (field) => {
    if (field.length === 1 && field[0].key === "" && field[0].value === "")
      return []

    else
      return field
  }

  async function doChange() {
    const sendValues = new Object({
      name: formValues.name,
      mtype: formValues.type,
      group: formValues.group,
      description: formValues.description,
      parent: formValues.parent,
      probeversion: formValues.probeversion,
      probeexecutable: formValues.probeexecutable,
      config: handleInlineFields(formValues.config),
      attribute: handleInlineFields(formValues.attributes),
      dependancy: handleInlineFields(formValues.dependency),
      flags: handleInlineFields(formValues.flags),
      parameter: handleInlineFields(formValues.parameter),
    })
    mutation.mutate(sendValues, {
      onSuccess: () => {
        queryClient.invalidateQueries("public_metric")
        queryClient.invalidateQueries("metric")
        NotifyOk({
          msg: 'Metric successfully changed',
          title: 'Changed',
          callback: () => navigate('/ui/metrics')
        })
      },
      onError: (error) => {
        NotifyError({
          title: 'Error',
          msg: error.message ? error.message : 'Error changing metric'
        })
      }
    })
  }

  async function doDelete() {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries("public_metric")
        queryClient.invalidateQueries("metric")
        NotifyOk({
          msg: 'Metric successfully deleted',
          title: 'Deleted',
          callback: () => navigate('/ui/metrics')
        })
      },
      onError: (error) => {
        NotifyError({
          title: 'Error',
          msg: error.message ? error.message : 'Error deleting metric'
        })
      }
    })
  }

  if (metricLoading || userDetailsLoading || probesLoading)
    return (<MetricFormPlaceholder obj_label="metric" { ...props } />)

  else if (metricError)
    return (<ErrorComponent error={metricError}/>);

  else if (userDetailsError)
    return (<ErrorComponent error={userDetailsError}/>);

  else if (probesError)
    return (<ErrorComponent error={probesError}/>);

  else {
    const writePerm = publicView ?
      false
    :
      userDetails ?
        userDetails.is_superuser || userDetails.groups.metrics.indexOf(metric.group) >= 0
      :
        false;

    const groups = userDetails ?
      userDetails.groups.metrics.indexOf(metric.group) < 0 ?
        [...userDetails.groups.metrics, metric.group]
      :
        userDetails.groups.metrics
    :
      [metric.group];

    const probe = probes ? probes.find(prb => prb.object_repr === metric.probeversion).fields : { package: "" };

    return (
      <MetricForm
        {...props}
        obj_label="metric"
        resourcename={ publicView ? 'Metric details' : 'metric' }
        initValues={{
          name: metric.name,
          probeversion: metric.probeversion,
          description: metric.description,
          type: metric.mtype,
          group: metric.group,
          probeexecutable: metric.probeexecutable,
          parent: metric.parent,
          config: metric.config,
          attributes: metric.attribute,
          dependency: metric.dependancy,
          parameter: metric.parameter,
          flags: metric.flags,
          files: metric.files,
          file_attributes: metric.files,
          file_parameters: metric.fileparameter,
          probe: probe,
          tags: metric.tags,
          profiles: metric.profiles
        }}
        isTenantSchema={ true }
        groups={ groups }
        writePerm={ writePerm }
        saveFormValues={ (val) => saveFormValues(val) }
        doChange={ doChange }
        doDelete={ doDelete }
      />
    )
  }
};


const fetchMetricVersions = async (publicView, name) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}tenantversion/metric/${name}`);
}


export const MetricVersionDetails = (props) => {
  const { name, version } = useParams();

  const { data: metrics, error: errorMetric, isLoading: loadingMetric } = useQuery(
    ['metric', 'tenantversion', name], () => fetchMetricVersions(false, name)
  )

  const metricProbeVersion = metrics?.find(met => met.version === version).fields.probeversion.split(' ')[0];

  const { data: probes, error: errorProbes, isLoading: loadingProbes } = useQuery(
    ['probe', 'version', metricProbeVersion], () => fetchProbeVersion(false, metricProbeVersion),
    { enabled: !!metricProbeVersion }
  )

  if (loadingMetric || loadingProbes)
    return (
      <MetricFormPlaceholder 
        obj_label="metric" 
        historyview={ true } 
        title={ `${name} (${version})` }
      />
    )

  else if (errorMetric)
    return (<ErrorComponent error={errorMetric}/>);

  else if (errorProbes)
    return (<ErrorComponent error={errorProbes} />);

  else if (metrics) {
    const metricVersion = metrics.find(met => met.version === version);
    const metric = {
      ...metricVersion.fields,
      date_created: metricVersion.date_created
    }

    const probe = probes ? probes.find(prb => prb.object_repr === metric.probeversion).fields : {};

    return (
      <MetricForm
        {...props}
        obj_label="metric"
        resourcename={ `${name} (${metric.date_created})` }
        initValues={{
          name: name,
          probeversion: metric.probeversion,
          type: metric.mtype,
          group: metric.group,
          description: metric.description,
          probeexecutable: metric.probeexecutable,
          parent: metric.parent,
          config: metric.config,
          attributes: metric.attribute,
          dependency: metric.dependancy,
          parameter: metric.parameter,
          flags: metric.flags,
          file_attributes: metric.files,
          file_parameters: metric.fileparameter,
          probe: probe,
          tags: metric.tags
        }}
        isHistory={ true }
      />
    )
  } else
    return null;
};
