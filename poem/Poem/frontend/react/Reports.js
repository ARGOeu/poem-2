import React, { useContext, useState } from 'react';
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
  CustomDropdownIndicator
 } from './UIElements';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
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
  Input,
  Form,
  FormFeedback
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
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ErrorMessage } from '@hookform/error-message';
import CreatableSelect from 'react-select/creatable';


const ReportsChangeContext = React.createContext()


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


const sortStr = (a, b) => {
  if (a.toLowerCase() < b.toLowerCase()) return -1;
  if (a.toLowerCase() > b.toLowerCase()) return 1;
  if (a.toLowerCase() === b.toLowerCase()) {
    if (a.toLowerCase() < b.toLowerCase()) return -1;
    if (a.toLowerCase() > b.toLowerCase()) return 1;
    if (a.toLowerCase() === b.toLowerCase()) return 0;
  }
}


function preProcessTagValue(data) {
  if (data === '1')
    return 'yes'
  else if (data === '0')
    return 'no'

  return data
}


const entityInitValues = (matchWhat, formvalue) => {
  let tmp = new Array()
  for (let entity of formvalue) {
    if (entity && matchWhat.indexOf(entity.name) > -1) {
      if (entity.value.indexOf('|') > -1) {
        tmp = entity.value.split('|').map(e => new Object({
          'label': e.trim(),
          'value': e.trim()
        }))
      }
      else if (entity.value)
        tmp.push(
          new Object({
            'label': entity.value,
            'value': entity.value
          }))
      else
        tmp.push(undefined)
    }
  }
  return tmp
}


const formatFilteredSelectEntities = (data, entitiesGroups, entitiesEndpoints, topoMaps, lookkey) => {
  let selectedTop = new Array()
  let selectedMiddle = new Array()

  let selectedEntitiesTop = entitiesGroups[0]
  let selectedEntitiesMiddle = entitiesEndpoints[0] && entitiesEndpoints[0]['value'] ? entitiesEndpoints[0] : entitiesGroups[1]

  if (selectedEntitiesTop && selectedEntitiesTop['value']) {
    if (selectedEntitiesTop['value'].includes('|'))
      selectedTop = selectedEntitiesTop['value'].split('|')
    else
      selectedTop = [selectedEntitiesTop['value']]
  }

  if (selectedEntitiesMiddle && selectedEntitiesMiddle['value']) {
    if (selectedEntitiesMiddle['value'].includes('|'))
      selectedMiddle = selectedEntitiesMiddle['value'].split('|')
    else
      selectedMiddle = [selectedEntitiesMiddle['value']]
  }

  if (selectedTop.length > 0 || selectedMiddle.length > 0) {
    let topoTypeMeta = new Array(
      new Object({
        'middleKey': 'entitiesSites',
        'lowerKey': 'serviceTypesSitesEndpoints',
        'topMapKey': 'ngi_sites',
        'middleMapKey': 'site_services'
      }),
      new Object({
        'middleKey': 'entitiesServiceGroups',
        'lowerKey': 'serviceTypesServiceGroupsEndpoints',
        'topMapKey': 'project_servicegroups',
        'middleMapKey': 'servicegroup_services'
      })
    )

    for (var tt of topoTypeMeta) {
      if (lookkey.includes(tt['middleKey'])) {
        let choices = new Array()
        if (selectedTop.length > 0)
          selectedTop.forEach(sel => {
            let sels = topoMaps[tt['topMapKey']].get(sel)
            if (sels)
              choices.push(...sels)
          })
        else
          choices = data
        return formatSelectEntities(choices.sort(sortStr))
      }

      else if (lookkey.includes(tt['lowerKey'])) {
        let services = new Set()
        if (selectedMiddle.length > 0) {
          selectedMiddle.forEach(sel => {
            let sels = topoMaps[tt['middleMapKey']].get(sel)
            if (sels)
              for (var ser of sels)
                services.add(ser)
          })
          return formatSelectEntities(Array.from(services).sort(sortStr))
        }
        else if (selectedTop.length > 0) {
          let sites = new Array()
          selectedTop.forEach(sel => {
            let sels = topoMaps[tt['topMapKey']].get(sel)
            if (sels)
              sites.push(...sels)
          })
          sites.forEach(sel => {
            let sels = topoMaps[tt['middleMapKey']].get(sel)
            if (sels)
              for (var ser of sels)
                services.add(ser)
          })
          return formatSelectEntities(Array.from(services).sort(sortStr))
        }
      }
    }
  }
  else
    return formatSelectEntities(data.sort(sortStr))
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


const TagSelect = ({forwardedRef, tagOptions, onChangeHandler, isMulti,
  closeMenuOnSelect, tagInitials}) => {
  if (tagInitials) {
    return (
      <CustomReactSelect
        forwardedRef={ forwardedRef }
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
        forwardedRef={ forwardedRef }
        closeMenuOnSelect={closeMenuOnSelect}
        isMulti={isMulti}
        isClearable={false}
        onChange={(e) => onChangeHandler(e)}
        options={tagOptions}
      />
    )
  }


const TagCreatable = ({
  forwardedRef,
  tagOptions,
  onChangeHandler,
  tagInitials
}) => {
  if (tagInitials) {
    return (
      <CreatableSelect
        forwardedRef={ forwardedRef }
        closeMenuOnSelect={ false }
        isMulti={ true }
        isClearable={ false }
        onChange={ (e) => onChangeHandler(e) }
        options={ tagOptions }
        components={{ CustomDropdownIndicator }}
        defaultValue={ tagInitials }
      />
    )
  } else {
    return (
      <CreatableSelect
        forwardedRef={ forwardedRef }
        closeMenuOnSelect={ false }
        isMulti={ true }
        isClearable={ false }
        onChange={ (e) => onChangeHandler(e) }
        options={ tagOptions }
        components={{ CustomDropdownIndicator }}
      />
    )
  }
}


const TopologyTagList = ({ part, fieldName, tagsAll, addview, publicView }) => {
  const extractTags = (which, filter=false) => {
    let selected = new Array()
    let tagsState = getValues(fieldName.toLowerCase().endsWith("tags") ? "tagsState" : "extensionsState")

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
    setValue(tagsStateName, newState)
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

  const { control, getValues, setValue } = useFormContext()

  const { fields, append, remove } = useFieldArray({ control, name: fieldName })

  const tagsStateName = fieldName.toLowerCase().endsWith("tags") ? "tagsState" : "extensionsState"

  const tagsState = useWatch({ control, name: tagsStateName })

  return (
    <React.Fragment>
      {
        fields.length === 0 && publicView ?
          <Row className="g-0">
            <Col md={4}>
              <Input
                data-testid={`${fieldName}.0.name`}
                className="form-control"
                disabled={ true }
                value=""
              />
            </Col>
            <Col md={7}>
              <Input
                data-testid={`${fieldName}.0.value`}
                className="form-control"
                disabled={ true }
                value=""
              />
            </Col>
          </Row>
        :
          fields.map((tags, index) => (
            <React.Fragment key={index}>
              <Row key={ tags.id } className="g-0">
                <Col md={4}>
                  <Controller
                    name={ `${fieldName}.${index}.name` }
                    control={ control }
                    render={ ({ field }) =>
                      publicView ?
                        <Input
                          { ...field }
                          data-testid={`${fieldName}.${index}.name`}
                          className="form-control"
                          disabled={ true }
                          value={ getValues(`${fieldName}.${index}.name`) }
                        />
                      :
                        <TagSelect
                          forwardedRef={ field.ref }
                          data-testid={ `${fieldName}.${index}.name` }
                          tagOptions={ extractTags(part, true).map((e) => new Object({
                            'label': e.name,
                            'value': e.name
                          })) }
                          onChangeHandler={(e) => {
                            setValue(`${fieldName}.${index}.name`, e.value)
                            recordSelectedTagKeys(index, e.value)
                          }}
                          isMulti={false}
                          closeMenuOnSelect={true}
                          tagInitials={!addview ? tagsInitValues('name', tags) : undefined}
                        />
                    }
                  />
                </Col>
                <Col md={7}>
                  <Controller
                    name={ `${fieldName}.${index}.value` }
                    control={ control }
                    render={ ({ field }) =>
                      publicView ?
                        <Input
                          { ...field }
                          data-testid={`${fieldName}.${index}.value`}
                          className='form-control'
                          disabled={true}
                          value={preProcessTagValue(tags.value.replace(new RegExp('\\|', 'g'), ', '))}
                        />
                      :
                        isMultiValuesTags(extractValuesTags(index)) ?
                          <TagCreatable
                            forwardedRef={ field.ref }
                            tagOptions={extractValuesTags(index, true)}
                            onChangeHandler={(e) => {
                              if (Array.isArray(e)) {
                                let joinedValues = ''
                                e.forEach((e) => {
                                  joinedValues += e.value + '|'
                                })
                                setValue(`${fieldName}.${index}.value`, joinedValues.replace(/\|$/, ''))
                              }
                              else
                                setValue(`${fieldName}.${index}.value`, e.value.trim())
                            }}
                            tagInitials={!addview ? tagsInitValues('value', tags, true) : undefined}
                          />
                        :
                          <TagSelect
                            forwardedRef={ field.ref }
                            data-testid={`${fieldName}.${index}.value`}
                            tagOptions={extractValuesTags(index, true)}
                            onChangeHandler={(e) => {
                              if (Array.isArray(e)) {
                                let joinedValues = ''
                                e.forEach((e) => {
                                  joinedValues += e.value + '|'
                                })
                                setValue(`${fieldName}.${index}.value`, joinedValues.replace(/\|$/, ''))
                              }
                              else
                                setValue(`${fieldName}.${index}.value`, e.value.trim())
                            }}
                            isMulti={isMultiValuesTags(extractValuesTags(index))}
                            closeMenuOnSelect={!isMultiValuesTags(extractValuesTags(index))}
                            tagInitials={!addview ? tagsInitValues('value', tags, true) : undefined}
                          />
                    }
                  />
                </Col>
                <Col md={1} className="ps-2 pt-1">
                  {
                      !publicView &&
                        <Button
                          size="sm"
                          color="danger"
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
                            setValue(tagsStateName, renumNewState)
                          }}
                        >
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
              <Button
                color="success"
                type="button"
                onClick={ () => { append({name: '', value: ''}) } }
              >
                {`Add new ${fieldName.toLowerCase().endsWith('tags') ? 'tag' : 'extension'}`}
              </Button>
          }
        </Col>
      </Row>
    </React.Fragment>
  )
}


const EntitySelect = ({
  forwardedRef,
  label,
  entitiesOptions,
  onChangeHandler,
  entitiesInitials
}) => {
  if (entitiesInitials)
    return (
      <>
        { label && <Label for="entity-creatable">{ label }</Label> }
        <CreatableSelect
          forwardedRef={ forwardedRef }
          closeMenuOnSelect={ false }
          placeholder="Search..."
          isMulti={ true }
          isClearable={ false }
          onChange={ (e) => onChangeHandler(e) }
          options={ entitiesOptions }
          value={ entitiesInitials }
          inputId="entity-creatable"
        />
      </>
    )
  else
    return (
      <>
        { label && <Label for="entity-creatable">{ label }</Label> }
        <CreatableSelect
          forwardedRef={ forwardedRef }
          closeMenuOnSelect={ false }
          placeholder="Search..."
          isMulti={ true }
          isClearable={ false }
          onChange={ (e) => onChangeHandler(e) }
          options={ entitiesOptions }
          inputId="entity-creatable"
        />
      </>
    )

}


const TopologyConfGroupsEntityFields = ({topoGroups, addview, topoMaps, publicView}) => {
  const { control, getValues, setValue } = useFormContext()

  const topoType = useWatch({ control, name: "topologyType" })
  const entitiesGroups = useWatch({ control, name: "entitiesGroups" })
  const entitiesEndpoints = useWatch({ control, name: "entitiesEndpoints" })

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
      <Label for='topoEntityGroup1'>{label1}</Label>
      <Controller
        name="entitiesGroups.0.value"
        control={ control }
        render={ ({ field }) =>
          publicView ?
            <Input
              { ...field }
              id='topoEntityGroup1'
              className='form-control'
              disabled={true}
              value={field.value?.replace(new RegExp('\\|', 'g'), ', ')}
            />
          :
            <EntitySelect
              forwardedRef={ field.ref }
              id="topoEntityGroup1"
              entitiesOptions={formatSelectEntities(topoGroups[key1])}
              onChangeHandler={(e) => {
                let joinedValues = ''
                for (let event of e)
                  joinedValues += event.value + '|'
                joinedValues = joinedValues.replace(/\|$/, '')
                setValue("entitiesGroups.0.name", key1)
                setValue("entitiesGroups.0.value", joinedValues)
              }}
              entitiesInitials={!addview ? entityInitValues(["entitiesNgi", "entitiesProjects"], getValues("entitiesGroups")) : undefined}
            />
        }
      />
      <Label for='topoEntityGroup2' className='pt-2'>{label2}</Label>
      <Controller
        name="entitiesGroups.1.value"
        control={ control }
        render={ ({ field }) =>
          publicView ?
            <Input
              { ...field }
              id='topoEntityGroup2'
              className='form-control'
              disabled={true}
              value={field.value?.replace(new RegExp('\\|', 'g'), ', ')}
            />
          :
            <EntitySelect
              forwardedRef={ field.ref }
              className="pt-2"
              id="topoEntityGroup2"
              entitiesOptions={formatFilteredSelectEntities(topoGroups[key2], entitiesGroups, entitiesEndpoints, topoMaps, key2)}
              onChangeHandler={(e) => {
                let joinedValues = ''
                for (let event of e)
                  joinedValues += event.value + '|'
                joinedValues = joinedValues.replace(/\|$/, '')
                setValue("entitiesGroups.1.name", key2)
                setValue("entitiesGroups.1.value", joinedValues)
              }}
              entitiesInitials={!addview ? entityInitValues(["entitiesSites", "entitiesServiceGroups"], getValues("entitiesGroups")) : undefined}
            />
        }
      />
    </React.Fragment>
  )
}


const TopologyConfEndpointsEntityFields = ({topoGroups, addview, topoMaps, publicView}) => {
  const { control, getValues, setValue } = useFormContext()

  const topoType = useWatch({ control, name: "topologyType" })
  const entitiesGroups = useWatch({ control, name: "entitiesGroups" })
  const entitiesEndpoints = useWatch({ control, name: "entitiesEndpoints" })

  let label1 = undefined
  let label2 = undefined
  let key1 = undefined
  let key2 = undefined

  if (topoType === 'Sites') {
    label1 = 'Sites:'
    label2 = 'Service types:'
    key1 = 'entitiesSites'
    key2 = 'serviceTypesSitesEndpoints'
  }
  else if (topoType === 'ServiceGroups'){
    label1 = 'Service groups:'
    label2 = 'Service types:'
    key1 = 'entitiesServiceGroups'
    key2 = 'serviceTypesServiceGroupsEndpoints'
  }
  else {
    label1 = 'Upper group:'
    label2 = 'Lower group:'
    key1 = 'entitiesSites'
    key2 = 'serviceTypesSitesEndpoints'
  }

  return (
    <React.Fragment>
      <Label for='topoEntityEndoint1'>{label1}</Label>
      <Controller
        name="entitiesEndpoints.0.value"
        control={ control }
        render={ ({ field }) =>
          publicView ?
            <Input
              { ...field }
              id='topoEntityEndoint1'
              className='form-control'
              disabled={true}
              value={field.value?.replace(new RegExp('\\|', 'g'), ', ')}
            />
          :
            <EntitySelect
              forwardedRef={ field.ref }
              id="topoEntityEndoint1"
              entitiesOptions={
                formatFilteredSelectEntities(
                  topoGroups[key1], entitiesGroups, entitiesEndpoints, topoMaps, key1
              )}
              onChangeHandler={(e) => {
                let joinedValues = ''
                for (let event of e)
                  joinedValues += event.value + '|'
                joinedValues = joinedValues.replace(/\|$/, '')
                setValue("entitiesEndpoints.0.name", key1)
                setValue("entitiesEndpoints.0.value", joinedValues)
              }}
              entitiesInitials={!addview ? entityInitValues(["entitiesSites", "entitiesServiceGroups"], getValues("entitiesEndpoints")) : undefined}
            />
        }
      />
      <Label for='topoEntityEndoint2' className='pt-2'>{label2}</Label>
      <Controller
        name="entitiesEndpoints.1.value"
        control={ control }
        render={ ({ field }) =>
          publicView ?
            <Input
              { ...field }
              id='topoEntityEndoint2'
              className='form-control'
              disabled={true}
              value={field.value?.replace(new RegExp('\\|', 'g'), ', ')}
            />
          :
            <EntitySelect
              forwardedRef={ field.ref }
              className="pt-2"
              id="topoEntityEndoint2"
              entitiesOptions={
                formatFilteredSelectEntities(
                  topoGroups[key2],
                  entitiesGroups,
                  entitiesEndpoints,
                  topoMaps,
                  key2
              )}
              onChangeHandler={(e) => {
                let joinedValues = ''
                for (let event of e)
                  joinedValues += event.value + '|'
                joinedValues = joinedValues.replace(/\|$/, '')
                setValue("entitiesEndpoints.1.name", key2)
                setValue("entitiesEndpoints.1.value", joinedValues)
              }}
              entitiesInitials={!addview ? entityInitValues(["serviceTypesSitesEndpoints", "serviceTypesServiceGroupsEndpoints"], getValues("entitiesEndpoints")) : undefined}
            />
          }
      />
    </React.Fragment>
  )
}


const ProfileSelect = ({ field, error, label, options, onChangeHandler, initVal }) => {
  if (initVal)
    return (
      <CustomReactSelect
        forwardedRef={ field.ref }
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
        forwardedRef={ field.ref }
        label={ label }
        error={ error }
        closeMenuOnSelect={ true }
        isClearable={ field.name === 'thresholdsProfile' }
        onChange={ e => onChangeHandler(e) }
        options={ options }
      />
    )
}


const ReportsForm = ({
  initValues,
  userDetails,
  doChange=undefined,
  doDelete=undefined,
  ...props
}) => {
  const context = useContext(ReportsChangeContext)

  const addview = props.addview
  const publicView = props.publicView
  const location = props.location

  const entitiesNgi = context.entitiesNgi
  const entitiesSites = context.entitiesSites
  const entitiesProjects = context.entitiesProjects
  const entitiesServiceGroups = context.entitiesServiceGroups
  const serviceTypesSitesEndpoints = context.serviceTypesSitesEndpoints
  const serviceTypesServiceGroupsEndpoints = context.serviceTypesServiceGroupsEndpoints

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [onYes, setOnYes] = useState('')

  const methods = useForm({
    defaultValues: initValues,
    mode: "all",
    resolver: yupResolver(ReportsSchema)
  })

  const extractProfileNames = (profiles) => {
    let tmp = new Array();

    for (let profile of profiles)
      tmp.push(profile.name)

    tmp = tmp.sort(sortStr)

    return tmp;
  }

  const onSubmitHandle = async () => {
    let msg = `Are you sure you want to ${addview ? "add" : "change"} report?`
    let title = `${addview ? "Add" : "Change"} report`

    setAreYouSureModal(!areYouSureModal);
    setModalMsg(msg)
    setModalTitle(title)
    setOnYes('change')
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      doDelete(methods.getValues("id"))
    else if (onYes === 'change')
      doChange(methods.getValues())
  }

  let write_perm = undefined;

  if (!publicView) {
    if (!addview) {
      write_perm = userDetails.is_superuser ||
            userDetails.groups.reports.indexOf(initValues.groupname) >= 0;
    }
    else {
      write_perm = userDetails.is_superuser ||
        userDetails.groups.reports.length > 0;
    }
  }

  let grouplist = undefined;

  if (write_perm)
    grouplist = userDetails.groups.reports
  else
    grouplist = [initValues.groupname]


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
      <FormProvider { ...methods }>
        <Form onSubmit={ methods.handleSubmit(onSubmitHandle) } data-testid='form'>
          <FormGroup>
            <Row className='align-items-center'>
              <Col md={6}>
                <InputGroup>
                  <InputGroupText>Name</InputGroupText>
                  <Controller
                    name="name"
                    control={ methods.control }
                    render={ ({ field }) =>
                      <Input
                        { ...field }
                        data-testid="name"
                        className={`form-control form-control-lg ${ methods.formState.errors?.name && "is-invalid" }`}
                        disabled={ publicView }
                      />
                    }
                  />
                  <ErrorMessage
                    errors={ methods.formState.errors }
                    name="name"
                    render={ ({ message }) =>
                      <FormFeedback invalid="true" className="end-0">
                        { message }
                      </FormFeedback>
                    }
                  />
                </InputGroup>
                <FormText color='muted'>
                  Report name
                </FormText>
              </Col>
              <Col md={2}>
                <Row>
                  <FormGroup check inline className='ms-3'>
                    <Controller
                      name="disabled"
                      control={ methods.control }
                      render={ ({ field }) =>
                        <Input
                          { ...field }
                          type="checkbox"
                          id="disabled"
                          disabled={ publicView }
                          onChange={ e => methods.setValue("disabled", e.target.checked) }
                          checked={ field.value }
                        />
                      }
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
                <Controller
                  name="description"
                  control={ methods.control }
                  render={ ({ field }) =>
                    <textarea
                      { ...field }
                      rows={ 4 }
                      id="description"
                      className="form-control"
                      disabled={ publicView }
                    />
                  }
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
                  <Controller
                    name="groupname"
                    control={ methods.control }
                    render={ ({ field }) =>
                      publicView ?
                        <Input
                          { ...field }
                          data-testid="groupname"
                          className="form-control"
                          disabled={ true }
                        />
                      :
                        <div className='react-select form-control p-0'>
                          <CustomReactSelect
                            forwardedRef={ field.ref }
                            inputgroup={ true }
                            error={ methods.formState.errors.groupname }
                            options={
                              grouplist.map((group) => new Object({
                                label: group, value: group
                              }))
                            }
                            value={
                              methods.getValues("groupname") ?
                              { label: methods.getValues("groupname"), value: methods.getValues("groupname") }
                              : undefined
                            }
                            onChange={ e => methods.setValue("groupname", e.value) }
                          />
                        </div>
                    }
                  />
                  {
                    !publicView &&
                      <ErrorMessage
                        errors={ methods.formState.errors }
                        name="groupname"
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                  }
                </InputGroup>
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
                  publicView &&
                    <Label for="metricProfile">Metric profile:</Label>
                }
                <Controller
                  name="metricProfile"
                  control={ methods.control }
                  render={ ({ field }) =>
                    publicView ?
                      <Input
                        { ...field }
                        id="metricProfile"
                        className="form-control"
                        disabled={ true }
                      />
                    :
                      <ProfileSelect
                        field={ field }
                        error={ methods.formState.errors?.metricProfile }
                        options={
                          extractProfileNames(context.listMetricProfiles).map((profile) => new Object({
                            label: profile, value: profile
                          }))
                        }
                        onChangeHandler={(e) => methods.setValue("metricProfile", e.value)}
                        label="Metric profile:"
                        initVal={ !addview ? methods.getValues("metricProfile") : undefined }
                      />
                  }
                />
                <ErrorMessage
                  errors={ methods.formState.errors }
                  name="metricProfile"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </Col>
              <Col md={4}>
                {
                  publicView && <Label for="aggregationProfile">Aggregation profile:</Label>
                }
                <Controller
                  name="aggregationProfile"
                  control={ methods.control }
                  render={ ({ field }) =>
                    publicView ?
                      <Input
                        { ...field }
                        id="aggregationProfile"
                        className="form-control"
                        disabled={ true }
                      />
                    :
                      <ProfileSelect
                        field={ field }
                        error={ methods.formState.errors?.aggregationProfile }
                        options={
                          extractProfileNames(context.listAggregationProfiles).map((profile) => new Object({
                            label: profile, value: profile
                          }))
                        }
                        onChangeHandler={ e => methods.setValue("aggregationProfile", e.value) }
                        label="Aggregation profile:"
                        initVal={ !addview ? methods.getValues("aggregationProfile") : undefined }
                      />
                  }
                />
                <ErrorMessage
                  errors={ methods.formState.errors }
                  name="aggregationProfile"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </Col>
              <Col md={4}>
                {
                  publicView && <Label for="operationsProfile">Operations profile:</Label>
                }
                <Controller
                  name="operationsProfile"
                  control={ methods.control }
                  render={ ({ field }) =>
                    publicView ?
                      <Input
                        { ...field }
                        id="operationsProfile"
                        className="form-control"
                        disabled={ true }
                      />
                    :
                      <ProfileSelect
                        field={ field }
                        error={ methods.formState.errors?.operationsProfile }
                        options={
                          extractProfileNames(context.listOperationsProfiles).map((profile) => new Object({
                            label: profile, value: profile
                          }))
                        }
                        onChangeHandler={ (e) =>
                          methods.setValue("operationsProfile", e.value)
                        }
                        label="Operations profile:"
                        initVal={ !addview ? methods.getValues("operationsProfile") : undefined }
                      />
                  }
                />
                <ErrorMessage
                  errors={ methods.formState.errors }
                  name="operationsProfile"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </Col>
            </Row>
            <Row className='mt-4'>
              <Col md={4}>
                {
                  publicView &&
                    <Label for="thresholdsProfile">Thresholds profile:</Label>
                }
                <Controller
                  name="thresholdsProfile"
                  control={ methods.control }
                  render={ ({ field }) =>
                    publicView ?
                      <Input
                        { ...field }
                        id="thresholdsProfile"
                        className="form-control"
                        disabled={ true }
                      />
                    :
                      <ProfileSelect
                        field={ field }
                        options={
                          extractProfileNames(context.listThresholdsProfiles).map((profile) => new Object({
                            label: profile, value: profile
                          }))
                        }
                        onChangeHandler={ e => {
                          if (e)
                            methods.setValue("thresholdsProfile", e.value)
                          else
                            methods.setValue("thresholdsProfile", null)
                        }}
                        label="Thresholds profile:"
                        initVal={ !addview ? methods.getValues("thresholdsProfile") : null }
                      />
                  }
                />
              </Col>
            </Row>
          </FormGroup>
          <FormGroup className='mt-4'>
            <ParagraphTitle title='Topology configuration'/>
            <Row>
              <Col md={2}>
                {
                  publicView &&
                    <Label for="topologyType">Topology type:</Label>
                }
                <Controller
                  name="topologyType"
                  control={ methods.control }
                  render={ ({ field }) =>
                    publicView ?
                      <Input
                        { ...field }
                        id="topologyType"
                        className="form-control"
                        disabled={ true }
                      />
                    :
                      <CustomReactSelect
                        forwardedRef={ field.ref }
                        error={ methods.formState.errors?.topologyType }
                        label="Topology type:"
                        onChange={ e => methods.setValue("topologyType", e.value) }
                        options={
                          context.topologyTypes.map(type => new Object({
                            label: type, value: type
                          }))
                        }
                        value={
                          methods.getValues("topologyType") ?
                            { label: methods.getValues("topologyType"), value: methods.getValues("topologyType") }
                          : undefined
                        }
                      />
                  }
                />
                <ErrorMessage
                  errors={ methods.formState.errors }
                  name="topologyType"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
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
                    <TopologyTagList
                      part="groups"
                      fieldName="groupsTags"
                      tagsAll={context.allTags}
                      publicView={publicView}
                    />
                    <div>
                      <hr style={{'borderTop': '1px solid #b5c4d1'}}/>
                    </div>
                    <CardTitle className="mb-2">
                      <strong>Extensions</strong>
                    </CardTitle>
                    <TopologyTagList
                      {...props}
                      part="groups"
                      fieldName="groupsExtensions"
                      tagsAll={context.allExtensions}
                      publicView={publicView}
                    />
                    <div>
                      <hr style={{'borderTop': '1px solid #b5c4d1'}}/>
                    </div>
                    <CardTitle className="mb-2">
                      <strong>Entities</strong>
                    </CardTitle>
                    <TopologyConfGroupsEntityFields
                      topoGroups={{
                        entitiesNgi, entitiesSites,
                        entitiesProjects, entitiesServiceGroups
                      }}
                      topoMaps={context.topologyMaps}
                      addview={addview}
                      publicView={publicView}
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
                    <TopologyTagList
                      part="endpoints"
                      fieldName="endpointsTags"
                      tagsAll={context.allTags}
                      addview={addview}
                      publicView={publicView}
                    />
                    <div>
                      <hr style={{'borderTop': '1px solid #b5c4d1'}}/>
                    </div>
                    <CardTitle className="mb-2">
                      <strong>Extensions</strong>
                    </CardTitle>
                    <TopologyTagList
                      part="endpoints"
                      fieldName="endpointsExtensions"
                      tagsAll={context.allExtensions}
                      addview={addview}
                      publicView={publicView}
                    />
                    <div>
                      <hr style={{'borderTop': '1px solid #b5c4d1'}}/>
                    </div>
                    <CardTitle className="mb-2">
                      <strong>Entities</strong>
                    </CardTitle>
                    <TopologyConfEndpointsEntityFields
                      topoGroups={{
                        entitiesSites, entitiesServiceGroups,
                        serviceTypesSitesEndpoints, serviceTypesServiceGroupsEndpoints
                      }}
                      topoMaps={context.topologyMaps}
                      addview={addview}
                      publicView={publicView}
                      {...props}
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
                <Controller
                  name="availabilityThreshold"
                  control={ methods.control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      id='availabilityThreshold'
                      className={`form-control ${methods.formState.errors?.availabilityThreshold && "is-invalid"}`}
                      disabled={publicView}
                    />
                  }
                />
                <ErrorMessage
                  errors={ methods.formState.errors }
                  name="availabilityThreshold"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </Col>
              <Col md={2} className='me-4'>
                <Label for='reliabilityThreshold'>Reliability:</Label>
                <Controller
                  name="reliabilityThreshold"
                  control={ methods.control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      id='reliabilityThreshold'
                      className={`form-control ${methods.formState.errors?.reliabilityThreshold && "is-invalid"}`}
                      disabled={publicView}
                    />
                  }
                />
                <ErrorMessage
                  errors={ methods.formState.errors }
                  name="reliabilityThreshold"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </Col>
              <Col md={2} className='me-4'>
                <Label for='uptimeThreshold'>Uptime:</Label>
                <Controller
                  name="uptimeThreshold"
                  control={ methods.control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      id='uptimeThreshold'
                      className={`form-control ${methods.formState.errors?.uptimeThreshold && "is-invalid"}`}
                      disabled={publicView}
                    />
                  }
                />
                <ErrorMessage
                  errors={ methods.formState.errors }
                  name="uptimeThreshold"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </Col>
              <Col md={2} className='me-4'>
                <Label for='unknownThreshold'>Unknown:</Label>
                <Controller
                  name="unknownThreshold"
                  control={ methods.control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      id='unknownThreshold'
                      className={`form-control ${methods.formState.errors?.unknownThreshold && "is-invalid"}`}
                      disabled={publicView}
                    />
                  }
                />
                <ErrorMessage
                  errors={ methods.formState.errors }
                  name="unknownThreshold"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </Col>
              <Col md={2} className='me-4'>
                <Label for='downtimeThreshold'>Downtime:</Label>
                <Controller
                  name="downtimeThreshold"
                  control={ methods.control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      id='downtimeThreshold'
                      className={`form-control ${methods.formState.errors?.downtimeThreshold && "is-invalid"}`}
                      disabled={publicView}
                    />
                  }
                />
                <ErrorMessage
                  errors={ methods.formState.errors }
                  name="downtimeThreshold"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
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
                      setModalMsg('Are you sure you want to delete report?')
                      setModalTitle('Delete report')
                      setAreYouSureModal(!areYouSureModal);
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
      </FormProvider>
    </BaseArgoView>
  )
}


export const ReportsComponent = (props) => {
  const report_name = props.match.params.name;
  const addview = props.addview
  const publicView = props.publicView
  const history = props.history;

  const backend = new Backend();
  const webapi = new WebApi({
    token: props.webapitoken,
    reportsConfigurations: props.webapireports,
    metricProfiles: props.webapimetric,
    aggregationProfiles: props.webapiaggregation,
    operationsProfiles: props.webapioperations,
    thresholdsProfiles: props.webapithresholds
  });

  const queryClient = useQueryClient();

  const topologyTypes = ['Sites', 'ServiceGroups']

  let topologyMaps = new Object();

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
    const setNameField = (i) => {
        let name_field = ''
        if (i === 0)
          name_field = 'group'
        else if (context.indexOf('argo.group') !== -1 && i === 1)
          name_field = 'subgroup'
        else if (context.indexOf('argo.endpoint') !== -1 && i === 1)
          name_field = 'service'
        return name_field
    }
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
              name: setNameField(i),
              value: val.trim(),
              context: context
            }))
        entities = [...entities, ...tmpEntites]
      }
      else {
        if (entity.value) {
          tmpEntity['name'] = setNameField(i),
          tmpEntity['value'] = entity.value,
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
        if (entity_type) {
          if (tmpEntityJoint[entity_type] === undefined)
            tmpEntityJoint[entity_type] = new Array()
          tmpEntityJoint[entity_type].push(entity.value)
        }
      }
    }

    for (let entity in tmpEntityJoint)
      entities.push(new Object({
        'name': entity,
        'value': tmpEntityJoint[entity].join('|')
      }))

    let final_entities = new Array()
    if (context.indexOf('argo.group') !== -1) {
      if (entities.length === 1) {
        let only_type = entities[0].name.toLowerCase()
        if (only_type.indexOf('ngi') !== -1 || only_type.indexOf('project') !== -1)
          final_entities = [entities[0], default_empty]
        else if (only_type.indexOf('site') !== -1 || only_type.indexOf('servicegroup') !== -1)
          final_entities = [default_empty, entities[0]]
      }
      else
        final_entities = entities
    }
    else if (context.indexOf('argo.endpoint') !== 1) {
      if (entities.length === 1) {
        let only_type = entities[0].name.toLowerCase()
        if (only_type.startsWith('site') || only_type.startsWith('servicegroup'))
          final_entities = [entities[0], default_empty]
        else if (only_type.startsWith('servicetypessites') || only_type.startsWith('servicetypesservicegroups'))
          final_entities = [default_empty, entities[0]]
      }
      else
        final_entities = entities
    }

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
    let groupTagsFormatted = formatToReportTags('argo.group.filter.tags', formValues.groupsTags, formValues.groupsExtensions)
    let endpointTagsFormatted = formatToReportTags('argo.endpoint.filter.tags', formValues.endpointsTags, formValues.endpointsExtensions)
    let groupEntitiesFormatted = formatToReportEntities('argo.group.filter.fields', formValues.entitiesGroups)
    let endpointEntitiesFormatted = formatToReportEntities('argo.endpoint.filter.fields', formValues.entitiesEndpoints)
    dataToSend['filter_tags'] = [...groupTagsFormatted,
      ...endpointTagsFormatted, ...groupEntitiesFormatted, ...endpointEntitiesFormatted]
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
    let entitiesProjects = new Array()
    let entitiesServiceGroups = new Array()
    let serviceTypesServiceGroupsEndpoints = new Array()
    let serviceTypesSitesEndpoints = new Array()
    let entitiesGroupsFormik = new Array()
    let entitiesEndpointsFormik = new Array()
    let groupsTags = undefined
    let endpointsTags = undefined
    let groupsExtensions = undefined
    let endpointsExtensions = undefined

    if (topologyEndpoints && topologyGroups
      && Object.keys(topologyMaps).length === 0) {
      topologyMaps['project_servicegroups'] = new Map()
      topologyMaps['ngi_sites'] = new Map()
      topologyMaps['site_services'] = new Map()
      topologyMaps['servicegroup_services'] = new Map()

      for (let group of topologyGroups) {
        let key = group['group']
        let value = group['subgroup']
        if (group['type'] === 'PROJECT') {
          if (topologyMaps['project_servicegroups'].has(key)) {
            let values = topologyMaps['project_servicegroups'].get(key)
            if (values.indexOf(value) === -1)
              topologyMaps['project_servicegroups'].set(key, [value, ...values])
          }
          else
            topologyMaps['project_servicegroups'].set(key, new Array(value))
        }
        else if (group['type'] === 'NGI') {
          if (topologyMaps['ngi_sites'].has(key)) {
            let values = topologyMaps['ngi_sites'].get(key)
            if (values.indexOf(value) === -1)
              topologyMaps['ngi_sites'].set(key, [value, ...values])
          }
          else
            topologyMaps['ngi_sites'].set(key, new Array(value))
        }
      }
      for (let endpoint of topologyEndpoints) {
        let key = endpoint['group']
        let value = endpoint['service']
        if (endpoint['type'] === 'SITES') {
          if (topologyMaps['site_services'].has(key)) {
            let values = topologyMaps['site_services'].get(key)
            if (values.indexOf(value) === -1)
              topologyMaps['site_services'].set(key, [value, ...values])
          }
          else
            topologyMaps['site_services'].set(key, new Array(value))
        }
        else if (endpoint['type'] === 'SERVICEGROUPS') {
          if (topologyMaps['servicegroup_services'].has(key)) {
            let values = topologyMaps['servicegroup_services'].get(key)
            if (values.indexOf(value) === -1)
              topologyMaps['servicegroup_services'].set(key, [value, ...values])
          }
          else
            topologyMaps['servicegroup_services'].set(key, new Array(value))
        }
      }
    }

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

    if (topologyEndpoints && serviceTypesSitesEndpoints.length === 0 &&
      serviceTypesServiceGroupsEndpoints.length === 0) {
      let servicesSites = new Set()
      let servicesServiceGroups = new Set()

      for (var endpoint of topologyEndpoints) {
        if (endpoint['type'].toLowerCase() === 'sites')
          servicesSites.add(endpoint['service'])
        else if (endpoint['type'].toLowerCase() === 'servicegroups')
          servicesServiceGroups.add(endpoint['service'])
      }
      serviceTypesSitesEndpoints = Array.from(servicesSites).sort(sortStr)
      serviceTypesServiceGroupsEndpoints = Array.from(servicesServiceGroups).sort(sortStr)
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
      entitiesGroupsFormik = formatFromReportEntities('argo.group.filter.fields',
        webApiReport['filter_tags'], {
          entitiesNgi,
          entitiesSites,
          entitiesProjects,
          entitiesServiceGroups
        })
    }
    else if (addview)
      entitiesGroupsFormik = new Array(
        new Object({
          'name': undefined,
          'value': undefined
        }),
        new Object({
          'name': undefined,
          'value': undefined
        })
      )

    if (!addview && webApiReport
      && (
        (entitiesSites.length > 0 && serviceTypesSitesEndpoints.length > 0)
        || (entitiesServiceGroups.length > 0 && serviceTypesServiceGroupsEndpoints.length > 0)
      )
    ) {
      entitiesEndpointsFormik = formatFromReportEntities('argo.endpoint.filter.fields',
        webApiReport['filter_tags'], {
          entitiesSites,
          serviceTypesSitesEndpoints,
          entitiesServiceGroups,
          serviceTypesServiceGroupsEndpoints
        })
    }
    else if (addview)
      entitiesEndpointsFormik = new Array(
        new Object({
          'name': undefined,
          'value': undefined
        }),
        new Object({
          'name': undefined,
          'value': undefined
        })
      )

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

    let preselectedtags = new Object({
      "groups": undefined,
      "endpoints": undefined
    })
    let preselectedexts = new Object({
      "groups": undefined,
      "endpoints": undefined
    })

    if (!addview && groupsTags === undefined && endpointsTags == undefined
      && groupsExtensions === undefined && endpointsExtensions === undefined ) {
      let [gt, ge] = formatFromReportTags([
        'argo.group.filter.tags', 'argo.group.filter.tags.array'],
        webApiReport['filter_tags'])
      let [et, ee] = formatFromReportTags([
        'argo.endpoint.filter.tags', 'argo.endpoint.filter.tags.array'],
        webApiReport['filter_tags'])

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
      <ReportsChangeContext.Provider value={{
        listMetricProfiles: listMetricProfiles,
        listAggregationProfiles: listAggregationProfiles,
        listOperationsProfiles: listOperationsProfiles,
        listThresholdsProfiles: listThresholdsProfiles,
        topologyTypes: topologyTypes,
        allTags: allTags,
        allExtensions: allExtensions,
        entitiesNgi: entitiesNgi,
        entitiesSites: entitiesSites,
        entitiesProjects: entitiesProjects,
        entitiesServiceGroups: entitiesServiceGroups,
        topologyMaps: topologyMaps,
        serviceTypesSitesEndpoints: serviceTypesSitesEndpoints,
        serviceTypesServiceGroupsEndpoints: serviceTypesServiceGroupsEndpoints
      }}>
        <ReportsForm
          initValues={{
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
            entitiesGroups: entitiesGroupsFormik,
            entitiesEndpoints: entitiesEndpointsFormik,
            tagsState: preselectedtags,
            extensionsState: preselectedexts
          }}
          userDetails={ userDetails }
          doChange={ doChange }
          doDelete={ doDelete }
          { ...props }
        />
      </ReportsChangeContext.Provider>
    )
  }

  else
    return null
};
