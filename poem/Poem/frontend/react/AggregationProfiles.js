import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  DropDown,
  Icon,
  HistoryComponent,
  DiffElement,
  ProfileMainInfo} from './UIElements';
import Autocomplete from 'react-autocomplete';
import ReactTable from 'react-table';
import 'react-table/react-table.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Formik, Field, FieldArray, Form } from 'formik';
import { faPlus, faTimes, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import FormikEffect from './FormikEffect.js';
import {Backend, WebApi} from './DataManager';
import {
  Alert,
  Button,
  Row,
  Col,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  FormGroup,
  FormText,
  InputGroup,
  InputGroupAddon} from 'reactstrap';

import ReactDiffViewer from 'react-diff-viewer';

import "react-notifications/lib/notifications.css";
import './AggregationProfiles.css';

export const AggregationProfileHistory = HistoryComponent('aggregationprofile');


function matchItem(item, value) {
  return item.toLowerCase().indexOf(value.toLowerCase()) !== -1;
}


function insertSelectPlaceholder(data, text) {
  if (data) {
    return [text, ...data]
  } else
    return [text]
}


const GroupList = ({name, form, list_services, list_operations, last_service_operation, write_perm}) =>
  <Row className="groups">
  {
    form.values[name].map((group, i) =>
      <FieldArray
        key={i}
        name="groups"
        render={props => (
          <Group
            {...props}
            key={i}
            operation={group.operation}
            services={group.services}
            list_services={list_services}
            list_operations={list_operations}
            last_service_operation={last_service_operation}
            write_perm={write_perm}
            groupindex={i}
            isnew={group.isNew}
            last={i === form.values[name].length - 1}
          />
        )}
      />
    )
  }
  </Row>


const Group = ({operation, services, list_operations, list_services,
  last_service_operation, write_perm, form, groupindex, remove, insert, isnew,
  last}) =>
  (!last) ?
    <React.Fragment key={groupindex}>
      <Col sm={{size: 8}} md={{size: 5}} className="mt-4 mb-2">
        <Card className={isnew ? "border-success" : ""}>
          <CardHeader className="p-1" color="primary">
            <Row className="d-flex align-items-center no-gutters">
              <Col sm={{size: 10}} md={{size: 11}}>
                <Field
                  name={`groups.${groupindex}.name`}
                  placeholder="Name of service group"
                  required={true}
                  className="form-control"
                />
              </Col>
              <Col sm={{size: 2}} md={{size: 1}} className="pl-1">
                <Button size="sm" color="danger"
                  type="button"
                  onClick={() => (write_perm) && remove(groupindex)}>
                  <FontAwesomeIcon icon={faTimes}/>
                </Button>
              </Col>
            </Row>
          </CardHeader>
          <CardBody className="p-1">
            <FieldArray
              name={`groups.${groupindex}`}
              render={props => (
                <ServiceList
                  list_services={list_services}
                  list_operations={list_operations}
                  last_service_operation={last_service_operation}
                  services={services}
                  groupindex={groupindex}
                  groupoperation={operation}
                  groupnew={isnew}
                  form={form}
                />)}
            />
          </CardBody>
          <CardFooter className="p-1 d-flex justify-content-center">
            <DropDown
              field={{name: "operation", value: operation}}
              data={list_operations}
              prefix={`groups.${groupindex}`}
              class_name="custom-select col-2"
            />
          </CardFooter>
        </Card>
      </Col>
      <Col sm={{size: 4}} md={{size: 1}} className="mt-5">
        <div className="group-operation" key={groupindex}>
          <DropDown
            field={{name: 'profile_operation', value: form.values.profile_operation}}
            data={list_operations}/>
        </div>
      </Col>
    </React.Fragment>
  :
    <Col sm={{size: 12}} md={{size: 6}} className="mt-4 mb-2 d-flex justify-content-center align-items-center">
      <Button outline color="secondary" size='lg' disabled={!write_perm ? true : false} onClick={
        () => write_perm &&
          insert(groupindex, {name: '', operation: '', isNew: true,
              services: [{name: '', operation: ''}]})
      }>Add new group</Button>
    </Col>


const ServiceList = ({services, list_services=[], list_operations=[], last_service_operation, groupindex, groupnew=false, form}) =>
  services.map((service, i) =>
    <FieldArray
      key={i}
      name={`groups.${groupindex}.services`}
      render={props => (
        <Service
          {...props}
          key={i}
          service={service}
          operation={service.operation}
          list_services={list_services}
          list_operations={list_operations}
          last_service_operation={last_service_operation}
          groupindex={groupindex}
          groupnew={groupnew}
          index={i}
          last={i === services.length - 1}
          form={form}
          isnew={service.isnew}
          ismissing={list_services.indexOf(service.name) === -1}
        />
      )}
    />
  )


const Service = ({name, service, operation, list_services, list_operations,
  last_service_operation, groupindex, groupnew, index, remove, insert, form,
  isnew, ismissing}) =>
  <Row className="d-flex align-items-center service pt-1 pb-1 no-gutters" key={index}>
    <Col md={8}>
      <Autocomplete
        inputProps={{
          className: `"form-control custom-select " ${isnew && !groupnew ? "border-success" : ""} ${ismissing ? "border-danger": ""}`
        }}
        getItemValue={(item) => item}
        items={list_services}
        value={service.name}
        renderItem={(item, isHighlighted) =>
          <div
            key={list_services.indexOf(item)}
            className={`aggregation-autocomplete-entries ${isHighlighted ?
                "aggregation-autocomplete-entries-highlighted"
                : ""}`
            }>
            {item ? <Icon i='serviceflavour'/> : ''} {item}
          </div>}
        onChange={(e) => form.setFieldValue(`groups.${groupindex}.services.${index}.name`, e.target.value)}
        onSelect={(val) => {
          form.setFieldValue(`groups.${groupindex}.services.${index}.name`, val)
        }}
        wrapperStyle={{}}
        shouldItemRender={matchItem}
        renderMenu={(items) =>
            <div className='aggregation-autocomplete-menu' children={items}/>}
      />
    </Col>
    <Col md={2}>
      <div className="input-group">
        <DropDown
          field={{name: "operation", value: operation}}
          data={list_operations}
          prefix={`groups.${groupindex}.services.${index}`}
          class_name="custom-select service-operation"
          isnew={isnew && !groupnew}
        />
      </div>
    </Col>
    <Col md={2} className="pl-2">
      <Button size="sm" color="light"
        type="button"
        onClick={() => remove(index)}>
        <FontAwesomeIcon icon={faTimes}/>
      </Button>
      <Button size="sm" color="light"
        type="button"
        onClick={() => insert(index + 1, {name: '', operation:
          last_service_operation(index, form.values.groups[groupindex].services), isnew: true})}>
        <FontAwesomeIcon icon={faPlus}/>
      </Button>
    </Col>
  </Row>


const AggregationProfilesForm = ({ values, errors, historyview=false, write_perm=false,
  list_user_groups, logic_operations, endpoint_groups, list_id_metric_profiles }) => (
  <>
    <ProfileMainInfo
      values={values}
      errors={errors}
      fieldsdisable={historyview}
      grouplist={
        historyview ?
          undefined
        :
          (write_perm) ?
            list_user_groups :
            [values.groupname, ...list_user_groups]
      }
      profiletype='aggregation'
    />
    <h4 className="mt-4 alert-info p-1 pl-3 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>Operations and group</h4>
    <Row className='mt-4'>
      <Col md={4}>
        <FormGroup>
          <Row>
            <Col md={8}>
              <InputGroup>
                <InputGroupAddon addonType='prepend'>Metric operation</InputGroupAddon>
                {
                  historyview ?
                    <Field
                      name='metric_operation'
                      className='form-control'
                      disabled={true}
                    />
                  :
                    <Field
                      name='metric_operation'
                      component={DropDown}
                      data={insertSelectPlaceholder(logic_operations, '')}
                      required={true}
                      class_name='custom-select'
                    />
                }
              </InputGroup>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
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
            <Col md={8}>
              <InputGroup>
                <InputGroupAddon addonType='prepend'>Aggregation operation</InputGroupAddon>
                {
                  historyview ?
                    <Field
                      name='profile_operation'
                      className='form-control'
                      disabled={true}
                    />
                  :
                    <Field
                      name='profile_operation'
                      component={DropDown}
                      data={insertSelectPlaceholder(logic_operations, '')}
                      required={true}
                      class_name='custom-select'
                    />
                }
              </InputGroup>
            </Col>
          </Row>
          <Row>
            <Col md={12}>
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
            <Col md={8}>
              <InputGroup>
                <InputGroupAddon addonType='prepend'>Endpoint group</InputGroupAddon>
                {
                  historyview ?
                    <Field
                      name='endpoint_group'
                      className='form-control'
                      disabled={true}
                    />
                  :
                    <Field
                      name='endpoint_group'
                      component={DropDown}
                      data={insertSelectPlaceholder(endpoint_groups, '')}
                      required={true}
                      class_name='custom-select'
                    />
                }
              </InputGroup>
            </Col>
          </Row>
        </FormGroup>
      </Col>
    </Row>
    <h4 className="mt-4 alert-info p-1 pl-3 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>Metric profile</h4>
    <Row className='mt-4'>
      <Col md={6}>
        <FormGroup>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Metric profile</InputGroupAddon>
            {
              historyview ?
                <Field
                  name='metric_profile'
                  className='form-control'
                  disabled={true}
                />
              :
                <Field
                  name='metric_profile'
                  component={DropDown}
                  data={insertSelectPlaceholder(list_id_metric_profiles.map(e => e.name), '')}
                  required={true}
                  class_name='custom-select'
                />
            }
          </InputGroup>
          <FormText>
            Metric profile associated to Aggregation profile. Service flavours defined in service flavour groups originate from selected metric profile.
          </FormText>
        </FormGroup>
      </Col>
    </Row>
    <h4 className="mt-2 alert-info p-1 pl-3 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>Service flavour groups</h4>
  </>
);


export class AggregationProfilesChange extends Component
{
  constructor(props) {
    super(props);

    this.tenant_name = props.tenant_name;
    this.token = props.webapitoken;
    this.webapiaggregation = props.webapiaggregation;
    this.webapimetric = props.webapimetric;
    this.profile_name = props.match.params.name;
    this.addview = props.addview
    this.history = props.history;
    this.location = props.location;

    this.state = {
      aggregation_profile: {},
      groupname: undefined,
      list_user_groups: [],
      write_perm: false,
      list_id_metric_profiles: [],
      list_services: [],
      list_complete_metric_profiles: {},
      areYouSureModal: false,
      loading: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined,
    }

    this.backend = new Backend();
    this.webapi = new WebApi({
      token: props.webapitoken,
      metricProfiles: props.webapimetric,
      aggregationProfiles: props.webapiaggregation}
    )

    this.extractListOfMetricsProfiles = this.extractListOfMetricsProfiles.bind(this);
    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.doChange = this.doChange.bind(this);
    this.doDelete = this.doDelete.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.onSubmitHandle = this.onSubmitHandle.bind(this);

    this.logic_operations = ["OR", "AND"];
    this.endpoint_groups = ["servicegroups", "sites"];
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

  extractListOfServices(profileFromAggregation, listMetricProfiles) {
    let targetProfile = listMetricProfiles.filter(p => p.name === profileFromAggregation.name)

    return targetProfile[0].services.map(s => s.service)
  }

  extractListOfMetricsProfiles(allProfiles) {
    var list_profiles = []

    allProfiles.forEach(profile => {
      var i = list_profiles['length']
      var {name, id} = profile

      list_profiles[i] = {name, id}
      i += 1
    })

    return list_profiles
  }

  insertEmptyServiceForNoServices(groups) {
    groups.forEach(group => {
      if (group.services.length === 0) {
          group.services.push({name: '', operation: ''})
      }
    })
    return groups
  }

  insertOperationFromPrevious(index, array) {
    if (array.length) {
      let last = array.length - 1

      return array[last]['operation']
    }
    else
      return ''
  }

  onSubmitHandle(values, action) {
    let msg = undefined;
    let title = undefined;

    if (this.addview) {
      msg = 'Are you sure you want to add Aggregation profile?'
      title = 'Add aggregation profile'
    }
    else {
      msg = 'Are you sure you want to change Aggregation profile?'
      title = 'Change aggregation profile'
    }
    this.toggleAreYouSureSetModal(msg, title,
      () => this.doChange(values, action));
  }

  doChange(values, actions) {
    let values_send = JSON.parse(JSON.stringify(values));
    this.removeDummyGroup(values_send)

    values_send.namespace = this.tenant_name

    let match_profile = this.state.list_id_metric_profiles.filter((e) =>
      values_send.metric_profile === e.name)

    values_send.metric_profile = match_profile[0]

    if (!this.addview) {
      this.webapi.changeAggregation(values_send)
      .then(response => {
        if (!response.ok) {
          this.toggleAreYouSureSetModal(`Error: ${response.status}, ${response.statusText}`,
            'Error changing aggregation profile',
            undefined)
        }
        else {
          response.json()
            .then(r => {
              this.backend.changeObject(
                '/api/v2/internal/aggregations/',
                {
                  apiid: values_send.id,
                  name: values_send.name,
                  groupname: values_send.groupname,
                  endpoint_group: values_send.endpoint_group,
                  metric_operation: values_send.metric_operation,
                  profile_operation: values_send.profile_operation,
                  metric_profile: values.metric_profile,
                  groups: JSON.stringify(values_send.groups)
                }
              )
                .then(() => NotifyOk({
                  msg: 'Aggregation profile succesfully changed',
                  title: 'Changed',
                  callback: () => this.history.push('/ui/aggregationprofiles')
                },
                ))
                .catch(err => alert('Something went wrong: ' + err))
            })
          .catch(err => alert('Something went wrong: ' + err))
        }
      }).catch(err => alert('Something went wrong: ' + err))
    }
    else {
      this.webapi.addAggregation(values_send)
      .then(response => {
        if (!response.ok) {
          this.toggleAreYouSureSetModal(`Error: ${response.status}, ${response.statusText}`,
            'Error adding aggregation profile',
            undefined)
        }
        else {
          response.json()
            .then(r => {
              this.backend.addObject(
                '/api/v2/internal/aggregations/',
                {
                  apiid: r.data.id,
                  name: values_send.name,
                  groupname: values_send.groupname,
                  endpoint_group: values_send.endpoint_group,
                  metric_operation: values_send.metric_operation,
                  profile_operation: values_send.profile_operation,
                  metric_profile: values.metric_profile,
                  groups: JSON.stringify(values_send.groups)
                }
              ).then(() => NotifyOk({
                  msg: 'Aggregation profile successfully added',
                  title: 'Added',
                  callback: () => this.history.push('/ui/aggregationprofiles')
                }))
                .catch(err => alert('Something went wrong: ' + err))
            })
            .catch(err => alert('Something went wrong: ' + err))
        }
      }).catch(err => alert('Something went wrong: ' + err))
    }
  }

  doDelete(idProfile) {
    this.webapi.deleteAggregation(idProfile)
    .then(response => {
      if (!response.ok) {
        alert(`Error: ${response.status}, ${response.statusText}`)
      } else {
        response.json()
        .then(this.backend.deleteObject(`/api/v2/internal/aggregations/${idProfile}`))
        .then(
          () => NotifyOk({
            msg: 'Aggregation profile sucessfully deleted',
            title: 'Deleted',
            callback: () => this.history.push('/ui/aggregationprofiles')
          }))
      }
    }).catch(err => alert('Something went wrong: ' + err))
  }

  insertDummyGroup(groups) {
    return  [...groups, {name: 'dummy', operation: 'OR', services: [{name: 'dummy', operation: 'OR'}]}]
  }

  removeDummyGroup(values) {
    let last_group_element = values.groups[values.groups.length - 1]

    if (last_group_element['name'] == 'dummy' &&
      last_group_element.services[0]['name'] == 'dummy') {
      values.groups.pop()
    }
  }

  checkIfServiceMissingInMetricProfile(servicesMetricProfile, serviceGroupsAggregationProfile) {
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

  componentDidMount() {
    this.setState({loading: true})

    this.backend.isActiveSession().then(sessionActive => {
      sessionActive.active && Promise.all([
        this.webapi.fetchMetricProfiles(),
      ])
        .then(([metricp]) => {
          if (!this.addview) {
            this.backend.fetchData(`/api/v2/internal/aggregations/${this.profile_name}`)
              .then(json => Promise.all([this.webapi.fetchAggregationProfile(json.apiid)])
                .then(([aggregp]) => this.setState({
                  aggregation_profile: aggregp,
                  groupname: json['groupname'],
                  list_user_groups: sessionActive.userdetails.groups.groupsofaggregations,
                  write_perm: sessionActive.userdetails.is_superuser ||
                    sessionActive.userdetails.groups.groupsofaggregations.indexOf(json['groupname']) >= 0,
                  list_id_metric_profiles: this.extractListOfMetricsProfiles(metricp),
                  list_services: this.extractListOfServices(aggregp.metric_profile, metricp),
                  list_complete_metric_profiles: metricp,
                  loading: false
                }))
              )
          } else {
            let empty_aggregation_profile = {
              id: '',
              name: '',
              metric_operation: '',
              profile_operation: '',
              endpoint_group: '',
              metric_profile: {
                  name: ''
              },
              groups: []
            }
            this.setState({
              aggregation_profile: empty_aggregation_profile,
              groupname: '',
              list_user_groups: usergroups,
              write_perm: sessionActive.userdetails.is_superuser ||
                sessionActive.userdetails.groups.groupsofaggregations.length > 0,
              list_id_metric_profiles: this.extractListOfMetricsProfiles(metricp),
              list_complete_metric_profiles: metricp,
              list_services: [],
              loading: false
            })
          }
        })
    })
  }

  render() {
    const {aggregation_profile, list_id_metric_profiles,
        list_complete_metric_profiles, list_user_groups, groupname,
        list_services, write_perm, loading} = this.state


    if (loading)
      return (<LoadingAnim />)

    else if (!loading && aggregation_profile &&
      aggregation_profile.metric_profile && list_user_groups
      && this.token) {

      let is_service_missing = this.checkIfServiceMissingInMetricProfile(list_services, aggregation_profile.groups)

      return (
        <BaseArgoView
          resourcename='aggregation profile'
          location={this.location}
          addview={this.addview}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}>
          <Formik
            initialValues = {{
              id: aggregation_profile.id,
              name: aggregation_profile.name,
              groupname: groupname,
              metric_operation: aggregation_profile.metric_operation,
              profile_operation: aggregation_profile.profile_operation,
              metric_profile: aggregation_profile.metric_profile.name,
              endpoint_group: aggregation_profile.endpoint_group,
              groups: this.insertDummyGroup(
                this.insertEmptyServiceForNoServices(aggregation_profile.groups)
              )
            }}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            render = {props => (
              <Form>
                <FormikEffect onChange={(current, prev) => {
                  if (current.values.metric_profile !== prev.values.metric_profile) {
                    let selected_profile = {name: current.values.metric_profile}
                    this.setState({list_services:
                      this.extractListOfServices(selected_profile,
                      list_complete_metric_profiles)})
                  }
                }}
                />
                {
                  is_service_missing &&
                  <Alert color='danger'>
                    <center>
                      <FontAwesomeIcon icon={faInfoCircle} size="lg" color="black"/> &nbsp;
                      Some Service Flavours used in Aggregation profile are not presented in associated Metric profile meaning that two profiles are out of sync. Check below for Service Flavours in red borders.
                    </center>
                  </Alert>
                }
                <AggregationProfilesForm
                  {...props}
                  list_user_groups={list_user_groups}
                  logic_operations={this.logic_operations}
                  endpoint_groups={this.endpoint_groups}
                  list_id_metric_profiles={list_id_metric_profiles}
                />
                <FieldArray
                  name="groups"
                  render={props => (
                    <GroupList
                      {...props}
                      list_services={insertSelectPlaceholder(list_services, '')}
                      list_operations={insertSelectPlaceholder(this.logic_operations, '')}
                      last_service_operation={this.insertOperationFromPrevious}
                      write_perm={write_perm}
                    />)}
                />
                {
                  (write_perm) &&
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                      <Button
                        color="danger"
                        onClick={() => {
                          this.toggleAreYouSureSetModal('Are you sure you want to delete Aggregation profile?',
                            'Delete aggregation profile',
                            () => this.doDelete(props.values.id))
                        }}>
                        Delete
                      </Button>
                      <Button color="success" id="submit-button" type="submit">Save</Button>
                    </div>
                }
              </Form>
            )}
          />
        </BaseArgoView>
      )
    }
    else
      return null
  }
}

export class AggregationProfilesList extends Component
{
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_aggregations: null
    }

    this.location = props.location;
    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true})
    this.backend.fetchData('/api/v2/internal/aggregations')
      .then(json =>
        this.setState({
          list_aggregations: json,
          loading: false})
      )
  }

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name',
        accessor: e =>
        <Link to={'/ui/aggregationprofiles/' + e.name}>
          {e.name}
        </Link>
      },
      {
        Header: 'Group',
        accessor: 'groupname',
        maxWidth: 150,
      }
    ]
    const {loading, list_aggregations} = this.state

    if (loading)
      return (<LoadingAnim />)

    else if (!loading && list_aggregations) {
      return (
        <BaseArgoView
          resourcename='aggregation profile'
          location={this.location}
          listview={true}>
          <ReactTable
            data={list_aggregations}
            columns={columns}
            className="-striped -highlight"
            defaultPageSize={12}
          />
        </BaseArgoView>
      )
    }
    else
      return null
  }
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
    };
    list1.push(
      `name: ${item1[i]['name']},\noperation: ${item1[i]['operation']},\nservices: [\n${services.join('\n')}\n]`
      );
  };
  for (let i = 0; i < item2.length; i++) {
    let services = [];
    for (let j = 0; j < item2[i]['services'].length; j++) {
      services.push(
        `{name: ${item2[i]['services'][j]['name']}, operation: ${item2[i]['services'][j]['operation']}}`
      );
    };
    list2.push(
      `name: ${item2[i]['name']},\noperation: ${item2[i]['operation']},\nservices: [\n${services.join('\n')}\n]`
      );
  };

  return (
    <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
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


export class AggregationProfileVersionCompare extends Component {
  constructor(props) {
    super(props);

    this.version1 = props.match.params.id1;
    this.version2 = props.match.params.id2;
    this.name = props.match.params.name;

    this.state = {
      loading: false,
      name1: '',
      groupname1: '',
      metric_operation1: '',
      profile_operation1: '',
      endpoint_group1: '',
      metric_profile1: '',
      groups1: [],
      name2: '',
      groupname2: '',
      metric_operation2: '',
      profile_operation2: '',
      endpoint_group2: '',
      metric_profile2: '',
      groups2: []
    };

    this.backend = new Backend();
  };

  componentDidMount() {
    this.backend.fetchData(`/api/v2/internal/tenantversion/aggregationprofile/${this.name}`)
      .then((json) => {
        let name1 = '';
        let groupname1 = '';
        let metric_operation1 = '';
        let profile_operation1 = '';
        let endpoint_group1 = '';
        let metric_profile1 = '';
        let groups1 = [];
        let name2 = '';
        let groupname2 = '';
        let metric_operation2 = '';
        let profile_operation2 = '';
        let endpoint_group2 = '';
        let metric_profile2 = '';
        let groups2 = [];

        json.forEach((e) => {
          if (e.version == this.version1) {
            name1 = e.fields.name;
            groupname1 = e.fields.groupname;
            metric_operation1 = e.fields.metric_operation;
            profile_operation1 = e.fields.profile_operation;
            endpoint_group1 = e.fields.endpoint_group;
            metric_profile1 = e.fields.metric_profile;
            groups1 = e.fields.groups;
          } else if (e.version == this.version2) {
            name2 = e.fields.name;
            groupname2 = e.fields.groupname;
            metric_operation2 = e.fields.metric_operation;
            profile_operation2 = e.fields.profile_operation;
            endpoint_group2 = e.fields.endpoint_group;
            metric_profile2 = e.fields.metric_profile;
            groups2 = e.fields.groups;
          };
        });

        this.setState({
          name1: name1,
          groupname1: groupname1,
          metric_operation1: metric_operation1,
          profile_operation1: profile_operation1,
          endpoint_group1: endpoint_group1,
          metric_profile1: metric_profile1,
          groups1: groups1,
          name2: name2,
          groupname2: groupname2,
          metric_operation2: metric_operation2,
          profile_operation2: profile_operation2,
          endpoint_group2: endpoint_group2,
          metric_profile2: metric_profile2,
          groups2: groups2,
          loading: false,
        });
      });
  };

  render() {
    const {
      name1, name2, groupname1, groupname2, metric_operation1,
      metric_operation2, profile_operation1, profile_operation2,
      endpoint_group1, endpoint_group2, metric_profile1, metric_profile2,
      groups1, groups2, loading
    } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (!loading && name1 && name2) {
      return (
        <React.Fragment>
          <div className='d-flex align-items-center justify-content-between'>
            <h2 className='ml-3 mt-1 mb-4'>{`Compare ${this.name} versions`}</h2>
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
  };
};


export class AggregationProfileVersionDetails extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.version = props.match.params.version;

    this.backend = new Backend();

    this.state = {
      name: '',
      groupname: '',
      metric_operation: '',
      profile_operation: '',
      endpoint_group: '',
      metric_profile: '',
      groups: [],
      date_created: '',
      loading: false
    };
  };

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchData(`/api/v2/internal/tenantversion/aggregationprofile/${this.name}`)
      .then((json) => {
        json.forEach((e) => {
          if (e.version == this.version)
            this.setState({
              name: e.fields.name,
              groupname: e.fields.groupname,
              metric_operation: e.fields.metric_operation,
              profile_operation: e.fields.profile_operation,
              endpoint_group: e.fields.endpoint_group,
              metric_profile: e.fields.metric_profile,
              groups: e.fields.groups,
              date_created: e.date_created,
              loading: false
            });
        });
      });
  };

  render() {
    const { name, groupname, metric_operation, profile_operation,
    endpoint_group, metric_profile, groups, date_created, loading } = this.state;
    if (loading)
      return (<LoadingAnim/>);

    else if (!loading && name) {
      return (
        <BaseArgoView
          resourcename={`${name} (${date_created})`}
          infoview={true}
        >
          <Formik
            initialValues = {{
              name: name,
              groupname: groupname,
              metric_operation: metric_operation,
              profile_operation: profile_operation,
              endpoint_group: endpoint_group,
              metric_profile: metric_profile,
              groups: groups
            }}
            render = {props => (
              <Form>
                <AggregationProfilesForm
                  {...props}
                  historyview={true}
                />
                <FieldArray
                  name='groups'
                  render={arrayHelpers => (
                    <Row className='groups'>
                      {
                        props.values['groups'].map((group, i) =>
                          <FieldArray
                            key={i}
                            name='groups'
                            render={arrayHelpers => (
                              <React.Fragment key={i}>
                                <Col sm={{size: 8}} md={{size: 5}} className='mt-4 mb-2'>
                                  <Card>
                                    <CardHeader className='p-1' color='primary'>
                                      <Row className='d-flex align-items-center no-gutters'>
                                        <Col sm={{size: 10}} md={{size: 11}}>
                                          {groups[i].name}
                                        </Col>
                                      </Row>
                                    </CardHeader>
                                    <CardBody className='p-1'>
                                      {
                                        group.services.map((service, j) =>
                                          <FieldArray
                                            key={j}
                                            name={`groups.${i}.services`}
                                            render={arrayHelpers => (
                                              <Row className='d-flex align-items-center service pt-1 pb-1 no-gutters' key={j}>
                                                <Col md={8}>
                                                  {groups[i].services[j].name}
                                                </Col>
                                                <Col md={2}>
                                                  {groups[i].services[j].operation}
                                                </Col>
                                              </Row>
                                            )}
                                          />
                                        )
                                      }
                                    </CardBody>
                                    <CardFooter className='p-1 d-flex justify-content-center'>
                                      {groups[i].operation}
                                    </CardFooter>
                                  </Card>
                                </Col>
                                <Col sm={{size: 4}} md={{size: 1}} className='mt-5'>
                                  <div className='group-operation' key={i}>
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
              </Form>
            )}
          />
        </BaseArgoView>
      );
    } else
      return null;
  };
};
