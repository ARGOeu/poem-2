import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { LoadingAnim, BaseArgoView, NotifyOk } from './UIElements';
import ReactTable from 'react-table';
import { Formik, Form, Field, FieldArray } from 'formik';
import {
  FormGroup,
  Row,
  Col,
  Label,
  FormText,
  Button} from 'reactstrap';


const DefaultFilterComponent = ({filter, onChange, field}) => (
  <input 
    type='text'
    placeholder={'Search by ' + field}
    value={filter ? filter.value : ''}
    onChange={event => onChange(event.target.value)}
    style={{width: '100%'}}
  />
)

const DropdownFilterComponent = ({filter, onChange, data}) => (
  <select
    onChange={event => onChange(event.target.value)}
    style={{width: '100%'}}
    value={filter ? filter.value : 'all'}
  >
    <option key={0} value=''>Show all</option>
    {
      data.map((name, i) => 
        <option key={i + 1} value={name}>{name}</option>
      )
    }
  </select>
)


const InlineFields = ({values, field}) => (
  <div>
  <h6 className='mt-4 font-weight-bold text-uppercase' hidden={values.type === 'Passive' && field !== 'flags'}>{field.replace('_', ' ')}</h6>
  <FieldArray
    name={field}
    render={arrayHelpers => (
      (eval(`values.${field}`) && eval(`values.${field}`).length > 0) ? (
        eval(`values.${field}`).map((item, index) => (
          <Row key={'row-' + index}>
            <Col md={5}>
              {(index === 0) ? <Label for={`${field}.0.key`}>Key</Label> : null}
              <Field 
                type='text'
                name={`${field}.${index}.key`} 
                id={`${field}.${index}.key`}
                className='form-control'
                disabled={true}
              />
            </Col>
            <Col md={5}>
              {(index === 0) ? <Label for={`${field}.0.value`}>Value</Label> : null}
              <Field 
                type='text'
                name={`${field}.${index}.value`} 
                id={`${field}.${index}.value`} 
                className='form-control'
                disabled={field !== 'config' || field === 'config' && item.key === 'path'}
              />
            </Col>
          </Row>
        ))
      ) : (
        <Row>
          <Col md={5}>
            <Label to={'emtpty-key'} hidden={values.type === 'Passive' && field !== 'flags'}>Key</Label>
            <Field 
              type='text'
              className='form-control'
              value=''
              id='empty-key'
              disabled={true}
              hidden={values.type === 'Passive' && field !== 'flags'}
            />
          </Col>
          <Col md={5}>
            <Label to={'emtpty-value'} hidden={values.type === 'Passive' && field !== 'flags'}>Value</Label>
            <Field 
              type='text'
              value=''
              className='form-control'
              id='empty-value'
              disabled={true}
              hidden={values.type === 'Passive' && field !== 'flags'}
            />
          </Col>
        </Row>
      )
    )}
  />
  </div>
)


export class MetricList extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      list_metric: null,
      list_tags: null,
      list_groups: null,
      list_types: null
    }

    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true});

    Promise.all([this.backend.fetchAllMetric(),
      this.backend.fetchAllGroups(),
      this.backend.fetchTags(),
      this.backend.fetchMetricTypes()
    ]).then(([metrics, groups, tags, types]) =>
          this.setState({
            list_metric: metrics,
            list_tags: tags,
            list_groups: groups['metrics'],
            list_types: types,
            loading: false, 
            search: ''
          }));
  }

  render() {
    const columns = [
      {
        Header: '#',
        id: 'row',
        minWidth: 12,
        Cell: (row) =>
          <div style={{textAlign: 'center'}}>
            {row.index + 1}
          </div>
      },
      {
        Header: 'Name',
        id: 'name',
        minWidth: 100,
        accessor: e =>
        <Link to={'/ui/metrics/' + e.name}>
          {e.name}
        </Link>,
        filterable: true,
        Filter: (
          <input 
            value={this.state.search}
            onChange={e => this.setState({search: e.target.value})}
            placeholder='Search by name'
            style={{width: '100%'}}
          />
        )
      },
      {
        Header: 'Probe version',
        minWidth: 80,
        accessor: 'probeversion',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        filterable: true,
        Filter: ({filter, onChange}) => (
          <DefaultFilterComponent 
            filter={filter}
            onChange={onChange}
            field='probe version'
          />
        )
      },
      {
        Header: 'Tag',
        accessor: 'tag',
        minWidth: 30,
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        filterable: true,
        Filter: ({filter, onChange}) => (
        <DropdownFilterComponent
          filter={filter}
          onChange={onChange}
          data={this.state.list_tags}
        />
        )
      },
      {
        Header: 'Group',
        minWidth: 30,
        accessor: 'group',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        filterable: true,
        Filter: ({filter, onChange}) => (
          <DropdownFilterComponent 
            filter={filter}
            onChange={onChange}
            data={this.state.list_groups}
          />
        )
      },
      {
        Header: 'Type',
        minWidth: 30,
        accessor: 'mtype',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        filterable:true,
        Filter: ({filter, onChange}) => (
          <DropdownFilterComponent
            filter={filter}
            onChange={onChange}
            data={this.state.list_types}
          />
        )
      }
    ];

    var { loading, list_metric } = this.state;

    if (this.state.search) {
      list_metric = list_metric.filter(row =>
        row.name.toLowerCase().includes(this.state.search.toLowerCase())
      )
    }

    if (loading)
      return (<LoadingAnim />);

    else if (!loading && list_metric) {
      return (
        <React.Fragment>
          <div className="d-flex align-items-center justify-content-between">
            <React.Fragment>
              <h2 className="ml-3 mt-1 mb-4">{'Select metric to change'}</h2>
            </React.Fragment>
          </div>
          <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
            <ReactTable
              data={list_metric}
              columns={columns}
              className='-striped -highlight'
              defaultPageSize={50}
            />
          </div>
        </React.Fragment>
      )
    }
    else
      return null
  }
}


export class MetricChange extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.addview = props.addview;
    this.location = props.location;
    this.history = props.history;
    this.backend = new Backend();

    this.state = {
      metric: {},
      tags: [],
      groups: [],
      loading: false,
      write_perm: false,
      areYouSureModal: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined
    };

    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.onSubmitHandle = this.onSubmitHandle.bind(this);
    this.doChange = this.doChange.bind(this);
    this.doDelete = this.doDelete.bind(this);
  }

  toggleAreYouSure() {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal}));
  }

  toggleAreYouSureSetModal(msg, title, onyes) {
    this.setState(prevState => 
      ({areYouSureModal: !prevState.areYouSureModal,
        modalFunc: onyes,
        modalMsg: msg,
        modalTitle: title,
      }));
  }

  onSubmitHandle(values, actions) {
    let msg = 'Are you sure you want to change Metric?';
    let title = 'Change metric';

    this.toggleAreYouSureSetModal(msg, title, 
      () => this.doChange(values, actions))
  }

  doChange(values, actions) {
    this.backend.changeMetric({
      name: values.name,
      group: values.group,
      tag: values.tag,
      config: values.config
    })
      .then(() => NotifyOk({
        msg: 'Metric successfully changed',
        title: 'Changed',
        callback: () => this.history.push('/ui/metrics')
      }))
      .catch(err => alert('Something went wrong: ' + err))
  }

  doDelete(name) {
    this.backend.deleteMetric(name)
      .then(() => NotifyOk({
        msg: 'Metric successfully deleted',
        title: 'Deleted',
        callback: () => this.history.push('/ui/metrics')
      }))
      .catch(err => alert('Something went wrong: ' + err))
  }

  componentDidMount() {
    this.setState({loading: true});

    if (!this.addview) {
      Promise.all([this.backend.fetchMetricByName(this.name),
        this.backend.fetchMetricUserGroups(),
        this.backend.fetchTags(),
        this.backend.fetchAllGroups()
      ]).then(([metrics, usergroups, tags, groups]) =>
        this.setState({
          metric: metrics,
          tags: tags,
          groups: groups['metrics'],
          loading: false,
          write_perm: localStorage.getItem('authIsSuperuser') === 'true' || usergroups.indexOf(metrics.group) >= 0,
        })
      )
    }
  }

  render() {
    const { metric, tags, groups, loading, write_perm } = this.state;

    if (loading)
      return (<LoadingAnim/>)
    
    else if (!loading) {
      return (
        <BaseArgoView
          resourcename='Metrics'
          location={this.location}
          addview={this.addview}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}>
          <Formik
            initialValues = {{
              name: metric.name,
              probe: metric.probeversion,
              tag: metric.tag,
              type: metric.mtype,
              group: metric.group,
              probeexecutable: metric.probeexecutable,
              parent: metric.parent,
              config: metric.config,
              attributes: metric.attribute,
              dependency: metric.dependancy,
              parameter: metric.parameter,
              flags: metric.flags,
              file_attributes: metric.files,
              file_parameters: metric.fileparameter
            }}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            render = {props => (
              <Form>
                <FormGroup>
                  <Row className='mb-3'>
                    <Col md={4}>
                      <Label to='name'>Name</Label>
                      <Field
                        type='text'
                        name='name'
                        className='form-control'
                        id='name'
                        disabled={true}
                      />
                      <FormText color='muted'>
                        Metric name
                      </FormText>
                    </Col>
                    <Col md={4}>
                      <Label to='probeversion'>Probe</Label>
                      <Field
                        type='text'
                        name='probe'
                        className='form-control'
                        id='probeversion'
                        disabled={true}
                      />
                      <FormText color='muted'>
                        Probe name and version
                      </FormText>
                    </Col>
                    <Col md={2}>
                      <Label to="tag">Tag</Label>
                      <Field 
                        component='select'
                        name='tag'
                        className='form-control'
                        id='tag'
                      >
                        {
                          tags.map((name, i) =>
                          <option key={i} value={name}>{name}</option>)
                        }
                      </Field>
                    </Col>
                  </Row>
                  <Row className='mb-4'>
                    <Col md={2}>
                      <Label to='mtype'>Type</Label>
                      <Field
                        type='text'
                        name='type'
                        className='form-control'
                        id='mtype'
                        disabled={true}
                      />
                      <FormText color='muted'>
                        Metric is of given type
                      </FormText>
                    </Col>
                    <Col md={2}>
                      <Label to='group'>Group</Label>
                      <Field 
                        component='select'
                        name='group'
                        className='form-control'
                        id='group'
                      >
                        {
                          groups.map((name, i) =>
                            <option key={i} value={name}>{name}</option>
                          )
                        }
                      </Field>
                      <FormText color='muted'>
                        Metric is member of selected group
                      </FormText>
                    </Col>
                  </Row>
                </FormGroup>
                <FormGroup>
                <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Metric configuration</h4>
                <h6 className='mt-4 font-weight-bold text-uppercase' hidden={props.values.type === 'Passive'}>probe executable</h6>
                <Row>
                  <Col md={5}>
                    <Field
                      type='text'
                      name='probeexecutable'
                      id='probeexecutable'
                      className='form-control'
                      disabled={true}
                      hidden={props.values.type === 'Passive'}
                    />
                  </Col>
                </Row>
                <InlineFields {...props} field='config'/>
                <InlineFields {...props} field='attributes'/>
                <InlineFields {...props} field='dependency'/>
                <InlineFields {...props} field='parameter'/>
                <InlineFields {...props} field='flags'/>
                <InlineFields {...props} field='file_attributes'/>
                <InlineFields {...props} field='file_parameters'/>
                <h6 className='mt-4 font-weight-bold text-uppercase'>parent</h6>
                <Row>
                  <Col md={5}>
                    <Field
                      type='text'
                      name='parent'
                      id='parent'
                      className='form-control'
                      disabled={true}
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
                          this.toggleAreYouSureSetModal('Are you sure you want to delete Metric?',
                          'Delete metric',
                          () => this.doDelete(props.values.name))
                        }}
                      >
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
  }
}
