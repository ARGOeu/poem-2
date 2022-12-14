import React, { useState, useMemo, useContext, useEffect } from 'react';
import {Link} from 'react-router-dom';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  Icon,
  DiffElement,
  ProfileMain,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  ProfilesListTable,
  CustomReactSelect
} from './UIElements';
import Autosuggest from 'react-autosuggest';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import {Backend, WebApi} from './DataManager';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Col,
  Form,
  FormGroup,
  FormText,
  Label,
  Row,
  ButtonDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Input,
  FormFeedback
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
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ErrorMessage } from '@hookform/error-message';


const AggregationProfilesChangeContext = React.createContext()


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


const DropDown = ({
  name,
  options,
  class_name="",
  isnew=false,
  errors=undefined,
  ...props
}) => {
  const { control } = useFormContext()

  return (
    <Controller
      name={ name }
      control={ control }
      render={ ({ field }) =>
        <select
          { ...field }
          { ...props }
          data-testid={ name }
          className={ `form-control ${class_name} ${isnew ? 'border-success' : `${errors && 'is-invalid'}`}` }
        >
          {
            options.map((name, i) => (
              i === 0 ?
                <option key={i} value='' hidden color='text-muted'>{name}</option>
              :
                <option key={i} value={name}>{name}</option>
            ))
          }
        </select>
      }
    />

  )
}


function insertSelectPlaceholder(data, text) {
  if (data)
    return [text, ...data]
  else
    return [text]
}


const AggregationProfileAutocompleteField = ({
  index,
  isNew,
  groupNew,
  groupIndex,
  isMissing,
  value
}) => {
  const context = useContext(AggregationProfilesChangeContext);

  const { setValue } = useFormContext()

  const [suggestionList, setSuggestions] = useState(context.list_services)

  return (
    <Autosuggest
      inputProps={{
        className: `form-control form-select ${isNew && !groupNew && "border-success"} ${isMissing && "border-primary"}`,
        placeholder: '',
        onChange: (_, {newValue}) => setValue(`groups.${groupIndex}.services.${index}.name`, newValue),
        value: value
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
        setValue(`groups.${groupIndex}.services.${index}.name`, suggestion)
      }}
      shouldRenderSuggestions={() => true}
      theme={{
        suggestionsContainerOpen: 'aggregation-autocomplete-menu',
        suggestionsList: 'aggregation-autocomplete-list'
      }}
    />
  )
}


const GroupList = () => {
  const { control } = useFormContext()

  const { fields, insert, remove } = useFieldArray({ control, name: "groups" })

  return (
    <Row className="groups">
      {
        fields.map((group, i) =>
          <Group
            key={ group.id }
            group={ group }
            groupindex={ i }
            insert={ insert }
            remove={ remove }
            last={ i === fields.length - 1 }
          />
        )
      }
    </Row>
  )
}


const Group = ({ group, groupindex, remove, insert, last }) => {
  const context = useContext(AggregationProfilesChangeContext)

  const { control, formState: { errors } } = useFormContext()

  if (!last)
    return (
      <React.Fragment key={ group.id }>
        <Col sm={{size: 8}} md={{size: 5}} className="mt-4 mb-2">
          <Card className={ group.isNew ? "border-success" : ""} data-testid={`card-${groupindex}`}>
            <CardHeader className="p-1" color="primary">
              <Row className="d-flex align-items-center g-0">
                <Col sm={{size: 10}} md={{size: 11}}>
                  <Controller
                    name={ `groups.${groupindex}.name` }
                    control={ control }
                    render={ ({ field }) =>
                      <Input
                        { ...field }
                        placeholder="Name of service group"
                        data-testid={ `groups.${groupindex}.name` }
                        required={ true }
                        className={ `form-control ${errors?.groups?.[groupindex]?.name && "is-invalid"}` }
                      />
                    }
                  />
                </Col>
                <Col sm={{size: 2}} md={{size: 1}} className="ps-1">
                  <Button
                    size="sm"
                    color="danger"
                    data-testid={`remove-group-${groupindex}`}
                    type="button"
                    onClick={() => (context.write_perm) && remove(groupindex)}
                  >
                    <FontAwesomeIcon icon={faTimes}/>
                  </Button>
                </Col>
              </Row>
            </CardHeader>
            <CardBody className="p-1">
              <ServiceList
                groupindex={groupindex}
                groupnew={group.isNew}
              />
            </CardBody>
            <CardFooter className="p-1 d-flex justify-content-center">
              <div className='col-2' data-testid='operation'>
                <DropDown
                  name={ `groups.${groupindex}.operation` }
                  data-testid={ `groups.${groupindex}.operation` }
                  options={ insertSelectPlaceholder(context.logic_operations, 'Select') }
                  class_name="form-select form-control"
                  errors={ errors?.groups?.[groupindex]?.operation }
                />
              </div>
            </CardFooter>
          </Card>
        </Col>
        <Col sm={{size: 4}} md={{size: 1}} className="mt-5">
          <div className="group-operation" key={groupindex} data-testid={`group-operation-${groupindex}`}>
            <DropDown
              name="profile_operation"
              data-testid={`profile_operation-${groupindex}`}
              options={ insertSelectPlaceholder(context.logic_operations, 'Select') }
              class_name='form-select'
            />
          </div>
        </Col>
      </React.Fragment>
    )
  else
    return (
      <Col sm={{size: 12}} md={{size: 6}} className="mt-4 mb-2 d-flex justify-content-center align-items-center">
        <Button
        outline
        color="secondary"
        size='lg'
        disabled={ !context.write_perm || context.list_services.length === 0 ? true : false }
        onClick={
          () => context.write_perm && insert(groupindex, {name: '', operation: '', isNew: true, services: [{name: '', operation: ''}]})
        }
        >
          Add new group
        </Button>
      </Col>
    )
}


const ServiceList = ({groupindex, groupnew=false}) =>
{
  const context = useContext(AggregationProfilesChangeContext);

  const { control } = useFormContext()

  const { fields: services, insert, remove } = useFieldArray({ control, name: `groups.${groupindex}.services` })

  return (
    services.map((service, i) =>
      <Service
        key={ service.id }
        groupindex={ groupindex }
        groupnew={ groupnew }
        isnew={ service.isNew }
        index={ i }
        serviceRemove={ remove }
        serviceInsert={ insert }
        ismissing={ service.name && context.list_services.indexOf(service.name) === -1 }
      />
    )
  )
}


const Service = ({
  groupindex,
  groupnew,
  isnew,
  index,
  serviceInsert,
  serviceRemove,
  ismissing
}) => {
  const context = useContext(AggregationProfilesChangeContext);

  const { control, getValues, formState: { errors } } = useFormContext()

  const insertOperationFromPrevious = (_, array) => {
    if (array.length) {
      let last = array.length - 1

      return array[last]['operation']
    }
    else
      return ''
  }

  return (
    <React.Fragment>
      <Row className="d-flex align-items-center service pt-1 pb-1 g-0" key={index}>
        <Col md={8}>
          <Controller
            name={ `groups.${groupindex}.services.${index}.name` }
            control={ control }
            render={ ({ field }) =>
              <AggregationProfileAutocompleteField
                forwardedRef={ field.id }
                index={ index }
                isNew={ isnew }
                groupNew={ groupnew }
                groupIndex={ groupindex }
                isMissing={ ismissing }
                value={ field.value }
              />
            }
          />
        </Col>
        <Col md={2}>
          <div className="input-group" data-testid={`operation-${index}`}>
            <DropDown
              name={ `groups.${groupindex}.services.${index}.operation` }
              data-testid={ `groups.${groupindex}.services.${index}.operation` }
              options={ insertSelectPlaceholder(context.logic_operations, 'Select') }
              class_name="form-select service-operation"
              isnew={ isnew && !groupnew }
          />
          </div>
        </Col>
        <Col md={2} className="ps-2">
          <Button size="sm" color="light"
            type="button"
            data-testid={`remove-service-${index}`}
            onClick={() => serviceRemove(index)}
          >
            <FontAwesomeIcon icon={faTimes}/>
          </Button>
          <Button
            size="sm"
            color="light"
            type="button"
            data-testid={`insert-${index}`}
            onClick={() => {
              serviceInsert(
                index + 1,
                {
                  name: '',
                  operation: insertOperationFromPrevious(index, getValues(`groups.${groupindex}.services`)),
                  isNew: true
                }
              )
            }}
          >
            <FontAwesomeIcon icon={faPlus}/>
          </Button>
        </Col>
      </Row>
      <Row>
        <Col md={8}>
          <ErrorMessage
            errors={ errors }
            name={ `groups.${groupindex}.services.${index}.name` }
            render={ ({ message }) =>
              <FormFeedback invalid="true" className="end-0">
                { message }
              </FormFeedback>
            }
          />
        </Col>
        <Col md={{offset: errors?.groups?.[groupindex]?.services?.[index]?.name ? 0 : 8, size: 2}}>
          <ErrorMessage
            errors={ errors }
            name={ `groups.${groupindex}.services.${index}.operation` }
            render={ ({ message }) =>
              <FormFeedback invalid="true" className="end-0">
                { message }
              </FormFeedback>
            }
          />
        </Col>
      </Row>
    </React.Fragment>
  )
}


const AggregationProfilesForm = ({
  initValues,
  resourcename,
  profile_name,
  location,
  addview=false,
  historyview=false,
  publicView=false,
  doDelete=undefined,
  doChange=undefined
}) => {
  const context = useContext(AggregationProfilesChangeContext)

  const [listServices, setListServices] = useState([])
  const [isServiceMissing, setIsServiceMissing] = useState(false)
  const [extraServices, setExtraServices] = useState([])
  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [onYes, setOnYes] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const hiddenFileInput = React.useRef(null);

  const extractListOfServices = (profileFromAggregation, listMetricProfiles) => {
    let targetProfile = listMetricProfiles.filter(profile => profile.name === profileFromAggregation)

    if (targetProfile.length) {
      let services = targetProfile[0].services.map(service => service.service)
      return services.sort(sortServices)
    }
    else
      return []
  }

  const handleFileRead = (e) => {
    let jsonData = JSON.parse(e.target.result);
    methods.setValue('metric_operation', jsonData.metric_operation);
    methods.setValue('profile_operation', jsonData.profile_operation);
    methods.setValue('metric_profile', jsonData.metric_profile);
    methods.setValue('endpoint_group', jsonData.endpoint_group)
    let groups = insertDummyGroup(
      insertEmptyServiceForNoServices(jsonData.groups)
    )
    methods.resetField("groups")
    methods.setValue('groups', groups)
  }

  const handleFileChosen = (file) => {
    var reader = new FileReader();
    reader.onload = handleFileRead;
    reader.readAsText(file);
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(methods.getValues("id"));
    else if (onYes === 'change')
      doChange(methods.getValues());
  }

  const methods = useForm({
    defaultValues: initValues,
    mode: "all",
    resolver: yupResolver(AggregationProfilesSchema)
  })

  const { control } = methods

  const metric_profile = useWatch({ control, name: "metric_profile" })
  const groups = useWatch({ control, name: "groups" })

  useEffect(() => {
    if (!publicView && !historyview)
      setListServices(extractListOfServices(metric_profile, context.metric_profiles))
  }, [metric_profile])

  useEffect(() => {
    setIsServiceMissing(checkIfServiceMissingInMetricProfile())
    setExtraServices(checkIfServiceExtraInMetricProfile(listServices, groups))
  }, [groups, listServices])


  const checkIfServiceMissingInMetricProfile = () => {
    let servicesInMetricProfiles = new Set(listServices)
    let isMissing = false

    groups.forEach(group => {
      for (let service of group.services) {
        if (!["dummy", ""].includes(service.name))
          if (!servicesInMetricProfiles.has(service.name)) {
            isMissing = true
            break
          }
      }
    })

    return isMissing
  }

  const checkIfServiceExtraInMetricProfile = () => {
    let serviceGroupsInAggregationProfile = new Set()
    let _difference = new Set(listServices)

    groups.forEach(group => {
      for (let service of group.services) {
        if (service.name !== "dummy")
          serviceGroupsInAggregationProfile.add(service.name)
      }
    })

    for (let elem of serviceGroupsInAggregationProfile) {
      _difference.delete(elem)
    }

    return Array.from(_difference).sort(sortServices)
  }

  const onSubmitHandle = () => {
    setAreYouSureModal(!areYouSureModal);
    setModalMsg(`Are you sure you want to ${addview ? "add" : "change"} aggregation profile?`)
    setModalTitle(`${addview ? "Add" : "Change"} aggregation profile`)
    setOnYes('change')
  }

  return (
    <BaseArgoView
      resourcename={ resourcename }
      location={location}
      modal={true}
      infoview={ historyview }
      history={!publicView}
      state={{ areYouSureModal, 'modalFunc': onYesCallback, modalTitle, modalMsg }}
      toggle={ () => setAreYouSureModal(!areYouSureModal) }
      addview={ publicView ? !publicView : addview }
      publicview={ publicView }
      submitperm={ !historyview && context.write_perm }
      extra_button={
        (!addview && !historyview) &&
          <ButtonDropdown isOpen={dropdownOpen} toggle={ () => setDropdownOpen(!dropdownOpen) }>
            <DropdownToggle caret color='secondary'>JSON</DropdownToggle>
            <DropdownMenu>
              <DropdownItem
                onClick={() => {
                  let valueSave = JSON.parse(JSON.stringify(methods.getValues()));
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
      <FormProvider { ...methods }>
        <Form onSubmit={ methods.handleSubmit(val => onSubmitHandle(val)) } data-testid="aggregation-form" >
          {
            (isServiceMissing && !(publicView || historyview)) &&
              <Alert color='danger'>
                <center data-testid='alert-missing'>
                  <FontAwesomeIcon icon={faInfoCircle} size="lg" color="black"/> &nbsp;
                  Some Service Flavours used in Aggregation profile are not presented in associated Metric profile meaning that two profiles are out of sync. Check below for Service Flavours in blue borders.
                </center>
              </Alert>
          }
          {
            (extraServices.length > 0 && !(publicView || historyview)) &&
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
          <ProfileMain
            fieldsdisable={ historyview }
            grouplist={
              historyview ?
                undefined
              :
                context.write_perm ?
                  context.list_user_groups
                :
                  [methods.getValues("groupname")]
            }
            profiletype="aggregation"
            addview={ addview }
          />
          <ParagraphTitle title='Operations, endpoint group and metric profile'/>
          <Row className='mt-4'>
            <Col md={4}>
              <FormGroup>
                <Row>
                  {
                    historyview &&
                      <Col md={12}>
                        <Label for='aggregationMetric'>Metric operation:</Label>
                      </Col>
                  }
                  <Col md={5}>
                    <Controller
                      name="metric_operation"
                      control={ methods.control }
                      render={ ({ field }) =>
                        historyview ?
                          <Input
                            { ...field }
                            data-testid="metric_operation"
                            className="form-control"
                            disabled={ true }
                          />
                        :
                          <CustomReactSelect
                            forwardedRef={ field.ref }
                            onChange={
                              e => methods.setValue("metric_operation", e.value)
                            }
                            options={
                              context.logic_operations.map(operation => new Object({
                                label: operation, value: operation
                              }))
                            }
                            value={ field.value ? { label: field.value, value: field.value } : undefined }
                            error={ methods.formState.errors?.metric_operation }
                            label="Metric operation:"
                          />
                      }
                    />
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <ErrorMessage
                      errors={ methods.formState.errors }
                      name="metric_operation"
                      render={ ({ message }) =>
                        <FormFeedback invalid="true" className="end-0">
                          { message }
                        </FormFeedback>
                      }
                    />
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
                    historyview &&
                      <Col md={12}>
                        <Label for='aggregationOperation'>Aggregation operation:</Label>
                      </Col>
                  }
                  <Col md={5}>
                    <Controller
                      name="profile_operation"
                      control={ methods.control }
                      render={ ({ field }) =>
                        historyview ?
                          <Input
                            { ...field }
                            data-testid="profile_operation"
                            className="form-control"
                            disabled={ true }
                          />
                        :
                          <CustomReactSelect
                            forwardedRef={ field.ref }
                            onChange={e => methods.setValue("profile_operation", e.value)}
                            options={
                              context.logic_operations.map(operation => new Object({
                                label: operation, value: operation
                              }))
                            }
                            value={ field.value ? { label: field.value, value: field.value } : undefined }
                            label="Aggregation operation:"
                            error={ methods.formState.errors?.profile_operation }
                          />
                      }
                    />
                  </Col>
                </Row>
                <Row>
                  <Col md={12}>
                    <ErrorMessage
                      errors={ methods.formState.errors }
                      name="profile_operation"
                      render={ ({ message }) =>
                        <FormFeedback invalid="true" className="end-0">
                          { message }
                        </FormFeedback>
                      }
                    />
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
                    historyview &&
                      <Col md={12}>
                        <Label for='aggregationEndpointGroup'>Endpoint group:</Label>
                      </Col>
                  }
                  <Col md={5}>
                    <Controller
                      name="endpoint_group"
                      control={ methods.control }
                      render={ ({ field }) =>
                        historyview ?
                          <Input
                            { ...field }
                            data-testid="endpoint_group"
                            id="aggregationEndpointGroup"
                            className="form-control"
                            disabled={ true }
                          />
                        :
                          <CustomReactSelect
                            forwardedRef={ field.ref }
                            onChange={
                              e => methods.setValue("endpoint_group", e.value)
                            }
                            options={
                              context.endpoint_groups.map(group => new Object({
                                label: group, value: group
                              }))
                            }
                            value={ field.value ? { label: field.value, value: field.value } : undefined }
                            label="Endpoint group:"
                            error={ methods.formState.errors?.endpoint_group }
                          />
                      }
                    />
                  </Col>
                  <ErrorMessage
                    errors={ methods.formState.errors }
                    name="endpoint_group"
                    render={ ({ message }) =>
                      <FormFeedback invalid="true" className="end-0">
                        { message }
                      </FormFeedback>
                    }
                  />
                </Row>
              </FormGroup>
            </Col>
          </Row>
          <Row className='mt-4'>
            <Col md={5}>
              <FormGroup>
                {
                  historyview && <Label for='metricProfile'>Metric profile:</Label>
                }
                <Controller
                  name="metric_profile"
                  control={ methods.control }
                  render={ ({ field }) =>
                    historyview ?
                      <Input
                        { ...field }
                        data-testid="metric_profile"
                        id="metricProfile"
                        className="form-control"
                        disabled={ true }
                      />
                    :
                      <CustomReactSelect
                        onChange={e => methods.setValue("metric_profile", e.value)}
                        options={
                          extractListOfMetricsProfiles(context.metric_profiles).map(profile => new Object({
                            label: profile.name, value: profile.name
                          }))
                        }
                        value={ field.value ? { label: field.value, value: field.value } : undefined }
                        label="Metric profile:"
                        error={ methods.formState.errors?.metric_profile }
                      />
                  }
                />
                <ErrorMessage
                  errors={ methods.formState.errors }
                  name="metric_profile"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
                <FormText>
                  Metric profile associated to Aggregation profile. Service flavours defined in service flavour groups originate from selected metric profile.
                </FormText>
              </FormGroup>
            </Col>
          </Row>
          <ParagraphTitle title='Service flavour groups'/>
          {
            !(publicView || historyview) ?
              <AggregationProfilesChangeContext.Provider value={{ ...context, list_services: listServices }}>
                <GroupList />
              </AggregationProfilesChangeContext.Provider>
            :
              <GroupsDisabledForm />
          }
          {
            (!historyview && context.write_perm) &&
              <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                {
                  !addview ?
                    <Button
                      color="danger"
                      onClick={() => {
                        setModalMsg('Are you sure you want to delete aggregation profile?')
                        setModalTitle('Delete aggregation profile')
                        setAreYouSureModal(!areYouSureModal)
                        setOnYes('delete')
                      }}
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
      </FormProvider>
    </BaseArgoView>
  )
}


const GroupsDisabledForm = () => {
  const { getValues } = useFormContext()

  return (
    <Row className='groups'>
      {
        getValues("groups").map((group, i) =>
          <React.Fragment key={ i }>
            <Col sm={{size: 8}} md={{size: 5}} className='mt-4 mb-2'>
              <Card data-testid={`card-${i}`}>
                <CardHeader className='p-1' color='primary'>
                  <Row className='d-flex align-items-center g-0'>
                    <Col sm={{size: 10}} md={{size: 11}} data-testid='service-group'>
                      { group.name }
                    </Col>
                  </Row>
                </CardHeader>
                <CardBody className='p-1'>
                  {
                    group.services.map((_, j) =>
                      <Row className='d-flex align-items-center service pt-1 pb-1 g-0' key={j}>
                        <Col md={8} data-testid={`service-${j}`}>
                          { group.services[j].name }
                        </Col>
                        <Col md={2} data-testid={`operation-${j}`}>
                          { group.services[j].operation }
                        </Col>
                      </Row>
                    )
                  }
                </CardBody>
                <CardFooter className='p-1 d-flex justify-content-center' data-testid='operation'>
                  { group.operation }
                </CardFooter>
              </Card>
            </Col>
            <Col sm={{size: 4}} md={{size: 1}} className='mt-5'>
              <div className='group-operation' key={i} data-testid={`group-operation-${i}`}>
                { getValues("profile_operation") }
              </div>
            </Col>
          </React.Fragment>
        )
      }
    </Row>
  )
}


const fetchAP = async (webapi, apiid) => {
  return await webapi.fetchAggregationProfile(apiid);
}


const sortServices = (a, b) => {
  if (a.toLowerCase() < b.toLowerCase()) return -1
  if (a.toLowerCase() > b.toLowerCase()) return 1
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


const insertDummyGroup = (groups) => {
  return  [...groups, {name: 'dummy', operation: 'OR', services: [{name: 'dummy', operation: 'OR'}]}]
}


const insertEmptyServiceForNoServices = (groups) => {
  groups.forEach(group => {
    if (group.services.length === 0) {
        group.services.push({name: '', operation: ''})
    }
  })
  return groups
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


export const AggregationProfilesChange = (props) => {
  const tenant_name = props.tenantname;
  const profile_name = props.match.params.name;
  const addview = props.addview
  const history = props.history;
  const location = props.location;
  const publicView = props.publicView;

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

  if (loadingUserDetails || loadingBackendAP || loadingWebApiAP || loadingMetricProfiles)
    return (<LoadingAnim />)

  else if (errorBackendAP)
    return (<ErrorComponent error={errorBackendAP}/>)

  else if (errorWebApiAP)
      return (<ErrorComponent error={errorWebApiAP} />)

  else if (errorMetricProfiles)
    return (<ErrorComponent error={errorMetricProfiles} />)

  else if ((addview || (backendAP && webApiAP) && metricProfiles)) {
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
      <AggregationProfilesChangeContext.Provider value={{
        list_user_groups: !publicView ? userDetails.groups.aggregations : [],
        logic_operations: logic_operations,
        endpoint_groups: endpoint_groups,
        metric_profiles: metricProfiles,
        write_perm: write_perm
      }}>
        <AggregationProfilesForm
          initValues={{
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
          resourcename={ publicView ? 'Aggregation profile details' : 'aggregation profile' }
          profile_name={ profile_name }
          location={ location }
          publicView={ publicView }
          historyview={ publicView }
          addview={ addview }
          doChange={ doChange }
          doDelete={ doDelete }
        />
      </AggregationProfilesChangeContext.Provider>
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
      <AggregationProfilesForm
        initValues={{
          name: name,
          groupname: aggregationProfileDetails.groupname,
          metric_operation: aggregationProfileDetails.metric_operation,
          profile_operation: aggregationProfileDetails.profile_operation,
          endpoint_group: aggregationProfileDetails.endpoint_group,
          metric_profile: aggregationProfileDetails.metric_profile,
          groups: aggregationProfileDetails.groups
        }}
        resourcename={ `${name} (${aggregationProfileDetails.date_created})` }
        historyview={true}
      />
    )
  } else
    return null
}
