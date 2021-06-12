import React, { useState } from 'react';
import { Backend, WebApi } from './DataManager';

import { useQuery } from 'react-query';
import {
  BaseArgoTable,
  BaseArgoView,
  DropDown,
  ErrorComponent,
  FancyErrorMessage,
  LoadingAnim,
  NotifyError,
  NotifyOk,
  ParagraphTitle,
 } from './UIElements';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { Formik, Field, FieldArray, Form } from 'formik';
import {
  Button,
  FormGroup,
  Row,
  Col,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  InputGroup,
  InputGroupAddon,
  FormText,
  Label
} from 'reactstrap';
import { CustomReactSelect } from './UIElements';
import * as Yup from 'yup';


const ReportsSchema = Yup.object().shape({
  name: Yup.string().required('Required'),
  groupname: Yup.string().required('Required'),
  topologyType: Yup.string().required('Required'),
  availabilityThreshold: Yup.string().required('Required'),
  reliabilityThreshold: Yup.string().required('Required'),
  downtimeThreshold: Yup.string().required('Required'),
  unknownThreshold: Yup.string().required('Required'),
  uptimeThreshold: Yup.string().required('Required'),
  metricProfile: Yup.string().required('Required'),
  aggregationProfile: Yup.string().required('Required'),
  operationsProfile: Yup.string().required('Required'),
})

export const ReportsAdd = (props) => <ReportsComponent addview={true} {...props}/>;
export const ReportsChange = (props) => <ReportsComponent {...props}/>;


export const ReportsList = (props) => {
  const location = props.location;
  const backend = new Backend();
  // TODO: add public API endpoints
  let apiUrl = '/api/v2/internal/reports'

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    `session_userdetails`, async () => {
      const sessionActive = await backend.isActiveSession()
      if (sessionActive.active) {
        return sessionActive.userdetails
      }
    }
  );

  const { data: listReports, error: error, isLoading: loading } = useQuery(
    'reports_listview', async () => {
      let json = await backend.fetchData(apiUrl);
      let reports = [];
      json.forEach(e => reports.push({
        'name': e.name,
        'description': e.description,
        'disabled': e.disabled,
        'group': e.groupname
      }))

      return reports;
    },
    {
      enabled: userDetails
    }
  );

  const columns = React.useMemo(
    () => [
      {
        Header: '#',
        accessor: null,
        column_width: '2%'
      },
      {
        Header: 'Name',
        id: 'name',
        accessor: e =>
          <Link to={`/ui/reports/${e.name}`}>
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
        accessor: 'group',
        className: 'text-center',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        column_width: '8%'
      }
    ], []
  );

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loadingUserDetails && listReports) {
    return (
      <BaseArgoView
        resourcename='report'
        location={location}
        listview={true}
        addnew={true}
        addperm={userDetails.is_superuser || userDetails.groups.reports.length > 0}
      >
        <BaseArgoTable
          data={listReports}
          columns={columns}
          resourcename='reports'
          page_size={10}
        />
      </BaseArgoView>
    )
  }
  else
    return null
};


function insertSelectPlaceholder(data, text) {
  if (data)
    return [text, ...data]
  else
    return [text]
}


function preProcessTagValue(data) {
  if (data === '1')
    return 'yes'
  else if (data === '0')
    return 'no'

  return data
}


const TagSelect = ({field, tagOptions, onChangeHandler, isMulti,
  closeMenuOnSelect, tagInitials}) => {
  if (tagInitials) {
    return (
      <CustomReactSelect
        name={field.name}
        closeMenuOnSelect={closeMenuOnSelect}
        isMulti={isMulti}
        isClearable={false}
        onChange={(e) => onChangeHandler(e)}
        options={tagOptions}
        value={tagInitials}
      />
    )
  }
  else
    return (
      <CustomReactSelect
        name={field.name}
        closeMenuOnSelect={closeMenuOnSelect}
        isMulti={isMulti}
        isClearable={false}
        onChange={(e) => onChangeHandler(e)}
        options={tagOptions}
      />
    )
}


const TopologyTagList = ({ part, tagsState, setTagsState, tagsAll, addview, push, form, remove }) => {
  const extractTags = (which, filter=false) => {
    let selected = new Array()

    if (filter)
      if (tagsState[part])
        Object.keys(tagsState[part]).forEach((e) =>
          selected.push(tagsState[part][e])
        )

    let found = tagsAll.filter(element => element.name === which)
    found = found[0].values

    if (filter)
      found = found.filter(element => selected.indexOf(element.name) === -1)

    return found
  }

  const recordSelectedTagKeys = (index, value) => {
    let newState = JSON.parse(JSON.stringify(tagsState))
    if (newState[part])
      newState[part][index] = value
    else {
      newState[part] = new Object()
      newState[part][index] = value
    }
    setTagsState(newState)
  }

  const isMultiValuesTags = (data) => {
    if (data.length === 2) {
      if (data[0].value === 'yes' ||
        data[0].value === 'no')
      return false
    }
    else
      return true
  }

  const tagsInitValues = (key, data, preprocess=false) => {
    if (data[key] === '')
      return undefined
    if (data[key].indexOf(' ') === -1)
      return new Object({
        'label': preprocess ? preProcessTagValue(data[key]) : data[key],
        'value': preprocess ? preProcessTagValue(data[key]) : data[key]
      })
    else {
      let tmp = data[key].split(' ').map(e => new Object({
        'label': preprocess ? preProcessTagValue(e) : e,
        'value': preprocess ? preProcessTagValue(e) : e
      }))
      return tmp
    }
  }

  const extractValuesTags = (index, preprocess=false) => {
    if (tagsState[part] !== undefined) {
      let interestTags = extractTags(part)
      interestTags = interestTags.filter((e) => e.name === tagsState[part][index])
      if (interestTags.length > 0) {
        interestTags = interestTags[0].values.map((e) => new Object({
          'label': preprocess ? preProcessTagValue(e) : e,
          'value': preprocess ? preProcessTagValue(e) : e
        }))
        return interestTags
      }
    }
    return []
  }

  return (
    <React.Fragment>
      {
        form.values[part].map((tags, index) => (
          <React.Fragment key={index}>
            <Row key={index} className="no-gutters">
              <Col md={4}>
                <Field
                  name={`${part}.${index}.name`}
                  component={TagSelect}
                  tagOptions={extractTags(part, true).map((e) => new Object({
                    'label': e.name,
                    'value': e.name
                  }))}
                  onChangeHandler={(e) => {
                    form.setFieldValue(`${part}.${index}.name`, e.value)
                    recordSelectedTagKeys(index, e.value)
                  }}
                  isMulti={false}
                  closeMenuOnSelect={true}
                  tagInitials={!addview ? tagsInitValues('name', tags) : undefined}
                />
              </Col>
              <Col md={7}>
                <Field
                  name={`${part}.${index}.value`}
                  component={TagSelect}
                  tagOptions={extractValuesTags(index, true)}
                  onChangeHandler={(e) => {
                    if (Array.isArray(e)) {
                      let joinedValues = ''
                      e.forEach((e) => {
                        joinedValues += e.value + ' '
                      })
                      form.setFieldValue(`${part}.${index}.value`, joinedValues.trim())
                    }
                    else
                      form.setFieldValue(`${part}.${index}.value`, e.value.trim())
                  }}
                  isMulti={isMultiValuesTags(extractValuesTags(index))}
                  closeMenuOnSelect={!isMultiValuesTags(extractValuesTags(index))}
                  tagInitials={!addview ? tagsInitValues('value', tags, true) : undefined}
                />
              </Col>
              <Col md={1} className="pl-2 pt-1">
                <Button size="sm" color="danger"
                  type="button"
                  onClick={() => {
                    let newState = JSON.parse(JSON.stringify(tagsState))
                    let renumNewState = JSON.parse(JSON.stringify(tagsState))

                    delete newState[part][index]
                    delete renumNewState[part]
                    renumNewState[part] = new Object()

                    let i = 0
                    for (var tag in newState[part]) {
                      renumNewState[part][i] = newState[part][tag]
                      i += 1
                    }

                    remove(index)
                    setTagsState(renumNewState)
                  }}>
                  <FontAwesomeIcon icon={faTimes}/>
                </Button>
              </Col>
            </Row>
          </React.Fragment>
        ))
      }
      <Row>
        <Col className="pt-4 d-flex justify-content-center">
          <Button color="success"
            type="button"
            onClick={() => {push({'name': '', 'value': ''})}}>
            Add new tag
          </Button>
        </Col>
      </Row>
    </React.Fragment>
  )
}


const EntitySelect = ({field, entitiesOptions, onChangeHandler, entitiesInitials}) => {
  if (entitiesInitials) {
    return (
      <CustomReactSelect
        name={field.name}
        closeMenuOnSelect={false}
        placeholder="Search..."
        isClearable={false}
        isMulti
        onChange={(e) => onChangeHandler(e)}
        options={entitiesOptions}
        defaultValue={entitiesInitials}
      />
    )
  }
  else
    return (
      <CustomReactSelect
        name={field.name}
        closeMenuOnSelect={false}
        placeholder="Search..."
        isClearable={false}
        isMulti
        onChange={(e) => onChangeHandler(e)}
        options={entitiesOptions}
      />
    )
}


const TopologyEntityFields = ({topoGroups, addview, form}) => {
  const entityInitValues = (matchWhat) => {
    let tmp = new Array()
    for (let entity of form.values.entities) {
      if (matchWhat.indexOf(entity.name) > -1) {
        if (entity.value.indexOf(' ') > -1) {
          tmp = entity.value.split(' ').map(e => new Object({
            'label': e,
            'value': e
          }))
        }
        else
          tmp.push(
            new Object({
              'label': entity.value,
              'value': entity.value
            }))
      }
    }
    return tmp
  }

  const formatSelectEntities = (data) => {
    let formatted = new Array()
    for (var e of [...data])
      formatted.push(new Object({
        'label': e,
        'value': e
      }))
    return formatted
  }

  let topoType = form.values.topologyType
  let label1 = undefined
  let label2 = undefined
  let key1 = undefined
  let key2 = undefined

  if (topoType === 'Sites') {
    label1 = 'NGIs:'
    label2 = 'Sites:'
    key1 = 'ngis'
    key2 = 'sites'
  }
  else if (topoType === 'ServiceGroups'){
    label1 = 'Projects:'
    label2 = 'Service groups:'
    key1 = 'projects'
    key2 = 'servicegroups'
  }
  else {
    label1 = 'Upper group:'
    label2 = 'Lower group:'
    key1 = 'ngis'
    key2 = 'sites'
  }

  return (
    <React.Fragment>
      <Label to='topoEntity1'>
        {label1}
      </Label>
      <Field
        name="entities.0.value"
        id="topoEntity1"
        component={EntitySelect}
        entitiesOptions={formatSelectEntities(topoGroups[key1])}
        onChangeHandler={(e) => {
          let joinedValues = ''
          for (let event of e)
            joinedValues += event.value + ' '
          joinedValues = joinedValues.trim()
          form.setFieldValue("entities.0.value", joinedValues)
          form.setFieldValue("entities.0.name", key1.toUpperCase().slice(0, -1))
        }}
        entitiesInitials={!addview ? entityInitValues(["NGI", "PROJECT"]) : undefined}
      />
      <Label to='topoEntity2' className="pt-2">
        {label2}
      </Label>
      <Field
        name="entities.1.value"
        id="topoEntity2"
        component={EntitySelect}
        entitiesOptions={formatSelectEntities(topoGroups[key2])}
        onChangeHandler={(e) => {
          let joinedValues = ''
          for (let event of e)
            joinedValues += event.value + ' '
          joinedValues = joinedValues.trim()
          form.setFieldValue("entities.1.name", key2.toUpperCase())
          form.setFieldValue("entities.1.value", joinedValues)
        }}
        entitiesInitials={!addview ? entityInitValues(["SITES", "SERVICEGROUPS"]) : undefined}
      />
    </React.Fragment>
  )
}


export const ReportsComponent = (props) => {
  const report_name = props.match.params.name;
  const addview = props.addview
  const location = props.location;
  const history = props.history;
  const backend = new Backend();
  const crud = props.webapireports ? props.webapireports.crud : undefined
  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [onYes, setOnYes] = useState('')
  const [formikValues, setFormikValues] = useState({})
  const topologyTypes = ['Sites', 'ServiceGroups']
  let apiUrl = '/api/v2/internal/reports'
  const [tagsState, setTagsState] = useState(new Object({
    'groups': undefined,
    'endpoints': undefined
  }))
  const [groupsTags, setGroupsTags] = useState(undefined)
  const [endpointsTags, setEndpointsTags] = useState(undefined)
  const [entitiesState, setEntitiesState] = useState(undefined)

  let querykey = undefined;
  if (addview)
    querykey = `report_addview`;
  else
    querykey = `report_${report_name}_changeview`;

  const webapi = new WebApi({
    token: props.webapitoken,
    reportsConfigurations: props.webapireports,
    metricProfiles: props.webapimetric,
    aggregationProfiles: props.webapiaggregation,
    operationsProfiles: props.webapioperations
  });

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    `session_userdetails`, async () => {
      const sessionActive = await backend.isActiveSession()
      if (sessionActive.active) {
        return sessionActive.userdetails
      }
    }
  );

  const { data: report, error: reportError, isLoading: reportLoading } = useQuery(
    `${querykey}_report`, async () => {
      if (!addview) {
        let backendReport = await backend.fetchData(`${apiUrl}/${report_name}`)
        let report = await webapi.fetchReport(report_name);
        report['groupname'] = backendReport.groupname

        let groupstags = formatFromReportTags('argo.group.filter.tags', report['filter_tags'])
        let endpointstags = formatFromReportTags('argo.endpoint.filter.tags', report['filter_tags'])
        let entities = formatFromReportEntities('argo.group.filter.fields', report['filter_tags'])
        let preselectedtags = JSON.parse(JSON.stringify(tagsState))
        preselectedtags['groups'] = new Object()
        preselectedtags['endpoints'] = new Object()
        groupstags.forEach((e, i) => {
          preselectedtags['groups'][i] = e.name
        })
        endpointstags.forEach((e, i) => {
          preselectedtags['endpoints'][i] = e.name
        })
        if (tagsState['groups'] === undefined
          && tagsState['endpoints'] === undefined)
          setTagsState(preselectedtags)
        setGroupsTags(groupstags)
        setEndpointsTags(endpointstags)
        setEntitiesState(entities)

        return report;
      }
      else {
        setGroupsTags(new Array())
        setEndpointsTags(new Array())
        setEntitiesState(new Array())

        return {
            tenant: '',
            disabled: false,
            info: {
                name: '',
                description: '',
                created: '',
                updated: ''
            },
            thresholds: {
              uptime: '',
              unknown: '',
              downtime: '',
              availability: '',
              reliability: ''
            },
            topology_schema: {},
            profiles: [],
            filter_tags: []
        }
      }
    },
    {
      enabled: userDetails,
    }
  );

  const { data: listMetricProfiles, error: listMetricProfilesError, isLoading: listMetricProfilesLoading } = useQuery(
    `${querykey}_metricprofiles`, async () => {
      return await webapi.fetchMetricProfiles();
    },
    {
      enabled: userDetails
    }
  );

  const { data: listAggregationProfiles, error: listAggregationProfilesError, isLoading: listAggregationProfilesLoading } = useQuery(
    `${querykey}_aggregationprofiles`, async () => {
      return await webapi.fetchAggregationProfiles();
    },
    {
      enabled: userDetails
    }
  );

  const { data: listOperationsProfiles, error: listOperationsProfilesError, isLoading: listOperationsProfilesLoading } = useQuery(
    `${querykey}_operationsprofiles`, async () => {
      return await webapi.fetchOperationsProfiles();
    },
    {
      enabled: userDetails
    }
  );

  const sortStr = (a, b) => {
    if (a.toLowerCase() < b.toLowerCase()) return -1;
    if (a.toLowerCase() > b.toLowerCase()) return 1;
    if (a.toLowerCase() === b.toLowerCase()) {
      if (a.toLowerCase() < b.toLowerCase()) return -1;
      if (a.toLowerCase() > b.toLowerCase()) return 1;
      if (a.toLowerCase() === b.toLowerCase()) return 0;
    }
  }

  const extractProfileNames = (profiles) => {
    let tmp = new Array();

    for (let profile of profiles)
      tmp.push(profile.name)

    tmp = tmp.sort(sortStr)

    return tmp;
  }

  const { data: topologyTags, error: topologyTagsError, isLoading: isLoadingTopologyTags} = useQuery(
    `${querykey}_topologytags`, async () => {
      if (crud) {
        let tags = await webapi.fetchReportsTopologyTags();
        return tags
      }
      else
        return new Array()
    },
    {
      enabled: report
    }
  );

  const { data: topologyGroups, error: topologyGroupsErrors, isLoading: topologyGroupsErrorsIsLoading } = useQuery(
    `${querykey}_topologygroups`, async () => {
      if (crud) {
        let groups = await webapi.fetchReportsTopologyGroups();
        let ngis = new Set()
        let sites = new Set()
        let projects = new Set()
        let servicegroups = new Set()

        for (var entity of groups) {
          if (entity['type'].toLowerCase() === 'project') {
            projects.add(entity['group'])
            servicegroups.add(entity['subgroup'])
          }
          else if (entity['type'].toLowerCase() === 'ngi') {
            ngis.add(entity['group'])
            sites.add(entity['subgroup'])
          }
        }

        return new Object({
          'ngis': Array.from(ngis).sort(sortStr),
          'sites': Array.from(sites).sort(sortStr),
          'projects': Array.from(projects).sort(sortStr),
          'servicegroups': Array.from(servicegroups).sort(sortStr)
        })
      }
      else
        return new Object()
    },
    {
      enabled: report
    }
  );

  const whichTopologyType = (schema) => {
    if (!addview) {
      if (schema.group.group.type.toLowerCase() === topologyTypes[0].toLowerCase())
        return topologyTypes[0]
      else
        return topologyTypes[1]
    }
    else
      return ''
  }

  const onSubmitHandle = async (formValues) => {
    let msg = undefined;
    let title = undefined;

    if (addview) {
      msg = 'Are you sure you want to add Report?'
      title = 'Add report'
    }
    else {
      msg = 'Are you sure you want to change Report?'
      title = 'Change report'
    }
    setAreYouSureModal(!areYouSureModal);
    setModalMsg(msg)
    setModalTitle(title)
    setOnYes('change')
    setFormikValues(formValues)
  }

  const formatToReportTags = (tagsContext, formikTags) => {
    let tags = new Array()

    for (let tag of formikTags) {
      let tmpTag = new Object()
      let tmpTags = new Array()
      if (tag.value.indexOf(' ') !== -1) {
        let values = tag.value.split(' ')
        for (var val of values)
          tmpTags.push(new Object({
            name: tag.name,
            value: val,
            context: tagsContext
          }))
        tags = [...tags, ...tmpTags]
      }
      else {
        let tmpTagValue = tag.value
        if (tag.value.toLowerCase() === 'yes')
          tmpTagValue = '1'
        else if (tag.value === 'no')
          tmpTagValue = '0'
        tmpTag['name'] = tag.name
        tmpTag['value'] = tmpTagValue
        tmpTag['context'] = tagsContext
        tags.push(tmpTag)
      }
    }
    return tags
  }

  const formatToReportEntities = (context, formikEntities) => {
    let entities = new Array()

    for (let entity of formikEntities) {
      let tmpEntity = new Object()
      let tmpEntites = new Array()
      if (entity.value.indexOf(' ') !== -1) {
        let values = entity.value.split(' ')
        for (var val of values)
          tmpEntites.push(new Object({
            name: entity.name,
            value: val,
            context: context
          }))
        entities = [...entities, ...tmpEntites]
      }
      else {
        tmpEntity['name'] = entity.name
        tmpEntity['value'] = entity.value
        tmpEntity['context'] = context
        entities.push(tmpEntity)
      }
    }
    return entities
  }

  const formatFromReportTags = (tagsContext, formikTags) => {
    let tmpTagsJoint = new Object()
    let tags = new Array()

    for (let tag of formikTags) {
      if (tag.context === tagsContext) {
        if (tmpTagsJoint[tag.name] === undefined)
          tmpTagsJoint[tag.name] = new Array()
        tmpTagsJoint[tag.name].push(tag.value)
      }
    }

    for (let tag in tmpTagsJoint)
      tags.push(new Object({
        'name': tag,
        'value': tmpTagsJoint[tag].join(' ')
      }))

    return tags
  }

  const formatFromReportEntities = (context, formikEntities) => {
    let tmpEntityJoint = new Object()
    let entities = new Array()

    for (let entity of formikEntities) {
      if (entity.context === context) {
        if (tmpEntityJoint[entity.name] === undefined)
          tmpEntityJoint[entity.name] = new Array()
        tmpEntityJoint[entity.name].push(entity.value)
      }
    }

    for (let entity in tmpEntityJoint)
      entities.push(new Object({
        'name': entity,
        'value': tmpEntityJoint[entity].join(' ')
      }))

    return entities
  }

  const formatTopologySchema = (toposchema) => {
    let tmpTopoSchema = new Object()
    if (toposchema.toLowerCase() === 'ServiceGroups'.toLowerCase()) {
      tmpTopoSchema = {
        'group': {
          'type': 'PROJECT',
          'group': {
            'type': 'SERVICEGROUPS'
          }
        }
      }
      return tmpTopoSchema
    }
    else if (toposchema.toLowerCase() === 'Sites'.toLowerCase()) {
      tmpTopoSchema = {
        'group': {
          'type': 'NGI',
          'group': {
            'type': 'SITES'
          }
        }
      }
      return tmpTopoSchema
    }
  }

  const extractProfileMetadata = (profiletype, name) => {
    let profile = undefined
    if (profiletype === 'metric') {
      profile = listMetricProfiles.filter(
        profile => profile.name === name
      )
      profile = profile[0]
    }

    if (profiletype === 'aggregation') {
      profile = listAggregationProfiles.filter(
        profile => profile.name === name
      )
      profile = profile[0]
    }

    if (profiletype === 'operations') {
      profile = listOperationsProfiles.filter(
        profile => profile.name === name
      )
      profile = profile[0]
    }

    if (profile) {
      return new Object({
        id: profile.id,
        name: profile.name,
        type: profiletype
      })
    }
    else
      new Object({})
  }

  const doDelete = async (idReport) => {
    let response = await webapi.deleteReport(idReport);
    if (!response.ok) {
      let msg = '';
      try {
        let json = await response.json();
        let msg_list = [];
        json.errors.forEach(e => msg_list.push(e.details));
        msg = msg_list.join(' ');
      } catch(err) {
        msg = 'Web API error deleting report';
      }
      NotifyError({
        title: `Web API error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    } else {
      let r_internal = await backend.deleteObject(`/api/v2/internal/reports/${idReport}`);
      if (r_internal.ok)
        NotifyOk({
          msg: 'Report sucessfully deleted',
          title: 'Deleted',
          callback: () => history.push('/ui/reports')
        });
      else {
        let msg = '';
        try {
          let json = await r_internal.json();
          msg = json.detail;
        } catch(err) {
          msg = 'Internal API error deleting report';
        }
        NotifyError({
          title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
          msg: msg
        });
      }
    }
  }

  const doChange = async (formValues) => {
    let dataToSend = new Object()
    dataToSend.info = {
      name: formValues.name,
      description: formValues.description,
      //TODO: created, updated
    }
    dataToSend.thresholds = {
      availability: Number.parseFloat(formValues.availabilityThreshold),
      reliability: Number.parseFloat(formValues.reliabilityThreshold),
      uptime: Number.parseFloat(formValues.uptimeThreshold),
      unknown: Number.parseFloat(formValues.unknownThreshold),
      downtime: Number.parseFloat(formValues.downtimeThreshold)
    }
    dataToSend.disabled = formValues.disabled
    let extractedMetricProfile = extractProfileMetadata('metric',
      formValues.metricProfile)
    let extractedAggregationProfile = extractProfileMetadata('aggregation',
      formValues.aggregationProfile)
    let extractedOperationProfile = extractProfileMetadata('operations',
      formValues.operationsProfile)
    dataToSend.profiles = new Array()
    dataToSend['profiles'].push(extractedMetricProfile)
    dataToSend['profiles'].push(extractedAggregationProfile)
    dataToSend['profiles'].push(extractedOperationProfile)
    let groupTagsFormatted = formatToReportTags('argo.group.filter.tags', formValues.groups)
    let endpointTagsFormatted = formatToReportTags('argo.endpoint.filter.tags', formValues.endpoints)
    let groupEntitiesFormatted = formatToReportEntities('argo.group.filter.fields', formValues.entities)
    dataToSend['filter_tags'] = [...groupTagsFormatted,
      ...endpointTagsFormatted, ...groupEntitiesFormatted]
    dataToSend['topology_schema'] = formatTopologySchema(formValues.topologyType)

    if (addview) {
      let response = await webapi.addReport(dataToSend);
      if (!response.ok) {
        let add_msg = '';
        try {
          let json = await response.json();
          let msg_list = [];
          json.errors.forEach(e => msg_list.push(e.details));
          add_msg = msg_list.join(' ');
        } catch(err) {
          add_msg = 'Web API error adding report';
        }
        NotifyError({
          title: `Web API error: ${response.status} ${response.statusText}`,
          msg: add_msg
        });
      } else {
        let r_json = await response.json();
        let r_internal = await backend.addObject(
          '/api/v2/internal/reports/',
          {
            apiid: r_json.data.id,
            name: dataToSend.info.name,
            groupname: formValues.groupname,
            description: formValues.description,
          }
        );
        if (r_internal.ok)
          NotifyOk({
            msg: 'Report successfully added',
            title: 'Added',
            callback: () => history.push('/ui/reports')
          });
        else {
          let add_msg = '';
          try {
            let json = await r_internal.json();
            add_msg = json.detail;
          } catch(err) {
            add_msg = 'Internal API error adding report';
          }
          NotifyError({
            title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
            msg: add_msg
          });
        }
      }
    }
    else {
      dataToSend.id = report.id
      let response = await webapi.changeReport(dataToSend, dataToSend.id);
      if (!response.ok) {
        let change_msg = '';
        try {
          let json = await response.json();
          let msg_list = [];
          json.errors.forEach(e => msg_list.push(e.details));
          change_msg = msg_list.join(' ');
        } catch(err) {
          change_msg = 'Web API error changing report';
        }
        NotifyError({
          title: `Web API error: ${response.status} ${response.statusText}`,
          msg: change_msg
        });
      } else {
        let r_internal = await backend.changeObject(
          '/api/v2/internal/reports/',
          {
            apiid: dataToSend.id,
            name: dataToSend.info.name,
            groupname: formValues.groupname,
            description: formValues.description,
          }
        );
        if (r_internal.ok)
          NotifyOk({
            msg: 'Report successfully changed',
            title: 'Changed',
            callback: () => history.push('/ui/reports')
          });
        else {
          let add_msg = '';
          try {
            let json = await r_internal.json();
            add_msg = json.detail;
          } catch(err) {
            add_msg = 'Internal API error changing report';
          }
          NotifyError({
            title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
            msg: add_msg
          });
        }
      }
    }
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(formikValues.id)
    else if (onYes === 'change')
      doChange(formikValues)
  }

  if (reportLoading || listMetricProfilesLoading || listAggregationProfilesLoading || listOperationsProfilesLoading)
    return (<LoadingAnim/>);

  else if (reportError)
    return (<ErrorComponent error={reportError}/>);

  else if (listMetricProfilesError)
    return (<ErrorComponent error={listMetricProfilesError}/>);

  else if (listAggregationProfilesError)
    return (<ErrorComponent error={listAggregationProfilesError}/>);

  else if (listOperationsProfilesError)
    return (<ErrorComponent error={listOperationsProfilesError}/>);

  else if (report && userDetails && topologyTags && topologyGroups &&
    groupsTags !== undefined && endpointsTags !== undefined
    && entitiesState !== undefined)  {
    let metricProfile = '';
    let aggregationProfile = '';
    let operationsProfile = '';

    report.profiles.forEach(profile => {
      if (profile.type === 'metric')
        metricProfile = profile.name;

      if (profile.type === 'aggregation')
        aggregationProfile = profile.name;

      if (profile.type === 'operations')
        operationsProfile = profile.name;
    })

    let write_perm = undefined;
    let grouplist = undefined;
    if (!addview) {
      write_perm = userDetails.is_superuser ||
            userDetails.groups.reports.indexOf(report.groupname) >= 0;
    }
    else {
      write_perm = userDetails.is_superuser ||
        userDetails.groups.reports.length > 0;
    }
    if (write_perm)
      grouplist = userDetails.groups.reports
    else
      grouplist = [report.groupname]

    return (
      <BaseArgoView
        resourcename='report'
        location={location}
        modal={true}
        state={{areYouSureModal, 'modalFunc': onYesCallback, modalTitle, modalMsg}}
        toggle={() => setAreYouSureModal(!areYouSureModal)}
        submitperm={write_perm}
        addview={addview}
        history={false}
      >
        <Formik
          validationSchema={ReportsSchema}
          initialValues = {{
            id: report.id,
            disabled: report.disabled,
            name: report.info.name,
            description: report.info.description,
            metricProfile: metricProfile,
            aggregationProfile: aggregationProfile,
            operationsProfile: operationsProfile,
            availabilityThreshold: report.thresholds.availability,
            reliabilityThreshold: report.thresholds.reliability,
            uptimeThreshold: report.thresholds.uptime,
            unknownThreshold: report.thresholds.unknown,
            downtimeThreshold: report.thresholds.downtime,
            topologyType: whichTopologyType(report.topology_schema),
            groupname: report.groupname,
            groups: groupsTags,
            endpoints: endpointsTags,
            entities: entitiesState
          }}
          enableReinitialize={true}
          onSubmit = {(values) => onSubmitHandle(values)}
        >
          {(props) => (
            <Form>
              <FormGroup>
                <Row className='align-items-center'>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
                      <Field
                        type='text'
                        name='name'
                        className='form-control form-control-lg'
                      />
                    </InputGroup>
                    {
                      props.errors && props.errors.name &&
                        FancyErrorMessage(props.errors.name)
                    }
                    <FormText color='muted'>
                      Report name
                    </FormText>
                  </Col>
                  <Col md={2}>
                    <label>
                      <Field
                        type='checkbox'
                        name='disabled'
                        className='mr-1'
                      />
                      Disabled
                    </label>
                    <FormText color='muted'>
                      Mark report as disabled.
                    </FormText>
                  </Col>
                </Row>
                <Row className='mt-3'>
                  <Col md={10}>
                    <Label for='description'>Description:</Label>
                    <Field
                      id='description'
                      className='form-control'
                      component='textarea'
                      rows={4}
                      name='description'
                    />
                    <FormText color='muted'>
                      Free text report description.
                    </FormText>
                  </Col>
                </Row>
                <Row className='mt-4'>
                  <Col md={3}>
                    <InputGroup>
                      <InputGroupAddon addonType='prepend'>Group</InputGroupAddon>
                      <Field
                        name='groupname'
                        component='select'
                        className={`form-control custom-select`}
                      >
                        <option key={0} value='' hidden color='text-muted'>Select group</option>
                        {
                          grouplist.map((group, i) =>
                            <option key={i + 1} value={group}>{group}</option>
                          )
                        }
                      </Field>
                    </InputGroup>
                    {
                      props.errors && props.errors.groupname &&
                        FancyErrorMessage(props.errors.groupname)
                    }
                    <FormText color='muted'>
                      Report is member of given group
                    </FormText>
                  </Col>
                </Row>
              </FormGroup>
              <FormGroup className='mt-4'>
                <ParagraphTitle title='Profiles'/>
                <Row className='mt-2'>
                  <Col md={4}>
                    <Label to='metricProfile'>Metric profile:</Label>
                    <Field
                      id='metricProfile'
                      name='metricProfile'
                      component={DropDown}
                      data={insertSelectPlaceholder(extractProfileNames(
                        listMetricProfiles),
                        'Select')}
                      required={true}
                      class_name='custom-select'
                    />
                    {
                      props.errors && props.errors.metricProfile &&
                        FancyErrorMessage(props.errors.metricProfile)
                    }
                  </Col>
                  <Col md={4}>
                    <Label to='aggregationProfile'>Aggregation profile:</Label>
                    <Field
                      id='aggregationProfile'
                      name='aggregationProfile'
                      component={DropDown}
                      data={insertSelectPlaceholder(
                        extractProfileNames(listAggregationProfiles).sort(sortStr),
                        'Select')}
                      required={true}
                      class_name='custom-select'
                    />
                    {
                      props.errors && props.errors.aggregationProfile &&
                        FancyErrorMessage(props.errors.aggregationProfile)
                    }
                  </Col>
                  <Col md={4}>
                    <Label to='operationsProfile'>Operations profile:</Label>
                    <Field
                      name='operationsProfile'
                      id='operationsProfile'
                      component={DropDown}
                      data={insertSelectPlaceholder(
                        extractProfileNames(listOperationsProfiles),
                        'Select')}
                      required={true}
                      class_name='custom-select'
                    />
                    {
                      props.errors && props.errors.operationsProfile &&
                        FancyErrorMessage(props.errors.operationsProfile)
                    }
                  </Col>
                </Row>
              </FormGroup>
              <FormGroup className='mt-4'>
                <ParagraphTitle title='Topology configuration'/>
                <Row>
                  <Col md={2}>
                    <Label for='topologyType'>Topology type:</Label>
                    <Field
                      id='topologyType'
                      name='topologyType'
                      component={DropDown}
                      data={insertSelectPlaceholder(topologyTypes, 'Select')}
                      required={true}
                      class_name='custom-select'
                    />
                    {
                      props.errors && props.errors.topologyType &&
                        FancyErrorMessage(props.errors.topologyType)
                    }
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Card className="mt-3">
                      <CardHeader>
                        <strong>Group of groups</strong>
                      </CardHeader>
                      <CardBody>
                        <CardTitle className="mb-2">
                          <strong>Tags</strong>
                        </CardTitle>
                        <FieldArray
                          name="groups"
                          render={props => (
                            <TopologyTagList
                              part="groups"
                              tagsState={tagsState}
                              setTagsState={setTagsState}
                              tagsAll={topologyTags}
                              {...props}/>
                          )}
                        />
                        <div>
                          <hr style={{'borderTop': '1px solid #b5c4d1'}}/>
                        </div>
                        <CardTitle className="mb-2">
                          <strong>Entities</strong>
                        </CardTitle>
                        <FieldArray
                          name="entities"
                          render={props => (
                            <TopologyEntityFields
                              topoGroups={topologyGroups}
                              addview={addview}
                              {...props}
                            />
                          )}
                        />
                      </CardBody>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="mt-3">
                      <CardHeader>
                        <strong>Group of endpoints</strong>
                      </CardHeader>
                      <CardBody>
                        <CardTitle className="mb-2">
                          <strong>Tags</strong>
                        </CardTitle>
                        <FieldArray
                          name="endpoints"
                          render={propsLocal => (
                            <TopologyTagList
                              part="endpoints"
                              tagsState={tagsState}
                              setTagsState={setTagsState}
                              tagsAll={topologyTags}
                              addview={addview}
                              {...propsLocal}/>
                          )}
                        />
                      </CardBody>
                    </Card>
                  </Col>
                </Row>
              </FormGroup>
              <FormGroup className='mt-4'>
                <ParagraphTitle title='Thresholds'/>
                <Row>
                  <Col md={2} className='mr-4'>
                    <Label to='availabilityThreshold'>Availability:</Label>
                    <Field
                      id='availabilityThreshold'
                      name='availabilityThreshold'
                      className='form-control'
                    />
                    {
                      props.errors && props.errors.availabilityThreshold &&
                        FancyErrorMessage(props.errors.availabilityThreshold)
                    }
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='reliabilityThreshold'>Reliability:</Label>
                    <Field
                      id='reliabilityThreshold'
                      name='reliabilityThreshold'
                      className='form-control'
                    />
                    {
                      props.errors && props.errors.reliabilityThreshold &&
                        FancyErrorMessage(props.errors.reliabilityThreshold)
                    }
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='uptimeThreshold'>Uptime:</Label>
                    <Field
                      id='uptimeThreshold'
                      name='uptimeThreshold'
                      className='form-control'
                    />
                    {
                      props.errors && props.errors.uptimeThreshold &&
                        FancyErrorMessage(props.errors.uptimeThreshold)
                    }
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='unknownThreshold'>Unknown:</Label>
                    <Field
                      id='unknownThreshold'
                      name='unknownThreshold'
                      className='form-control'
                    />
                    {
                      props.errors && props.errors.unknownThreshold &&
                        FancyErrorMessage(props.errors.unknownThreshold)
                    }
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='downtimeThreshold'>Downtime:</Label>
                    <Field
                      id='downtimeThreshold'
                      name='downtimeThreshold'
                      className='form-control'
                    />
                    {
                      props.errors && props.errors.downtimeThreshold &&
                        FancyErrorMessage(props.errors.downtimeThreshold)
                    }
                  </Col>
                </Row>
              </FormGroup>
              {
                (write_perm) &&
                  <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                    <Button
                      color="danger"
                      onClick={() => {
                        setModalMsg('Are you sure you want to delete Report?')
                        setModalTitle('Delete report')
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
        </Formik>
      </BaseArgoView>
    )
  }

  else
    return null
};
