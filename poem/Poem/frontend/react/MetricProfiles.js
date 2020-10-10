import React, { Component, useState, useMemo } from 'react';
import {Link} from 'react-router-dom';
import {Backend, WebApi} from './DataManager';
import Autosuggest from 'react-autosuggest';
import {
  LoadingAnim,
  BaseArgoView,
  SearchField,
  FancyErrorMessage,
  NotifyOk,
  Icon,
  DiffElement,
  ProfileMainInfo,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  ProfilesListTable
} from './UIElements';
import { Formik, Field, FieldArray, Form } from 'formik';
import { Button } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import ReactDiffViewer from 'react-diff-viewer';
import { useQuery } from 'react-query';

import './MetricProfiles.css';


export const MetricProfilesClone = (props) => <MetricProfilesComponent cloneview={true} {...props}/>;
export const MetricProfilesChange = (props) => <MetricProfilesComponent {...props}/>;


function matchItem(item, value) {
  return item.toLowerCase().indexOf(value.toLowerCase()) !== -1;
}


const MetricProfileAutocompleteField = ({suggestions, service, index, onselect, icon, form, tupleType, id}) => {
  const [suggestionList, setSuggestions] = useState(suggestions)

  const changeFieldValue = (newValue) => {
    form.setFieldValue(`view_services.${index}.${tupleType}`, newValue)
    form.setFieldValue(`view_services.${index}.${tupleType}Changed`, true)
    onselect(form.values.view_services[index],
      tupleType,
      newValue)
  }

  return (
    <Autosuggest
      inputProps={{
        className: `"form-control custom-select " ${service.isNew ? "border border-success" : service[tupleType + 'Changed'] ? "border border-danger" : ""}`,
        placeholder: '',
        onChange: (_, {newValue}) => changeFieldValue(newValue),
        value: service[tupleType]
      }}
      getSuggestionValue={(suggestion) => suggestion}
      suggestions={suggestionList}
      renderSuggestion={(suggestion, {query, isHighlighted}) =>
        <div
          key={suggestions.indexOf(suggestion)}
          className={`metricprofiles-autocomplete-entries ${isHighlighted ?
              "metricprofiles-autocomplete-entries-highlighted"
              : ""}`
          }>
          {suggestion ? <Icon i={icon}/> : ''} {suggestion}
        </div>}
      onSuggestionsFetchRequested={({ value }) =>
        {
          let result = suggestions.filter(service => service.toLowerCase().includes(value.trim().toLowerCase()))
          setSuggestions(result)
      }
      }
      onSuggestionsClearRequested={() => {
        setSuggestions([])
      }}
      onSuggestionSelected={(_, {suggestion}) => changeFieldValue(suggestion) }
      shouldRenderSuggestions={() => true}
      theme={{
        containerOpen: 'metricprofiles-autocomplete-menu',
        suggestionsList: 'metricprofiles-autocomplete-list'
      }}
      id={id}
    />
  )
}


const MetricProfileTupleValidate = ({view_services, name, groupname,
  metrics_all, services_all}) => {
  let errors = new Object()
  let found = false
  let empty = false
  errors.view_services = new Array(view_services.length)

  // find duplicates
  for (var i of view_services)
    for (var j of view_services)
      if (i.index !== j.index &&
          i.service === j.service &&
          i.metric === j.metric &&
          (i.isNew || i.serviceChanged
           || i.metricChanged)) {
        errors.view_services[i.index] = new Object()
        errors.view_services[i.index].dup = "Duplicated"
        found = true
      }

  // empty essential metadata
  if (!name) {
    errors.name = 'Required'
    empty = true
  }
  if (!groupname) {
    errors.groupname = 'Required'
    empty = true
  }

  // find new empty tuples
  for (var i of view_services) {
    let obj = undefined
    if (!errors.view_services[i.index])
      errors.view_services[i.index] = new Object()
    obj = errors.view_services[i.index]

    if (!i.service && i.isNew) {
      obj.service = "Required"
      empty = true
    }
    else if (i.service &&
      (i.isNew || i.serviceChanged) &&
      services_all.indexOf(i.service) == -1) {
      obj.service = "Must be one of predefined service types"
      empty = true
    }
    if (!i.metric && i.isNew) {
      obj.metric = "Required"
      empty = true
    }
    else if (i.metric &&
      (i.isNew || i.metricChanged) &&
      metrics_all.indexOf(i.metric) == -1) {
      obj.metric = "Must be one of predefined metrics"
      empty = true
    }
  }

  if (found || empty)
    return errors
  else
    return new Object()
}


const ServicesList = ({serviceflavours_all, metrics_all, search_handler,
  remove_handler, insert_handler, onselect_handler, form, remove, insert}) => (
    <table className="table table-bordered table-sm table-hover">
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
          <React.Fragment key={index}>
            <tr key={index}>
              <td className={service.isNew ? "bg-light align-middle text-center" : "align-middle text-center"}>
                {index + 1}
              </td>
              <td className={service.isNew ? "bg-light" : ""}>
                <MetricProfileAutocompleteField
                  suggestions={serviceflavours_all}
                  service={service}
                  index={index}
                  icon='serviceflavour'
                  onselect={onselect_handler}
                  form={form}
                  tupleType='service'
                  id={`autosuggest-metric-${index}`}/>
                {
                  form.errors && form.errors.view_services && form.errors.view_services[index]
                    ? form.errors.view_services[index].service
                      ? FancyErrorMessage(form.errors.view_services[index].service)
                      : null
                    : null
                }
              </td>
              <td className={service.isNew ? "bg-light" : ""}>
                <MetricProfileAutocompleteField
                  suggestions={metrics_all}
                  service={service}
                  index={index}
                  icon='metrics'
                  onselect={onselect_handler}
                  form={form}
                  tupleType='metric'
                  id={`autosuggest-metric-${index}`}
                />
                {
                  form.errors && form.errors.view_services && form.errors.view_services[index]
                    ? form.errors.view_services[index].metric
                      ? FancyErrorMessage(form.errors.view_services[index].metric)
                      : null
                    : null
                }
              </td>
              <td className={service.isNew ? "bg-light align-middle pl-3" : "align-middle pl-3"}>
                <Button size="sm" color="light"
                  type="button"
                  onClick={() => {
                    remove_handler(form.values.view_services[index],
                      form.values.groupname, form.values.name,
                      form.values.description);
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
            {
              form.errors && form.errors.view_services && form.errors.view_services[index]
                ? form.errors.view_services[index].dup
                  ?
                    <tr key={index + form.values.view_services.length}>
                      <td className="bg-light"></td>
                      <td colSpan="2" className="bg-light text-center">
                        {FancyErrorMessage(form.errors.view_services[index].dup)}
                      </td>
                      <td className="bg-light"></td>
                    </tr>
                  : null
                : null
            }
          </React.Fragment>
        )
      }
      </tbody>
    </table>
)


export const MetricProfilesComponent = (props) => {
  const tenant_name = props.tenant_name;
  const token = props.webapitoken;
  const webapimetric = props.webapimetric;
  const profile_name = props.match.params.name;
  const addview = props.addview
  const history = props.history;
  const location = props.location;
  const cloneview = cloneview;
  const publicView = props.publicView;
  const backend = new Backend();
  const webapi = new WebApi({
        token: props.webapitoken,
        metricProfiles: props.webapimetric}
      )

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [groupname, setGroupname] = useState(undefined);
  const [listServices, setListServices] = useState(undefined);
  const [listUserGroups, setListUserGroups] = useState(undefined);
  const [metricProfileDescription, setMetricProfileDescription] = useState(undefined);
  const [metricProfileName, setMetricProfileName] = useState(undefined);
  const [modalFunc, setModalFunc] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [onYes, setOnYes] = useState('')
  const [searchMetric, setSearchMetric] = useState("");
  const [searchServiceFlavour, setSearchServiceFlavour] = useState("");
  const [viewServices, setViewServices] = useState(undefined);
  // TODO: useFormik hook with formik 2.x
  const [formikValues, setFormikValues] = useState({})
  const querykey = `metricprofiles_${addview ? 'addview' : `${profile_name}_${publicView ? 'publicview' : 'changeview'}`}`;

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    `session_userdetails`, async () => {
      const sessionActive = await backend.isActiveSession()
      if (sessionActive.active) {
        return sessionActive.userdetails
      }
    }
  );

  const { data: serviceFlavoursAll, error: errorServiceFlavoursAll, isloading: loadingServiceFlavoursAll} = useQuery(
    'metricprofiles_serviceflavoursall', async() => {
        let data = await backend.fetchListOfNames('/api/v2/internal/serviceflavoursall');
        return data
    }
  )

  const { data: backendMetricProfiles, error: errorBackendMetricProfiles, isloading: loadingBackendMetricProfiles} = useQuery(
    'metricprofiles_backend', async () => {
      try {
        let json = await backend.fetchData(`/api/v2/internal/metricprofiles/${profile_name}`);
        return json
      }
      catch (e) {
        return new Object()
      }
    }
  )

  const { data: metricsAll, error: errorMetricsAll, isloading: loadingMetricsAll} = useQuery(
    'metricprofiles_metricsall', async() => {
        let data = await backend.fetchListOfNames('/api/v2/internal/metricsall');
        return data
    }
  )

  const { data: metricProfile, error: errorMetricProfile, isLoading:
    loadingMetricProfile } = useQuery(querykey, async () => {
      if (publicView) {
        let json = await backend.fetchData(`/api/v2/internal/public_metricprofiles/${profile_name}`);
        let metricProfile = await webapi.fetchMetricProfile(json.apiid);
        return metricProfile;
      }
      else {
        if (!addview || cloneview) {
          let json = await backend.fetchData(`/api/v2/internal/metricprofiles/${profile_name}`);
          let metricProfile = await webapi.fetchMetricProfile(json.apiid);
          return metricProfile
        }
        else {
          let metricProfile = new Object({
            id: '',
            name: '',
            services: [],
          });
          return metricProfile;
        }
      }
    },
    {
      enabled: backendMetricProfiles
    }
  )

  const onInsert = async (element, i, group, name, description) => {
    // full list of services
    if (searchServiceFlavour === '' && searchMetric === '') {
      let service = element.service;
      let metric = element.metric;

      let tmp_list_services = [...listServices];
      // split list into two preserving original
      let slice_left_tmp_list_services = [...tmp_list_services].slice(0, i);
      let slice_right_tmp_list_services = [...tmp_list_services].slice(i);

      slice_left_tmp_list_services.push({index: i, service, metric, isNew: true});

      // reindex first slice
      slice_left_tmp_list_services = ensureAlignedIndexes(slice_left_tmp_list_services)

      // reindex rest of list
      let index_update = slice_left_tmp_list_services.length;
      slice_right_tmp_list_services.forEach((element) => {
        element.index = index_update;
        index_update += 1;
      })

      // concatenate two slices
      tmp_list_services = [...slice_left_tmp_list_services, ...slice_right_tmp_list_services];

      setListServices(tmp_list_services);
      setViewServices(tmp_list_services);
      setGroupname(group);
      setMetricProfileName(name);
      setMetricProfileDescription(description);
    }
    // subset of matched elements of list of services
    else {
      let tmp_view_services = [...viewServices];
      let tmp_list_services = [...listServices];

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

      setViewServices([...slice_left_view_services, ...slice_right_view_services]);
      setListServices(tmp_list_services);
    }
  }

  const handleSearch = (e, statefieldlist, statefieldsearch, formikfield,
    alternatestatefield, alternateformikfield) => {
    let filtered = listServices;
    let tmp_list_services = [...listServices];
    let searchWhat = statefieldsearch

    if (statefieldsearch === 'searchServiceFlavour')
      statefieldsearch = searchServiceFlavour
    else if (statefieldsearch === 'searchMetric')
      statefieldsearch = searchMetric

    if (statefieldsearch.length > e.target.value.length) {
      // handle remove of characters of search term
      filtered = listServices.filter((elem) => matchItem(elem[formikfield], e.target.value))

      tmp_list_services.sort(sortServices);
      tmp_list_services = ensureAlignedIndexes(tmp_list_services)
    }
    else if (e.target.value !== '') {
      filtered = listServices.filter((elem) =>
        matchItem(elem[formikfield], e.target.value))
    }

    if (alternatestatefield === 'searchServiceFlavour')
      alternatestatefield = searchServiceFlavour
    else if (alternatestatefield === 'searchMetric')
      alternatestatefield = searchMetric

    // handle multi search
    if (alternatestatefield.length) {
      filtered = filtered.filter((elem) =>
        matchItem(elem[alternateformikfield], alternatestatefield))
    }

    filtered.sort(sortServices);

    if (searchWhat === 'searchServiceFlavour')
      setSearchServiceFlavour(e.target.value);
    else if (searchWhat === 'searchMetric')
      setSearchMetric(e.target.value);

    setViewServices(filtered);
    setListServices(tmp_list_services);
  }

  const doDelete = async (idProfile) => {
    let response = await webapi.deleteMetricProfile(idProfile);
    if (!response.ok) {
      let msg = '';
      try {
        let json = await response.json();
        let msg_list = [];
        json.errors.forEach(e => msg_list.push(e.details));
        msg = msg_list.join(' ');
      } catch(err) {
        msg = 'Web API error deleting metric profile';
      }
      NotifyError({
        title: `Web API error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    } else {
      let r_internal = await backend.deleteObject(`/api/v2/internal/metricprofiles/${idProfile}`);
      if (r_internal.ok)
        NotifyOk({
          msg: 'Metric profile sucessfully deleted',
          title: 'Deleted',
          callback: () => history.push('/ui/metricprofiles')
        });
      else {
        let msg = '';
        try {
          let json = await r_internal.json();
          msg = json.detail;
        } catch(err) {
          msg = 'Internal API error deleting metric profile';
        }
        NotifyError({
          title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
          msg: msg
        });
      }
    }
  }

  const onRemove = async (element, group, name, description) => {
    let tmp_view_services = []
    let tmp_list_services = []
    let index = undefined
    let index_tmp = undefined

    // special case when duplicates are result of explicit add of duplicated
    // tuple followed by immediate delete of it
    let dup_list = listServices.filter(service =>
      element.service === service.service &&
      element.metric === service.metric
    )
    let dup_view = viewServices.filter(service =>
      element.service === service.service &&
      element.metric === service.metric
    )
    let dup = dup_list.length >= 2 || dup_view.length >= 2 ? true : false

    if (dup) {
      // search by index also
      index = listServices.findIndex(service =>
        element.index === service.index &&
        element.service === service.service &&
        element.metric === service.metric
      );
      index_tmp = viewServices.findIndex(service =>
        element.index === service.index &&
        element.service === service.service &&
        element.metric === service.metric
      );
    }
    else {
      index = listServices.findIndex(service =>
        element.service === service.service &&
        element.metric === service.metric
      );
      index_tmp = viewServices.findIndex(service =>
        element.service === service.service &&
        element.metric === service.metric
      );
    }

    // don't remove last tuple, just reset it to empty values
    if (viewServices.length === 1
      && listServices.length === 1) {
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
      tmp_list_services = [...listServices]
      tmp_view_services = [...viewServices]
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
    else {
      tmp_list_services = [...listServices]
      tmp_view_services = [...viewServices]
    }
    setListServices(ensureAlignedIndexes(tmp_list_services));
    setViewServices(ensureAlignedIndexes(tmp_view_services));
    setGroupname(group);
    setMetricProfileName(name);
    setMetricProfileDescription(description);
  }

  const onSelect = (element, field, value) => {
    let index = element.index;
    let tmp_list_services = [...listServices];
    let tmp_view_services = [...viewServices];
    let new_element = tmp_list_services.findIndex(service =>
      service.index === index && service.isNew === true)

    if (new_element >= 0 ) {
      tmp_list_services[new_element][field] = value;
      tmp_list_services[new_element][field + 'Changed'] = value;
    }
    else {
      tmp_list_services[index][field] = value;
      tmp_list_services[index][field + 'Changed'] = value;
    }

    for (var i = 0; i < tmp_view_services.length; i++)
      if (tmp_view_services[i].index === index) {
        tmp_view_services[i][field] = value
        tmp_view_services[i][field + 'Changed'] = true
      }

    setListServices(tmp_list_services);
    setViewServices(tmp_view_services);
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

  const doChange = async ({formValues, servicesList}) => {
    let services = [];
    let dataToSend = new Object()

    if (!addview && !cloneview) {
      const { id } = metricProfile
      services = groupMetricsByServices(servicesList);
      dataToSend = {
        id,
        name: formValues.name,
        description: formValues.description,
        services
      };
      let response = await webapi.changeMetricProfile(dataToSend);
      if (!response.ok) {
        let change_msg = '';
        try {
          let json = await response.json();
          let msg_list = [];
          json.errors.forEach(e => msg_list.push(e.details));
          change_msg = msg_list.join(' ');
        } catch(err) {
          change_msg = 'Web API error changing metric profile';
        }
        NotifyError({
          title: `Web API error: ${response.status} ${response.statusText}`,
          msg: change_msg
        });
      } else {
        let r = await backend.changeObject(
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
            callback: () => history.push('/ui/metricprofiles')
          });
        else {
          let change_msg = '';
          try {
            let json = await r.json();
            change_msg = json.detail;
          } catch(err) {
            change_msg = 'Internal API error changing metric profile';
          }
          NotifyError({
            title: `Internal API error: ${r.status} ${r.statusText}`,
            msg: change_msg
          });
        }
      }
    } else {
      services = groupMetricsByServices(servicesList);
      dataToSend = {
        name: formValues.name,
        description: formValues.description,
        services
      }
      let response = await webapi.addMetricProfile(dataToSend);
      if (!response.ok) {
        let add_msg = '';
        try {
          let json = await response.json();
          let msg_list = [];
          json.errors.forEach(e => msg_list.push(e.details));
          add_msg = msg_list.join(' ');
        } catch(err) {
          add_msg = 'Web API error adding metric profile';
        }
        NotifyError({
          title: `Web API error: ${response.status} ${response.statusText}`,
          msg: add_msg
        });
      } else {
        let r_json = await response.json();
        let r_internal = await backend.addObject(
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
            callback: () => history.push('/ui/metricprofiles')
          });
        else {
          let add_msg = '';
          try {
            let json = await r_internal.json();
            add_msg = json.detail;
          } catch(err) {
            add_msg = 'Internal API error adding metric profile';
          }
          NotifyError({
            title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
            msg: add_msg
          });
        }
      }
    }
  }

  const flattenServices = (services) => {
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

  const sortServices = (a, b) => {
    if (a.service.toLowerCase() < b.service.toLowerCase()) return -1;
    if (a.service.toLowerCase() > b.service.toLowerCase()) return 1;
    if (a.service.toLowerCase() === b.service.toLowerCase()) {
      if (a.metric.toLowerCase() < b.metric.toLowerCase()) return -1;
      if (a.metric.toLowerCase() > b.metric.toLowerCase()) return 1;
      if (a.metric.toLowerCase() === b.metric.toLowerCase()) return 0;
    }
  }

  const ensureAlignedIndexes = (list) => {
    let i = 0

    list.forEach(e => {
      e.index = i
      i += 1
    })

    return list
  }

  const onSubmitHandle = async ({formValues, servicesList}) => {
    let msg = undefined;
    let title = undefined;

    if (addview || cloneview) {
      msg = 'Are you sure you want to add Metric profile?'
      title = 'Add metric profile'
    }
    else {
      msg = 'Are you sure you want to change Metric profile?'
      title = 'Change metric profile'
    }
    setAreYouSureModal(!areYouSureModal);
    setModalMsg(msg)
    setModalTitle(title)
    setOnYes('change')
    setFormikValues(formValues)
    setListServices(servicesList)
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(formikValues.id);
    else if (onYes === 'change')
      doChange({
          formValues: formikValues,
          servicesList: listServices
        }
      );
  }

  if (loadingMetricProfile || loadingUserDetails || loadingServiceFlavoursAll
    || loadingMetricsAll || loadingBackendMetricProfiles)
    return (<LoadingAnim />)

  else if (errorMetricProfile)
    return (<ErrorComponent error={errorMetricProfile}/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (errorMetricsAll)
    return (<ErrorComponent error={errorMetricsAll}/>);

  else if (errorServiceFlavoursAll)
    return (<ErrorComponent error={errorServiceFlavoursAll}/>);

  else if (!loadingMetricProfile && !loadingUserDetails &&
    !loadingBackendMetricProfiles && metricProfile &&
    backendMetricProfiles && serviceFlavoursAll && metricsAll)
  {
    let write_perm = undefined

    if (metricProfile && publicView && !listServices && !viewServices) {
      setMetricProfileName(metricProfile.name);
      setMetricProfileDescription(metricProfile.description);
      setGroupname(backendMetricProfiles['groupname']);
      setViewServices(flattenServices(metricProfile.services).sort(sortServices));
      setListServices(flattenServices(metricProfile.services).sort(sortServices));
    }
    else if (metricProfile && (!addview || !cloneview) && !listServices && !viewServices) {
      setMetricProfileName(metricProfile.name);
      setMetricProfileDescription(metricProfile.description);
      setGroupname(backendMetricProfiles['groupname']);
      setViewServices(ensureAlignedIndexes(flattenServices(metricProfile.services).sort(sortServices)));
      setListServices(ensureAlignedIndexes(flattenServices(metricProfile.services).sort(sortServices)));
    }
    else if (metricProfile && !listServices && !viewServices) {
      setMetricProfileName('');
      setMetricProfileDescription('');
      setGroupname('');
      setViewServices([{service: '', metric: '', index: 0, isNew: true}]);
      setListServices([{service: '', metric: '', index: 0, isNew: true}]);
    }

    if (publicView) {
      write_perm = false
    }
    else if (!addview || !cloneview) {
      write_perm = userDetails.is_superuser ||
            userDetails.groups.metricprofiles.indexOf(backendMetricProfiles['groupname']) >= 0;
    }
    else {
      write_perm = userDetails.is_superuser ||
        userDetails.groups.metricprofiles.length > 0;
    }

    return (
      <BaseArgoView
        resourcename={publicView ? 'Metric profile details' : 'metric profile'}
        location={location}
        addview={addview}
        modal={true}
        cloneview={cloneview}
        clone={true}
        history={!publicView}
        state={{areYouSureModal, 'modalFunc': onYesCallback, modalTitle, modalMsg}}
        toggle={() => setAreYouSureModal(!areYouSureModal)}
        addview={publicView ? !publicView : addview}
        publicview={publicView}
        submitperm={write_perm}>
        <Formik
          initialValues = {{
            id: metricProfile.id,
            name: metricProfileName,
            description: metricProfileDescription,
            groupname: groupname,
            view_services: viewServices,
            search_metric: searchMetric,
            search_serviceflavour: searchServiceFlavour,
            metrics_all: metricsAll,
            services_all: serviceFlavoursAll
          }}
          onSubmit = {(values, actions) => onSubmitHandle({
            formValues: values,
            servicesList: listServices
          }, actions)}
          enableReinitialize={true}
          validate={MetricProfileTupleValidate}
          render = {props => (
            <Form>
              <ProfileMainInfo
                {...props}
                description="description"
                grouplist={
                  write_perm ?
                    userDetails.groups.metricprofiles
                  :
                    [groupname]
                }
                profiletype='metric'
                fieldsdisable={publicView}
              />
              <ParagraphTitle title='Metric instances'/>
              {
                !publicView ?
                  <FieldArray
                    name="view_services"
                    render={props => (
                      <ServicesList
                        {...props}
                        serviceflavours_all={serviceFlavoursAll}
                        metrics_all={metricsAll}
                        search_handler={handleSearch}
                        remove_handler={onRemove}
                        insert_handler={onInsert}
                        onselect_handler={onSelect}
                      />)}
                  />
                :
                  <FieldArray
                    name='metricinstances'
                    render={() => (
                      <table className='table table-bordered table-sm'>
                        <thead className='table-active'>
                          <tr>
                            <th className='align-middle text-center' style={{width: '5%'}}>#</th>
                            <th style={{width: '47.5%'}}><Icon i='serviceflavour'/>Service flavour</th>
                            <th style={{width: '47.5%'}}><Icon i='metrics'/>Metric</th>
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
                                onChange={(e) => handleSearch(e, 'view_services',
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
                                onChange={(e) => handleSearch(e, 'view_services', 'searchMetric',
                                  'metric', 'searchServiceFlavour', 'service')}
                                component={SearchField}
                              />
                            </td>
                          </tr>
                          {
                            props.values.view_services.map((service, index) =>
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
              }
              {
                (write_perm) &&
                  <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                    <Button
                      color="danger"
                      onClick={() => {
                        setModalMsg('Are you sure you want to delete Metric profile?')
                        setModalTitle('Delete metric profile')
                        setAreYouSureModal(!areYouSureModal);
                        setFormikValues(props.values)
                        setOnYes('delete')
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


export const MetricProfilesList = (props) => {
  const location = props.location;
  const backend = new Backend();
  const publicView = props.publicView

  let apiUrl = null;
  if (publicView)
    apiUrl = '/api/v2/internal/public_metricprofiles'
  else
    apiUrl = '/api/v2/internal/metricprofiles'

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    `session_userdetails`, async () => {
      const sessionActive = await backend.isActiveSession()
      if (sessionActive.active) {
        return sessionActive.userdetails
      }
    }
  );

  const { data: listMetricProfiles, error: errorListMetricProfiles, isLoading: loadingListMetricProfiles} = useQuery(
    `metricprofiles_listview`, async () => {
      const fetched = await backend.fetchData(apiUrl)

      return fetched
    }
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
        <Link to={`/ui/${publicView ? 'public_' : ''}metricprofiles/` + e.name}>
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
  ])

  if (loadingUserDetails || loadingListMetricProfiles)
    return (<LoadingAnim />)

  else if (errorListMetricProfiles)
    return (<ErrorComponent error={errorListMetricProfiles}/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (!loadingUserDetails && !loadingUserDetails && listMetricProfiles) {
    return (
      <BaseArgoView
        resourcename='metric profile'
        location={location}
        listview={true}
        addnew={!publicView}
        addperm={publicView ? false : userDetails.is_superuser || userDetails.groups.metricprofiles.length > 0}
        publicview={publicView}>
        <ProfilesListTable
          data={listMetricProfiles}
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
      metricinstances2: [],
      error: null
    };

    this.backend = new Backend();
  }

  async componentDidMount() {
    this.setState({loading: true});

    try {
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
    } catch(err) {
      this.setState({
        error: err,
        loading: false
      });
    }
  }

  render() {
    const { name1, name2, description1, description2, groupname1, groupname2,
      metricinstances1, metricinstances2, loading, error } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    if (error)
      return (<ErrorComponent error={error}/>);

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
      loading: false,
      error: null
    };
  }

  async componentDidMount() {
    this.setState({loading: true});

    try {
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
    } catch(err) {
      this.setState({
        error: err,
        loading: false
      });
    }
  }

  render() {
    const { name, description, groupname, date_created, metricinstances,
      loading, error } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (error)
      return (<ErrorComponent error={error}/>);

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
                <ParagraphTitle title='Metric instances'/>
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
