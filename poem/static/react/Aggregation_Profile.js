import React, { Component } from 'react';
import { Formik, Field, FieldArray, Form } from 'formik';
import FormikEffect from './FormikEffect.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTimes } from '@fortawesome/free-solid-svg-icons'
import Popup from 'react-popup';

const MetricProfileAPI = 'https://web-api-devel.argo.grnet.gr/api/v2/metric_profiles'
const AggregationProfileAPI = 'https://web-api-devel.argo.grnet.gr/api/v2/aggregation_profiles'
const TokenAPI = 'https://<tenant-host>/poem/api/v2/internal/tokens/WEB-API'
const AggregationChangeListView = 'https://<tenant-host>/poem/admin/poem/aggregation'

class App extends Component {
    constructor(props) {
        super(props)

        this.profile_id = props.django.apiid
        this.django_view = props.django.view
        this.tokenapi = TokenAPI.replace('<tenant-host>', props.django.tenant_host)
        this.django_changelistview = AggregationChangeListView.replace('<tenant-host>', props.django.tenant_host) 

        this.state = {
            loading: false,
            aggregation_profile: {},
            metric_profile: {},
            list_metric_profiles: {},
        }
        this.fetchMetricProfiles = this.fetchMetricProfiles.bind(this)
        this.fetchAggregationProfile = this.fetchAggregationProfile.bind(this)
        this.extractListOfMetricsProfiles = this.extractListOfMetricsProfiles.bind(this)

        this.logic_operations = ["OR", "AND"] 
        this.endpoint_groups = ["servicegroups", "sites"]
    }
    fetchToken() {
        return fetch(this.tokenapi)
            .then(response => response.json())
            .catch(err => console.log('Something went wrong: ' + err))
    }

    fetchMetricProfiles(token) {
        return fetch(MetricProfileAPI, 
            {headers: {"Accept": "application/json",
                "x-api-key": token}})
            .then(response => response.json())
            .then(json => json['data']) 
            .catch(err => console.log('Something went wrong: ' + err))
    }

    fetchAggregationProfile(token, idProfile) {
        return fetch(AggregationProfileAPI + '/' + idProfile, 
            {headers: {"Accept": "application/json",
                 "x-api-key": token}})
            .then(response => response.json())
            .then(json => json['data'])
            .then(array => array[0])
            .catch(err => console.log('Something went wrong: ' + err))
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

    insertOperationFromPrevious(index, array) {
        if (array.length) {
            let last = array.length - 1

            return array[last]['operation']
        }
        else {
            return ''
        }
    }

    extractListOfServices(profileFromAggregation, listMetricProfiles) {
        let targetProfile = listMetricProfiles.filter(p => p.name === profileFromAggregation.name)

        return targetProfile[0].services.map(s => s.service)
    }

    insertSelectPlaceholder(data, text) {
        if (data) {
            return [text, ...data]
        } else {
            return [text] 
        }
    }

    componentWillMount() {
        this.setState({loading: true})

        if (this.django_view === 'change') {
            this.fetchToken().then(token => 
                Promise.all([this.fetchAggregationProfile(token, this.profile_id), this.fetchMetricProfiles(token)])
                .then(([aggregp, metricp]) => this.setState(
            {
                aggregation_profile: aggregp, 
                list_id_metric_profiles: this.extractListOfMetricsProfiles(metricp),
                list_services: this.extractListOfServices(aggregp.metric_profile, metricp),
                list_complete_metric_profiles: metricp,
                loading: false
            }))
            )
        }
        else if (this.django_view === 'add') {
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
            this.fetchToken().then(token => this.fetchMetricProfiles(token))
                .then(metricp => this.setState(
            {
                aggregation_profile: empty_aggregation_profile,
                list_id_metric_profiles: this.extractListOfMetricsProfiles(metricp),
                list_complete_metric_profiles: metricp,
                list_services: [],
                loading: false
            }))
        }
    }

    onSubmitHandle(values, actions) {
        let last_group_element = values.groups[values.groups.length - 1]

        if (last_group_element['name'] == 'dummy' && 
            last_group_element.services[0]['name'] == 'dummy') {
            values.groups.pop()
        }

        //TODO: fetch from DB schema
        values.namespace = "egi"

        let match_profile = this.state.list_id_metric_profiles.filter((e) => 
            values.metric_profile === e.name)

        values.metric_profile = match_profile[0]

        if (this.django_view === 'add') {
            this.fetchToken().then(token => fetch(AggregationProfileAPI, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'same-origin',
                headers: {'Accept': 'application/json', 
                          'Content-Type': 'application/json',
                          'x-api-key': token},
                body: JSON.stringify(values),
            }).then(response => {
                if (!response.ok) {
                    Popup.alert(`Error: ${response.status}, ${response.statusText}`)
                } 
                else {
                    response.json().then(r => {
                                            Popup.create(
                                                {
                                                    title: null,
                                                    content: r.status.message,
                                                    buttons: {
                                                        right: [{
                                                            text: 'OK',
                                                            action: () => {
                                                                window.location = this.django_changelistview
                                                                Popup.close()
                                                            }
                                                        }]
                                                    }
                                                }
                                            )
                    }).catch(err => Popup.alert('Something went wrong: ' + err))
                }
            })).catch(err => Popup.alert('Something went wrong: ' + err))
        }
        else if (this.django_view === 'change') {
            this.fetchToken().then(token => fetch(AggregationProfileAPI + '/' + values.id, {
                method: 'PUT',
                mode: 'cors',
                cache: 'no-cache',
                credentials: 'same-origin',
                headers: {'Accept': 'application/json', 
                          'Content-Type': 'application/json',
                          'x-api-key': token},
                body: JSON.stringify(values),
            }).then(response => {
                if (!response.ok) {
                    Popup.alert(`Error: ${response.status}, ${response.statusText}`)
                }
                else {
                    response.json().then(r => {
                                            Popup.create(
                                                {
                                                    title: null,
                                                    content: r.status.message,
                                                    buttons: {
                                                        right: [{
                                                            text: 'OK',
                                                            action: () => {
                                                                window.location = this.django_changelistview
                                                                Popup.close()
                                                            }
                                                        }]
                                                    }
                                                }
                                            )
                    }).catch(err => Popup.alert('Something went wrong: ' + err))
                }
            }).catch(err => Popup.alert('Something went wrong: ' + err))
            .catch(err => Popup.alert('Something went wrong: ' + err)))
        }
    }

    onDeleteHandle(idProfile) {
        Popup.create(
            {
                title: null,
                content: 'Are you sure you want to delete Aggregation profile?',
                buttons: {
                    right: [{
                        text: "Yes I'm sure",
                        className: 'danger',
                        action: () => {
                            this.fetchToken().then(token => fetch(AggregationProfileAPI + '/' + idProfile, {
                                    method: 'DELETE',
                                    mode: 'cors',
                                    cache: 'no-cache',
                                    credentials: 'same-origin',
                                    headers: {'Accept': 'application/json', 
                                            'Content-Type': 'application/json',
                                            'x-api-key': token},
                                }).then(response => {
                                    if (!response.ok) {
                                        Popup.alert(`Error: ${response.status}, ${response.statusText}`)
                                    } else {
                                        response.json().then(r =>
                                            Popup.create(
                                                {
                                                    title: null,
                                                    content: r.status.message,
                                                    buttons: {
                                                        right: [{
                                                            text: 'OK',
                                                            action: () => {
                                                                window.location = this.django_changelistview
                                                                Popup.close()
                                                            }
                                                        }]
                                                    }
                                                }))
                                }}).catch(err => Popup.alert('Something went wrong: ' + err))
                                ).catch(err => Popup.alert('Something went wrong: ' + err))
                            Popup.close()
                        }
                    }],
                    left: [{
                        text: "No, take me back",
                        action: () => {
                            Popup.close()
                        }
                    }]
                }
            }
        )
    }

    insertEmptyServiceForNoServices(groups) {
        groups.forEach(group => {
            if (group.services.length === 0) {
                group.services.push({name: '', operation: ''})
            }
        })
        return groups
    }

    insertDummyGroup(groups) {
        return  [...groups, {name: 'dummy', operation: 'OR', services: [{name: 'dummy', operation: 'OR'}]}] 
    }

    render() {
        const {aggregation_profile, list_id_metric_profiles,
            list_complete_metric_profiles, list_services, loading} = this.state

        return (
            <div className="App">
            { 
                (loading) ? 
                    <div>Loading profiles...</div> : 
                    (!aggregation_profile && !list_id_metric_profiles) ?
                    <div>No profile loaded</div> :
                    <Formik
                        initialValues={{
                            id: aggregation_profile.id,
                            name: aggregation_profile.name, 
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
                            <section>
                            <FormikEffect onChange={(current, prev) => {
                                if (current.values.metric_profile !== prev.values.metric_profile) {
                                    let selected_profile = {name: current.values.metric_profile}
                                    this.setState({list_services:
                                        this.extractListOfServices(selected_profile,
                                        list_complete_metric_profiles)})
                                }
                            }}
                            />
                            <div className="aggregation-profile">
                                <label>Aggregation name: </label>
                                <Field 
                                    type="text" 
                                    name="name" 
                                    placeholder="Name of aggregation profile"
                                    required={true}/>
                            </div>
                            <div className="metric-operation">
                                <label>Metric operation: </label>
                                <Field 
                                    name="metric_operation" 
                                    component={DropDown} 
                                    data={this.insertSelectPlaceholder(this.logic_operations, '')}
                                    required={true}/> 
                                <div className="help">
                                    Logical operation that will be applied between metrics of each service flavour 
                                </div>
                            </div>
                            <div className="profile-operation">
                                <label>Aggregation operation: </label>
                                <Field 
                                    name="profile_operation" 
                                    component={DropDown} 
                                    data={this.insertSelectPlaceholder(this.logic_operations, '')}
                                    required={true}/> 
                                <div className="help">
                                    Logical operation that will be applied between defined service flavour groups
                                </div>
                            </div>
                            <div className="metric-profile">
                                <label>Metric profile: </label>
                                <Field 
                                    name="metric_profile" 
                                    component={DropDown} 
                                    data={this.insertSelectPlaceholder(list_id_metric_profiles.map(e => e.name), '')}
                                    required={true}
                                />
                                <div className="help">
                                   Metric profile associated to Aggregation profile. Service flavours defined in service flavour groups originate from selected metric profile. 
                                </div>
                            </div>
                            <div className="endpoint-group">
                                <label>Endpoint group: </label>
                                <Field 
                                    name="endpoint_group" 
                                    component={DropDown} 
                                    data={this.insertSelectPlaceholder(this.endpoint_groups, '')}
                                    required={true}
                                    /> 
                            </div>
                            <h2 
                                style={{fontWeight: 400, 
                                    padding: '8px', 
                                    color: 'white', 
                                    fontSize: '12px', 
                                    letterSpacing: '0.5px', 
                                    textTransform: 'uppercase', 
                                    background: '#79AEC8'}}>
                                Service flavour groups
                            </h2>
                            <FieldArray
                                name="groups"
                                render={props => (
                                    <GroupList
                                        {...props}
                                        list_services={this.insertSelectPlaceholder(list_services, '')}
                                        list_operations={this.insertSelectPlaceholder(this.logic_operations, '')}
                                        last_service_operation={this.insertOperationFromPrevious}
                                    />)}
                            />
                            </section>
                            <div className="submit-row">
                                <button id="submit-button" type="submit">Save</button>
                                <div className="wrap-delete-button">
                                    <div className="delete-button"
                                        onClick={() => this.onDeleteHandle(props.values.id)}>
                                        Delete
                                    </div>
                                </div>
                            </div>
                            </Form>
                        )}
                    />
            }
            </div>
        );}
    }


const DropDown = ({field, data=[], prefix=""}) => 
    <Field component="select"
        name={prefix ? `${prefix}.${field.name}` : field.name}
        required={true}>
        {
            data.map((name, i) => 
                i === 0 ?
                <option key={i} hidden>{name}</option> :
                <option key={i} value={name}>{name}</option>
            )
        }
    </Field>


const ButtonRemove = ({label, index=0, operation=f=>f}) => 
    <button
        type="button"
        onClick={() => operation(index)}>
        {label}
    </button>


const GroupList = ({name, form, list_services, list_operations, last_service_operation, insert}) =>
    <div className="groups"> 
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
                        groupindex={i}
                        last={i === form.values[name].length - 1}
                    />
                )}
            />
        )
    }
    </div>


const Group = ({name, operation, services, list_operations, list_services, last_service_operation, form, groupindex, remove, insert, last}) =>
    (!last) ?
        <div className="group" key={groupindex}>
            <fieldset className="groups-fieldset">
                <legend>
                    <Field
                        name={`groups.${groupindex}.name`}
                        placeholder="Name of service group"
                        required={true}>
                    </Field>
                    <ButtonRemove
                        label="X"
                        index={groupindex}
                        operation={remove}/>
                </legend>
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
            </fieldset>
            <div className="group-operation" key={groupindex}>
                <DropDown
                    field={{name: 'profile_operation', value: form.values.profile_operation}}
                    data={list_operations}/>
            </div>
        </div>
    :
        <div className="wrap-group-add">
            <div className="group-add"
                onClick={() => insert(groupindex, {name: '', operation: '',
                                     services: [{name: '', operation: ''}]})}>
                <FontAwesomeIcon icon={faPlus} color="#70bf2b"/>
                &nbsp;&nbsp;&nbsp;&nbsp;Add new Service Flavour Group
            </div>
        </div> 


const ServiceList = ({services, list_services=[], list_operations=[], last_service_operation, groupindex, groupoperation, form, push}) =>
    <fieldset className="services-fieldset">
        <legend align="center">
            <DropDown 
                field={{name: "operation", value: groupoperation}}
                data={list_operations}
                prefix={`groups.${groupindex}`}
            />
        </legend>
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
    </fieldset>


const Service = ({name, operation, list_services, list_operations, last_service_operation, groupindex, index, remove, insert, last, form}) => 
    <div className="service" key={index}>
        <DropDown 
            field={{name: "name", value: name}}
            data={list_services} 
            prefix={`groups.${groupindex}.services.${index}`}
        />
        <DropDown 
            field={{name: "operation", value: operation}}
            data={list_operations}
            prefix={`groups.${groupindex}.services.${index}`}
        />
        <button
            type="button"
            onClick={() => remove(index)}>
            <FontAwesomeIcon icon={faTimes} color="#dd4646"/>
        </button>
        <button
            type="button"
            onClick={() => insert(index + 1, {name: '', operation: 
                last_service_operation(index, form.values.groups[groupindex].services)})}>
            <FontAwesomeIcon icon={faPlus} color="#70bf2b"/>
        </button>
    </div>


export default App;
