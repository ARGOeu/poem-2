import React, { useState } from 'react';
import { Backend, WebApi } from './DataManager';

import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  BaseArgoTable,
  BaseArgoView,
  ErrorComponent,
  LoadingAnim,
  NotifyError,
  NotifyOk,
  ParagraphTitle,
  CustomReactSelect,
  CustomError
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
  InputGroupText,
  FormText,
  Label,
  Input
} from 'reactstrap';
import * as Yup from 'yup';
import {
  fetchMetricProfiles,
  fetchOperationsProfiles,
  fetchUserDetails,
  fetchBackendReports,
  fetchAggregationProfiles,
  fetchThresholdsProfiles,
  fetchTopologyTags,
  fetchTopologyGroups,
  fetchTopologyEndpoints,
} from './QueryFunctions';


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


const fetchReport = async (webapi, name) => {
  return await webapi.fetchReport(name);
}


export const ReportsList = (props) => {
  const location = props.location;
  const publicView = props.publicView;

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true)
  );

  const { data: reports, error: errorReports, isLoading: loadingReports } = useQuery(
    [`${publicView ? 'public_' : ''}report`, 'backend'],  () => fetchBackendReports(publicView),
    { enabled: !publicView ? !!userDetails : true }
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
          <Link
            to={`/ui/${publicView ? 'public_' : ''}reports/${e.name}`}
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
        className: 'text-center',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        column_width: '8%'
      }
    ], []
  );

  if (loadingReports || loadingUserDetails)
    return (<LoadingAnim/>);

  else if (errorReports)
    return (<ErrorComponent error={errorReports}/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails} />)

  else if (!loadingUserDetails && reports) {
    return (
      <BaseArgoView
        resourcename='report'
        location={location}
        listview={true}
        addnew={!publicView}
        addperm={publicView ? false : userDetails.is_superuser || userDetails.groups.reports.length > 0}
      >
        <BaseArgoTable
          data={reports}
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


const TopologyTagList = ({ part, fieldName, tagsState, setTagsState, tagsAll, addview, publicView, push, form, remove }) => {
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
    if (data) {
      if (data.length === 2 || data.length === 1) {
        if (data[0].value === 'yes' ||
          data[0].value === 'no')
        return false
      }
      else
        return true
    }
  }

  const tagsInitValues = (key, data, preprocess=false) => {
    if (!data[key])
      return undefined
    if (data[key].indexOf('|') === -1)
      return new Object({
        'label': preprocess ? preProcessTagValue(data[key]) : data[key],
        'value': preprocess ? preProcessTagValue(data[key]) : data[key]
      })
    else {
      let tmp = data[key].split('|').map(e => new Object({
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
        form.values[fieldName].length === 0 && publicView ?
          <Row className="g-0">
            <Col md={4}>
              <Field
                name={`${fieldName}.0.name`}
                data-testid={`${fieldName}.0.name`}
                className='form-control'
                disabled={true}
                value=''
              />
            </Col>
            <Col md={7}>
              <Field
                name={`${fieldName}.0.value`}
                data-testid={`${fieldName}.0.value`}
                className='form-control'
                disabled={true}
                value=''
              />
            </Col>
          </Row>
        :
        form.values[fieldName].map((tags, index) => (
          <React.Fragment key={index}>
            <Row key={index} className="g-0">
              <Col md={4}>
                {
                    publicView ?
                      <Field
                        name={`${fieldName}.${index}.name`}
                        data-testid={`${fieldName}.${index}.name`}
                        className='form-control'
                        disabled={true}
                        value={form.values[fieldName][index].name}
                      />
                    :
                      <Field
                        name={`${fieldName}.${index}.name`}
                        data-testid={`${fieldName}.${index}.name`}
                        component={TagSelect}
                        tagOptions={extractTags(part, true).map((e) => new Object({
                          'label': e.name,
                          'value': e.name
                        }))}
                        onChangeHandler={(e) => {
                          form.setFieldValue(`${fieldName}.${index}.name`, e.value)
                          recordSelectedTagKeys(index, e.value)
                        }}
                        isMulti={false}
                        closeMenuOnSelect={true}
                        tagInitials={!addview ? tagsInitValues('name', tags) : undefined}
                      />
                  }
              </Col>
              <Col md={7}>
                {
                    publicView ?
                      <Field
                        name={`${fieldName}.${index}.value`}
                        data-testid={`${fieldName}.${index}.value`}
                        className='form-control'
                        disabled={true}
                        value={preProcessTagValue(tags.value.replace(new RegExp('\\|', 'g'), ', '))}
                      />
                    :
                      <Field
                        name={`${fieldName}.${index}.value`}
                        data-testid={`${fieldName}.${index}.value`}
                        component={TagSelect}
                        tagOptions={extractValuesTags(index, true)}
                        onChangeHandler={(e) => {
                          if (Array.isArray(e)) {
                            let joinedValues = ''
                            e.forEach((e) => {
                              joinedValues += e.value + '|'
                            })
                            form.setFieldValue(`${fieldName}.${index}.value`, joinedValues.replace(/\|$/, ''))
                          }
                          else
                            form.setFieldValue(`${fieldName}.${index}.value`, e.value.trim())
                        }}
                        isMulti={isMultiValuesTags(extractValuesTags(index))}
                        closeMenuOnSelect={!isMultiValuesTags(extractValuesTags(index))}
                        tagInitials={!addview ? tagsInitValues('value', tags, true) : undefined}
                      />
                  }
              </Col>
              <Col md={1} className="ps-2 pt-1">
                {
                    !publicView &&
                      <Button size="sm" color="danger"
                        type="button"
                        data-testid={`remove${fieldName.toLowerCase().endsWith('tags') ? 'Tag' : 'Extension'}-${index}`}
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
                  }
              </Col>
            </Row>
          </React.Fragment>
          ))
      }
      <Row>
        <Col className="pt-4 d-flex justify-content-center">
          {
            !publicView &&
              <Button color="success"
                type="button"
                onClick={() => {push({'name': '', 'value': ''})}}>
                {`Add new ${fieldName.toLowerCase().endsWith('tags') ? 'tag' : 'extension'}`}
              </Button>
          }
        </Col>
      </Row>
    </React.Fragment>
  )
}


const EntitySelect = ({field, label, entitiesOptions, onChangeHandler, entitiesInitials }) => {
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
        value={entitiesInitials}
        label={label}
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
        label={label}
      />
    )
}


const TopologyEntityFields = ({topoGroups, addview, publicView, form}) => {
  const entityInitValues = (matchWhat) => {
    let tmp = new Array()
    for (let entity of form.values.entities) {
      if (entity && matchWhat.indexOf(entity.name) > -1) {
        if (entity.value.indexOf('|') > -1) {
          tmp = entity.value.split('|').map(e => new Object({
            'label': e.trim(),
            'value': e.trim()
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
    key1 = 'entitiesNgi'
    key2 = 'entitiesSites'
  }
  else if (topoType === 'ServiceGroups'){
    label1 = 'Projects:'
    label2 = 'Service groups:'
    key1 = 'entitiesProjects'
    key2 = 'entitiesServiceGroups'
  }
  else {
    label1 = 'Upper group:'
    label2 = 'Lower group:'
    key1 = 'entitiesNgi'
    key2 = 'entitiesSites'
  }

  return (
    <React.Fragment>
      <Label for='topoEntity1'>{label1}</Label>
      {
        publicView ?
          <Field
            name='entities.0.value'
            id='topoEntity1'
            className='form-control'
            disabled={true}
            value={form.values.entities[0] ? form.values.entities[0].value ? form.values.entities[0].value.replace(new RegExp('\\|', 'g'), ', ') : '' : ''}
          />
        :
          <Field
            name="entities.0.value"
            id="topoEntity1"
            component={EntitySelect}
            entitiesOptions={formatSelectEntities(topoGroups[key1])}
            onChangeHandler={(e) => {
              let joinedValues = ''
              for (let event of e)
                joinedValues += event.value + '|'
              joinedValues = joinedValues.replace(/\|$/, '')
              form.setFieldValue("entities.0.name", key1)
              form.setFieldValue("entities.0.value", joinedValues)
            }}
            entitiesInitials={!addview ? entityInitValues(["entitiesNgi", "entitiesProjects"]) : undefined}
           />
       }
      <Label for='topoEntity2' className='pt-2'>{label2}</Label>
      {
        publicView ?
          <Field
            name='entities.1.value'
            id='topoEntity2'
            className='form-control'
            disabled={true}
            value={form.values.entities[1] ? form.values.entities[1].value ? form.values.entities[1].value.replace(new RegExp('\\|', 'g'), ', ') : '' : ''}
          />
        :
          <Field
            name="entities.1.value"
            className="pt-2"
            id="topoEntity2"
            component={EntitySelect}
            entitiesOptions={formatSelectEntities(topoGroups[key2])}
            onChangeHandler={(e) => {
              let joinedValues = ''
              for (let event of e)
                joinedValues += event.value + '|'
              joinedValues = joinedValues.replace(/\|$/, '')
              form.setFieldValue("entities.1.name", key2)
              form.setFieldValue("entities.1.value", joinedValues)
            }}
            entitiesInitials={!addview ? entityInitValues(["entitiesSites", "entitiesServiceGroups"]) : undefined}
          />
      }
    </React.Fragment>
  )
}


const ProfileSelect = ({ field, error, label, options, onChangeHandler, initVal }) => {
  if (initVal)
    return (
      <CustomReactSelect
        name={ field.name }
        label={ label }
        error={ error }
        closeMenuOnSelect={ true }
        isClearable={ field.name === 'thresholdsProfile' }
        onChange={ e => onChangeHandler(e) }
        options={ options }
        value={ { value: initVal, label: initVal } }
      />
    )
  else
    return (
      <CustomReactSelect
        name={ field.name }
        label={ label }
        error={ error }
        closeMenuOnSelect={ true }
        isClearable={ field.name === 'thresholdsProfile' }
        onChange={ e => onChangeHandler(e) }
        options={ options }
      />
    )
}


export const ReportsComponent = (props) => {
  const report_name = props.match.params.name;
  const addview = props.addview
  const publicView = props.publicView
  const location = props.location;
  const history = props.history;

  const backend = new Backend();
  const queryClient = useQueryClient();

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [onYes, setOnYes] = useState('')
  const [formikValues, setFormikValues] = useState({})
  const topologyTypes = ['Sites', 'ServiceGroups']


  const [tagsState, setTagsState] = useState(new Object({
    'groups': undefined,
    'endpoints': undefined
  }))
  const [extensionsState, setExtensionsState] = useState(
    new Object({
      groups: undefined,
      endpoints: undefined
    })
  )

  const webapi = new WebApi({
    token: props.webapitoken,
    reportsConfigurations: props.webapireports,
    metricProfiles: props.webapimetric,
    aggregationProfiles: props.webapiaggregation,
    operationsProfiles: props.webapioperations,
    thresholdsProfiles: props.webapithresholds
  });

  const webapiAddMutation = useMutation(async (values) => await webapi.addReport(values));
  const backendAddMutation = useMutation(async (values) => await backend.addObject('/api/v2/internal/reports/', values));
  const webapiChangeMutation = useMutation(async (values) => await webapi.changeReport(values));
  const backendChangeMutation = useMutation(async (values) => await backend.changeObject('/api/v2/internal/reports/', values));
  const webapiDeleteMutation = useMutation(async (idReport) => await webapi.deleteReport(idReport));
  const backendDeleteMutation = useMutation(async (idReport) => await backend.deleteObject(`/api/v2/internal/reports/${idReport}`));

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true),
    { enabled: !publicView }
  );

  const { data: backendReport, error: errorBackendReport, isLoading: loadingBackendReport } = useQuery(
    [`${publicView ? 'public_' : ''}report`, 'backend', report_name], async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}reports/${report_name}`)
    },
    {
      enabled: publicView || (!!userDetails && !addview),
      initialData: () => {
        return queryClient.getQueryData([`${publicView ? 'public_' : ''}report`, 'backend'])?.find(rep => rep.name === report_name)
      }
    }
  )

  const { data: topologyGroups, error: topologyGroupsErrors, isLoading: loadingTopologyGroups } = useQuery(
    `${publicView ? 'public_' : ''}topologygroups`, () => fetchTopologyGroups(webapi),
    { enabled: publicView || !!userDetails }
  );

  const { data: topologyEndpoints, error: topologyEndpointsErrors, isLoading: loadingTopologyEndpoints } = useQuery(
    `${publicView ? 'public_' : ''}topologyendpoints`, () => fetchTopologyEndpoints(webapi),
    { enabled: publicView || !!userDetails }
  );

  const { data: topologyTags, error: topologyTagsError, isLoading: loadingTopologyTags } = useQuery(
    'topologytags', () => fetchTopologyTags(webapi),
    { enabled: !publicView && !!userDetails }
  );

  const { data: webApiReport, error: errorWebApiReport, isLoading: loadingWebApiReport } = useQuery(
    [`${publicView ? 'public_' : ''}report`, 'webapi', report_name], () => fetchReport(webapi, report_name),
    { enabled: publicView || (!!userDetails && !addview) }
  )

  const { data: listMetricProfiles, error: listMetricProfilesError, isLoading: listMetricProfilesLoading } = useQuery(
    [`${publicView ? 'public_' : ''}metricprofile`, 'webapi'],  () => fetchMetricProfiles(webapi),
    { enabled: !publicView && !!userDetails }
  );

  const { data: listAggregationProfiles, error: listAggregationProfilesError, isLoading: listAggregationProfilesLoading } = useQuery(
    [`${publicView ? 'public_' : ''}aggregationprofile`, 'webapi'], () => fetchAggregationProfiles(webapi),
    { enabled: !publicView && !!userDetails }
  );

  const { data: listOperationsProfiles, error: listOperationsProfilesError, isLoading: listOperationsProfilesLoading } = useQuery(
    `${publicView ? 'public_' : ''}operationsprofile`, () => fetchOperationsProfiles(webapi),
    { enabled: !publicView && !!userDetails }
  );

  const { data: listThresholdsProfiles, error: listThresholdsProfilesError, isLoading: listThresholdsProfilesLoading } = useQuery(
    [`${publicView ? 'public_' : ''}thresholdsprofile`, 'webapi'], () => fetchThresholdsProfiles(webapi),
    { enabled: !publicView && !!userDetails }
  )

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

  const formatToReportTags = (tagsContext, formikTags, formikExtensions) => {
    const formatTag = (tag, prefix='') => {
      let tmpTag = new Object()
      if (tag.value.indexOf('|') !== -1) {
        let values = tag.value.replace(/\|/g, ', ')
        tmpTag = new Object({
          name: `${prefix}${tag.name}`,
          value: values,
          context: tagsContext.replace(".filter.tags", ".filter.tags.array")
        })
      }
      else if (tag.value.indexOf(' ') === -1
        && tag.value.toLowerCase() !== 'yes'
        && tag.value.toLowerCase() !== 'no'
        && tag.value.toLowerCase() !== '1'
        && tag.value.toLowerCase() !== '0') {
        tmpTag['name'] = `${prefix}${tag.name}`
        tmpTag['value'] = tag.value
        tmpTag['context'] = tagsContext.replace(".filter.tags", ".filter.tags.array")
      }
      else {
        let tmpTagValue = tag.value
        if (tag.value.toLowerCase() === 'yes')
          tmpTagValue = '1'
        else if (tag.value === 'no')
          tmpTagValue = '0'
        tmpTag['name'] = `${prefix}${tag.name}`
        tmpTag['value'] = tmpTagValue
        tmpTag['context'] = tagsContext
      }
      return tmpTag
    }

    let tags = new Array()

    for (let tag of formikTags) {
      if (tag && tag.value !== '')
        tags.push(formatTag(tag))
    }

    for (let tag of formikExtensions)
      tags.push(formatTag(tag, 'info_ext_'))

    return tags
  }

  const formatToReportEntities = (context, formikEntities) => {
    let entities = new Array()

    for (var i = 0; i < formikEntities.length; i++) {
      let entity = formikEntities[i]
      let tmpEntity = new Object()
      let tmpEntites = new Array()
      if (entity.value && entity.value.indexOf('|') !== -1) {
        let values = entity.value.split('|')
        for (var val of values)
          if (val)
            tmpEntites.push(new Object({
              name: i === 0 ? 'group' : 'subgroup',
              value: val.trim(),
              context: context
            }))
        entities = [...entities, ...tmpEntites]
      }
      else {
        if (entity.value) {
          tmpEntity['name'] = i === 0 ? 'group' : 'subgroup',
          tmpEntity['value'] = entity.value
          tmpEntity['context'] = context
          entities.push(tmpEntity)
        }
      }
    }
    return entities
  }

  const formatFromReportTags = (tagsContext, formikTags) => {
    if (!formikTags)
      return new Array()

    let tmpTagsJoint = new Object()
    let tags = new Array()
    let extensions = new Array()


    for (let tag of formikTags) {
      for (let tagContext of tagsContext) {
        if (tag.context === tagContext) {
          if (tmpTagsJoint[tag.name] === undefined)
            tmpTagsJoint[tag.name] = new Array()
          tmpTagsJoint[tag.name].push(tag.value)
        }
      }
    }

    for (let tag in tmpTagsJoint) {
      if (tag.startsWith('info_ext_'))
        extensions.push(
          new Object({
            name: tag.substring(9),
            value: tmpTagsJoint[tag].join().replace(/, /g, '|')
          })
        )
      else
        tags.push(new Object({
          'name': tag,
          'value': tmpTagsJoint[tag].join().replace(/, /g, '|')
        }))
    }

    return [tags, extensions]
  }

  const formatFromReportEntities = (context, formikEntities, topologyGroups) => {
    let default_empty = new Object(
      {
        'name': undefined,
        'value': undefined
      }
    )

    if (!formikEntities || (formikEntities && formikEntities.length === 0))
      return new Array(default_empty, default_empty)

    let context_found = formikEntities.filter(item => item["context"] === context)
    if (context_found.length === 0)
      return new Array(default_empty, default_empty)

    let tmpEntityJoint = new Object()
    let entities = new Array()

    for (let entity of formikEntities) {
      if (entity.context === context) {
        let entity_type = undefined
        for (var type in topologyGroups)
          if (topologyGroups[type].indexOf(entity.value) > -1) {
            entity_type = type
            break
          }
        if (tmpEntityJoint[entity_type] === undefined)
          tmpEntityJoint[entity_type] = new Array()
        if (entity_type)
          tmpEntityJoint[entity_type].push(entity.value)
      }
    }

    for (let entity in tmpEntityJoint)
      entities.push(new Object({
        'name': entity,
        'value': tmpEntityJoint[entity].join('|')
      }))

    let final_entities = new Array()
    if (entities.length === 1) {
      let only_type = entities[0].name.toLowerCase()
      if (only_type.indexOf('ngi') !== -1 || only_type.indexOf('project') !== -1)
        final_entities = [entities[0], default_empty]
      else if (only_type.indexOf('site') !== -1 || only_type.indexOf('servicegroup') !== -1)
        final_entities = [default_empty, entities[0]]
    }
    else
      final_entities = entities

    return final_entities
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

    if (profiletype === 'thresholds') {
      profile = listThresholdsProfiles.filter(
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

  const doDelete = (idReport) => {
    webapiDeleteMutation.mutate(idReport, {
      onSuccess: () => {
        backendDeleteMutation.mutate(idReport, {
          onSuccess: () => {
            NotifyOk({
              msg: 'Report successfully deleted',
              title: 'Deleted',
              callback: () => history.push('/ui/reports')
            });
          },
          onError: (error) => {
            NotifyError({
              title: 'Internal API error',
              msg: error.message ? error.message : 'Internal API error deleting report'
            })
          }
        })
      },
      onError: (error) => {
        NotifyError({
          title: 'Web API error',
          msg: error.message ? error.message : 'Web API error deleting report'
        })
      }
    })
    queryClient.invalidateQueries('report')
  }

  const doChange = (formValues) => {
    let dataToSend = new Object()
    dataToSend.info = {
      name: formValues.name,
      description: formValues.description,
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
    let extractedThresholdsProfile = extractProfileMetadata(
      'thresholds', formValues.thresholdsProfile
    )
    dataToSend.profiles = new Array()
    dataToSend['profiles'].push(extractedMetricProfile)
    dataToSend['profiles'].push(extractedAggregationProfile)
    dataToSend['profiles'].push(extractedOperationProfile)
    if (extractedThresholdsProfile)
      dataToSend['profiles'].push(extractedThresholdsProfile)
    let groupTagsFormatted = formatToReportTags('argo.group.filter.tags', formValues.groupsTags, formikValues.groupsExtensions)
    let endpointTagsFormatted = formatToReportTags('argo.endpoint.filter.tags', formValues.endpointsTags, formikValues.endpointsExtensions)
    let groupEntitiesFormatted = formatToReportEntities('argo.group.filter.fields', formValues.entities)
    dataToSend['filter_tags'] = [...groupTagsFormatted,
      ...endpointTagsFormatted, ...groupEntitiesFormatted]
    dataToSend['topology_schema'] = formatTopologySchema(formValues.topologyType)

    if (addview) {
      webapiAddMutation.mutate(dataToSend, {
        onSuccess: (data) => {
          backendAddMutation.mutate({
            apiid: data.data.id,
            name: dataToSend.info.name,
            groupname: formValues.groupname,
            description: formValues.description,
          }, {
            onSuccess: () => {
              queryClient.invalidateQueries('report');
              NotifyOk({
                msg: 'Report successfully added',
                title: 'Added',
                callback: () => history.push('/ui/reports')
              });
            },
            onError: (error) => {
              NotifyError({
                title: 'Internal API error',
                msg: error.message ? error.message : 'Internal API error adding report'
              })
            }
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Web API error',
            msg: error.message ? error.message : 'Web API error adding report'
          })
        }
      })
    }
    else {
      dataToSend.id = webApiReport.id
      webapiChangeMutation.mutate(dataToSend, {
        onSuccess: () => {
          backendChangeMutation.mutate({
            apiid: dataToSend.id,
            name: dataToSend.info.name,
            groupname: formValues.groupname,
            description: formValues.description,
          }, {
            onSuccess: () => {
              queryClient.invalidateQueries('report');
              NotifyOk({
                msg: 'Report successfully changed',
                title: 'Changed',
                callback: () => history.push('/ui/reports')
              });
            },
            onError: (error) => NotifyError({
              title: 'Internal API error',
              msg: error.message ? error.message : 'Internal API error changing report'
            })
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Web API error',
            msg: error.message ? error.message : 'Web API error changing report'
          })
        }
      })
    }
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(formikValues.id)
    else if (onYes === 'change')
      doChange(formikValues)
  }

  const loading = publicView ?
    loadingBackendReport || loadingWebApiReport
  :
    loadingUserDetails || loadingBackendReport || loadingWebApiReport || listMetricProfilesLoading || listAggregationProfilesLoading || listOperationsProfilesLoading || listThresholdsProfilesLoading || loadingTopologyTags || loadingTopologyGroups || loadingTopologyEndpoints

  if (loading)
    return (<LoadingAnim/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (errorBackendReport)
    return (<ErrorComponent error={errorBackendReport} />)

  else if (errorWebApiReport)
    return (<ErrorComponent error={errorWebApiReport} />)

  else if (listMetricProfilesError)
    return (<ErrorComponent error={listMetricProfilesError}/>);

  else if (listAggregationProfilesError)
    return (<ErrorComponent error={listAggregationProfilesError}/>);

  else if (listOperationsProfilesError)
    return (<ErrorComponent error={listOperationsProfilesError}/>);

  else if (listThresholdsProfilesError)
    return (<ErrorComponent error={listThresholdsProfilesError} />)

  else if (topologyTagsError)
    return (<ErrorComponent error={topologyTagsError} />)

  else if (topologyGroupsErrors)
    return (<ErrorComponent error={topologyGroupsErrors} />)

  else if (topologyEndpointsErrors)
    return (<ErrorComponent error={topologyEndpointsErrors} />)

  else if (!loading) {
    let metricProfile = '';
    let aggregationProfile = '';
    let operationsProfile = '';
    let thresholdsProfile = '';

    let entitiesSites = new Array()
    let entitiesNgi = new Array()
    let entitiesProjects= new Array()
    let entitiesServiceGroups = new Array()
    let entitiesFormik = new Array()
    let groupsTags = undefined
    let endpointsTags = undefined
    let groupsExtensions = undefined
    let endpointsExtensions = undefined

    if (webApiReport && webApiReport.profiles) {
      webApiReport.profiles.forEach(profile => {
        if (profile.type === 'metric')
          metricProfile = profile.name;

        if (profile.type === 'aggregation')
          aggregationProfile = profile.name;

        if (profile.type === 'operations')
          operationsProfile = profile.name;

        if (profile.type == 'thresholds')
          thresholdsProfile = profile.name;
      })
    }

    if (topologyGroups && entitiesNgi.length === 0 && entitiesSites.length === 0
      && entitiesProjects.length === 0 && entitiesServiceGroups.length === 0) {
      let ngis = new Set()
      let projects = new Set()
      let servicegroups = new Set()
      let sites = new Set()

      for (var entity of topologyGroups) {
        if (entity['type'].toLowerCase() === 'project') {
          projects.add(entity['group'])
          servicegroups.add(entity['subgroup'])
        }

        else if (entity['type'].toLowerCase() === 'ngi') {
          ngis.add(entity['group'])
          sites.add(entity['subgroup'])
        }
      }
      entitiesNgi = Array.from(ngis).sort(sortStr)
      entitiesSites = Array.from(sites).sort(sortStr)
      entitiesProjects = Array.from(projects).sort(sortStr)
      entitiesServiceGroups = Array.from(servicegroups).sort(sortStr)
    }

    if (!addview && webApiReport
      && (
        (entitiesNgi.length > 0 && entitiesSites.length > 0)
        || (entitiesProjects.length > 0 && entitiesServiceGroups.length > 0)
      )
    ) {
      entitiesFormik = formatFromReportEntities('argo.group.filter.fields',
        webApiReport['filter_tags'], {
          entitiesNgi,
          entitiesSites,
          entitiesProjects,
          entitiesServiceGroups
        })
    }
    else if (addview)
      entitiesFormik = new Array(
        new Object({
          'name': undefined,
          'value': undefined
        }),
        new Object({
          'name': undefined,
          'value': undefined
        })
      )

    let write_perm = undefined;
    let grouplist = undefined;

    if (!publicView) {
      if (!addview) {
        write_perm = userDetails.is_superuser ||
              userDetails.groups.reports.indexOf(backendReport.groupname) >= 0;
      }
      else {
        write_perm = userDetails.is_superuser ||
          userDetails.groups.reports.length > 0;
      }
    }

    if (write_perm)
      grouplist = userDetails.groups.reports
    else
      grouplist = [backendReport.groupname]

    var allTags = new Array()
    var allExtensions = new Array()

    if (topologyTags) {
      for (let entity of topologyTags) {
        let tmpTags = new Array()
        let tmpExtensions = new Array()
        for (let item of entity['values']) {
          if (item['name'].startsWith('info_ext_'))
            tmpExtensions.push(
              new Object({
                name: item['name'].substring(9),
                values: item['values']
              })
            )

          else if (!item['name'].startsWith('info_') && !item['name'].startsWith('vo_'))
            tmpTags.push(item)
        }
        allTags.push(
          new Object({
            name: entity['name'],
            values: tmpTags
          })
        )
        allExtensions.push(
          new Object({
            name: entity['name'],
            values: tmpExtensions
          })
        )
      }
    }

    if (!addview && groupsTags === undefined && endpointsTags == undefined
      && groupsExtensions === undefined && endpointsExtensions === undefined ) {
      let [gt, ge] = formatFromReportTags([
        'argo.group.filter.tags', 'argo.group.filter.tags.array'],
        webApiReport['filter_tags'])
      let [et, ee] = formatFromReportTags([
        'argo.endpoint.filter.tags', 'argo.endpoint.filter.tags.array'],
        webApiReport['filter_tags'])

      let preselectedtags = JSON.parse(JSON.stringify(tagsState))
      let preselectedexts = JSON.parse(JSON.stringify(extensionsState))
      preselectedtags['groups'] = new Object()
      preselectedtags['endpoints'] = new Object()
      preselectedexts['groups'] = new Object()
      preselectedexts['endpoints'] = new Object()

      endpointsTags = et
      groupsExtensions = ge
      groupsTags = gt
      endpointsExtensions = ee

      groupsTags && groupsTags.forEach((e, i) => {
        preselectedtags['groups'][i] = e.name
      })
      endpointsTags && endpointsTags.forEach((e, i) => {
        preselectedtags['endpoints'][i] = e.name
      })
      groupsExtensions && groupsExtensions.forEach((e, i) => {
        preselectedexts['groups'][i] = e.name
      })
      endpointsExtensions && endpointsExtensions.forEach((e, i) => {
        preselectedexts['endpoints'][i] = e.name
      })

      if (tagsState['groups'] === undefined
        && tagsState['endpoints'] === undefined)
        setTagsState(preselectedtags)

      if (
        extensionsState['groups'] === undefined &&
        extensionsState['endpoints'] == undefined
      )
        setExtensionsState(preselectedexts)
    }
    else if ((addview || publicView) && groupsTags === undefined
      && endpointsTags == undefined && groupsExtensions === undefined
      && endpointsExtensions === undefined) {
      endpointsTags = new Array()
      groupsExtensions = new Array()
      groupsTags = new Array()
      endpointsExtensions = new Array()
    }

    return (
      <BaseArgoView
        resourcename={publicView ? 'Report details' : 'report'}
        location={location}
        modal={true}
        state={{areYouSureModal, 'modalFunc': onYesCallback, modalTitle, modalMsg}}
        toggle={() => setAreYouSureModal(!areYouSureModal)}
        submitperm={write_perm}
        addview={addview}
        publicview={publicView}
        history={false}
      >
        <Formik
          validationSchema={ReportsSchema}
          initialValues = {{
            id: webApiReport ? webApiReport.id : '',
            disabled: webApiReport ? webApiReport.disabled : false,
            name: webApiReport ? webApiReport.info ? webApiReport.info.name : '' : '',
            description: webApiReport ? webApiReport.info ? webApiReport.info.description : '' : '',
            metricProfile: metricProfile,
            aggregationProfile: aggregationProfile,
            operationsProfile: operationsProfile,
            thresholdsProfile: thresholdsProfile,
            availabilityThreshold: webApiReport ? webApiReport.thresholds ? webApiReport.thresholds.availability : '' : '',
            reliabilityThreshold: webApiReport ? webApiReport.thresholds ? webApiReport.thresholds.reliability : '' : '',
            uptimeThreshold: webApiReport ? webApiReport.thresholds ? webApiReport.thresholds.uptime : '' : '',
            unknownThreshold: webApiReport ? webApiReport.thresholds ? webApiReport.thresholds.unknown : '' : '',
            downtimeThreshold: webApiReport ? webApiReport.thresholds ? webApiReport.thresholds.downtime : '' : '',
            topologyType: whichTopologyType(webApiReport ? webApiReport.topology_schema : {}),
            groupname: backendReport ? backendReport.groupname : '',
            groupsTags: groupsTags,
            endpointsTags: endpointsTags,
            groupsExtensions: groupsExtensions,
            endpointsExtensions: endpointsExtensions,
            entities: entitiesFormik
          }}
          enableReinitialize={true}
          onSubmit = {(values) => onSubmitHandle(values)}
        >
          {(props) => (
            <Form data-testid='form'>
              <FormGroup>
                <Row className='align-items-center'>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupText>Name</InputGroupText>
                      <Field
                        type='text'
                        name='name'
                        data-testid='name'
                        className={`form-control form-control-lg ${props.errors.name && 'border-danger'}`}
                        disabled={publicView}
                      />
                    </InputGroup>
                    <CustomError error={props.errors.name} />
                    <FormText color='muted'>
                      Report name
                    </FormText>
                  </Col>
                  <Col md={2}>
                    <Row>
                      <FormGroup check inline className='ms-3'>
                        <Input
                          type='checkbox'
                          id='disabled'
                          name='disabled'
                          disabled={publicView}
                          onChange={e => props.setFieldValue('disabled', e.target.checked)}
                          checked={props.values.disabled}
                        />
                        <Label check for='disabled'>Disabled</Label>
                      </FormGroup>
                    </Row>
                    <Row>
                      <FormText color='muted'>
                        Mark report as disabled.
                      </FormText>
                    </Row>
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
                      disabled={publicView}
                    />
                    <FormText color='muted'>
                      Free text report description.
                    </FormText>
                  </Col>
                </Row>
                <Row className='mt-4'>
                  <Col md={3}>
                    <InputGroup>
                      <InputGroupText>Group</InputGroupText>
                      {
                        publicView ?
                          <Field
                            type='text'
                            name='groupname'
                            data-testid='groupname'
                            className='form-control'
                            disabled={true}
                          />
                        :
                          <div className='react-select form-control p-0'>
                            <CustomReactSelect
                              name='groupname'
                              inputgroup={ true }
                              error={props.errors.groupname}
                              options={
                                grouplist.map((group) => new Object({
                                  label: group, value: group
                                }))
                               }
                               value={
                                 props.values.groupname ?
                                  { label: props.values.groupname, value: props.values.groupname }
                                  : undefined
                               }
                               onChange={ e => props.setFieldValue('groupname', e.value) }
                            />
                          </div>
                      }
                    </InputGroup>
                    {
                      !publicView &&
                        <CustomError error={props.errors.groupname} />
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
                    {
                      publicView ?
                        <>
                          <Label for='metricProfile'>Metric profile:</Label>
                          <Field
                            type='text'
                            id='metricProfile'
                            name='metricProfile'
                            className='form-control'
                            disabled={true}
                          />
                        </>
                      :
                        <Field
                          id='metricProfile'
                          name='metricProfile'
                          component={ProfileSelect}
                          error={props.errors.metricProfile}
                          options={
                            extractProfileNames(listMetricProfiles).map((profile) => new Object({
                              label: profile, value: profile
                            }))
                          }
                          onChangeHandler={(e) => props.setFieldValue('metricProfile', e.value)}
                          label='Metric profile:'
                          initVal={ !addview ? props.values.metricProfile : null }
                          required={true}
                        />
                    }
                    <CustomError error={props.errors.metricProfile} />
                  </Col>
                  <Col md={4}>
                    {
                      publicView ?
                        <>
                          <Label for='aggregationProfile'>Aggregation profile:</Label>
                          <Field
                            type='text'
                            id='aggregationProfile'
                            name='aggregationProfile'
                            className='form-control'
                            disabled={true}
                          />
                        </>
                      :
                        <Field
                          id='aggregationProfile'
                          name='aggregationProfile'
                          component={ProfileSelect}
                          error={props.errors.aggregationProfile}
                          options={
                            extractProfileNames(listAggregationProfiles).map((profile) => new Object({
                              label: profile, value: profile
                            }))
                          }
                          onChangeHandler={ (e) => props.setFieldValue('aggregationProfile', e.value) }
                          label='Aggregation profile:'
                          initVal={ !addview ? props.values.aggregationProfile : null }
                          required={true}
                        />
                    }
                    <CustomError error={props.errors.aggregationProfile} />
                  </Col>
                  <Col md={4}>
                    {
                      publicView ?
                        <>
                          <Label for='operationsProfile'>Operations profile:</Label>
                          <Field
                            type='text'
                            id='operationsProfile'
                            name='operationsProfile'
                            className='form-control'
                            disabled={true}
                          />
                        </>
                      :
                        <Field
                          name='operationsProfile'
                          id='operationsProfile'
                          component={ProfileSelect}
                          error={props.errors.operationsProfile}
                          options={
                            extractProfileNames(listOperationsProfiles).map((profile) => new Object({
                              label: profile, value: profile
                            }))
                          }
                          onChangeHandler={ (e) =>
                            props.setFieldValue('operationsProfile', e.value)
                          }
                          label='Operations profile:'
                          initVal={ !addview ? props.values.operationsProfile : null }
                          required={true}
                        />
                    }
                    <CustomError error={props.errors.operationsProfile} />
                  </Col>
                </Row>
                <Row className='mt-4'>
                  <Col md={4}>
                    {
                      publicView ?
                        <>
                          <Label for='thresholdsProfile'>Thresholds profile:</Label>
                          <Field
                            type='text'
                            id='thresholdsProfile'
                            name='thresholdsProfile'
                            className='form-control'
                            disabled={true}
                          />
                        </>
                      :
                        <Field
                          name='thresholdsProfile'
                          id='thresholdsProfile'
                          component={ProfileSelect}
                          options={
                            extractProfileNames(listThresholdsProfiles).map((profile) => new Object({
                              label: profile, value: profile
                            }))
                          }
                          onChangeHandler={ (e) => {
                            if (e)
                              props.setFieldValue('thresholdsProfile', e.value)
                            else
                              props.setFieldValue('thresholdsProfile', null)
                          }}
                          label='Thresholds profile:'
                          initVal={ !addview ? props.values.thresholdsProfile : null }
                        />
                    }
                  </Col>
                </Row>
              </FormGroup>
              <FormGroup className='mt-4'>
                <ParagraphTitle title='Topology configuration'/>
                <Row>
                  <Col md={2}>
                    {
                      publicView ?
                        <>
                          <Label for='topologyType'>Topology type:</Label>
                          <Field
                            type='text'
                            id='topologyType'
                            name='topologyType'
                            className='form-control'
                            disabled={true}
                          />
                        </>
                      :
                        <CustomReactSelect
                          id='topologyType'
                          name='topologyType'
                          error={props.errors.topologyType}
                          label='Topology type:'
                          onChange={ e => props.setFieldValue('topologyType', e.value) }
                          options={
                            topologyTypes.map(type => new Object({
                              label: type, value: type
                            }))
                          }
                          value={
                            props.values.topologyType ?
                              { label: props.values.topologyType, value: props.values.topologyType }
                            : undefined
                          }
                        />
                    }
                    <CustomError error={props.errors.topologyType} />
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Card className="mt-3" data-testid="card-group-of-groups">
                      <CardHeader>
                        <strong>Group of groups</strong>
                      </CardHeader>
                      <CardBody>
                        <CardTitle className="mb-2">
                          <strong>Tags</strong>
                        </CardTitle>
                        <FieldArray
                          name="groupsTags"
                          render={props => (
                            <TopologyTagList
                              part="groups"
                              fieldName="groupsTags"
                              tagsState={tagsState}
                              setTagsState={setTagsState}
                              tagsAll={allTags}
                              publicView={publicView}
                              {...props}/>
                          )}
                        />
                        <div>
                          <hr style={{'borderTop': '1px solid #b5c4d1'}}/>
                        </div>
                        <CardTitle className="mb-2">
                          <strong>Extensions</strong>
                        </CardTitle>
                        <FieldArray
                            name="groupsExtensions"
                            render={ props => (
                              <TopologyTagList
                                {...props}
                                part="groups"
                                fieldName="groupsExtensions"
                                tagsState={extensionsState}
                                setTagsState={setExtensionsState}
                                tagsAll={allExtensions}
                                publicView={publicView}
                              />
                            ) }
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
                              topoGroups={{
                                entitiesNgi, entitiesSites,
                                entitiesProjects, entitiesServiceGroups
                              }}
                              addview={addview}
                              publicView={publicView}
                              {...props}
                            />
                          )}
                        />
                      </CardBody>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="mt-3" data-testid='card-group-of-endpoints'>
                      <CardHeader>
                        <strong>Group of endpoints</strong>
                      </CardHeader>
                      <CardBody>
                        <CardTitle className="mb-2">
                          <strong>Tags</strong>
                        </CardTitle>
                        <FieldArray
                          name="endpointsTags"
                          render={propsLocal => (
                            <TopologyTagList
                              part="endpoints"
                              fieldName="endpointsTags"
                              tagsState={tagsState}
                              setTagsState={setTagsState}
                              tagsAll={allTags}
                              addview={addview}
                              publicView={publicView}
                              {...propsLocal}/>
                          )}
                        />
                        <div>
                          <hr style={{'borderTop': '1px solid #b5c4d1'}}/>
                        </div>
                        <CardTitle className="mb-2">
                          <strong>Extensions</strong>
                        </CardTitle>
                        <FieldArray
                            name="endpointsExtensions"
                            render={ propsLocal => (
                              <TopologyTagList
                                {...propsLocal}
                                part="endpoints"
                                fieldName="endpointsExtensions"
                                tagsState={extensionsState}
                                setTagsState={setExtensionsState}
                                tagsAll={allExtensions}
                                addview={addview}
                                publicView={publicView}
                              />
                            ) }
                          />
                      </CardBody>
                    </Card>
                  </Col>
                </Row>
              </FormGroup>
              <FormGroup className='mt-4'>
                <ParagraphTitle title='Thresholds'/>
                <Row>
                  <Col md={2} className='me-4'>
                    <Label for='availabilityThreshold'>Availability:</Label>
                    <Field
                      id='availabilityThreshold'
                      name='availabilityThreshold'
                      className={`form-control ${props.errors.availabilityThreshold && 'border-danger'}`}
                      disabled={publicView}
                    />
                    <CustomError error={props.errors.availabilityThreshold} />
                  </Col>
                  <Col md={2} className='me-4'>
                    <Label for='reliabilityThreshold'>Reliability:</Label>
                    <Field
                      id='reliabilityThreshold'
                      name='reliabilityThreshold'
                      className={`form-control ${props.errors.reliabilityThreshold && 'border-danger'}`}
                      disabled={publicView}
                    />
                    <CustomError error={props.errors.reliabilityThreshold} />
                  </Col>
                  <Col md={2} className='me-4'>
                    <Label for='uptimeThreshold'>Uptime:</Label>
                    <Field
                      id='uptimeThreshold'
                      name='uptimeThreshold'
                      className={`form-control ${props.errors.uptimeThreshold && 'border-danger'}`}
                      disabled={publicView}
                    />
                    <CustomError error={props.errors.uptimeThreshold} />
                  </Col>
                  <Col md={2} className='me-4'>
                    <Label for='unknownThreshold'>Unknown:</Label>
                    <Field
                      id='unknownThreshold'
                      name='unknownThreshold'
                      className={`form-control ${props.errors.unknownThreshold && 'border-danger'}`}
                      disabled={publicView}
                    />
                    <CustomError error={props.errors.unknownThreshold} />
                  </Col>
                  <Col md={2} className='me-4'>
                    <Label for='downtimeThreshold'>Downtime:</Label>
                    <Field
                      id='downtimeThreshold'
                      name='downtimeThreshold'
                      className={`form-control ${props.errors.downtimeThreshold && 'border-danger'}`}
                      disabled={publicView}
                    />
                    <CustomError error={props.errors.downtimeThreshold} />
                  </Col>
                </Row>
              </FormGroup>
              {
                (!publicView && write_perm) &&
                <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                  {
                    !addview ?
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
                    :
                      <div></div>
                  }
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
