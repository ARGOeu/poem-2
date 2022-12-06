import React, { useState, useMemo, useContext } from 'react';
import {Link} from 'react-router-dom';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  Icon,
  DiffElement,
  ProfileMainInfo,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  ProfilesListTable,
  CustomError,
  CustomReactSelect
} from './UIElements';
import Autosuggest from 'react-autosuggest';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Formik, Field, FieldArray, Form } from 'formik';
import { faPlus, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import FormikEffect from './FormikEffect.js';
import {Backend, WebApi} from './DataManager';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Col,
  FormGroup,
  FormText,
  Label,
  Row,
  ButtonDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem
} from 'reactstrap';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import * as Yup from 'yup';
import { downloadJSON } from './FileDownload';

import ReactDiffViewer from 'react-diff-viewer';

import "react-notifications/lib/notifications.css";
import './AggregationProfiles.css';
import {
  fetchBackendAggregationProfiles,
  fetchMetricProfiles,
  fetchUserDetails
} from './QueryFunctions';


const AggregationProfilesChangeContext = React.createContext();


const AggregationProfilesSchema = Yup.object().shape({
  name: Yup.string().required('Required'),
  groupname: Yup.string().required('Required'),
  metric_operation: Yup.string().required('Required'),
  profile_operation: Yup.string().required('Required'),
  endpoint_group: Yup.string().required('Required'),
  metric_profile: Yup.string().required('Required'),
  groups: Yup.array()
  .of(Yup.object().shape({
    name: Yup.string().required('Required'),
    operation: Yup.string().required('Required'),
    services: Yup.array().of(
      Yup.object().shape({
        name: Yup.string().required('Required'),
        operation: Yup.string().required('Required')
      })
    )
  }))
})


const DropDown = ({field, data=[], prefix="", class_name="", isnew=false, errors=undefined}) =>
  <Field component="select"
    name={prefix ? `${prefix}.${field.name}` : field.name}
    data-testid={prefix ? `${prefix}.${field.name}` : field.name}
    required={true}
    className={`form-control ${class_name} ${isnew ? 'border-success' : `${errors && errors[field.name] ? 'border-danger' : ''}`}`}
  >
    {
      data.map((name, i) => (
        i === 0 ?
          <option key={i} value='' hidden color='text-muted'>{name}</option>
        :
          <option key={i} value={name}>{name}</option>
      ))
    }
  </Field>


function insertSelectPlaceholder(data, text) {
  if (data)
    return [text, ...data]
  else
    return [text]
}


const AggregationProfileAutocompleteField = ({service, index, isNew, groupNew, groupIndex, isMissing}) => {
  const context = useContext(AggregationProfilesChangeContext);
  const [suggestionList, setSuggestions] = useState(context.list_services)

  return (
    <Autosuggest
      inputProps={{
        className: `"form-control form-select " ${isNew && !groupNew ? "border-success" : ""} ${isMissing ? "border-primary": ""}`,
        placeholder: '',
        onChange: (_, {newValue}) => context.formikBag.form.setFieldValue(`groups.${groupIndex}.services.${index}.name`, newValue),
        value: service.name
      }}
      getSuggestionValue={(suggestion) => suggestion}
      suggestions={suggestionList}
      renderSuggestion={(suggestion, {_, isHighlighted}) =>
        <div
          key={context.list_services.indexOf(suggestion)}
          className={`aggregation-autocomplete-entries ${isHighlighted ?
              "aggregation-autocomplete-entries-highlighted"
              : ""}`
          }>
          {suggestion ? <Icon i='serviceflavour'/> : ''} {suggestion}
        </div>}
      onSuggestionsFetchRequested={({ value }) =>
        {
          let result = context.list_services.filter(service => service.toLowerCase().includes(value.trim().toLowerCase()))
          setSuggestions(result)
      }
      }
      onSuggestionsClearRequested={() => {
        setSuggestions([])
      }}
      onSuggestionSelected={(_, {suggestion}) => {
        context.formikBag.form.setFieldValue(`groups.${groupIndex}.services.${index}.name`, suggestion)
      }}
      shouldRenderSuggestions={() => true}
      theme={{
        suggestionsContainerOpen: 'aggregation-autocomplete-menu',
        suggestionsList: 'aggregation-autocomplete-list'
      }}
    />
  )
}


const GroupList = ({name}) => {
  const context = useContext(AggregationProfilesChangeContext);

  return (
    <Row className="groups">
      {
        context.formikBag.form.values[name].map((group, i) =>
          <FieldArray
            key={i}
            name="groups"
            render={props => (
              <Group
                {...props}
                key={i}
                operation={group.operation}
                services={group.services}
                groupindex={i}
                isnew={group.isNew}
                last={i === context.formikBag.form.values[name].length - 1}
              />
            )}
          />
        )
      }
    </Row>
  )
}


const Group = ({operation, services, groupindex, isnew, last}) => {
  const context = useContext(AggregationProfilesChangeContext);

  if (!last)
    return (
      <React.Fragment key={groupindex}>
        <Col sm={{size: 8}} md={{size: 5}} className="mt-4 mb-2">
          <Card className={isnew ? "border-success" : ""} data-testid={`card-${groupindex}`}>
            <CardHeader className="p-1" color="primary">
              <Row className="d-flex align-items-center g-0">
                <Col sm={{size: 10}} md={{size: 11}}>
                  <Field
                    name={`groups.${groupindex}.name`}
                    placeholder="Name of service group"
                    required={true}
                    className={`${context.formikBag.form.errors && context.formikBag.form.errors.groups &&
                      context.formikBag.form.errors.groups[groupindex] &&
                      context.formikBag.form.errors.groups[groupindex].name ? "form-control border-danger" : "form-control"}`}
                  />
                </Col>
                <Col sm={{size: 2}} md={{size: 1}} className="ps-1">
                  <Button size="sm" color="danger"
                    data-testid='remove-group'
                    type="button"
                    onClick={() => (context.write_perm) && context.formikBag.groupRemove(groupindex)}>
                    <FontAwesomeIcon icon={faTimes}/>
                  </Button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="p-1">
              <FieldArray
                name={`groups.${groupindex}`}
                render={() => (
                  <ServiceList
                    services={services}
                    groupindex={groupindex}
                    groupnew={isnew}
                  />)}
              />
            </CardBody>
            <CardFooter className="p-1 d-flex justify-content-center">
              <div className='col-2' data-testid='operation'>
                <DropDown
                  field={{name: "operation", value: operation}}
                  data={insertSelectPlaceholder(context.list_operations, 'Select')}
                  prefix={`groups.${groupindex}`}
                  class_name="form-select form-control"
                  errors={context.formikBag.form.errors && context.formikBag.form.errors.groups && context.formikBag.form.errors.groups[groupindex]}
                />
              </div>
            </CardFooter>
          </Card>
        </Col>
        <Col sm={{size: 4}} md={{size: 1}} className="mt-5">
          <div className="group-operation" key={groupindex} data-testid={`group-operation-${groupindex}`}>
            <DropDown
              field={{name: 'profile_operation', value: context.formikBag.form.values.profile_operation}}
              data={insertSelectPlaceholder(context.list_operations, 'Select')}
              class_name='form-select'
            />
          </div>
        </Col>
      </React.Fragment>
    )
  else
    return (
      <Col sm={{size: 12}} md={{size: 6}} className="mt-4 mb-2 d-flex justify-content-center align-items-center">
        <Button outline color="secondary" size='lg' disabled={!context.write_perm || !context.list_services ? true : false} onClick={
          () => context.write_perm &&
            context.formikBag.groupInsert(groupindex, {name: '', operation: '', isNew: true,
                services: [{name: '', operation: ''}]})
        }>Add new group</Button>
      </Col>
    )
}


const ServiceList = ({services, groupindex, groupnew=false}) =>
{
  const context = useContext(AggregationProfilesChangeContext);

  return (
    services.map((service, i) =>
      <FieldArray
        key={i}
        name={`groups.${groupindex}.services`}
        render={props => (
          <Service
            key={i}
            service={service}
            groupindex={groupindex}
            groupnew={groupnew}
            index={i}
            last={i === services.length - 1}
            isnew={service.isNew}
            serviceRemove={props.remove}
            serviceInsert={props.insert}
            ismissing={service.name && context.list_services.indexOf(service.name) === -1}
          />
        )}
      />
    )
  )
}


const Service = ({service, operation, groupindex, groupnew, index, isnew,
  serviceInsert, serviceRemove, ismissing}) => {
  const context = useContext(AggregationProfilesChangeContext);

  return (
    <React.Fragment>
      <Row className="d-flex align-items-center service pt-1 pb-1 g-0" key={index}>
        <Col md={8}>
          <AggregationProfileAutocompleteField
            service={service}
            index={index}
            form={context.formikBag.form}
            isNew={isnew}
            groupNew={groupnew}
            groupIndex={groupindex}
            isMissing={ismissing}
          />
        </Col>
        <Col md={2}>
          <div className="input-group" data-testid={`operation-${index}`}>
            <DropDown
              field={{name: "operation", value: operation}}
              data={insertSelectPlaceholder(context.list_operations, 'Select')}
              prefix={`groups.${groupindex}.services.${index}`}
              class_name="form-select service-operation"
              isnew={isnew && !groupnew}
          />
          </div>
        </Col>
        <Col md={2} className="ps-2">
          <Button size="sm" color="light"
            type="button"
            data-testid={`remove-${index}`}
            onClick={() => serviceRemove(index)}>
            <FontAwesomeIcon icon={faTimes}/>
          </Button>
          <Button size="sm" color="light"
            type="button"
            data-testid={`insert-${index}`}
            onClick={() => serviceInsert(index + 1, {name: '', operation:
              context.last_service_operation(index, context.formikBag.form.values.groups[groupindex].services), isNew: true})}>
            <FontAwesomeIcon icon={faPlus}/>
          </Button>
        </Col>
      </Row>
      <Row>
        {
          context.formikBag.form.errors && context.formikBag.form.errors.groups && context.formikBag.form.errors.groups[groupindex] &&
          context.formikBag.form.errors.groups[groupindex].services && context.formikBag.form.errors.groups[groupindex].services[index] &&
          context.formikBag.form.errors.groups[groupindex].services[index].name &&
            <Col md={8}>
              <CustomError error={ context.formikBag.form.errors.groups[groupindex].services[index].name} />
            </Col>
        }
        {
          context.formikBag.form.errors && context.formikBag.form.errors.groups && context.formikBag.form.errors.groups[groupindex] &&
          context.formikBag.form.errors.groups[groupindex].services && context.formikBag.form.errors.groups[groupindex].services[index] &&
          context.formikBag.form.errors.groups[groupindex].services[index].operation &&
            <Col md={{offset: context.formikBag.form.errors.groups[groupindex].services[index].name ? 0 : 8, size: 2}}>
              <CustomError error={ context.formikBag.form.errors.groups[groupindex].services[index].operation } />
            </Col>
      }
      </Row>
    </React.Fragment>
  )
}


const AggregationProfilesForm = ({ values, errors, setFieldValue, historyview=false, addview=false, write_perm=false,
  list_user_groups, logic_operations, endpoint_groups, list_id_metric_profiles }) =>
(
  <>
    <ProfileMainInfo
      values={values}
      errors={errors}
      setFieldValue={setFieldValue}
      fieldsdisable={historyview}
      grouplist={
        historyview ?
          undefined
        :
          write_perm ?
            list_user_groups
          :
            [values.groupname]
      }
      profiletype='aggregation'
      addview={addview}
  />
    <ParagraphTitle title='Operations, endpoint group and metric profile'/>
    <Row className='mt-4'>
      <Col md={4}>
        <FormGroup>
          <Row>
          </Row>
          <Row>
            {
              historyview ?
                <>
                  <Col md={12}>
                    <Label for='aggregationMetric'>Metric operation:</Label>
                  </Col>
                  <Col md={5}>
                    <Field
                      name='metric_operation'
                      data-testid='metric_operation'
                      className='form-control'
                      id='aggregationMetric'
                      disabled={true}
                    />
                  </Col>
                </>
              :
                <Col md={5}>
                  <CustomReactSelect
                    name='metric_operation'
                    id='aggregationMetric'
                    onChange={
                      e => setFieldValue('metric_operation', e.value)
                    }
                    options={
                      logic_operations.map(operation => new Object({
                        label: operation, value: operation
                      }))
                    }
                    value={
                      values.metric_operation ?
                        { label: values.metric_operation, value: values.metric_operation }
                      : undefined
                    }
                    error={errors.metric_operation}
                    label='Metric operation:'
                  />
                </Col>
            }
          </Row>
          <Row>
            <Col md={12}>
              <CustomError error={errors.metric_operation} />
              <FormText>
                Logical operation that will be applied between metrics of each service flavour
              </FormText>
            </Col>
          </Row>
        </FormGroup>
      </Col>
      <Col md={4}>
        <FormGroup>
          <Row>
            {
              historyview ?
                <>
                  <Col md={12}>
                    <Label for='aggregationOperation'>Aggregation operation:</Label>
                  </Col>
                  <Col md={5}>
                    <Field
                      name='profile_operation'
                      data-testid='profile_operation'
                      className='form-control'
                      id='aggregationOperation'
                      disabled={true}
                    />
                  </Col>
                </>
              :
                <Col md={5}>
                  <CustomReactSelect
                    name='profile_operation'
                    id='aggregationOperation'
                    onChange={e => setFieldValue('profile_operation', e.value)}
                    options={
                      logic_operations.map(operation => new Object({
                        label: operation, value: operation
                      }))
                    }
                    value={
                      values.profile_operation ?
                        { label: values.profile_operation, value: values.profile_operation }
                      : undefined
                    }
                    label='Aggregation operation:'
                    error={errors.profile_operation}
                  />
                </Col>
            }
          </Row>
          <Row>
            <Col md={12}>
              <CustomError error={errors.profile_operation} />
              <FormText>
                Logical operation that will be applied between defined service flavour groups
              </FormText>
            </Col>
          </Row>
        </FormGroup>
      </Col>
      <Col md={4}>
        <FormGroup>
          <Row>
            {
              historyview ?
                <>
                  <Col md={12}>
                    <Label for='aggregationEndpointGroup'>Endpoint group:</Label>
                  </Col>
                  <Col md={5}>
                    <Field
                      name='endpoint_group'
                      data-testid='endpoint_group'
                      className='form-control'
                      id='aggregationEndpointGroup'
                      disabled={true}
                    />
                  </Col>
                </>
              :
                <Col md={5}>
                  <CustomReactSelect
                    name='endpoint_group'
                    id='aggregationEndpointGroup'
                    onChange={
                      e => setFieldValue('endpoint_group', e.value)
                    }
                    options={
                      endpoint_groups.map(group => new Object({
                        label: group, value: group
                      }))
                    }
                    value={
                      values.endpoint_group ?
                        { label: values.endpoint_group, value: values.endpoint_group }
                      : undefined
                    }
                    label='Endpoint group:'
                    error={errors.endpoint_group}
                  />
                </Col>
            }
            <CustomError error={errors.endpoint_group} />
          </Row>
        </FormGroup>
      </Col>
    </Row>
    <Row className='mt-4'>
      <Col md={5}>
        <FormGroup>
          {
            historyview ?
              <>
                <Label for='metricProfile'>Metric profile:</Label>
                <Field
                  name='metric_profile'
                  data-testid='metric_profile'
                  id='metricProfile'
                  className='form-control'
                  disabled={true}
                />
              </>
            :
              <CustomReactSelect
                name='metric_profile'
                id='metricProfile'
                onChange={e => setFieldValue('metric_profile', e.value)}
                options={
                  list_id_metric_profiles.map(profile => new Object({
                    label: profile.name, value: profile.name
                  }))
                }
                value={
                  values.metric_profile ?
                    { label: values.metric_profile, value: values.metric_profile }
                  : undefined
                }
                label='Metric profile:'
                error={errors.metric_profile}
              />
          }
          <CustomError error={errors.metric_profile} />
          <FormText>
            Metric profile associated to Aggregation profile. Service flavours defined in service flavour groups originate from selected metric profile.
          </FormText>
        </FormGroup>
      </Col>
    </Row>
    <ParagraphTitle title='Service flavour groups'/>
  </>
);


const GroupsDisabledForm = ( props ) => (
  <FieldArray
    name='groups'
    render={() => (
      <Row className='groups'>
        {
          props.values['groups'].map((group, i) =>
            <FieldArray
              key={i}
              name='groups'
              render={() => (
                <React.Fragment key={i}>
                  <Col sm={{size: 8}} md={{size: 5}} className='mt-4 mb-2'>
                    <Card data-testid={`card-${i}`}>
                      <CardHeader className='p-1' color='primary'>
                        <Row className='d-flex align-items-center g-0'>
                          <Col sm={{size: 10}} md={{size: 11}} data-testid='service-group'>
                            {props.values.groups[i].name}
                          </Col>
                        </Row>
                      </CardHeader>
                      <CardBody className='p-1'>
                        {
                          group.services.map((_, j) =>
                            <FieldArray
                              key={j}
                              name={`groups.${i}.services`}
                              render={() => (
                                <Row className='d-flex align-items-center service pt-1 pb-1 g-0' key={j}>
                                  <Col md={8} data-testid={`service-${j}`}>
                                    {props.values.groups[i].services[j].name}
                                  </Col>
                                  <Col md={2} data-testid={`operation-${j}`}>
                                    {props.values.groups[i].services[j].operation}
                                  </Col>
                                </Row>
                              )}
                            />
                          )
                        }
                      </CardBody>
                      <CardFooter className='p-1 d-flex justify-content-center' data-testid='operation'>
                        {props.values.groups[i].operation}
                      </CardFooter>
                    </Card>
                  </Col>
                  <Col sm={{size: 4}} md={{size: 1}} className='mt-5'>
                    <div className='group-operation' key={i} data-testid={`group-operation-${i}`}>
                      {props.values.profile_operation}
                    </div>
                  </Col>
                </React.Fragment>
              )}
            />
          )
        }
      </Row>
    )}
  />
)


const fetchAP = async (webapi, apiid) => {
  return await webapi.fetchAggregationProfile(apiid);
}


export const AggregationProfilesChange = (props) => {
  const tenant_name = props.tenantname;
  const profile_name = props.match.params.name;
  const addview = props.addview
  const history = props.history;
  const location = props.location;
  const publicView = props.publicView;

  const [listServices, setListServices] = useState(undefined);
  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [onYes, setOnYes] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [formikValues, setFormikValues] = useState({})
  const hiddenFileInput = React.useRef(null);
  const formikRef = React.useRef();

  const backend = new Backend();
  const webapi = new WebApi({
    token: props.webapitoken,
    metricProfiles: props.webapimetric,
    aggregationProfiles: props.webapiaggregation}
  )

  const queryClient = useQueryClient();
  const webapiChangeMutation = useMutation(async (values) => await webapi.changeAggregation(values));
  const backendChangeMutation = useMutation(async (values) => await backend.changeObject('/api/v2/internal/aggregations/', values));
  const webapiAddMutation = useMutation(async (values) => await webapi.addAggregation(values));
  const backendAddMutation = useMutation(async (values) => await backend.addObject('/api/v2/internal/aggregations/', values));
  const webapiDeleteMutation = useMutation(async (idProfile) => await webapi.deleteAggregation(idProfile));
  const backendDeleteMutation = useMutation(async (idProfile) => await backend.deleteObject(`/api/v2/internal/aggregations/${idProfile}`));

  const logic_operations = ["OR", "AND"];
  const endpoint_groups = ["servicegroups", "sites"];

  const { data: userDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true),
    { enabled: !publicView }
  );

  const { data: backendAP, error: errorBackendAP, isLoading: loadingBackendAP } = useQuery(
    [`${publicView ? 'public_' : ''}aggregationprofile`, 'backend', profile_name],
    async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}aggregations/${profile_name}`);
    },
    {
      enabled: !addview && (!publicView ? !!userDetails : true),
      initialData: () => {
        return queryClient.getQueryData(
          [`${publicView ? 'public_' : ''}aggregationprofile`, 'backend']
        )?.find(
          profile => profile.name === profile_name
        )
      }
    }
  )

  const { data: webApiAP, error: errorWebApiAP, isLoading: loadingWebApiAP } = useQuery(
    [`${publicView ? 'public_' : ''}aggregationprofile`, 'webapi', profile_name],
    () => fetchAP(webapi, backendAP.apiid),
    {
      enabled: !!backendAP,
      initialData: () => {
        return queryClient.getQueryData(
          [`${publicView ? "public_" : ""}aggregationprofile`, "webapi"]
        )?.find(
          profile => profile.id == backendAP.apiid
        )
      }
    }
  )

  const { data: metricProfiles, error: errorMetricProfiles, isLoading: loadingMetricProfiles } = useQuery(
    [`${publicView ? 'public_' : ''}metricprofile`, 'webapi'],
    () => fetchMetricProfiles(webapi),
    { enabled: !publicView ? !!userDetails : true }
  )

  const correctMetricProfileName = (metricProfileId, listMetricProfilesWebApi) => {
    let targetProfile = listMetricProfilesWebApi.filter(profile => profile.id === metricProfileId)

    if (targetProfile.length)
      return targetProfile[0].name
    else
      return ''
  }

  const sortServices = (a, b) => {
    if (a.toLowerCase() < b.toLowerCase()) return -1
    if (a.toLowerCase() > b.toLowerCase()) return 1
  }

  const extractListOfServices = (profileFromAggregation, listMetricProfiles) => {
    let targetProfile = listMetricProfiles.filter(profile => profile.name === profileFromAggregation.name)

    if (targetProfile.length === 0)
      targetProfile = listMetricProfiles.filter(profile => profile.id === profileFromAggregation.id)

    if (targetProfile.length) {
      let services = targetProfile[0].services.map(service => service.service)
      return services.sort(sortServices)
    }
    else
      return []
  }

  const sortMetricProfiles = (a, b) => {
    if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
    if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
    if (a.name.toLowerCase() === b.name.toLowerCase()) return 0;
  }

  const extractListOfMetricsProfiles = (allProfiles) => {
    var list_profiles = []

    allProfiles.forEach(profile => {
      var i = list_profiles['length']
      var {name, id} = profile

      list_profiles[i] = {name, id}
      i += 1
    })

    return list_profiles.sort(sortMetricProfiles)
  }

  const insertEmptyServiceForNoServices = (groups) => {
    groups.forEach(group => {
      if (group.services.length === 0) {
          group.services.push({name: '', operation: ''})
      }
    })
    return groups
  }

  const insertOperationFromPrevious = (_, array) => {
    if (array.length) {
      let last = array.length - 1

      return array[last]['operation']
    }
    else
      return ''
  }

  const onSubmitHandle = (values) => {
    let msg = undefined;
    let title = undefined;

    if (addview) {
      msg = 'Are you sure you want to add Aggregation profile?'
      title = 'Add aggregation profile'
    }
    else {
      msg = 'Are you sure you want to change Aggregation profile?'
      title = 'Change aggregation profile'
    }
    setAreYouSureModal(!areYouSureModal);
    setModalMsg(msg)
    setModalTitle(title)
    setOnYes('change')
    setFormikValues(values)
  }

  const doChange = (values) => {
    let valueSend = JSON.parse(JSON.stringify(values));
    removeDummyGroup(valueSend)
    removeIsNewFlag(valueSend)

    valueSend.namespace = tenant_name;
    if (!addview)
      valueSend.name = profile_name;

    let match_profile = extractListOfMetricsProfiles(metricProfiles).filter((e) =>
      valueSend.metric_profile === e.name)

    valueSend.metric_profile = match_profile[0]

    if (!addview) {
      webapiChangeMutation.mutate(valueSend, {
        onSuccess: () => {
          backendChangeMutation.mutate({
            apiid: valueSend.id,
            name: valueSend.name,
            groupname: valueSend.groupname,
            endpoint_group: valueSend.endpoint_group,
            metric_operation: valueSend.metric_operation,
            profile_operation: valueSend.profile_operation,
            metric_profile: valueSend.metric_profile.name,
            groups: JSON.stringify(valueSend.groups)
          }, {
            onSuccess: () => {
              queryClient.invalidateQueries('aggregationprofile');
              queryClient.invalidateQueries('public_aggregationprofile');
              NotifyOk({
                msg: 'Aggregation profile successfully changed',
                title: 'Changed',
                callback: () => history.push('/ui/aggregationprofiles')
              });
            },
            onError: (error) => {
              NotifyError({
                title: 'Internal API error',
                msg: error.message ? error.message : 'Internal API error changing aggregation profile'
              })
            }
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Web API error',
            msg: error.message ? error.message : 'Web API error changing aggregation profile'
          })
        }
      })
    } else {
      webapiAddMutation.mutate(valueSend, {
        onSuccess: (data) => {
          backendAddMutation.mutate({
            apiid: data.data.id,
            name: valueSend.name,
            groupname: valueSend.groupname,
            endpoint_group: valueSend.endpoint_group,
            metric_operation: valueSend.metric_operation,
            profile_operation: valueSend.profile_operation,
            metric_profile: values.metric_profile,
            groups: JSON.stringify(valueSend.groups)
          }, {
            onSuccess: () => {
              queryClient.invalidateQueries('aggregationprofile');
              queryClient.invalidateQueries('public_aggregationprofile');
              NotifyOk({
                msg: 'Aggregation profile successfully added',
                title: 'Added',
                callback: () => history.push('/ui/aggregationprofiles')
              })
            },
            onError: (error) => {
              NotifyError({
                title: 'Internal API error',
                msg: error.message ? error.message : 'Internal API error adding aggregation profile'
              })
            }
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Web API error',
            msg: error.message ? error.message : 'Web API error adding aggregation profile'
          })
        }
      })
    }
  }

  const doDelete = (idProfile) => {
    webapiDeleteMutation.mutate(idProfile, {
      onSuccess: () => {
        backendDeleteMutation.mutate(idProfile, {
          onSuccess: () => {
            queryClient.invalidateQueries('aggregationprofile');
            queryClient.invalidateQueries('public_aggregationprofile');
            NotifyOk({
              msg: 'Aggregation profile successfully deleted',
              title: 'Deleted',
              callback: () => history.push('/ui/aggregationprofiles')
            });
          },
          onError: (error) => {
            NotifyError({
              title: 'Internal API error',
              msg: error.message ? error.message : 'Internal API error deleting aggregation profile'
            })
          }
        })
      },
      onError: (error) => {
        NotifyError({
          title: 'Web API error',
          msg: error.message ? error.message : 'Web API error deleting aggregation profile'
        })
      }
    })
  }

  const insertDummyGroup = (groups) => {
    return  [...groups, {name: 'dummy', operation: 'OR', services: [{name: 'dummy', operation: 'OR'}]}]
  }

  const removeDummyGroup = (values) => {
    let last_group_element = values.groups[values.groups.length - 1]

    if (last_group_element['name'] == 'dummy' &&
      last_group_element.services[0]['name'] == 'dummy') {
      values.groups.pop()
    }
  }

  const removeIsNewFlag = (values) => {
    for (let group of values.groups) {
      let keys = Object.keys(group)
      if (keys.indexOf('isNew') !== -1)
        delete group.isNew
      for (let service of group.services) {
        let keys = Object.keys(service)
        if (keys.indexOf('isNew') !== -1)
          delete service.isNew
      }
    }
  }

  const checkIfServiceMissingInMetricProfile = (servicesMetricProfile, serviceGroupsAggregationProfile) => {
    let servicesInMetricProfiles = new Set(servicesMetricProfile)
    let isMissing = false

    serviceGroupsAggregationProfile.forEach(group => {
      for (let service of group.services) {
        if (!servicesInMetricProfiles.has(service.name)) {
          isMissing = true
          break
        }
      }
    })

    return isMissing
  }

  const checkIfServiceExtraInMetricProfile = (servicesMetricProfile, serviceGroupsAggregationProfile) => {
    let serviceGroupsInAggregationProfile = new Set()
    let _difference = new Set(servicesMetricProfile)

    serviceGroupsAggregationProfile.forEach(group => {
      for (let service of group.services) {
        serviceGroupsInAggregationProfile.add(service.name)
      }
    })

    for (let elem of serviceGroupsInAggregationProfile) {
      _difference.delete(elem)
    }

    return  Array.from(_difference).sort(sortServices)
  }

  const handleFileRead = (e) => {
    let jsonData = JSON.parse(e.target.result);
    formikRef.current.setFieldValue('metric_operation', jsonData.metric_operation);
    formikRef.current.setFieldValue('profile_operation', jsonData.profile_operation);
    formikRef.current.setFieldValue('metric_profile', jsonData.metric_profile);
    formikRef.current.setFieldValue('endpoint_group', jsonData.endpoint_group)
    let groups = insertDummyGroup(
      insertEmptyServiceForNoServices(jsonData.groups)
    )
    formikRef.current.setFieldValue('groups', groups);
  }

  const handleFileChosen = (file) => {
    var reader = new FileReader();
    reader.onload = handleFileRead;
    reader.readAsText(file);
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(formikValues.id);
    else if (onYes === 'change')
      doChange(formikValues);
  }

  if (loadingUserDetails || loadingBackendAP || loadingWebApiAP || loadingMetricProfiles)
    return (<LoadingAnim />)

  else if (errorBackendAP)
    return (<ErrorComponent error={errorBackendAP}/>)

  else if (errorWebApiAP)
      return (<ErrorComponent error={errorWebApiAP} />)

  else if (errorMetricProfiles)
    return (<ErrorComponent error={errorMetricProfiles} />)

  else if ((addview || (backendAP && webApiAP) && metricProfiles)) {
    if (!listServices && !publicView && !addview)
      setListServices(!addview ? extractListOfServices(webApiAP.metric_profile, metricProfiles) : [])

    let isServiceMissing = checkIfServiceMissingInMetricProfile(listServices, !addview ? webApiAP.groups : [])
    let write_perm = undefined

    if (publicView) {
      write_perm = false
    }
    else if (!addview) {
      write_perm = userDetails.is_superuser ||
            userDetails.groups.aggregations.indexOf(backendAP.groupname) >= 0;
    }
    else {
      write_perm = userDetails.is_superuser ||
        userDetails.groups.aggregations.length > 0;
    }

    return (
      <BaseArgoView
        resourcename={publicView ? 'Aggregation profile details' : 'aggregation profile'}
        location={location}
        modal={true}
        history={!publicView}
        state={{areYouSureModal, 'modalFunc': onYesCallback, modalTitle, modalMsg}}
        toggle={() => setAreYouSureModal(!areYouSureModal)}
        addview={publicView ? !publicView : addview}
        publicview={publicView}
        submitperm={write_perm}
        extra_button={
          !addview &&
            <ButtonDropdown isOpen={dropdownOpen} toggle={ () => setDropdownOpen(!dropdownOpen) }>
              <DropdownToggle caret color='secondary'>JSON</DropdownToggle>
              <DropdownMenu>
                <DropdownItem
                  onClick={() => {
                    let valueSave = JSON.parse(JSON.stringify(formikRef.current.values));
                    removeDummyGroup(valueSave);
                    removeIsNewFlag(valueSave);
                    const jsonContent = {
                      endpoint_group: valueSave.endpoint_group,
                      metric_operation: valueSave.metric_operation,
                      profile_operation: valueSave.profile_operation,
                      metric_profile: valueSave.metric_profile,
                      groups: valueSave.groups
                    }
                    let filename = `${profile_name}.json`
                    downloadJSON(jsonContent, filename)
                  }}
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
                onChange={(e) => { handleFileChosen(e.target.files[0]) }}
                style={{display: 'none'}}
              />
            </ButtonDropdown>
        }
      >
        <Formik
          initialValues = {{
            id: webApiAP ? webApiAP.id : '',
            name: webApiAP ? webApiAP.name : '',
            groupname: backendAP ? backendAP.groupname: '',
            metric_operation: webApiAP ? webApiAP.metric_operation : '',
            profile_operation: webApiAP ? webApiAP.profile_operation : '',
            metric_profile: webApiAP ? correctMetricProfileName(webApiAP.metric_profile.id, extractListOfMetricsProfiles(metricProfiles)) : '',
            endpoint_group: webApiAP ? webApiAP.endpoint_group : '',
            groups: !publicView ?
              insertDummyGroup(
                insertEmptyServiceForNoServices(webApiAP ? webApiAP.groups : [])
              )
            :
              webApiAP.groups
          }}
          onSubmit={(values, actions) => onSubmitHandle(values, actions)}
          validationSchema={AggregationProfilesSchema}
          validateOnBlur={true}
          validateOnChange={false}
          innerRef={formikRef}
        >
          {props => {
            let extraServices = checkIfServiceExtraInMetricProfile(listServices, props.values.groups)
            return (
              <Form>
                <FormikEffect onChange={(current, prev) => {
                  if (current.values.metric_profile !== prev.values.metric_profile) {
                    let selected_profile = {
                      name: current.values.metric_profile
                    }
                    setListServices(extractListOfServices(selected_profile,
                      metricProfiles))
                  }
                }}
                />
                {
                  (isServiceMissing && !publicView) &&
                  <Alert color='danger'>
                    <center data-testid='alert-missing'>
                      <FontAwesomeIcon icon={faInfoCircle} size="lg" color="black"/> &nbsp;
                      Some Service Flavours used in Aggregation profile are not presented in associated Metric profile meaning that two profiles are out of sync. Check below for Service Flavours in blue borders.
                    </center>
                  </Alert>
                }
                {
                  (extraServices.length > 0 && !publicView) &&
                    <Alert color='danger'>
                      <center data-testid='alert-extra'>
                        <p>
                          <FontAwesomeIcon icon={faInfoCircle} size='lg' color='black' /> &nbsp;
                          There are some extra Service Flavours in associated metric profile which are not used in the aggregation profile, meaning that two profiles are out of sync:
                        </p>
                        <p>{ extraServices.join(', ') }</p>
                      </center>
                    </Alert>
                }
                <AggregationProfilesForm
                  {...props}
                  list_user_groups={!publicView ? userDetails.groups.aggregations : []}
                  logic_operations={logic_operations}
                  endpoint_groups={endpoint_groups}
                  list_id_metric_profiles={extractListOfMetricsProfiles(metricProfiles)}
                  write_perm={write_perm}
                  historyview={publicView}
                  addview={addview}
                />
                {
                  !publicView ?
                    <FieldArray
                      name="groups"
                      render={props => (
                        <AggregationProfilesChangeContext.Provider value={{
                          list_services: listServices,
                          list_operations: logic_operations,
                          write_perm: write_perm,
                          last_service_operation: insertOperationFromPrevious,
                          formikBag: {
                            form: props.form,
                            groupRemove: props.remove,
                            groupInsert: props.insert
                          }
                        }}>
                          <GroupList {...props}/>
                        </AggregationProfilesChangeContext.Provider>
                      )}
                    />
                  :
                    <GroupsDisabledForm {...props} />
                }
                {
                  (write_perm) &&
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                      {
                        !addview ?
                          <Button
                            color="danger"
                            onClick={() => {
                              setModalMsg('Are you sure you want to delete Aggregation profile?')
                              setModalTitle('Delete aggregation profile')
                              setAreYouSureModal(!areYouSureModal);
                              setFormikValues(props.values)
                              setOnYes('delete')
                            }}>
                            Delete
                          </Button>
                        :
                          <div></div>
                      }
                      <Button color="success" id="submit-button" type="submit">Save</Button>
                    </div>
                }
              </Form>
          )}}
        </Formik>
      </BaseArgoView>
    )
  }
  else
    return null
}


export const AggregationProfilesList = (props) => {
  const location = props.location;
  const publicView = props.publicView

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true)
  );

  const { data: aggregations, error: errorAggregations, isLoading: loadingAggregations } = useQuery(
    [`${publicView ? 'public_' : ''}aggregationprofile`, 'backend'],
    () => fetchBackendAggregationProfiles(publicView),
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
          to={`/ui/${publicView ? 'public_' : ''}aggregationprofiles/` + e.name}
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
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>,
      column_width: '8%'
    }
  ], [])

  if (loadingUserDetails || loadingAggregations)
    return (<LoadingAnim />)

  else if (errorAggregations)
    return (<ErrorComponent error={errorAggregations}/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (!loadingUserDetails && aggregations) {
    return (
      <BaseArgoView
        resourcename='aggregation profile'
        location={location}
        listview={true}
        addnew={!publicView}
        addperm={publicView ? false : userDetails.is_superuser || userDetails.groups.aggregations.length > 0}
        publicview={publicView}>
        <ProfilesListTable
          data={aggregations}
          columns={columns}
          type='aggregation'
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
    let services = [];
    for (let j = 0; j < item1[i]['services'].length; j++) {
      services.push(
        `{name: ${item1[i]['services'][j]['name']}, operation: ${item1[i]['services'][j]['operation']}}`
      );
    }
    list1.push(
      `name: ${item1[i]['name']},\noperation: ${item1[i]['operation']},\nservices: [\n${services.join('\n')}\n]`
      );
  }
  for (let i = 0; i < item2.length; i++) {
    let services = [];
    for (let j = 0; j < item2[i]['services'].length; j++) {
      services.push(
        `{name: ${item2[i]['services'][j]['name']}, operation: ${item2[i]['services'][j]['operation']}}`
      );
    }
    list2.push(
      `name: ${item2[i]['name']},\noperation: ${item2[i]['operation']},\nservices: [\n${services.join('\n')}\n]`
      );
  }

  return (
    <div id='argo-contentwrap' className='ms-2 mb-2 mt-2 p-3 border rounded'>
      <h6 className='mt-4 font-weight-bold text-uppercase'>{title}</h6>
      <ReactDiffViewer
        oldValue={list2.join('\n')}
        newValue={list1.join('\n')}
        showDiffOnly={true}
        splitView={true}
        hideLineNumbers={true}
      />
    </div>
  );
};


const fetchAggregationProfileVersions = async (name) => {
  const backend = new Backend();
  return await backend.fetchData(`/api/v2/internal/tenantversion/aggregationprofile/${name}`);
}


export const AggregationProfileVersionCompare = (props) => {
  const version1 = props.match.params.id1;
  const version2 = props.match.params.id2;
  const name = props.match.params.name;

  const { data: versions, error, isLoading: loading } = useQuery(
    ['aggregationprofile', 'tenantversion', name], () => fetchAggregationProfileVersions(name)
  )

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (
      <ErrorComponent error={error}/>
    )

  else if (versions) {
    const aggregationProfileVersion1 = versions.find(ver => ver.version == version1).fields;
    const aggregationProfileVersion2 = versions.find(ver => ver.version == version2).fields;

    const {
      name: name1, groupname: groupname1, metric_operation: metric_operation1,
      profile_operation: profile_operation1, endpoint_group: endpoint_group1,
      metric_profile: metric_profile1, groups: groups1
    } = aggregationProfileVersion1

    const {
      name: name2, groupname: groupname2, metric_operation: metric_operation2,
      profile_operation: profile_operation2, endpoint_group: endpoint_group2,
      metric_profile: metric_profile2, groups: groups2
    } = aggregationProfileVersion2

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
          (groupname1 !== groupname2) &&
            <DiffElement title='group name' item1={groupname1} item2={groupname2}/>
        }
        {
          (metric_operation1 !== metric_operation2) &&
            <DiffElement title='metric operation' item1={metric_operation1} item2={metric_operation2}/>
        }
        {
          (profile_operation1 !== profile_operation2) &&
            <DiffElement title='aggregation operation' item1={profile_operation1} item2={profile_operation2}/>
        }
        {
          (endpoint_group1 !== endpoint_group2) &&
            <DiffElement title='endpoint group' item1={endpoint_group1} item2={endpoint_group2}/>
        }
        {
          (metric_profile1 !== metric_profile2) &&
            <DiffElement title='metric profile' item1={metric_profile1} item2={metric_profile2}/>
        }
        {
          (groups1 !== groups2) &&
            <ListDiffElement title='groups' item1={groups1} item2={groups2}/>
        }
      </React.Fragment>
    );
  } else
    return null;
}


export const AggregationProfileVersionDetails = (props) => {
  const name = props.match.params.name;
  const version = props.match.params.version;

  const { data: versions, error, isLoading: loading } = useQuery(
    ['aggregationprofile', 'tenantversion', name], () => fetchAggregationProfileVersions(name)
  )

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>)

  else if (versions) {
    const properVersion = versions.find(ver => ver.version == version);

    const aggregationProfileDetails = {
      ...properVersion.fields,
      date_created: properVersion.date_created
    };

    return (
      <BaseArgoView
        resourcename={`${name} (${aggregationProfileDetails.date_created})`}
        infoview={true}
      >
        <Formik
          initialValues = {{
            name: name,
            groupname: aggregationProfileDetails.groupname,
            metric_operation: aggregationProfileDetails.metric_operation,
            profile_operation: aggregationProfileDetails.profile_operation,
            endpoint_group: aggregationProfileDetails.endpoint_group,
            metric_profile: aggregationProfileDetails.metric_profile,
            groups: aggregationProfileDetails.groups
          }}
        >
          {props => (
            <Form>
              <AggregationProfilesForm
                {...props}
                historyview={true}
              />
              <GroupsDisabledForm {...props} />
            </Form>
          )}
        </Formik>
      </BaseArgoView>
    );
  } else
    return null;
}
