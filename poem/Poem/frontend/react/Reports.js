import React, { useState } from 'react';
import { Backend, WebApi } from './DataManager';

import { useQuery } from 'react-query';
import {
  LoadingAnim,
  ErrorComponent,
  BaseArgoView,
  ParagraphTitle,
  BaseArgoTable,
  DropDown,
  NotifyOk,
  NotifyError,
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
import Select, { components } from 'react-select';


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


const TagSelect = ({field, tagOptions, onChangeHandler, isMulti, closeMenuOnSelect}) => {
  return (
    <Select
      name={field.name}
      closeMenuOnSelect={closeMenuOnSelect}
      isMulti={isMulti}
      isClearable={false}
      components={isMulti ? components.MultiValueContainer : components.SingleValue}
      onChange={(e) => onChangeHandler(e)}
      options={tagOptions}
    />
  )
}

const TopologyTagList = ({ part, tagsState, setTagsState, tagsAll, push, form, remove }) => {
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

  const extractValuesTags = (index) => {
    if (tagsState[part] !== undefined) {
      let interestTags = extractTags(part)
      interestTags = interestTags.filter((e) => e.name === tagsState[part][index])
      if (interestTags.length > 0) {
        if (interestTags[0].values[0] === '0' ||
          interestTags[0].values[0] === '1') {
          interestTags = interestTags[0].values.map((e) => new Object({
            'label': e === '1' ? 'yes' : 'no',
            'value': e === '1' ? 'yes' : 'no'
          }))
        }
        else {
          interestTags = interestTags[0].values.map((e) => new Object({
            'label': e,
            'value': e
          }))
        }
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
                />
              </Col>
              <Col md={7}>
                <Field
                  name={`${part}.${index}.value`}
                  component={TagSelect}
                  tagOptions={extractValuesTags(index)}
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
                />
              </Col>
              {
                index === form.values[part].length - 1 &&
                <Col md={1} className="pl-2 pt-1">
                  <Button size="sm" color="danger"
                    type="button"
                    onClick={() => {
                      let newState = JSON.parse(JSON.stringify(tagsState))
                      delete newState[part][index]
                      remove(index)
                      setTagsState(newState)
                    }}>
                    <FontAwesomeIcon icon={faTimes}/>
                  </Button>
                </Col>
              }
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


export const ReportsComponent = (props) => {
  const report_name = props.match.params.name;
  const addview = props.addview
  const location = props.location;
  const backend = new Backend();
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

        return report;
      }
      else {
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
      enabled: userDetails
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

  const extractProfileNames = (profiles) => {
    let tmp = new Array();
    profiles.forEach(profile => tmp.push(profile.name));
    return tmp;
  }

  const { data: topologyTags, error: topologyTagsError, isLoading: isLoadingTopologyTags} = useQuery(
    `${querykey}_topologytags`, async () => {
      let tags = await webapi.fetchReportsToplogyTags();
      return tags
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

  const formatFilterTags = (tagtype, formikTags) => {
    let tags = new Array()
    let typeString = undefined

    if (tagtype === 'groups')
      typeString = 'argo.group.filter.tags'
    else if (tagtype == 'endpoints')
      typeString = 'argo.endpoint.filter.tags'

    formikTags.forEach(e => {
      let tmpTag = new Object()
      let tmpTags = new Array()
      if (e.value.indexOf(' ') !== -1) {
        let values = e.value.split(' ')
        for (var tag of values)
          tmpTags.push(new Object({
            name: e.name,
            value: tag,
            context: typeString
          }))
        tags = [...tags, ...tmpTags]
      }
      else {
        tmpTag['name'] = e.name
        tmpTag['value'] = e.value
        tmpTag['context'] = typeString
        tags.push(tmpTag)
      }
    })
    return tags
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
    let groupTagsFormatted = formatFilterTags('groups', formValues.groups)
    let endpointTagsFormatted = formatFilterTags('endpoints', formValues.endpoints)
    dataToSend['filter_tags'] = [...groupTagsFormatted, ...endpointTagsFormatted]
    dataToSend['topology_schema'] = formatTopologySchema(formValues.topologyType)
    console.log(dataToSend)

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
            name: dataToSend.name,
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
  }

  const onYesCallback = () => {
    if (onYes === 'delete')
      console.log(onYes)
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

  else if (report && topologyTags)  {
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
            groups: new Array(),
            endpoints: new Array()
          }}
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
                      className='custom-select'
                    />
                  </Col>
                  <Col md={4}>
                    <Label to='aggregationProfile'>Aggregation profile:</Label>
                    <Field
                      id='aggregationProfile'
                      name='aggregationProfile'
                      component={DropDown}
                      data={insertSelectPlaceholder(
                        extractProfileNames(listAggregationProfiles),
                        'Select')}
                      required={true}
                      className='custom-select'
                    />
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
                      className='custom-select'
                    />
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
                            <TopologyTagList part="groups" tagsState={tagsState} setTagsState={setTagsState} tagsAll={topologyTags} {...props}/>
                          )}
                        />
                        <div>
                          <hr style={{'borderTop': '1px solid #b5c4d1'}}/>
                        </div>
                        <CardTitle className="mb-2">
                          <strong>Entities</strong>
                        </CardTitle>
                          FooBar
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
                          render={props => (
                            <TopologyTagList part="endpoints" tagsState={tagsState} setTagsState={setTagsState} tagsAll={topologyTags} {...props}/>
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
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='reliabilityThreshold'>Reliability:</Label>
                    <Field
                      id='reliabilityThreshold'
                      name='reliabilityThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='uptimeThreshold'>Uptime:</Label>
                    <Field
                      id='uptimeThreshold'
                      name='uptimeThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='unknownThreshold'>Unknown:</Label>
                    <Field
                      id='unknownThreshold'
                      name='unknownThreshold'
                      className='form-control'
                    />
                  </Col>
                  <Col md={2} className='mr-4'>
                    <Label to='downtimeThreshold'>Downtime:</Label>
                    <Field
                      id='downtimeThreshold'
                      name='downtimeThreshold'
                      className='form-control'
                    />
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
