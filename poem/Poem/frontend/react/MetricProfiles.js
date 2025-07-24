import React, { useState, useMemo, useContext, useEffect } from 'react';
import {Link, useLocation, useParams, useNavigate} from 'react-router-dom';
import {
  Backend, 
  WebApi,
  fetchTenantsMetricProfiles
} from './DataManager';
import {
  BaseArgoView,
  SearchField,
  NotifyOk,
  Icon,
  DiffElement,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  ProfilesListTable,
  CustomError,
  ProfileMain,
  CustomReactSelect,
  NotifyWarn
} from './UIElements';
import {
  Button,
  ButtonDropdown,
  Col,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Form,
  Label,
  Row,
  Table
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import PapaParse from 'papaparse';
import { downloadCSV } from './FileDownload';
import {
  fetchUserDetails,
  fetchBackendMetricProfiles
} from './QueryFunctions';

import './MetricProfiles.css';
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form';
import * as yup from "yup"
import { yupResolver } from '@hookform/resolvers/yup';
import { 
  ChangeViewPlaceholder,
  ListViewPlaceholder, 
  ProfileMainPlaceholder, 
  VersionComparePlaceholder
} from './Placeholders';

export const MetricProfilesClone = (props) => {
  return <MetricProfilesComponent cloneview={true} {...props} />
};

export const MetricProfilesChange = (props) => { 
  return <MetricProfilesComponent {...props} />
};


const MetricProfilesComponentContext = React.createContext();


const MetricProfilesSchema = yup.object().shape({
  name: yup.string().required("Required"),
  groupname: yup.string().required("Required"),
  view_services: yup.array()
  .of(yup.object().shape({
    service: yup.string()
      .required("Required")
      .test("predefined_services", "Must be one of predefined service types", function (value) {
        let arr = this.options.context.allServices.map(service => service.name)
        if (arr.indexOf(value) === -1)
          return false

        else
          return true
      }),
    metric: yup.string()
      .required("Required")
      .test("predefined_metrics", "Must be one of predefined metrics", function (value) {
        if (this.options.context.allMetrics.indexOf(value) == -1)
          return false

        else
          return true
      })
  }))
})


const MetricProfileAutocompleteField = ({
  tupleType,
  index,
  error,
  isNew
}) => {
  const context = useContext(MetricProfilesComponentContext)

  const { control, getValues, setValue, clearErrors } = useFormContext()

  const name = `view_services.${index}.${tupleType}`

  const options = tupleType === "service" ?
    context.serviceflavours_all.map(service => service.name)
  :
    tupleType === "metric" ?
      context.metrics_all
    :
      undefined

  const changeFieldValue = (newValue) => {
    const origIndex = context.listServices.findIndex(e => e.service === getValues(`view_services.${index}.service`) && e.metric === getValues(`view_services.${index}.metric`) && e.index === getValues(`view_services.${index}.index`))

    if (getValues("view_services").length === 1 && getValues(name) == "") {
      setValue(`view_services.${index}.isNew`, true)
      setValue(`services.${origIndex}.isNew`, true)
    }

    else {
      setValue(`${name}Changed`, true)
      setValue(`services.${origIndex}.${tupleType}Changed`, true)
    }

    clearErrors("view_services")
    setValue(`services.${origIndex}.${tupleType}`, newValue)
    setValue(name, newValue)
    clearErrors(name)
  }

  return (
    <Controller
      name={ name }
      control={ control }
      render={ ({ field }) =>
        <CustomReactSelect
          forwardedRef={ field.ref }
          onChange={ e => changeFieldValue(e.value) }
          options={ options.map(option => new Object({ label: option, value: option })) }
          value={ field.value ? { label: field.value, value: field.value } : undefined }
          error={ error || (!isNew && getValues("view_services")?.[index]?.[`${tupleType}Changed`]) }
          isnew={ isNew }
        />
      }
    />
  )
}


const sortServices = (a, b) => {
  if (a.service.toLowerCase() < b.service.toLowerCase()) return -1;
  if (a.service.toLowerCase() > b.service.toLowerCase()) return 1;
  if (a.service.toLowerCase() === b.service.toLowerCase()) {
    if (a.metric.toLowerCase() < b.metric.toLowerCase()) return -1;
    if (a.metric.toLowerCase() > b.metric.toLowerCase()) return 1;
    if (a.metric.toLowerCase() === b.metric.toLowerCase()) return 0;
  }
}


const ServicesList = () => {
  const context = useContext(MetricProfilesComponentContext);

  const { control, getValues, setValue, resetField, clearErrors, trigger, formState: { errors } } = useFormContext()

  const { fields, insert, remove } = useFieldArray({ control, name: "view_services" })

  const onRemove = (index) => {
    let tmpListServices = [ ...context.listServices ]
    let origIndex = tmpListServices.findIndex(e => e.service == getValues(`view_services.${index}.service`) && e.metric == getValues(`view_services.${index}.metric`))
    tmpListServices.splice(origIndex, 1)
    resetField("services")
    setValue("services", tmpListServices)
    remove(index)
    clearErrors("view_services")
    trigger("view_services")
  }

  const onInsert = (index) => {
    let tmpListServices = [ ...context.listServices ]
    let origIndex = tmpListServices.findIndex(e => e.service === getValues(`view_services.${index}.service`) && e.metric === getValues(`view_services.${index}.metric`))
    let new_element = { service: "", metric: "", isNew: true }
    tmpListServices.splice(origIndex, 0, new_element)
    resetField("services")
    setValue("services", tmpListServices)
    insert(index + 1, new_element)
  }

  return (
    <table className="table table-bordered table-sm table-hover">
      <thead className="table-active">
        <tr>
          <th className="align-middle text-center" style={{width: "5%"}}>#</th>
          <th style={{width: !context.publicView ? "42.5%" : "47.5%"}}><Icon i="serviceflavour"/> Service flavour</th>
          <th style={{width: !context.publicView ? "42.5%" : "47.5%"}}><Icon i='metrics'/> Metric</th>
          {
            !(context.publicView || context.historyview) &&
              <th style={{width: "10%"}}>Actions</th>
          }
        </tr>
      </thead>
      <tbody>
        <tr style={{background: "#ECECEC"}}>
          <td className="align-middle text-center">
            <FontAwesomeIcon icon={faSearch}/>
          </td>
          <td>
            <Controller
              name="search_serviceflavour"
              control={ control }
              render={ ({ field }) =>
                <SearchField
                  field={ field }
                  forwardedRef={ field.ref }
                  className="form-control"
                />
              }
            />
          </td>
          <td>
            <Controller
              name="search_metric"
              control={ control }
              render={ ({ field }) =>
                <SearchField
                  field={ field }
                  forwardedRef={ field.ref }
                  className="form-control"
              />
              }
            />
          </td>
          {
            !(context.publicView || context.historyview) &&
              <td>
                {''}
              </td>
          }
        </tr>
        {
          fields.map((service, index) =>
            !(context.publicView || context.historyview) ?
              <React.Fragment key={ service.id }>
                <tr key={index}>
                  <td className={service.isNew ? "bg-light align-middle text-center" : "align-middle text-center"}>
                    {index + 1}
                  </td>
                  <td className={service.isNew ? "bg-light" : ""}>
                    <MetricProfileAutocompleteField
                      tupleType='service'
                      index={ index }
                      isNew={ service.isNew }
                      error={ errors?.view_services?.[index]?.service || errors?.view_services?.[index]?.dup }
                    />
                    {
                      errors?.view_services?.[index]?.service &&
                        <CustomError error={ errors?.view_services?.[index]?.service?.message } />
                    }
                  </td>
                  <td className={service.isNew ? "bg-light" : ""}>
                    <MetricProfileAutocompleteField
                      tupleType='metric'
                      index={ index }
                      isNew={ service.isNew }
                      error={ errors?.view_services?.[index]?.metric || errors?.view_services?.[index]?.dup }
                    />
                    {
                      errors?.view_services?.[index]?.metric &&
                        <CustomError error={ errors?.view_services?.[index]?.metric?.message } />
                    }
                  </td>
                  <td className={service.isNew ? "bg-light align-middle ps-3" : "align-middle ps-3"}>
                    <Button
                      size="sm"
                      color="light"
                      data-testid={`remove-${index}`}
                      onClick={ () => onRemove(index) }
                    >
                      <FontAwesomeIcon icon={faTimes}/>
                    </Button>
                    <Button
                      size="sm"
                      color="light"
                      data-testid={`insert-${index}`}
                      onClick={ () => onInsert(index) }
                    >
                      <FontAwesomeIcon icon={faPlus}/>
                    </Button>
                  </td>
                </tr>
                {
                  errors?.view_services?.[index]?.dup &&
                    <tr key={index + getValues("view_services").length}>
                      <td className="bg-light"></td>
                      <td colSpan="2" className="bg-light text-center">
                        <CustomError error={ errors?.view_services?.[index]?.dup?.message } />
                      </td>
                      <td className="bg-light"></td>
                    </tr>
                }
              </React.Fragment>
            :
              <tr key={ service.id }>
                <td className="align-middle text-center">{ index + 1 }</td>
                <td>{ service.service }</td>
                <td>{ service.metric }</td>
              </tr>
          )
        }
      </tbody>
    </table>
  )
}


const fetchMetricProfile = async (webapi, apiid) => {
  return await webapi.fetchMetricProfile(apiid);
}


const MetricProfilesForm = ({
  metricProfile,
  userDetails,
  metricsAll=undefined,
  servicesAll=undefined,
  tenantsProfiles=undefined,
  doChange=undefined,
  doDelete=undefined,
  historyview=false,
  ...props
}) => {
  const profile_name = props.profile_name
  const addview = props.addview
  const location = useLocation();
  const cloneview = props.cloneview;
  const publicView = props.publicView;
  const combined = props.combined

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [onYes, setOnYes] = useState('')
  const [formikValues, setFormikValues] = useState({})
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const hiddenFileInput = React.useRef(null);

  const flattenServices = (services) => {
    let flat_services = [];

    services.forEach((service_element) => {
      let service = service_element.service;
      service_element.metrics.forEach((metric) => {
        flat_services.push({ service, metric })
      })
    })
    return flat_services
  }

  let write_perm = undefined

  if (publicView) {
    write_perm = false
  }
  else if (cloneview) {
    write_perm = userDetails.is_superuser ||
      userDetails.groups.metricprofiles.length > 0;
  }
  else if (!addview) {
    write_perm = userDetails.is_superuser ||
          userDetails.groups.metricprofiles.indexOf(metricProfile.groupname) >= 0;
  }
  else {
    write_perm = userDetails.is_superuser ||
      userDetails.groups.metricprofiles.length > 0;
  }

  const defaultServices = metricProfile.profile.services.length > 0 ?
    historyview ?
      metricProfile.profile.services.sort(sortServices)
    :
      flattenServices(metricProfile.profile.services).sort(sortServices)
  :
    [{ service: "", metric: "" }]

  let initValues = {
    id: metricProfile.profile.id,
    name: `${ cloneview ? "Cloned " : ""}${metricProfile.profile.name}`,
    description: metricProfile.profile.description,
    groupname: metricProfile.groupname,
    services: defaultServices,
    view_services: defaultServices,
    search_metric: "",
    search_serviceflavour: ""
  }

  if (addview && combined) {
    for (let tenant of Object.keys(tenantsProfiles)) {
      initValues[`${tenant}-profile`] = ""
    }
  }

  const methods = useForm({
    defaultValues: initValues,
    mode: "all",
    resolver: yupResolver(MetricProfilesSchema),
    context: { allServices: servicesAll, allMetrics: metricsAll }
  })

  const { control } = methods

  const searchMetric = useWatch({ control, name: "search_metric" })
  const searchServiceFlavour = useWatch({ control, name: "search_serviceflavour" })
  const viewServices = useWatch({ control, name: "view_services" })
  const listServices = useWatch({ control, name: "services" })

  useEffect(() => {
    for (var i=0; i < viewServices.length; i++)
      for (var j=0; j < viewServices.length; j++)
        if (i !== j && viewServices[i].service === viewServices[j].service && viewServices[i].metric === viewServices[j].metric && (viewServices[i].isNew || viewServices[i].serviceChanged || viewServices[i].metricChanged)) {
          methods.setError(`view_services.[${i}].dup`, { type: "custom", message: "Duplicated" })
        }

    if (viewServices.length === 0) {
      methods.setValue("view_services", [{ service: "", metric: "" }])
    }
  }, [viewServices])

  useEffect(() => {
    methods.setValue("view_services", listServices.filter(e => e.service.toLowerCase().includes(searchServiceFlavour.toLowerCase()) && e.metric.toLowerCase().includes(searchMetric.toLowerCase())))
  }, [searchMetric, searchServiceFlavour])

  const onSubmitHandle = async (formValues) => {
    let msg = `Are you sure you want to ${(addview || cloneview) ? "add" : "change"} metric profile?`
    let title = `${(addview || cloneview) ? "Add" : "Change"} metric profile`

    setAreYouSureModal(!areYouSureModal);
    setModalMsg(msg)
    setModalTitle(title)
    setOnYes('change')
    setFormikValues(formValues)
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(formikValues.id);
    else if (onYes === 'change')
      doChange({
          formValues: formikValues,
          servicesList: listServices.sort(sortServices)
        }
      );
  }

  const resetServices = (values) => {
    methods.resetField("view_services")
    methods.setValue("view_services", values.sort(sortServices))
    methods.resetField("search_metric")
    methods.resetField("search_serviceflavour")
    methods.resetField("services")
    methods.setValue("services", values.sort(sortServices))
    methods.trigger()
  }

  return (
    <BaseArgoView
      resourcename={publicView ? 'Metric profile details' : historyview ? `${metricProfile.profile.name} (${metricProfile.date_created})` : 'metric profile'}
      location={location}
      modal={true}
      cloneview={cloneview}
      clone={true}
      history={!publicView}
      state={{areYouSureModal, 'modalFunc': onYesCallback, modalTitle, modalMsg}}
      toggle={() => setAreYouSureModal(!areYouSureModal)}
      addview={publicView ? !publicView : addview}
      publicview={publicView}
      infoview={historyview}
      submitperm={write_perm}
      extra_button={
        !publicView &&
          <ButtonDropdown isOpen={dropdownOpen} toggle={() => setDropdownOpen(!dropdownOpen)}>
            <DropdownToggle caret color='secondary'>CSV</DropdownToggle>
            <DropdownMenu>
              <DropdownItem
                onClick={() => {
                  let csvContent = [];
                  listServices.sort(sortServices).forEach((service) => {
                    csvContent.push({service: service.service, metric: service.metric})
                  })
                  const content = PapaParse.unparse(csvContent);
                  let filename = `${profile_name}.csv`;
                  downloadCSV(content, filename)
                }}
                disabled={addview}
              >
                Export
              </DropdownItem>
              <DropdownItem
                onClick={() => {hiddenFileInput.current.click()}}
              >
                Import
              </DropdownItem>
            </DropdownMenu>
            <input
              type='file'
              data-testid='file_input'
              ref={hiddenFileInput}
              onChange={(e) => {
                PapaParse.parse(e.target.files[0], {
                  header: true,
                  complete: (results) => {
                    var imported = results.data;
                    // remove entries without keys if there is any
                    imported = imported.filter(
                      obj => {
                        return 'service' in obj && 'metric' in obj
                      }
                    )
                    imported.forEach(item => {
                      if (!listServices.some(service => {
                        return service.service === item.service && service.metric == item.metric
                      }))
                        item.isNew = true
                    })
                    resetServices(imported)
                  }
                })
              }}
              style={{display: 'none'}}
            />
          </ButtonDropdown>
      }
    >
      <FormProvider { ...methods }>
        <Form onSubmit={ methods.handleSubmit(val => onSubmitHandle(val)) } data-testid="metricprofiles-form">
          <ProfileMain
            description="description"
            grouplist={
              write_perm ?
                userDetails.groups.metricprofiles
              :
                [ methods.getValues("groupname") ]
            }
            profiletype="metric"
            fieldsdisable={ publicView || historyview }
            addview={ addview || cloneview }
          />
          {
            (combined && addview) && <ParagraphTitle title="Combined from"/>
          }
          {
            (combined && addview) &&
            Object.keys(tenantsProfiles).sort().map(tenant => 
              <Row key={tenant}>
                <Col md={7}>
                  <h6 className='mt-4 font-weight-bold text-uppercase'>{ tenant }</h6>
                  <Label for={ `${tenant}-profile` }>Metric profile:</Label>
                  <Controller
                    name={ `${tenant}-profile` }
                    control={ control }
                    render={ ({ field }) =>
                      <CustomReactSelect
                        forwardedRef={ field.ref }
                        inputId={ `${tenant}-profile` }
                        onChange={ e => {
                          let tenants = Object.keys(tenantsProfiles)
                          let old_profile = methods.getValues(`${tenant}-profile`)
                          methods.setValue(`${tenant}-profile`, e.value) 
                          let old_profile_tuples = []
                          if (old_profile)
                            old_profile_tuples = flattenServices(tenantsProfiles[tenant].filter(profile => profile.name === old_profile)[0].services)
                          let current_tuples = []
                          for (let tnnt of tenants) {
                            let pname = methods.getValues(`${tnnt}-profile`)
                            if (pname)
                              current_tuples = current_tuples.concat(flattenServices(tenantsProfiles[tnnt].filter(profile => profile.name === pname)[0].services))
                          }
                          let tuples = current_tuples.filter(tuple => !old_profile_tuples.includes(tuple))
                          resetServices(tuples)
                        } }
                        options={ tenantsProfiles[tenant].map(profile => new Object({ value: profile.name, label: profile.name })) }
                        defaultValue={ field.value }
                      />
                    }
                  />
                </Col>
              </Row>
            )
          }
          <ParagraphTitle title='Metric instances'/>
          <MetricProfilesComponentContext.Provider value={{
            publicView: publicView,
            historyview: historyview,
            searchMetric: searchMetric,
            searchServiceFlavour: searchServiceFlavour,
            listServices: listServices,
            serviceflavours_all: servicesAll,
            metrics_all: metricsAll
          }}>
            <ServicesList />
          </MetricProfilesComponentContext.Provider>
          {
            (!historyview && write_perm) &&
              <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                {
                  !addview && !cloneview ?
                    <Button
                      color="danger"
                      onClick={() => {
                        setModalMsg('Are you sure you want to delete Metric profile?')
                        setModalTitle('Delete metric profile')
                        setAreYouSureModal(!areYouSureModal);
                        setFormikValues(methods.getValues())
                        setOnYes('delete')
                      }}
                    >
                      Delete
                    </Button>
                  :
                    <div></div>
                }
                <Button
                  color="success"
                  id="submit-button"
                  type="submit"
                  disabled={ methods.formState.errors?.view_services?.length > 0 }
                >
                  Save
                </Button>
              </div>
          }
        </Form>
      </FormProvider>
    </BaseArgoView>
  )
}


const MetricProfilesFormPlaceholder = ( props ) => {
  const addview = props.addview
  const publicview = props.publicView
  const historyview = props.historyview
  const cloneview = props.cloneview
  const title = props.title

  return (
    <ChangeViewPlaceholder
      resourcename={ `${publicview ? "Metric profile details" : historyview ? title : "metric profile"}` }
      addview={ addview }
      cloneview={ cloneview }
      infoview={ publicview || historyview }
      buttons={
        !addview && !publicview && !cloneview && !historyview &&
          <div>
            <Button color="secondary" disabled>CSV</Button>
            <Button className="ms-3" color="secondary" disabled>Clone</Button>
            <Button className="ms-3" color="secondary" disabled>History</Button>
          </div>
      }
    >
      <ProfileMainPlaceholder
        profiletype="metric"
        description={ true }
      />
      <ParagraphTitle title='Metric instances'/>
      <Table className="placeholder rounded" style={{ height: "600px" }} />
    </ChangeViewPlaceholder>
  )
}
   

export const MetricProfilesComponent = (props) => {
  const { name: profile_name } = useParams()
  const navigate = useNavigate()
  const addview = props.addview
  const cloneview = props.cloneview;
  const publicView = props.publicView;
  const tenantDetails = props.tenantDetails !== undefined ? props.tenantDetails : "";
  const combined = props.tenantDetails && props.tenantDetails.combined !== undefined ? props.tenantDetails.combined : false;  
  const backend = new Backend();
  const webapi = new WebApi({
    token: props.webapitoken,
    metricProfiles: props.webapimetric,
    aggregationProfiles: props.webapiaggregation,
    reportsConfigurations: props.webapireports,
    serviceTypes: props.webapiservicetypes
  })

  const queryClient = useQueryClient();
  const webapiChangeMutation = useMutation(async (values) => await webapi.changeMetricProfile(values));
  const backendChangeMutation = useMutation(async (values) => await backend.changeMetricProfile(values))
  const webapiAddMutation = useMutation(async (values) => await webapi.addMetricProfile(values));
  const backendAddMutation = useMutation(async (values) => await backend.addMetricProfile(values))
  const webapiDeleteMutation = useMutation(async (idProfile) => await webapi.deleteMetricProfile(idProfile));
  const backendDeleteMutation = useMutation(async (idProfile) => await backend.deleteMetricProfile(idProfile))

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true),
    { enabled: !publicView }
  );

  const { data: backendMP, error: errorBackendMP, isLoading: loadingBackendMP } = useQuery(
    [`${publicView ? 'public_' : ''}metricprofile`, 'backend', profile_name], async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metricprofiles/${profile_name}`);
    },
    {
      enabled: (publicView || !addview),
      initialData: () => {
        if (!addview)
          return queryClient.getQueryData([`${publicView ? 'public_' : ''}metricprofile`, "backend"])?.find(mpr => mpr.name === profile_name)
      }
    }
  )

  const { data: webApiMP, error: errorWebApiMP, isLoading: loadingWebApiMP } = useQuery(
    [`${publicView ? 'public_' : ''}metricprofile`, 'webapi', profile_name],
    () => fetchMetricProfile(webapi, backendMP.apiid),
    {
      enabled: !!backendMP && !addview,
      initialData: () => {
        if (!addview)
          return queryClient.getQueryData([`${publicView ? "public_" : ""}metricprofile`, "webapi"])?.find(profile => profile.id == backendMP.apiid)
      }
    }
  )

  const { data: metricsAll, error: errorMetricsAll, isLoading: loadingMetricsAll } = useQuery(
    "metrictemplate_names", async () => await backend.fetchListOfNames("/api/v2/internal/availmetrictemplates"),
    { enabled: !publicView }
  )

  const { data: webApiST, errorWebApiST, isLoading: loadingWebApiST} = useQuery(
    ['servicetypes', 'webapi'], async () => {
      return await webapi.fetchServiceTypes();
    },
    { enabled: !!userDetails }
  )

  const { data: aggregationProfiles, error: errorAggrProfiles, isLoading: loadingAggrProfiles } = useQuery(
    [`${publicView ? "public_" : ""}aggregationprofile`, "webapi"],
    async () => await webapi.fetchAggregationProfiles(),
    { enabled: !publicView && !cloneview && !addview && !!userDetails }
  )

  const { data: reports, error: errorReports, isLoading: loadingReports } = useQuery(
    [`${publicView ? "public_" : ""}report`, "webapi"], async () => await webapi.fetchReports(),
    { enabled: !publicView && !cloneview && !addview && !!userDetails }
  )

  const { data: tenantsProfiles, error: errorTenantsProfiles, isLoading: loadingTenantsProfiles } = useQuery(
    ["metricprofile", "combined", profile_name],
    () => fetchTenantsMetricProfiles(props.webapimetric, tenantDetails.tenants),
    { 
      enabled: combined && addview && !!userDetails,
      initialData: () => {
        if (userDetails)
          return userDetails.tenantdetails
      }
    }
  )

  const getAssociatedAggregations = (profileId) => {
    return aggregationProfiles.filter(profile => profile.metric_profile.id === profileId).map(profile => profile.name)
  }

  const getAssociatedReports = (profileId) => {
    let reportsNames = new Array()
    reports.forEach(report => {
      report.profiles.forEach(profile => {
        if (profile.type === "metric" && profile.id === profileId)
          reportsNames.push(report.info.name)
      })
    })
    return reportsNames
  }

  const doDelete = (idProfile) => {
    let aggrProfiles = getAssociatedAggregations(idProfile)
    let rprts = getAssociatedReports(idProfile)

    if (aggrProfiles.length === 0 && rprts.length === 0)
      webapiDeleteMutation.mutate(idProfile, {
        onSuccess: () => {
          backendDeleteMutation.mutate(idProfile, {
            onSuccess: (data) => {
              queryClient.invalidateQueries('metricprofile');
              queryClient.invalidateQueries('public_metricprofile');
              
              let msg = "Metric profile successfully deleted"

              if ("deleted" in data)
                msg = `${msg}\n${data.deleted}`

              NotifyOk({
                msg: msg,
                title: 'Deleted',
                callback: () => navigate('/ui/metricprofiles')
              });
            },
            onError: (error) => {
              NotifyError({
                title: 'Internal API error',
                msg: error.message ? error.message : 'Internal API error deleting metric profile'
              })
            }
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Web API error',
            msg: error.message ? error.message : 'Web API error deleting metric profile'
          })
        }
      })

    if (aggrProfiles.length >= 1)
      NotifyError({
        title: "Unable to delete",
        msg: `Metric profile is associated with aggregation profile${aggrProfiles.length > 1 ? "s" : ""}: ${aggrProfiles.join(", ")}`
      })

    if (rprts.length >=1 )
      NotifyError({
        title: "Unable to delete",
        msg: `Metric profile is associated with report${rprts.length > 1 ? "s" : ""}: ${rprts.join(", ")}`
      })
  }

  const groupMetricsByServices = (servicesFlat) => {
    let services = [];

    servicesFlat.forEach(element => {
      let service = services.filter(e => e.service === element.service);
      if (!service.length)
        services.push({
          'service': element.service,
          'metrics': [element.metric]
        })
      else
        service[0].metrics.push(element.metric)

    })
    return services
  }

  const doChange = ({formValues, servicesList}) => {
    let services = [];
    let dataToSend = new Object()
    const backend_services = [];
    servicesList.forEach((service) => backend_services.push({ service: service.service, metric: service.metric }));

    if (!addview && !cloneview) {
      const { id } = webApiMP
      services = groupMetricsByServices(servicesList);
      dataToSend = {
        id,
        name: profile_name,
        description: formValues.description,
        services
      };
      webapiChangeMutation.mutate(dataToSend, {
        onSuccess: () => {
          backendChangeMutation.mutate({
            apiid: dataToSend.id,
            name: profile_name,
            description: dataToSend.description,
            groupname: formValues.groupname,
            services: backend_services
          }, {
            onSuccess: (data) => {
              queryClient.invalidateQueries('metricprofile');
              queryClient.invalidateQueries('public_metricprofile');

              let msg = "Metric profile successfully changed"
              let warn_msg = ""

              if ("imported" in data)
                msg = `${msg}\n${data.imported}`

              if ("warning" in data)
                warn_msg = `${warn_msg}\n${data.warning}`.replace(/^\s+|\s+$/g, "")

              if ("unavailable" in data)
                warn_msg = `${warn_msg}\n${data.unavailable}`.replace(/^\s+|\s+$/g, "")

              if ("deleted" in data)
                msg = `${msg}\n${data.deleted}`

              NotifyOk({
                msg: msg,
                title: 'Changed',
                callback: () => navigate('/ui/metricprofiles')
              });

              if (warn_msg)
                NotifyWarn({
                  msg: warn_msg,
                  title: "Metrics warning"
                })
            },
            onError: (error) => {
              NotifyError({
                title: 'Internal API error',
                msg: error.message ? error.message : 'Internal API error changing metric profile'
              })
            }
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Web API error',
            msg: error.message ? error.message : 'Web API error changing metric profile'
          })
        }
      })
    } else {
      services = groupMetricsByServices(servicesList);
      dataToSend = {
        name: formValues.name,
        description: formValues.description,
        services
      }
      webapiAddMutation.mutate(dataToSend, {
        onSuccess: (data) => {
          backendAddMutation.mutate({
            apiid: data.data.id,
            name: dataToSend.name,
            groupname: formValues.groupname,
            description: formValues.description,
            services: backend_services
          }, {
            onSuccess: (data) => {
              queryClient.invalidateQueries('metricprofile');
              queryClient.invalidateQueries('public_metricprofile');
              
              let msg = "Metric profile successfully added"
              let warn_msg = ""

              if ("imported" in data)
                msg = `${msg}\n${data.imported}`

              if ("warning" in data)
                warn_msg = `${warn_msg}\n${data.warning}`.replace(/^\s+|\s+$/g, "")

              if ("unavailable" in data)
                warn_msg = `${warn_msg}\n${data.unavailable}`.replace(/^\s+|\s+$/g, "")

              if ("deleted" in data)
                msg = `${msg}\n${data.deleted}`

              NotifyOk({
                msg: msg,
                title: 'Added',
                callback: () => navigate('/ui/metricprofiles')
              })

              if (warn_msg)
                NotifyWarn({ msg: warn_msg, title: "Metrics warning" })
            },
            onError: (error) => {
              NotifyError({
                title: 'Internal API error',
                msg: error.message ? error.message : 'Internal API error adding metric profile'
              })
            }
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Web API error',
            msg: error.message ? error.message : 'Web API error adding metric profile'
          })
        }
      })
    }
  }

  if (loadingUserDetails || loadingBackendMP || loadingWebApiMP || loadingMetricsAll || loadingWebApiST || loadingAggrProfiles || loadingReports || loadingTenantsProfiles) {
    return <MetricProfilesFormPlaceholder { ...props } />
  }

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (errorBackendMP)
    return (<ErrorComponent error={errorBackendMP}/>);

  else if (errorWebApiMP)
    return (<ErrorComponent error={errorWebApiMP} />)

  else if (errorMetricsAll)
    return (<ErrorComponent error={errorMetricsAll} />)

  else if (errorWebApiST)
    return (<ErrorComponent error={errorWebApiST} />)

  else if (errorAggrProfiles)
    return (<ErrorComponent error={errorAggrProfiles} />)

  else if (errorReports)
    return (<ErrorComponent error={errorReports} />)

  else if (errorTenantsProfiles)
    return (<ErrorComponent error={ errorTenantsProfiles } />)

  else if ((addview && webApiST && (!tenantDetails.combined || (tenantDetails.combined && tenantsProfiles))) || (backendMP && webApiMP && webApiST) || (publicView))
  {
    var metricProfile = {
      profile: {
        id: "",
        name: '',
        description: '',
        services: [],
      },
      groupname: '',
      services: undefined
    }

    if (backendMP && webApiMP) {
      metricProfile.profile = webApiMP
      metricProfile.groupname = backendMP.groupname
    }

    return (
      <MetricProfilesForm
        { ...props }
        profile_name={ profile_name }
        metricProfile={ metricProfile }
        userDetails={ userDetails }
        metricsAll={ metricsAll ? metricsAll : [] }
        servicesAll={ webApiST ? webApiST : [] }
        tenantsProfiles={ tenantsProfiles ? tenantsProfiles : [] }
        combined={ tenantDetails.combined }
        doChange={ doChange }
        doDelete={ doDelete }
      />
    )
  }

  else
    return null
}


export const MetricProfilesList = (props) => {
  const location = useLocation();
  const publicView = props.publicView

  const { data: userDetails, error: errorUserDetails, status: statusUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true)
  );

  const { data: metricProfiles, error: errorMetricProfiles, status: statusMetricProfiles} = useQuery(
    [`${publicView ? 'public_' : ''}metricprofile`, 'backend'],
    () => fetchBackendMetricProfiles(publicView),
    { enabled: !publicView ? !!userDetails : true }
  );

  const columns = useMemo(() => [
    {
      Header: '#',
      accessor: null,
      column_width: '2%'
    },
    {
      Header: 'Name',
      id: 'name',
      accessor: e =>
        <Link
          to={`/ui/${publicView ? 'public_' : ''}metricprofiles/` + e.name}
        >
          {e.name}
        </Link>,
      column_width: '20%'
    },
    {
      Header: 'Description',
      accessor: 'description',
      column_width: '70%'
    },
    {
      Header: 'Group',
      accessor: 'groupname',
      className: 'text-center',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>,
      column_width: '8%'
    }
  ], [])

  if (statusUserDetails === 'loading' || statusMetricProfiles === 'loading')
    return (
      <ListViewPlaceholder
        resourcename="metric profile"
        infoview={ publicView }
      />
    )

  else if (statusMetricProfiles === 'error')
    return (<ErrorComponent error={errorMetricProfiles}/>);

  else if (statusUserDetails === 'error')
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (metricProfiles) {
    return (
      <BaseArgoView
        resourcename='metric profile'
        location={location}
        listview={true}
        addnew={!publicView}
        addperm={publicView ? false : userDetails.is_superuser || userDetails.groups.metricprofiles.length > 0}
        publicview={publicView}>
        <ProfilesListTable
          data={metricProfiles}
          columns={columns}
          type='metric'
        />
      </BaseArgoView>
    )
  }
  else
    return null
}


const ListDiffElement = ({title, item1, item2}) => {
  let list1 = [];
  let list2 = [];
  for (let i = 0; i < item1.length; i++) {
    list1.push(`service: ${item1[i]['service']}, metric: ${item1[i]['metric']}`)
  }

  for (let i = 0; i < item2.length; i++) {
    list2.push(`service: ${item2[i]['service']}, metric: ${item2[i]['metric']}`)
  }

  return (
    <div id='argo-contentwrap' className='ms-2 mb-2 mt-2 p-3 border rounded'>
      <h6 className='mt-4 font-weight-bold text-uppercase'>{title}</h6>
      <ReactDiffViewer
        oldValue={list2.join('\n')}
        newValue={list1.join('\n')}
        showDiffOnly={false}
        splitView={true}
        hideLineNumbers={true}
      />
    </div>
  )
};


const fetchMetricProfileVersions = async (name) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/tenantversion/metricprofile/${name}`);
}


export const MetricProfileVersionCompare = () => {
  const { name, id1: version1, id2: version2 } = useParams();

  const { data: metricProfileVersions, error, status } = useQuery(
    ['metricprofile', 'versions', name], () => fetchMetricProfileVersions(name)
  )

  if (status === 'loading')
    return (
      <VersionComparePlaceholder />
    )

  if (status === 'error')
    return (<ErrorComponent error={error}/>);


  else if (metricProfileVersions) {
    const metricProfileVersion1 = metricProfileVersions.find(ver => ver.version === version1).fields;
    const metricProfileVersion2 = metricProfileVersions.find(ver => ver.version === version2).fields;

    const { name: name1, description: description1, metricinstances:
      metricinstances1, groupname: groupname1 } = metricProfileVersion1
    const { name: name2, description: description2, metricinstances:
      metricinstances2, groupname: groupname2 } = metricProfileVersion2

    return (
      <React.Fragment>
        <div className='d-flex align-items-center justify-content-between'>
          <h2 className='ms-3 mt-1 mb-4'>{`Compare ${name} versions`}</h2>
        </div>
        {
          (name1 !== name2) &&
            <DiffElement title='name' item1={name1} item2={name2}/>
        }
        {
          (description1 !== description2) &&
            <DiffElement title='description' item1={description1} item2={description2}/>
        }
        {
          (groupname1 !== groupname2) &&
            <DiffElement title='groupname' item1={groupname1} item2={groupname2}/>
        }
        {
          (metricinstances1 !== metricinstances2) &&
            <ListDiffElement title='metric instances' item1={metricinstances1} item2={metricinstances2}/>
        }
      </React.Fragment>
    );
  } else
    return null;
}


export const MetricProfileVersionDetails = (props) => {
  const { name, version } = useParams();

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true)
  );

  const { data: metricProfileVersions, error, isLoading: loading } = useQuery(
    ['metricprofile', 'versions', name], () => fetchMetricProfileVersions(name),
    { enabled: !!userDetails }
  )

  if (loadingUserDetails || loading)
    return (
      <MetricProfilesFormPlaceholder historyview={ true } title={ `${name} (${version})` } />
    )

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={ error } />)

  else if (metricProfileVersions) {
    const instance = metricProfileVersions.find(ver => ver.version === version);
    var metricProfile = {
      profile: {
        id: "",
        name: instance.fields.name,
        description: instance.fields.description,
        services: instance.fields.metricinstances
      },
      groupname: instance.fields.groupname,
      date_created: instance.date_created
    }

    return (
      <MetricProfilesForm
        { ...props }
        profile_name={ name }
        historyview={ true }
        metricProfile={ metricProfile }
        userDetails={ userDetails }
      />
    )
  } else
    return null
}
