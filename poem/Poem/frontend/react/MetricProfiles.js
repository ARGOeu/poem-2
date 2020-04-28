import React, { Component } from 'react';
import {Link} from 'react-router-dom';
import {Backend, WebApi} from './DataManager';
import Autocomplete from 'react-autocomplete';
import {
  LoadingAnim,
  BaseArgoView,
  SearchField,
  NotifyOk,
  Icon,
  HistoryComponent,
  DiffElement,
  ProfileMainInfo,
  NotifyError} from './UIElements';
import ReactTable from 'react-table';
import { Formik, Field, FieldArray, Form } from 'formik';
import 'react-table/react-table.css';
import { Button } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import ReactDiffViewer from 'react-diff-viewer';
import * as Yup from 'yup';

import './MetricProfiles.css';


export const MetricProfileHistory = HistoryComponent('metricprofile');
export const MetricProfilesClone = MetricProfilesComponent(true);
export const MetricProfilesChange = MetricProfilesComponent();


function matchItem(item, value) {
  return item.toLowerCase().indexOf(value.toLowerCase()) !== -1;
}


const MetricProfilesSchema = Yup.object().shape({
  name: Yup.string().required('Required'),
  groupname: Yup.string().required('Required'),
})


const ServicesList = ({serviceflavours_all, metrics_all, search_handler,
  remove_handler, insert_handler, onselect_handler, form, remove, insert}) =>
    <table className="table table-bordered table-sm">
      <thead className="table-active">
        <tr>
          <th className="align-middle text-center" style={{width: "5%"}}>#</th>
          <th style={{width: "42.5%"}}><Icon i="serviceflavour"/> Service flavour</th>
          <th style={{width: "42.5%"}}><Icon i='metrics'/> Metric</th>
          <th style={{width: "10%"}}>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr style={{background: "#ECECEC"}}>
          <td className="align-middle text-center">
            <FontAwesomeIcon icon={faSearch}/>
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
        form.values.view_services.map((service, index) =>
          <tr key={index}>
            <td className={service.isNew ? "bg-light align-middle text-center" : "align-middle text-center"}>
              {index + 1}
            </td>
            <td className={service.isNew ? "bg-light" : ""}>
              <Autocomplete
                inputProps={{
                  className: `"form-control custom-select " ${service.isNew ? "border border-success" : ""}`
                }}
                getItemValue={(item) => item}
                items={serviceflavours_all}
                value={service.service}
                renderItem={(item, isHighlighted) =>
                  <div
                    key={serviceflavours_all.indexOf(item)}
                    className={`metricprofiles-autocomplete-entries ${isHighlighted ?
                        "metricprofiles-autocomplete-entries-highlighted"
                        : ""}`
                    }>
                    {item ? <Icon i='serviceflavour'/> : ''} {item}
                  </div>}
                onChange={(e) => form.setFieldValue(`view_services.${index}.service`, e.target.value)}
                onSelect={(val) => {
                  form.setFieldValue(`view_services.${index}.service`, val)
                  onselect_handler(form.values.view_services[index],
                    'service',
                    val)
                }}
                wrapperStyle={{}}
                shouldItemRender={matchItem}
                renderMenu={(items) =>
                  <div className='metricprofiles-autocomplete-menu'>
                    {items}
                  </div>}
              />
            </td>
            <td className={service.isNew ? "bg-light" : ""}>
              <Autocomplete
                inputProps={{
                  className: `"form-control custom-select " ${service.isNew ? "border border-success" : ""}`
                }}
                getItemValue={(item) => item}
                items={metrics_all}
                value={service.metric}
                renderItem={(item, isHighlighted) =>
                  <div
                    key={metrics_all.indexOf(item)}
                    className={`metricprofiles-autocomplete-entries ${isHighlighted ?
                        "metricprofiles-autocomplete-entries-highlighted"
                        : ""}`
                    }>
                    {item ? <Icon i='metrics'/> : ''} {item}
                  </div>}
                onChange={(e) => form.setFieldValue(`view_services.${index}.metric`, e.target.value)}
                onSelect={(val) => {
                  form.setFieldValue(`view_services.${index}.metric`, val)
                  onselect_handler(form.values.view_services[index],
                    'metric',
                    val)
                }}
                wrapperStyle={{}}
                shouldItemRender={matchItem}
                renderMenu={(items) =>
                  <div className='metricprofiles-autocomplete-menu'>
                    {items}
                  </div>}
              />
            </td>
            <td className="align-middle pl-3">
              <Button size="sm" color="light"
                type="button"
                onClick={() => {
                  remove_handler(form.values.view_services[index]);
                  // prevent removal of last tuple
                  if (index > 0 &&
                    form.values.view_services.length > 1)
                    return remove(index)
                }}>
                <FontAwesomeIcon icon={faTimes}/>
              </Button>
              <Button size="sm" color="light"
                type="button"
                onClick={() => {
                  let new_element = {index: index + 1, service: '', metric: '', isNew: true}
                  insert_handler(new_element, index + 1, form.values.groupname, form.values.name, form.values.description)
                  return insert(index + 1, new_element)
                }}>
                <FontAwesomeIcon icon={faPlus}/>
              </Button>
            </td>
          </tr>
        )
      }
      </tbody>
    </table>


function MetricProfilesComponent(cloneview=false) {
  return class extends Component {
    constructor(props) {
      super(props);

      this.tenant_name = props.tenant_name;
      this.token = props.webapitoken;
      this.webapimetric = props.webapimetric;
      this.profile_name = props.match.params.name;
      this.addview = props.addview
      this.history = props.history;
      this.location = props.location;
      this.cloneview = cloneview;
      this.publicView = props.publicView;

      this.state = {
        metric_profile: {},
        metric_profile_name: undefined,
        metric_profile_description: undefined,
        groupname: undefined,
        list_user_groups: undefined,
        view_services: undefined,
        list_services: undefined,
        write_perm: false,
        serviceflavours_all: undefined,
        metrics_all: undefined,
        areYouSureModal: false,
        loading: false,
        modalFunc: undefined,
        modalTitle: undefined,
        modalMsg: undefined,
        searchServiceFlavour: "",
        searchMetric: "",
      }

      this.backend = new Backend();
      this.webapi = new WebApi({
        token: props.webapitoken,
        metricProfiles: props.webapimetric}
      )

      this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
      this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
      this.handleSearch = this.handleSearch.bind(this);
      this.onRemove = this.onRemove.bind(this);
      this.onInsert = this.onInsert.bind(this);
      this.onSelect = this.onSelect.bind(this);
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

    async componentDidMount() {
      this.setState({loading: true})

      if (this.publicView) {
        let json = await this.backend.fetchData(`/api/v2/internal/public_metricprofiles/${this.profile_name}`);
        let metricp = await this.webapi.fetchMetricProfile(json.apiid);
        this.setState({
          metric_profile: metricp,
          metric_profile_name: metricp.name,
          metric_profile_description: metricp.description,
          groupname: json['groupname'],
          list_user_groups: [],
          write_perm: false,
          view_services: this.flattenServices(metricp.services).sort(this.sortServices),
          serviceflavours_all: [],
          metrics_all: [],
          list_services: this.flattenServices(metricp.services).sort(this.sortServices),
          loading: false
        });
      }
      else {
        let sessionActive = await this.backend.isActiveSession();
        if (sessionActive.active) {
          let serviceflavoursall = await this.backend.fetchListOfNames('/api/v2/internal/serviceflavoursall');
          let metricsall = await this.backend.fetchListOfNames('/api/v2/internal/metricsall');
          if (!this.addview || this.cloneview) {
            let json = await this.backend.fetchData(`/api/v2/internal/metricprofiles/${this.profile_name}`);
            let metricp = await this.webapi.fetchMetricProfile(json.apiid);
            this.setState({
              metric_profile: metricp,
              metric_profile_name: metricp.name,
              metric_profile_description: metricp.description,
              groupname: json['groupname'],
              list_user_groups: sessionActive.userdetails.groups.metricprofiles,
              write_perm: sessionActive.userdetails.is_superuser ||
                sessionActive.userdetails.groups.metricprofiles.indexOf(json['groupname']) >= 0,
              view_services: this.flattenServices(metricp.services).sort(this.sortServices),
              serviceflavours_all: serviceflavoursall,
              metrics_all: metricsall,
              list_services: this.flattenServices(metricp.services).sort(this.sortServices),
              loading: false
            });
          } else {
            let empty_metric_profile = {
              id: '',
              name: '',
              services: [],
            };
            this.setState({
              metric_profile: empty_metric_profile,
              metric_profile_name: '',
              metric_profile_description: '',
              groupname: '',
              list_user_groups: sessionActive.userdetails.groups.metricprofiles,
              write_perm: sessionActive.userdetails.is_superuser ||
                sessionActive.userdetails.groups.metricprofiles.length > 0,
              view_services: [{service: '', metric: '', index: 0, isNew: true}],
              serviceflavours_all: serviceflavoursall,
              metrics_all: metricsall,
              list_services: [{service: '', metric: '', index: 0, isNew: true}],
              loading: false
            });
          };
        }
      };
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

    sortServices(a, b) {
      if (a.service.toLowerCase() < b.service.toLowerCase()) return -1;
      if (a.service.toLowerCase() > b.service.toLowerCase()) return 1;
      if (a.service.toLowerCase() === b.service.toLowerCase()) {
        if (a.metric.toLowerCase() < b.metric.toLowerCase()) return -1;
        if (a.metric.toLowerCase() > b.metric.toLowerCase()) return 1;
        if (a.metric.toLowerCase() === b.metric.toLowerCase()) return 0;
      }
    }

    handleSearch(e, statefieldlist, statefieldsearch, formikfield,
      alternatestatefield, alternateformikfield) {
      let filtered = this.state[statefieldlist.replace('view_', 'list_')]
      let tmp_list_services = [...this.state.list_services];

      if (this.state[statefieldsearch].length > e.target.value.length) {
        // handle remove of characters of search term
        filtered = this.state[statefieldlist.replace('view_', 'list_')].
          filter((elem) => matchItem(elem[formikfield], e.target.value))

        // reindex after back to full list view
        let index_update = 0
        tmp_list_services.forEach((element) => {
          element.index = index_update;
          index_update += 1;
        })

        tmp_list_services.sort(this.sortServices);
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

      filtered.sort(this.sortServices);

      this.setState({
        [`${statefieldsearch}`]: e.target.value,
        [`${statefieldlist}`]: filtered,
        list_services: tmp_list_services
      })
    }

    onInsert(element, i, group, name, description) {
      // full list of services
      if (this.state.searchServiceFlavour === ''
        && this.state.searchMetric === '') {
        let service = element.service;
        let metric = element.metric;

        let tmp_list_services = [...this.state.list_services];
        // split list into two preserving original
        let slice_left_tmp_list_services = [...tmp_list_services].slice(0, i);
        let slice_right_tmp_list_services = [...tmp_list_services].slice(i);

        slice_left_tmp_list_services.push({index: i, service, metric, isNew: true});

        // reindex first slice
        let index_update = 0;
        slice_left_tmp_list_services.forEach((element) => {
          element.index = index_update;
          index_update += 1;
        })

        // reindex rest of list
        index_update = slice_left_tmp_list_services.length;
        slice_right_tmp_list_services.forEach((element) => {
          element.index = index_update;
          index_update += 1;
        })

        // concatenate two slices
        tmp_list_services = [...slice_left_tmp_list_services, ...slice_right_tmp_list_services];

        this.setState({
          list_services: tmp_list_services,
          view_services: tmp_list_services,
          groupname: group,
          metric_profile_name: name,
          metric_profile_description: description
        });
      }
      // subset of matched elements of list of services
      else {
        let tmp_view_services = [...this.state.view_services];
        let tmp_list_services = [...this.state.list_services];

        let slice_left_view_services = [...tmp_view_services].slice(0, i)
        let slice_right_view_services = [...tmp_view_services].slice(i)

        slice_left_view_services.push({...element, isNew: true});

        let index_update = 0;
        slice_left_view_services.forEach((element) => {
          element.index = index_update;
          index_update += 1;
        })

        index_update = i + 1;
        slice_right_view_services.forEach((element) => {
          element.index = index_update;
          index_update += 1;
        })

        tmp_list_services.push({...element, isNew: true})

        this.setState({
          view_services: [...slice_left_view_services, ...slice_right_view_services],
          list_services: tmp_list_services,
        });
      }
    }

    onSubmitHandle({formValues, servicesList}, action) {
      let msg = undefined;
      let title = undefined;

      if (this.addview || this.cloneview) {
        msg = 'Are you sure you want to add Metric profile?'
        title = 'Add metric profile'
      }
      else {
        msg = 'Are you sure you want to change Metric profile?'
        title = 'Change metric profile'
      }
      this.toggleAreYouSureSetModal(msg, title,
        () => this.doChange({formValues, servicesList}, action));
    }

    groupMetricsByServices(servicesFlat) {
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

    async doChange({formValues, servicesList}, actions) {
      let services = [];
      let dataToSend = new Object()

      if (!this.addview && !this.cloneview) {
        const { id } = this.state.metric_profile
        services = this.groupMetricsByServices(servicesList);
        dataToSend = {
          id,
          name: formValues.name,
          description: formValues.description,
          services
        };
        let response = await this.webapi.changeMetricProfile(dataToSend);
        if (!response.ok) {
          let change_msg = '';
          try {
            let json = await response.json();
            let msg_list = [];
            json.errors.forEach(e => msg_list.push(e.details));
            change_msg = msg_list.join(' ');
          } catch(err) {
            change_msg = 'Web API error changing metric profile';
          };
          NotifyError({
            title: `Web API error: ${response.status} ${response.statusText}`,
            msg: change_msg
          });
        } else {
          let r = await this.backend.changeObject(
            '/api/v2/internal/metricprofiles/',
            {
              apiid: dataToSend.id,
              name: dataToSend.name,
              description: dataToSend.description,
              groupname: formValues.groupname,
              services: formValues.view_services
            }
          );
          if (r.ok)
            NotifyOk({
              msg: 'Metric profile succesfully changed',
              title: 'Changed',
              callback: () => this.history.push('/ui/metricprofiles')
            });
          else {
            let change_msg = '';
            try {
              let json = await r.json();
              change_msg = json.detail;
            } catch(err) {
              change_msg = 'Internal API error changing metric profile';
            };
            NotifyError({
              title: `Internal API error: ${r.status} ${r.statusText}`,
              msg: change_msg
            });
          };
        };
      } else {
        services = this.groupMetricsByServices(servicesList);
        dataToSend = {
          name: formValues.name,
          description: formValues.description,
          services
        }
        let response = await this.webapi.addMetricProfile(dataToSend);
        if (!response.ok) {
          let add_msg = '';
          try {
            let json = await response.json();
            let msg_list = [];
            json.errors.forEach(e => msg_list.push(e.details));
            add_msg = msg_list.join(' ');
          } catch(err) {
            add_msg = 'Web API error adding metric profile';
          };
          NotifyError({
            title: `Web API error: ${response.status} ${response.statusText}`,
            msg: add_msg
          });
        } else {
          let r_json = await response.json();
          let r_internal = await this.backend.addObject(
            '/api/v2/internal/metricprofiles/',
            {
              apiid: r_json.data.id,
              name: dataToSend.name,
              groupname: formValues.groupname,
              description: formValues.description,
              services: formValues.view_services
            }
          );
          if (r_internal.ok)
            NotifyOk({
              msg: 'Metric profile successfully added',
              title: 'Added',
              callback: () => this.history.push('/ui/metricprofiles')
            });
          else {
            let add_msg = '';
            try {
              let json = await r_internal.json();
              add_msg = json.detail;
            } catch(err) {
              add_msg = 'Internal API error adding metric profile';
            };
            NotifyError({
              title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
              msg: add_msg
            });
          }
        };
      };
    }

    async doDelete(idProfile) {
      let response = await this.webapi.deleteMetricProfile(idProfile);
      if (!response.ok) {
        let msg = '';
        try {
          let json = await response.json();
          let msg_list = [];
          json.errors.forEach(e => msg_list.push(e.details));
          msg = msg_list.join(' ');
        } catch(err) {
          msg = 'Web API error deleting metric profile';
        };
        NotifyError({
          title: `Web API error: ${response.status} ${response.statusText}`,
          msg: msg
        });
      } else {
        let r_internal = await this.backend.deleteObject(`/api/v2/internal/metricprofiles/${idProfile}`);
        if (r_internal.ok)
          NotifyOk({
            msg: 'Metric profile sucessfully deleted',
            title: 'Deleted',
            callback: () => this.history.push('/ui/metricprofiles')
          });
        else {
          let msg = '';
          try {
            let json = await r_internal.json();
            msg = json.detail;
          } catch(err) {
            msg = 'Internal API error deleting metric profile';
          };
          NotifyError({
            title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
            msg: msg
          });
        };
      };
    }

    onSelect(element, field, value) {
      let index = element.index;
      let tmp_list_services = [...this.state.list_services];
      let tmp_view_services = [...this.state.view_services];
      let new_element = tmp_list_services.findIndex(service =>
        service.index === index && service.isNew === true)

      if (new_element >= 0 )
        tmp_list_services[new_element][field] = value;
      else
        tmp_list_services[index][field] = value;

      for (var i = 0; i < tmp_view_services.length; i++)
        if (tmp_view_services[i].index === index)
          tmp_view_services[i][field] = value

      this.setState({
        list_services: tmp_list_services,
        view_services: tmp_view_services
      });
    }

    onRemove(element) {
      let tmp_view_services = []
      let tmp_list_services = []

      // XXX: this means no duplicate elements allowed
      let index = this.state.list_services.findIndex(service =>
        element.index === service.index &&
        element.service === service.service &&
        element.metric === service.metric
      );
      let index_tmp = this.state.view_services.findIndex(service =>
        element.index === service.index &&
        element.service === service.service &&
        element.metric === service.metric
      );

      // don't remove last tuple, just reset it to empty values
      if (this.state.view_services.length === 1
        && this.state.list_services.length === 1) {
        tmp_list_services = [{
          index: 0,
          service: "",
          metric: ""
        }]
        tmp_view_services = [{
          index: 0,
          service: "",
          metric: ""
        }]
      }
      else if (index >= 0 && index_tmp >= 0) {
        tmp_list_services = [...this.state.list_services]
        tmp_view_services = [...this.state.view_services]
        tmp_list_services.splice(index, 1)
        tmp_view_services.splice(index_tmp, 1)

        // reindex rest of list
        for (var i = index; i < tmp_list_services.length; i++) {
          let element_index = tmp_list_services[i].index
          tmp_list_services[i].index = element_index - 1;
        }

        for (var i = index_tmp; i < tmp_view_services.length; i++) {
          let element_index = tmp_view_services[i].index
          tmp_view_services[i].index = element_index - 1;
        }
      }
      this.setState({
        list_services: tmp_list_services,
        view_services: tmp_view_services
      });
    }

    render() {
      const {write_perm, loading, metric_profile_description, view_services,
        groupname, list_user_groups, serviceflavours_all, metrics_all,
        searchMetric, searchServiceFlavour} = this.state;
      let {metric_profile, metric_profile_name} = this.state

      if (this.cloneview && metric_profile && metric_profile_name && metric_profile.id) {
        metric_profile.id = ''
        metric_profile_name = 'Cloned ' + metric_profile_name
      }

      if (loading)
        return (<LoadingAnim />)

      else if (!loading && metric_profile && view_services) {
        return (
          <BaseArgoView
            resourcename='Metric profile'
            location={this.location}
            addview={this.addview}
            modal={true}
            cloneview={this.cloneview}
            clone={true}
            state={this.state}
            toggle={this.toggleAreYouSure}
            addview={this.publicView ? !this.publicView : this.addview}
            publicview={this.publicView}
            submitperm={write_perm}>
            <Formik
              initialValues = {{
                id: metric_profile.id,
                name: metric_profile_name,
                description: metric_profile_description,
                groupname: groupname,
                view_services: view_services,
                search_metric: searchMetric,
                search_serviceflavour: searchServiceFlavour
              }}
              onSubmit = {(values, actions) => this.onSubmitHandle({
                formValues: values,
                servicesList: this.state.list_services
              }, actions)}
              enableReinitialize={true}
              validationSchema={MetricProfilesSchema}
              render = {props => (
                <Form>
                  <ProfileMainInfo
                    {...props}
                    description="description"
                    grouplist={
                      write_perm ?
                        list_user_groups
                      :
                        [groupname]
                    }
                    profiletype='metric'
                  />
                  <h4 className="mt-4 alert-info p-1 pl-3 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>Metric instances</h4>
                  <FieldArray
                    name="view_services"
                    render={props => (
                      <ServicesList
                        {...props}
                        serviceflavours_all={serviceflavours_all}
                        metrics_all={metrics_all}
                        search_handler={this.handleSearch}
                        remove_handler={this.onRemove}
                        insert_handler={this.onInsert}
                        onselect_handler={this.onSelect}
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
}

export class MetricProfilesList extends Component
{
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_metricprofiles: null,
      write_perm: false
    }

    this.location = props.location;
    this.backend = new Backend();
    this.publicView = props.publicView

    if (this.publicView)
      this.apiUrl = '/api/v2/internal/public_metricprofiles'
    else
      this.apiUrl = '/api/v2/internal/metricprofiles'
  }

  async componentDidMount() {
    this.setState({loading: true})
    let json = await this.backend.fetchData(this.apiUrl);
    if (!this.publicView) {
      let session = await this.backend.isActiveSession();
      this.setState({
        list_metricprofiles: json,
        loading: false,
        write_perm: session.userdetails.is_superuser || session.userdetails.groups.metricprofiles.length > 0
      });
    } else {
      this.setState({
        list_metricprofiles: json,
        loading: false
      })
    }
  }

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name',
        maxWidth: 350,
        accessor: e =>
          <Link to={`/ui/${this.publicView ? 'public_' : ''}metricprofiles/` + e.name}>
            {e.name}
          </Link>
      },
      {
        Header: 'Description',
        accessor: 'description',
      },
      {
        Header: 'Group',
        accessor: 'groupname',
        className: 'text-center',
        maxWidth: 150,
      }
    ]
    const {loading, list_metricprofiles, write_perm} = this.state;

    if (loading)
      return (<LoadingAnim />)

    else if (!loading && list_metricprofiles) {
      return (
        <BaseArgoView
          resourcename='metric profile'
          location={this.location}
          listview={true}
          addnew={!this.publicView}
          addperm={write_perm}
          publicview={this.publicView}>
          <ReactTable
            data={list_metricprofiles}
            columns={columns}
            className="-highlight"
            defaultPageSize={12}
            rowsText='profiles'
            getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
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
    list1.push(`service: ${item1[i]['service']}, metric: ${item1[i]['metric']}`)
  }

  for (let i = 0; i < item2.length; i++) {
    list2.push(`service: ${item2[i]['service']}, metric: ${item2[i]['metric']}`)
  }

  return (
    <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
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


export class MetricProfileVersionCompare extends Component {
  constructor(props) {
    super(props);

    this.version1 = props.match.params.id1;
    this.version2 = props.match.params.id2;
    this.name = props.match.params.name;

    this.state = {
      loading: false,
      name1: '',
      groupname1: '',
      metricinstances1: [],
      name2: '',
      groupname2: '',
      metricinstances2: []
    };

    this.backend = new Backend();
  }

  async componentDidMount() {
    this.setState({loading: true});

    let json = await this.backend.fetchData(`/api/v2/internal/tenantversion/metricprofile/${this.name}`);
    let name1 = '';
    let groupname1 = '';
    let description1 = '';
    let metricinstances1 = [];
    let name2 = '';
    let groupname2 = '';
    let description2 = '';
    let metricinstances2 = [];

    json.forEach((e) => {
      if (e.version == this.version1) {
        name1 = e.fields.name;
        description1 = e.fields.description;
        groupname1 = e.fields.groupname;
        metricinstances1 = e.fields.metricinstances;
      } else if (e.version == this.version2) {
        name2 = e.fields.name;
        groupname2 = e.fields.groupname;
        description2 = e.fields.description;
        metricinstances2 = e.fields.metricinstances;
      }
    });

    this.setState({
      name1: name1,
      groupname1: groupname1,
      description1: description1,
      metricinstances1: metricinstances1,
      name2: name2,
      description2: description2,
      groupname2: groupname2,
      metricinstances2: metricinstances2,
      loading: false
    });
  }

  render() {
    const { name1, name2, description1, description2, groupname1, groupname2,
      metricinstances1, metricinstances2, loading } = this.state;

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
            (name1 !== name2) &&
              <DiffElement title='name' item1={name1} item2={name2}/>
          }
          {
            (description1 !== description2) &&
              <DiffElement title='name' item1={description1} item2={description2}/>
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
}


export class MetricProfileVersionDetails extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.version = props.match.params.version;

    this.backend = new Backend();

    this.state = {
      name: '',
      groupname: '',
      description: '',
      date_created: '',
      metricinstances: [],
      loading: false
    };
  }

  async componentDidMount() {
    this.setState({loading: true});

    let json = await this.backend.fetchData(`/api/v2/internal/tenantversion/metricprofile/${this.name}`);
    json.forEach((e) => {
      if (e.version == this.version)
        this.setState({
          name: e.fields.name,
          groupname: e.fields.groupname,
          description: e.fields.description,
          date_created: e.date_created,
          metricinstances: e.fields.metricinstances,
          loading: false
        });
    });
  }

  render() {
    const { name, description, groupname, date_created, metricinstances,
      loading } = this.state;

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
              description: description,
              groupname: groupname,
              metricinstances: metricinstances
            }}
            render = {props => (
              <Form>
                <ProfileMainInfo
                  {...props}
                  fieldsdisable={true}
                  description='description'
                  profiletype='metric'
                />
                <h4 className="mt-4 alert-info p-1 pl-3 text-light text-uppercase rounded" style={{'backgroundColor': "#416090"}}>Metric instances</h4>
                <FieldArray
                  name='metricinstances'
                  render={arrayHelpers => (
                    <table className='table table-bordered table-sm'>
                      <thead className='table-active'>
                        <tr>
                          <th className='align-middle text-center' style={{width: '5%'}}>#</th>
                          <th style={{width: '47.5%'}}><Icon i='serviceflavour'/>Service flavour</th>
                          <th style={{width: '47.5%'}}><Icon i='metrics'/>Metric</th>
                        </tr>
                      </thead>
                      <tbody>
                        {
                          props.values.metricinstances.map((service, index) =>
                            <tr key={index}>
                              <td className='align-middle text-center'>{index + 1}</td>
                              <td>{service.service}</td>
                              <td>{service.metric}</td>
                            </tr>
                          )
                        }
                      </tbody>
                    </table>
                  )}
                />
              </Form>
            )}
          />
        </BaseArgoView>
      )
    } else
      return null;
  }
}
