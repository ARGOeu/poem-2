import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import {Backend, WebApi} from './DataManager';
import Autocomplete from 'react-autocomplete';
import { LoadingAnim, BaseArgoView, SearchField, DropDown } from './UIElements';
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
import { faPlus, faTimes} from '@fortawesome/free-solid-svg-icons';

import './MetricProfiles.css'; 


function matchItem(item, value) {
  return item.toLowerCase().indexOf(value.toLowerCase()) !== -1;
}


const ServicesList = ({serviceflavours_all, metrics_all, search_handler, form, remove, insert}) =>
  <table className="table table-bordered table-sm">
    <thead className="table-active">
      <tr>
        <th style={{width: "5%"}}>#</th>
        <th style={{width: "42.5%"}}>Service flavour name</th>
        <th style={{width: "42.5%"}}>Metric name</th>
        <th style={{width: "10%"}}>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          {''}
        </td>
        <td>
          <Field 
            type="text" 
            name="search_serviceflavour" 
            required={false}
            className="form-control"
            id="searchServiceFlavour"
            onChange={(e) => search_handler(e, 'view_services',
              'searchServiceFlavour', 'service', 'searchMetric', 'metric')}
            component={SearchField}
          />
        </td>
        <td>
          <Field 
            type="text" 
            name="search_metric" 
            required={false}
            className="form-control"
            id="searchMetric"
            onChange={(e) => search_handler(e, 'view_services', 'searchMetric',
              'metric', 'searchServiceFlavour', 'service')}
            component={SearchField}
          />
        </td>
        <td>
          {''}
        </td>
      </tr>
      {
        form.values.formview_services.map((service, index) =>
          <tr>
            <td className="align-middle text-center">
              {index + 1}
            </td>
            <td>
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
            </td>
            <td>
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
            </td>
            <td>
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
            </td>
          </tr>
        )
      }
    </tbody>
  </table>


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
    this.list_services = [],

    this.state = {
      metric_profile: {},
      groups_field: undefined,
      write_perm: false,
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
    this.handleSearch = this.handleSearch.bind(this);
  }

  flattenServices(services) {
    let flat_services = [];
    let index = 0;

    services.forEach((service_element) => {
      let service = service_element.service;
      service_element.metrics.forEach((metric) => {
        flat_services.push({index, service, metric})
        index += 1;
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
            .then(group => {
              this.setState(
                {
                  metric_profile: metricp,
                  groups_field: group,
                  list_user_groups: usergroups,
                  write_perm: localStorage.getItem('authIsSuperuser') === 'true' || usergroups.indexOf(group) >= 0,
                  view_services: this.flattenServices(metricp.services),
                  serviceflavours_all: serviceflavoursall,
                  metrics_all: metricsall,
                  loading: false
                });
              this.list_services = this.flattenServices(metricp.services);
            }) 
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

  handleSearch(e, statefieldlist, statefieldsearch, formikfield,
    alternatestatefield, alternateformikfield) 
  {
    let filtered = this[statefieldlist.replace('view_', 'list_')]

    if (this.state[statefieldsearch].length > e.target.value.length) {
      // handle remove of characters of search term
      filtered = this[statefieldlist.replace('view_', 'list_')].
        filter((elem) => matchItem(elem[formikfield], e.target.value))
    }
    else if (e.target.value !== '') {
      filtered = this.state[statefieldlist].filter((elem) => 
        matchItem(elem[formikfield], e.target.value))
    }

    // handle multi search 
    if (this.state[alternatestatefield].length) {
      filtered = filtered.filter((elem) => 
        matchItem(elem[alternateformikfield], this.state[alternatestatefield]))
    }

    this.setState({
      [`${statefieldsearch}`]: e.target.value, 
      [`${statefieldlist}`]: filtered
    })
  }

  render() {
    const {write_perm, loading, metric_profile, 
      view_services, groups_field, list_user_groups,
      serviceflavours_all, metrics_all, 
      searchMetric, searchServiceFlavour} = this.state;

    if (loading)
      return (<LoadingAnim />) 

    else if (!loading && metric_profile && view_services) {
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
              view_services: view_services,
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
                <h4 className="mt-2 alert-info p-1 pl-3 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>Metric instances</h4>
                <FieldArray
                  name="services"
                  render={props => (
                    <ServicesList
                      {...props}
                      serviceflavours_all={this.insertSelectPlaceholder(serviceflavours_all, '')}
                      metrics_all={this.insertSelectPlaceholder(metrics_all, '')}
                      search_handler={this.handleSearch}
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
            defaultPageSize={20}
          />
        </BaseArgoView>
      )
    }
    else 
      return null
  }
}
