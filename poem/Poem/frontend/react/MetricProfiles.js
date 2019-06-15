import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import {Backend, WebApi} from './DataManager';
import Autocomplete from 'react-autocomplete';
import { LoadingAnim, BaseArgoView } from './UIElements';
import ReactTable from 'react-table';
import { Formik, Field, FieldArray, Form } from 'formik';
import 'react-table/react-table.css';
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';

import './MetricProfiles.css'; 

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


function matchItem(item, value) {
  return item.toLowerCase().indexOf(value.toLowerCase()) !== -1;
}


const ServicesList = ({serviceflavours_all, metrics_all, form, remove, insert}) =>
  <Row className="no-gutters"> 
    {
      form.values.services.map((service, index) =>
        <React.Fragment>
          <Col md={{size: 5}}>
            <Autocomplete
              inputProps={{
                className: "form-control custom-select"
              }}
              getItemValue={(item) => item}
              items={serviceflavours_all}
              value={service.service}
              renderItem={(item, isHighlighted) => 
                <div 
                  key={serviceflavours_all.indexOf(item)} 
                  className={`autocomplete-entries ${isHighlighted ? 
                      "autocomplete-entries-highlighted" 
                      : ""}`
                  }>
                  {item}
                </div>}
              onChange={(e) => form.setFieldValue(`services.${index}.service`, e.target.value)}
              onSelect={(val) => form.setFieldValue(`services.${index}.service`, val)}
              wrapperStyle={{}}
              shouldItemRender={matchItem}
              renderMenu={(items) => 
                  <div className='autocomplete-menu' children={items}/>}
            />
          </Col>
          <Col md={{size: 5}}>
            <Autocomplete
              inputProps={{
                className: "form-control custom-select"
              }}
              getItemValue={(item) => item}
              items={metrics_all}
              value={service.metric}
              renderItem={(item, isHighlighted) => 
                <div 
                  key={metrics_all.indexOf(item)} 
                  className={`autocomplete-entries ${isHighlighted ? 
                      "autocomplete-entries-highlighted" 
                      : ""}`
                  }>
                  {item}
                </div>}
              onChange={(e) => form.setFieldValue(`services.${index}.metric`, e.target.value)}
              onSelect={(val) => form.setFieldValue(`services.${index}.metric`, val)}
              wrapperStyle={{}}
              shouldItemRender={matchItem}
              renderMenu={(items) => 
                  <div className='autocomplete-menu' children={items}/>}
            />
          </Col>
          <Col md={{size: 2}}>
            <Button color="light"
              type="button"
              onClick={() => remove(index)}>
              <FontAwesomeIcon icon={faTimes}/>
            </Button>
            <Button color="light"
              type="button"
              onClick={() => insert(index + 1, {service: '', metric: ''})}>
              <FontAwesomeIcon icon={faPlus}/>
            </Button>
          </Col>
        </React.Fragment>
      )
    }
  </Row>


export class MetricProfilesChange extends Component 
{
  constructor(props) {
    super(props);

    this.tenant_name = props.tenant_name;
    this.token = props.webapitoken;
    this.webapimetric = props.webapimetric;
    this.profile_name = props.match.params.name;
    this.addview = props.addview
    this.history = props.history;
    this.location = props.location;

    this.state = {
      metric_profile: {},
      groups_field: undefined,
      write_perm: false,
      list_services: undefined,
      serviceflavours_all: undefined,
      metrics_all: undefined,
      areYouSureModal: false,
      loading: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined,
      searchServiceFlavour: "",
      searchMetric: ""
    }

    this.backend = new Backend();
    this.webapi = new WebApi({
      token: props.webapitoken,
      metricProfiles: props.webapimetric}
    )

    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.handleSearchServiceFlavour = this.handleSearchServiceFlavour.bind(this);
  }

  flattenServices(services) {
    let flat_services = [];

    services.forEach((service_element) => {
      let service = service_element.service;
      service_element.metrics.forEach((metric) => {
        flat_services.push({service, metric})
      })
    })

    return flat_services
  }

  componentDidMount() {
    this.setState({loading: true})

    if (!this.addview) {
      this.backend.fetchMetricProfileIdFromName(this.profile_name).then(id =>
        Promise.all([this.webapi.fetchMetricProfile(id),
          this.backend.fetchMetricProfileUserGroups(),
          this.backend.fetchServiceFlavoursAll(),
          this.backend.fetchMetricsAll()
        ])
        .then(([metricp, usergroups, serviceflavoursall, metricsall]) => {
          this.backend.fetchMetricProfileGroup(metricp.name)
            .then(group => 
              this.setState(
                {
                  metric_profile: metricp,
                  groups_field: group,
                  list_user_groups: usergroups,
                  write_perm: localStorage.getItem('authIsSuperuser') === 'true' || usergroups.indexOf(group) >= 0,
                  list_services: this.flattenServices(metricp.services),
                  static_list_services: this.flattenServices(metricp.services),
                  serviceflavours_all: serviceflavoursall,
                  metrics_all: metricsall,
                  loading: false
                }
              ))
        }))
    }
  }

  insertSelectPlaceholder(data, text) {
    if (data) {
      return [text, ...data]
    } else
      return [text] 
  }

  toggleAreYouSureSetModal(msg, title, onyes) {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal,
        modalFunc: onyes,
        modalMsg: msg,
        modalTitle: title,
      }));
  }

  toggleAreYouSure() {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal}));
  }

  handleSearchServiceFlavour(e) {
    let filtered = this.state.static_list_services

    if (this.state.searchServiceFlavour.length > e.target.value.length) {
      // handle remove of characters of search term
      filtered = this.state.static_list_services.filter((elem) => 
        elem.service.toLowerCase().indexOf(e.target.value.toLowerCase()) !== -1)
    }
    else if (e.target.value !== '') {
      filtered = this.state.list_services.filter((elem) => 
        elem.service.toLowerCase().indexOf(e.target.value.toLowerCase()) !== -1)
    }

    this.setState({searchServiceFlavour: e.target.value, list_services: filtered})
  }

  handleSearchMetrics(e) {
    let filtered = this.state.static_list_services

    if (e.target.value !== '') {
      filtered = this.state.list_services.filter((elem) => 
        elem.metric.toLowerCase().indexOf(e.target.value.toLowerCase()) !== -1)
    }

    this.setState({searchMetric: e.target.value, list_services: filtered})
  }

  render() {
    const {write_perm, loading, metric_profile, 
      list_services, groups_field, list_user_groups,
      serviceflavours_all, metrics_all, 
      searchMetric, searchServiceFlavour} = this.state;

    if (loading)
      return (<LoadingAnim />) 

    else if (!loading && metric_profile && list_services) {
      return (
        <BaseArgoView
          resourcename='Metric profile'
          location={this.location}
          addview={this.addview}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}>
          <Formik
            initialValues = {{
              id: metric_profile.id,
              name: metric_profile.name,
              groups_field: groups_field,
              services: list_services,
              search_metric: searchMetric,
              search_serviceflavour: searchServiceFlavour
            }}
            onSubmit = {(values, actions) => alert(JSON.stringify(values, null, 4))}
            enableReinitialize={true}
            render = {props => (
              <Form>
                <FormGroup>
                  <Row>
                    <Col md={4}>
                      <Label for="metricProfileName">Metric profile name:</Label>
                      <Field 
                        type="text" 
                        name="name" 
                        placeholder="Name of metric profile"
                        required={true}
                        className="form-control form-control-lg"
                        id="metricProfileName"
                      />
                    </Col>
                  </Row>
                </FormGroup>
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
                            Metric profile is a member of a given group. 
                          </FormText>
                        </Col>
                      </Row>
                    </FormGroup>
                  </Col>
                </Row>
                <h4 className="mt-2 alert-info p-1 pl-3 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>Services and metrics</h4>
                <FormGroup>
                  <Row>
                    <Col md={{size: 5}}>
                      <Field 
                        type="text" 
                        name="search_serviceflavour" 
                        placeholder="Search service flavour"
                        required={false}
                        className="form-control"
                        id="searchServiceFlavour"
                        onChange={(e) => this.handleSearchServiceFlavour(e)}
                      />
                    </Col>
                    <Col md={{size: 5}}>
                      <Field 
                        type="text" 
                        name="search_metric" 
                        placeholder="Search metrics"
                        required={false}
                        className="form-control"
                        id="searchMetric"
                        onChange={(e) => this.handleSearchMetrics(e)}
                      />
                    </Col>
                  </Row>
                </FormGroup>
                <FieldArray
                  name="services"
                  render={props => (
                    <ServicesList
                      {...props}
                      serviceflavours_all={this.insertSelectPlaceholder(serviceflavours_all, '')}
                      metrics_all={this.insertSelectPlaceholder(metrics_all, '')}
                    />)}
                />
                {
                  (write_perm) &&
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                      <Button
                        color="danger"
                        onClick={() => {
                          this.toggleAreYouSureSetModal('Are you sure you want to delete Metric profile?', 
                            'Delete metric profile',
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


export class MetricProfilesList extends Component
{
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_metricprofiles: null
    }

    this.location = props.location;
    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true})
    this.backend.fetchMetricProfiles()
      .then(json =>
        this.setState({
          list_metricprofiles: json, 
          loading: false})
      )
  }

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name',
        accessor: e => 
        <Link to={'/ui/metricprofiles/' + e.name}>
          {e.name}
        </Link>
      },
      {
        Header: 'Group',
        accessor: 'groupname',
        maxWidth: 150,
      }
    ]
    const {loading, list_metricprofiles} = this.state

    if (loading) 
      return (<LoadingAnim />)

    else if (!loading && list_metricprofiles) {
      return (
        <BaseArgoView 
          resourcename='metric profile'
          location={this.location}
          listview={true}>
          <ReactTable
            data={list_metricprofiles}
            columns={columns}
            className="-striped -highlight"
            defaultPageSize={10}
          />
        </BaseArgoView>
      )
    }
    else 
      return null
  }
}
