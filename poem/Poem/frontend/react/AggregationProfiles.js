import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import { LoadingAnim, BaseArgoView, NotifyOk, DropDown } from './UIElements';
import Autocomplete from 'react-autocomplete';
import ReactTable from 'react-table';
import 'react-table/react-table.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Formik, Field, FieldArray, Form } from 'formik';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import FormikEffect from './FormikEffect.js';
import {Backend, WebApi} from './DataManager';
import {
  Button, 
  Row, 
  Col, 
  Card, 
  CardHeader, 
  CardBody,
  Label,
  CardFooter,
  FormGroup,
  FormText} from 'reactstrap';

import "react-notifications/lib/notifications.css";
import './AggregationProfiles.css';


function matchItem(item, value) {
  return item.toLowerCase().indexOf(value.toLowerCase()) !== -1;
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
            last={i === form.values[name].length - 1}
          />
        )}
      />
    )
  }
  </Row>


const Group = ({operation, services, list_operations, list_services, last_service_operation, write_perm, form, groupindex, remove, insert, last}) =>
  (!last) ?
    <React.Fragment key={groupindex}>
      <Col sm={{size: 8}} md={{size: 5}} className="mt-4 mb-2">
        <Card>
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
          insert(groupindex, {name: '', operation: '',
              services: [{name: '', operation: ''}]})
      }>Add new group</Button>
    </Col>


const ServiceList = ({services, list_services=[], list_operations=[], last_service_operation, groupindex, form}) =>
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
          index={i}
          last={i === services.length - 1}
          form={form}
        />
      )}
    />
  )


const Service = ({name, service, operation, list_services, list_operations, last_service_operation, groupindex, index, remove, insert, form}) => 
  <Row className="d-flex align-items-center service pt-1 pb-1 no-gutters" key={index}>
    <Col md={8}>
        <Autocomplete
          inputProps={{
            className: "form-control custom-select"
          }}
          getItemValue={(item) => item}
          items={list_services}
          value={service.name}
          renderItem={(item, isHighlighted) => 
            <div 
              key={list_services.indexOf(item)} 
              className={`autocomplete-entries ${isHighlighted ? 
                  "autocomplete-entries-highlighted" 
                  : ""}`
              }>
              {item}
            </div>}
          onChange={(e) => form.setFieldValue(`groups.${groupindex}.services.${index}.name`, e.target.value)}
          onSelect={(val) => {
            form.setFieldValue(`groups.${groupindex}.services.${index}.name`, val)
          }}
          wrapperStyle={{}}
          shouldItemRender={matchItem}
          renderMenu={(items) => 
              <div className='autocomplete-menu' children={items}/>}
        />
    </Col>
    <Col md={2}>
      <div className="input-group input-group-sm">
        <DropDown 
          field={{name: "operation", value: operation}}
          data={list_operations}
          prefix={`groups.${groupindex}.services.${index}`}
          class_name="custom-select service-operation"
        />
      </div>
    </Col>
    <Col md={2} className="pl-1">
      <Button size="sm" color="light"
        type="button"
        onClick={() => remove(index)}>
        <FontAwesomeIcon icon={faTimes}/>
      </Button>
      <Button size="sm" color="light"
        type="button"
        onClick={() => insert(index + 1, {name: '', operation: 
          last_service_operation(index, form.values.groups[groupindex].services)})}>
        <FontAwesomeIcon icon={faPlus}/>
      </Button>
    </Col>
  </Row>


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
      groups_field: undefined,
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

  insertSelectPlaceholder(data, text) {
    if (data) {
      return [text, ...data]
    } else
      return [text] 
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
              this.backend.changeAggregation({ 
                apiid: values_send.id, 
                name: values_send.name, 
                groupname: values_send.groups_field
              })
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
              this.backend.addAggregation({
                apiid: r.data.id, 
                name: values_send.name, 
                groupname: values_send.groups_field
              })
                .then(() => NotifyOk({
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
        .then(this.backend.deleteAggregation(idProfile))
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

  componentDidMount() {
    this.setState({loading: true})

    if (!this.addview) {
      this.backend.fetchAggregationProfileIdFromName(this.profile_name).then(id =>
        Promise.all([this.webapi.fetchAggregationProfile(id), 
          this.webapi.fetchMetricProfiles(),
          this.backend.fetchAggregationUserGroups()])
        .then(([aggregp, metricp, usergroups]) => {
          this.backend.fetchAggregationGroup(aggregp.name)
          .then(group =>
            this.setState(
            {
              aggregation_profile: aggregp,
              groups_field: group,
              list_user_groups: usergroups,
              write_perm: localStorage.getItem('authIsSuperuser') === 'true' || usergroups.indexOf(group) >= 0,
              list_id_metric_profiles: this.extractListOfMetricsProfiles(metricp),
              list_services: this.extractListOfServices(aggregp.metric_profile, metricp),
              list_complete_metric_profiles: metricp,
              loading: false
            })
          )
        })
      )
    }
    else {
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
      Promise.all([this.webapi.fetchMetricProfiles(), this.backend.fetchAggregationUserGroups()])
        .then(([metricp, usergroups]) => this.setState(
      {
        aggregation_profile: empty_aggregation_profile,
        groups_field: '',
        list_user_groups: usergroups,
        write_perm: true,
        list_id_metric_profiles: this.extractListOfMetricsProfiles(metricp),
        list_complete_metric_profiles: metricp,
        list_services: [],
        loading: false
      }))
    }
  }

  render() {
    const {aggregation_profile, list_id_metric_profiles,
        list_complete_metric_profiles, list_user_groups, groups_field,
        list_services, write_perm, loading} = this.state

    if (loading)
      return (<LoadingAnim />)

    else if (!loading && aggregation_profile && 
      aggregation_profile.metric_profile && list_user_groups 
      && this.token) {

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
              groups_field: groups_field, 
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
                <FormGroup>
                  <Row>
                    <Col md={4}>
                      <Label for="aggregationName">Aggregation name:</Label>
                      <Field 
                        type="text" 
                        name="name" 
                        placeholder="Name of aggregation profile"
                        required={true}
                        className="form-control form-control-lg"
                        id="aggregationName"
                      />
                    </Col>
                  </Row>
                </FormGroup>
                <Row>
                  <Col md={4}>
                    <FormGroup>
                      <Row>
                        <Col md={12}>
                          <Label for="aggregationMetric">Metric operation:</Label>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={5}>
                          <Field 
                            name="metric_operation" 
                            component={DropDown} 
                            data={this.insertSelectPlaceholder(this.logic_operations, '')}
                            required={true}
                            id="aggregationMetric"
                            class_name='custom-select'
                          /> 
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
                        <Col md={12}>
                          <Label for="aggregationOperation">Aggregation operation: </Label>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={5}>
                          <Field 
                            name="profile_operation" 
                            component={DropDown} 
                            data={this.insertSelectPlaceholder(this.logic_operations, '')}
                            required={true}
                            id="aggregationOperation"
                            class_name='custom-select'
                          /> 
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
                        <Col md={12}>
                          <Label>Endpoint group: </Label>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={6}>
                          <Field 
                            name="endpoint_group" 
                            component={DropDown} 
                            data={this.insertSelectPlaceholder(this.endpoint_groups, '')}
                            required={true}
                            class_name='custom-select'
                          /> 
                        </Col>
                      </Row>
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Label>Metric profile: </Label>
                      <Field 
                        name="metric_profile" 
                        component={DropDown} 
                        data={this.insertSelectPlaceholder(list_id_metric_profiles.map(e => e.name), '')}
                        required={true}
                        id="metricProfile" 
                        class_name='custom-select'
                      />
                      <FormText>
                        Metric profile associated to Aggregation profile. Service flavours defined in service flavour groups originate from selected metric profile. 
                      </FormText>
                    </FormGroup>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <FormGroup>
                      <Row>
                        <Col md={6}>
                          <Label>Group: </Label>
                        </Col>
                      </Row>
                      <Row>
                        <Col md={4}>
                          <Field 
                            name="groups_field"
                            component={DropDown} 
                            data={this.insertSelectPlaceholder(
                              (write_perm) ?
                                list_user_groups :
                                [groups_field, ...list_user_groups]
                            )}
                            required={true}
                            class_name='custom-select'
                          /> 
                        </Col>
                      </Row>
                      <Row>
                        <Col md={12}>
                          <FormText>
                            Aggregation profile is a member of a given group. 
                          </FormText>
                        </Col>
                      </Row>
                    </FormGroup>
                  </Col>
                </Row>
                <h4 className="mt-2 alert-info p-1 pl-3 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>Service flavour groups</h4>
                <FieldArray
                  name="groups"
                  render={props => (
                    <GroupList
                      {...props}
                      list_services={this.insertSelectPlaceholder(list_services, '')}
                      list_operations={this.insertSelectPlaceholder(this.logic_operations, '')}
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
    this.backend.fetchAggregation()
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
