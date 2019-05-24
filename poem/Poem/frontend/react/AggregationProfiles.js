import Cookies from 'universal-cookie';
import React, { Component } from 'react';
import { LoadingAnim, ModalAreYouSure } from './UIElements';
import ReactTable from 'react-table';
import 'react-table/react-table.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Formik, Field, FieldArray, Form } from 'formik'
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import FormikEffect from './FormikEffect.js'
import {
  Alert,
  Container,
  Button, 
  Row, 
  Col, 
  Card, 
  CardHeader, 
  CardTitle,
  CardBody,
  Label,
  CardFooter,
  FormGroup,
  FormText} from 'reactstrap';

import './AggregationProfiles.css';


const SubmitRow = ({readonly=false, ondelete, id}) =>
  (readonly) ?
    <div className="submit-row">
      <center>
        This is a read-only instance, please
        request the corresponding permissions
        to perform any changes in this form. 
      </center>
    </div>
  :
  <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
    <Button
      color="danger"
      id="id-button" 
      type="delete"
      onClick={() => ondelete(id)}>
      Delete
    </Button>
    <Button color="success" id="submit-button" type="submit">Save</Button>
  </div>


const DropDown = ({field, data=[], prefix="", class_name=""}) => 
  <Field component="select"
    name={prefix ? `${prefix}.${field.name}` : field.name}
    required={true}
    className={`form-control ${class_name}`}
  >
    {
      data.map((name, i) => 
        i === 0 ?
        <option key={i} hidden>{name}</option> :
        <option key={i} value={name}>{name}</option>
      )
    }
  </Field>


const ButtonRemove = ({index=0, operation=f=>f}) => 
  <Button size="sm" color="danger"
    type="button"
    onClick={() => operation(index)}>
    <FontAwesomeIcon icon={faTimes}/>
  </Button>


const GroupList = ({name, form, list_services, list_operations, last_service_operation, write_perm, insert}) =>
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


const Group = ({name, operation, services, list_operations, list_services, last_service_operation, write_perm, form, groupindex, remove, insert, last}) =>
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
                <ButtonRemove
                  index={groupindex}
                  operation={(write_perm) ? remove: null}/>
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
              class_name="custom-select col-3"
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
    <div className="wrap-group-add">
      <div className="group-add"
        onClick={() => {
          (write_perm) ?
              insert(groupindex, {name: '', operation: '',
                  services: [{name: '', operation: ''}]})
          :
          null
        }}>
        <FontAwesomeIcon icon={faPlus} color="#70bf2b"/>
        &nbsp;&nbsp;&nbsp;&nbsp;Add new Service Flavour Group
      </div>
    </div> 


const ServiceList = ({services, list_services=[], list_operations=[], last_service_operation, groupindex, groupoperation, form, push}) =>
  <React.Fragment>
    { 
      services.map((service, i) =>
        <FieldArray
          key={i}
          name={`groups.${groupindex}.services`}
          render={props => (
            <Service
              {...props}
              key={i}
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
    }
  </React.Fragment>


const Service = ({name, operation, list_services, list_operations, last_service_operation, groupindex, index, remove, insert, last, form}) => 
  <Row className="d-flex align-items-center service pt-1 pb-1 no-gutters" key={index}>
    <Col md={8}>
      <div className="input-group input-group-sm">
        <DropDown 
          field={{name: "name", value: name}}
          data={list_services} 
          prefix={`groups.${groupindex}.services.${index}`}
          class_name="custom-select service-name"
        />
      </div>
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

    const {params} = props.match;
    const {webapimetric, webapiaggregation, tenant_name} = props;
    this.webapimetric = webapimetric;
    this.webapiaggregation = webapiaggregation;
    this.tenant_name = tenant_name;

    this.profile_id = params.id;

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
    }

    this.fetchMetricProfiles = this.fetchMetricProfiles.bind(this);
    this.fetchAggregationProfile = this.fetchAggregationProfile.bind(this);
    this.extractListOfMetricsProfiles = this.extractListOfMetricsProfiles.bind(this);
    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.sendToDjango = this.sendToDjango.bind(this);
    this.sendToWebApi= this.sendToWebApi.bind(this);
    this.doChange = this.doChange.bind(this);
    this.setModalOptions = this.setModalOptions.bind(this);

    this.modalFunc = undefined;
    this.modalTitle = undefined;
    this.modalMsg = undefined;


    this.logic_operations = ["OR", "AND"]; 
    this.endpoint_groups = ["servicegroups", "sites"];
  }

  toggleAreYouSure() {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal}));
  }

  setModalOptions(msg, title, onyes) {
    this.modalFunc = onyes;
    this.modalTitle = title;
    this.modalMsg = msg;
  }

  fetchToken() {
    return fetch('/api/v2/internal/tokens/WEB-API')
      .then(response => response.json())
      .catch(err => console.log('Something went wrong: ' + err))
  }

  fetchUserGroups() {
    return fetch('/api/v2/internal/groups/aggregations')
      .then(response => response.json())
      .catch(err => console.log('Something went wrong: ' + err))
  }

  fetchAggregationGroup(aggregation_name) {
    return fetch('/api/v2/internal/aggregations' + '/' + aggregation_name)
      .then(response => response.json())
      .then(json => json['groupname'])
      .catch(err => console.log('Something went wrong: ' + err))
  }

  fetchMetricProfiles(token) {
    return fetch('https://web-api-devel.argo.grnet.gr/api/v2/metric_profiles',
      {headers: {"Accept": "application/json",
          "x-api-key": token}})
      .then(response => response.json())
      .then(json => json['data']) 
      .catch(err => console.log('Something went wrong: ' + err))
  }

  fetchAggregationProfile(token, idProfile) {
    return fetch('https://web-api-devel.argo.grnet.gr/api/v2/aggregation_profiles' + '/' + idProfile, 
      {headers: {"Accept": "application/json",
            "x-api-key": token}})
      .then(response => response.json())
      .then(json => json['data'])
      .then(array => array[0])
      .catch(err => console.log('Something went wrong: ' + err))
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
    } else {
        return [text] 
    }
  }

  insertOperationFromPrevious(index, array) {
      if (array.length) {
          let last = array.length - 1

          return array[last]['operation']
      }
      else {
          return ''
      }
  }

  sendToDjango(url, method, values=null) {
    const cookies = new Cookies()

    return fetch(url, {
      method: method,
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-CSRFToken': cookies.get('csrftoken'),
          'Referer': 'same-origin'
      },
      body: values ? JSON.stringify(values) : null 
    })
  }

  sendToWebApi(token, url, method, values=null) {
      return fetch(url, {
          method: method,
          mode: 'cors',
          cache: 'no-cache',
          credentials: 'same-origin',
          headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'x-api-key': token
          },
          body: values ? JSON.stringify(values) : null 
          
      })
  }

  onSubmitHandle(values, action) {
    console.log(values);

    this.setModalOptions('Are you sure you want to change Aggregation profile?', 
     'Change aggregation profile',
      this.doChange(values, action));
    this.toggleAreYouSure();
  }

  doChange(values, actions) {
    let last_group_element = values.groups[values.groups.length - 1]

    if (last_group_element['name'] == 'dummy' && 
      last_group_element.services[0]['name'] == 'dummy') {
      values.groups.pop()
    }

    values.namespace = this.tenant_name

    let match_profile = this.state.list_id_metric_profiles.filter((e) => 
      values.metric_profile === e.name)

    values.metric_profile = match_profile[0]

    this.fetchToken()
    .then(token => 
      this.sendToWebApi(token, this.webapiaggregation + '/' + values.id, 'PUT', values)
      .then(response => {
        if (!response.ok) {
          this.toggleAreYouSure(`Error: ${response.status}, ${response.statusText}`, 
            'Change aggregation profile', 
            null)
        }
        else {
          response.json()
            .then(r => {
              this.sendToDjango('/api/v2/internal/aggregations', 'PUT', 
                {
                  apiid: values.id, 
                  name: values.name, 
                  groupname: values.groups_field
                })
                .then(() => window.location = '/ui/aggregationprofiles')
                .catch(err => alert('Something went wrong: ' + err))
            })
          .catch(err => alert('Something went wrong: ' + err))
        }
      }).catch(err => alert('Something went wrong: ' + err))
    .catch(err => alert('Something went wrong: ' + err)))
  }

  insertDummyGroup(groups) {
    return  [...groups, {name: 'dummy', operation: 'OR', services: [{name: 'dummy', operation: 'OR'}]}] 
  }

  componentWillMount() {
    this.setState({loading: true})

    this.fetchToken().then(token => 
      Promise.all([this.fetchAggregationProfile(token, this.profile_id), 
        this.fetchMetricProfiles(token),
        this.fetchUserGroups()])
      .then(([aggregp, metricp, usergroups]) => {
        this.fetchAggregationGroup(aggregp.name)
        .then(group =>
          this.setState(
          {
            aggregation_profile: aggregp,
            groups_field: group,
            list_user_groups: usergroups,
            write_perm: usergroups.indexOf(group) >= 0,
            list_id_metric_profiles: this.extractListOfMetricsProfiles(metricp),
            list_services: this.extractListOfServices(aggregp.metric_profile, metricp),
            list_complete_metric_profiles: metricp,
            loading: false
          })
        )
      })
    )
  }

  render() {
    const {aggregation_profile, list_id_metric_profiles,
        list_complete_metric_profiles, list_user_groups, groups_field,
        list_services, write_perm, loading} = this.state

    return (
      (loading)
      ?
        <LoadingAnim />
      :
        <React.Fragment>
          <ModalAreYouSure 
            isOpen={this.state.areYouSureModal}
            toggle={this.toggleAreYouSure}
            title={this.modalTitle}
            msg={this.modalMsg}
            onYes={() => this.modalFunc} />
          <div className="d-flex align-items-center justify-content-between">
            <h2 className="ml-3 mt-4 mb-4">Change aggregation profile</h2> 
            <a className="btn btn-secondary" href="history" role="button">History</a>
          </div>
          <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
            <Formik
              initialValues={{
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
                          className="form-control"
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
                    (write_perm) ?
                      <SubmitRow 
                        ondelete={this.onDeleteHandle}
                        id={props.values.id}/>
                      :
                      <SubmitRow readonly={true}/>
                  }
                </Form>
              )}
            />
          </div>
        </React.Fragment>
    )
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

  }

  componentDidMount() {
    this.setState({loading: true})
    fetch('/api/v2/internal/aggregations')
      .then(response => response.json())
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
        <a href={'/ui/aggregationprofiles/change/' + e.apiid}>
          {e.name}
        </a>
      },
      {
        Header: 'Group',
        accessor: 'groupname',
        maxWidth: 150,
      }
    ]
    const {loading, list_aggregations} = this.state

    return (
      (loading)
      ?
        <LoadingAnim />
      :
        <React.Fragment>
          <div className="d-flex align-items-center justify-content-between">
            <h2 className="ml-3 mt-4 mb-4">Select aggregation profile to change</h2> 
            <a className="btn btn-secondary" href="add" role="button">Add</a>
          </div>
          <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
            {
              list_aggregations &&
              <ReactTable
                data={list_aggregations}
                columns={columns}
                className="-striped -highlight"
                defaultPageSize={10}
              />
            }
          </div>
        </React.Fragment>
    )
  }
}
