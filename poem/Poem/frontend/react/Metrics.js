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
  Button,
  Popover,
  PopoverBody,
  PopoverHeader} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { NotificationManager } from 'react-notifications';

export const MetricList = ListOfMetrics('metric');


const DefaultFilterComponent = ({value, onChange, field}) => (
  <input 
    type='text'
    placeholder={'Search by ' + field}
    value={value}
    onChange={onChange}
    style={{width: '100%'}}
  />
)

const DropdownFilterComponent = ({value, onChange, data}) => (
  <select
    onChange={onChange}
    style={{width: '100%'}}
    value={value}
  >
    <option key={0} value=''>Show all</option>
    {
      data.map((name, i) => 
        <option key={i + 1} value={name}>{name}</option>
      )
    }
  </select>
)


export const InlineFields = ({values, field, addnew=false, readonly=false}) => (
  <div>
    <h6 className='mt-4 font-weight-bold text-uppercase' hidden={values.type === 'Passive' && field !== 'flags'}>{field.replace('_', ' ')}</h6>
    <FieldArray
      name={field}
      render={arrayHelpers => (
        (eval(`values.${field}`) && eval(`values.${field}`).length > 0) ? (
          eval(`values.${field}`).map((item, index) => (
            <React.Fragment key={`fragment.${field}.${index}`}>
              <Row>
                <Col md={5}>
                  {(index === 0) ? <Label hidden={values.type === 'Passive' && field !== 'flags'} for={`${field}.0.key`}>Key</Label> : null}
                </Col>
                <Col md={5}>
                  {(index === 0) ? <Label hidden={values.type === 'Passive' && field !== 'flags'} for={`${field}.0.value`}>Value</Label> : null}
                </Col>
              </Row>
              <Row>
                <Col md={5}>
                  <Field 
                    type='text'
                    name={`${field}.${index}.key`} 
                    id={`${field}.${index}.key`}
                    className='form-control'
                    disabled={!addnew || field === 'config'}
                    hidden={values.type === 'Passive' && field !== 'flags'}
                  />
                </Col>
                <Col md={5}>
                  <Field 
                    type='text'
                    name={`${field}.${index}.value`} 
                    id={`${field}.${index}.value`} 
                    className='form-control'
                    disabled={readonly || (!addnew && (field !== 'config' || field === 'config' && item.key === 'path'))}
                    hidden={values.type === 'Passive' && field !== 'flags'}
                  />
                </Col>
                <Col md={2}>
                  {
                    (addnew && field !== 'config' && eval(`values.${field}`)[0]['key'] !== '' && eval(`values.${field}`)[0]['value'] !== '') &&
                      <Button 
                        hidden={values.type === 'Passive' && field !== 'flags'}
                        size='sm' 
                        color='danger'
                        type='button' 
                        onClick={() => {
                          arrayHelpers.remove(index)
                          if (eval(`values.${field}`).length === 1) {
                            arrayHelpers.push({key: '', value: ''})
                          }
                        }
                        }
                      >
                        <FontAwesomeIcon icon={faMinus}/>
                      </Button>
                  }
                </Col>
              </Row>
              {
                (addnew && field !== 'config' && index === eval(`values.${field}`).length - 1) &&
                <Row className={values.type === 'Passive' ? 'mt-0' : 'mt-2'}>
                  <Col md={2}>
                    <Button 
                      hidden={values.type === 'Passive' && field !== 'flags'}
                      size='sm'
                      color='success'
                      type='button' 
                      onClick={() => arrayHelpers.push({key: '', value: ''})}
                    >
                      <FontAwesomeIcon icon={faPlus}/> Add another {field.slice(-1) === 's' ? field.slice(0, -1).replace('_', ' '): field.replace('_', ' ')}
                    </Button>
                  </Col>
                </Row>
              }
            </React.Fragment>
          ))
        ) : (
          <React.Fragment key={`fragment.${field}`}>
            <Row>
              <Col md={5}>
                <Label to={'empty-key'} hidden={values.type === 'Passive' && field !== 'flags'}>Key</Label>
                <Field 
                  type='text'
                  className='form-control'
                  value=''
                  id='empty-key'
                  disabled={!addnew}
                  hidden={values.type === 'Passive' && field !== 'flags'}
                />
              </Col>
              <Col md={5}>
                <Label to={'empty-value'} hidden={values.type === 'Passive' && field !== 'flags'}>Value</Label>
                <Field 
                  type='text'
                  value=''
                  className='form-control'
                  id='empty-value'
                  disabled={!addnew}
                  hidden={values.type === 'Passive' && field !== 'flags'}
                />
              </Col>
            </Row>
            {
              addnew &&
                <Row className={values.type === 'Passive' ? 'mt-0' : 'mt-2'}>
                  <Col md={2}>
                    <Button 
                      hidden={values.type === 'Passive' && field !== 'flags'}
                      size='sm'
                      color='success'
                      type='button' 
                      onClick={() => arrayHelpers.push({key: '', value: ''})}
                    >
                      <FontAwesomeIcon icon={faPlus}/> Add another {field.slice(-1) === 's' ? field.slice(0, -1).replace('_', ' ') : field.replace('_', ' ')}
                    </Button>
                  </Col>
                </Row>
            }
          </React.Fragment>
        )
      )}
    />
  </div>
)

export const ProbeVersionLink = ({probeversion}) => (
  <Link to={'/ui/probes/' + probeversion.split(' ')[0] + '/history/' + probeversion.split(' ')[1].substring(1, probeversion.split(' ')[1].length - 1)}>
    {probeversion}
  </Link>
)


export function ListOfMetrics(type, imp=false) {
  return class extends Component {
    constructor(props) {
      super(props);

      this.location = props.location;

      if (type === 'metric') {
        this.state = {
          loading: false,
          list_metric: null,
          list_tags: null,
          list_groups: null,
          list_types: null,
          search_name: '',
          search_probeversion: '',
          search_type: '',
          search_group: ''
        }
      } else {
        this.state = {
          loading: false,
          list_metric: null,
          list_types: null,
          search_name: '',
          search_probeversion: '',
          search_type: '',
          selected: {},
          selectAll: 0
        }
      }

      this.backend = new Backend();
      this.doFilter = this.doFilter.bind(this);
      this.toggleRow = this.toggleRow.bind(this);
      this.importMetrics = this.importMetrics.bind(this);
    }

    doFilter(list_metric, field, filter) {
      return (
        list_metric.filter(row => 
          eval(`row.${field}`).toLowerCase().includes(filter.toLowerCase()))
      )
    }

    toggleRow(name) {
      const newSelected = Object.assign({}, this.state.selected);
      newSelected[name] = !this.state.selected[name];
      this.setState({
        selected: newSelected,
        selectAll: 2
      })
    }

    toggleSelectAll() {
      var { list_metric } = this.state;

      if (this.state.search_name) {
        list_metric = this.doFilter(list_metric, 'name', this.state.search_name)
      }
  
      if (this.state.search_probeversion) {
        list_metric = this.doFilter(list_metric, 'probeversion', this.state.search_probeversion)
      }
  
      if (this.state.search_type) {
        list_metric = this.doFilter(list_metric, 'mtype', this.state.search_type)
      }
 
      let newSelected = {};
      if (this.state.selectAll === 0) {
        list_metric.forEach(x => {
          newSelected[x.name] = true;
        });
      }
      this.setState({
        selected: newSelected,
        selectAll: this.state.selectAll === 0 ? 1 : 0
      });
    }

    importMetrics() {
      let selectedMetrics = this.state.selected;
      let mt = Object.keys(selectedMetrics);
      if (mt.length > 0) {
        this.backend.importMetrics({'metrictemplates': Object.keys(selectedMetrics)})
          .then(response => response.json())
          .then(json => {
            if (json.imported)
              NotificationManager.success(json.imported, 'Imported');
            
            if (json.err)
              NotificationManager.warning(json.err, 'Not imported')
          })
      } else {
        NotificationManager.error(
          'No metric templates were selected!',
          'Error'
        )
      }
    }

    componentDidMount() {
      this.setState({loading: true});
  
      if (type === 'metric') {
        Promise.all([this.backend.fetchAllMetric(),
          this.backend.fetchAllGroups(),
          this.backend.fetchMetricTypes()
        ]).then(([metrics, groups, types]) =>
              this.setState({
                list_metric: metrics,
                list_groups: groups['metrics'],
                list_types: types,
                loading: false, 
                search_name: '',
                search_probeversion: '',
                search_group: '',
                search_type: ''
              }));
        } else {
          Promise.all([
            this.backend.fetchMetricTemplates(),
            this.backend.fetchMetricTemplateTypes()
        ]).then(([metrictemplates, types]) =>
            this.setState({
              list_metric: metrictemplates,
              list_types: types,
              loading: false,
              search_name: '',
              search_probeversion: '',
              search_type: ''
            })
        )
        }
    }

    render() {
      let metriclink = undefined;
      if (type === 'metric') {
        metriclink = '/ui/metrics/'
      } else {
        if (imp)
          metriclink = '/ui/administration/metrictemplates/'
        else
          metriclink = '/ui/metrictemplates/'
      }

      const columns = [
        {
          Header: 'Name',
          id: 'name',
          minWidth: 100,
          accessor: e =>
          <Link to={metriclink + e.name}>
            {e.name}
          </Link>,
          filterable: true,
          Filter: (
            <DefaultFilterComponent
              field='name'
              value={this.state.search_name}
              onChange={e => this.setState({search_name: e.target.value})}
            />
          )
        },
        {
          Header: 'Probe version',
          id: 'probeversion',
          minWidth: 80,
          accessor: e => (e.probeversion ?
            <ProbeVersionLink probeversion={e.probeversion}/>
            :
            ""
          ),
          Cell: row =>
            <div style={{textAlign: 'center'}}>
              {row.value}
            </div>,
          filterable: true,
          Filter: (
            <DefaultFilterComponent 
              field='probe version'
              value={this.state.search_probeversion}
              onChange={e => this.setState({search_probeversion: e.target.value})}
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
          Filter: (
            <DropdownFilterComponent
              value={this.state.mtype}
              onChange={e => this.setState({search_type: e.target.value})}
              data={this.state.list_types}
            />
          )
        }
      ];

      if (imp) {
        columns.splice(
          0,
          0,
          {
            id: 'checkbox',
            accessor: '',
            Cell: ({original}) => {
              return (
                <div style={{display: 'flex', justifyContent: 'center'}}>
                  <input
                    type='checkbox'
                    className='checkbox'
                    checked={this.state.selected[original.name] === true}
                    onChange={() => this.toggleRow(original.name)}
                  />
                </div>
              );
            },
            Header: 'Select all',
            Filter: (
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                <input
                  type='checkbox'
                  className='checkbox'
                  checked={this.state.selectAll === 1}
                  ref={input => {
                    if (input) {
                      input.indeterminate = this.state.selectAll === 2;
                    }
                  }}
                  onChange={() => this.toggleSelectAll()}
                />
              </div>
              ),
            filterable: true,
            sortable: false,
            minWidth: 12
          }
        )
      } else {
        columns.splice(
          0,
          0,
          {
            Header: '#',
            id: 'row',
            minWidth: 12,
            Cell: (row) =>
              <div style={{textAlign: 'center'}}>
                {row.index + 1}
              </div>
          }
        )
      }

      if (type === 'metric') {
        columns.splice(
          3,
          0,
          {
            Header: 'Group',
            minWidth: 30,
            accessor: 'group',
            Cell: row =>
              <div style={{textAlign: 'center'}}>
                {row.value}
              </div>,
            filterable: true,
            Filter: (
              <DropdownFilterComponent 
                value={this.state.search_group}
                onChange={e => this.setState({search_group: e.target.value})}
                data={this.state.list_groups}
              />
            )
          }
        )
      }

      var { loading, list_metric } = this.state;

      if (this.state.search_name) {
        list_metric = this.doFilter(list_metric, 'name', this.state.search_name)
      }
  
      if (this.state.search_probeversion) {
        list_metric = this.doFilter(list_metric, 'probeversion', this.state.search_probeversion)
      }
  
      if (this.state.search_type) {
        list_metric = this.doFilter(list_metric, 'mtype', this.state.search_type)
      }
  
      if (type === 'metric' && this.state.search_group) {
        list_metric = this.doFilter(list_metric, 'group', this.state.search_group)
      }

      if (loading)
      return (<LoadingAnim />);

      else if (!loading && list_metric) {
        if (type === 'metric') {
          return (
            <BaseArgoView
              resourcename='metric'
              location={this.location}
              listview={true}
              addnew={false}
            >
              <ReactTable
                data={list_metric}
                columns={columns}
                className='-striped -highlight'
                defaultPageSize={50}
              />
            </BaseArgoView>
          )
        } else {
          if (imp)
            return (
              <>
                <div className="d-flex align-items-center justify-content-between">
                  <h2 className="ml-3 mt-1 mb-4">{`Select Metric template(s) to import`}</h2>
                  <Button 
                  className='btn btn-secondary'
                  onClick={() => this.importMetrics()}
                    >
                      Import
                    </Button>
                </div>
                <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
                  <ReactTable
                    data={list_metric}
                    columns={columns}
                    className='-striped -highlight'
                    defaultPageSize={50}
                  />
                </div>
            </>
            )
          else 
            return (
              <BaseArgoView
                resourcename='metric template'
                location={this.location}
                listview={!imp}
                importlistview={imp}
                addnew={true}
              >
                <ReactTable
                  data={list_metric}
                  columns={columns}
                  className='-striped -highlight'
                  defaultPageSize={50}
                />
              </BaseArgoView>
            )
        }
      }
      else
        return null
    }
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
      probe: {},
      groups: [],
      loading: false,
      popoverOpen: false,
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
    this.togglePopOver = this.togglePopOver.bind(this);
  }

  togglePopOver() {
    this.setState({
      popoverOpen: !this.state.popoverOpen
    })
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
        this.backend.fetchAllGroups()
      ]).then(([metrics, usergroups, groups]) => {
        metrics.probekey ? 
        this.backend.fetchVersions('probe', metrics.probeversion.split(' ')[0])
          .then(probe => {
            let fields = {};
            probe.forEach((e) => {
              if (e.id === metrics.probekey) {
                fields = e.fields;
              }
            })
            this.setState({
              metric: metrics,
              probe: fields,
              groups: groups['metrics'],
              loading: false,
              write_perm: localStorage.getItem('authIsSuperuser') === 'true' || usergroups.indexOf(metrics.group) >= 0,
            })
          })
          :
          this.setState({
            metric: metrics,
            groups: groups['metrics'],
            loading: false,
            write_perm: localStorage.getItem('authIsSuperuser') === 'true' || usergroups.indexOf(metrics.group) >= 0,
          })
      })
    }
  }

  render() {
    const { metric, groups, loading, write_perm } = this.state;

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
                        Probe name and version <FontAwesomeIcon id='probe-popover' hidden={this.state.metric.mtype === 'Passive'} icon={faInfoCircle} style={{color: '#416090'}}/>
                        <Popover placement='bottom' isOpen={this.state.popoverOpen} target='probe-popover' toggle={this.togglePopOver} trigger='hover'>
                          <PopoverHeader><ProbeVersionLink probeversion={this.state.metric.probeversion}/></PopoverHeader>
                          <PopoverBody>{this.state.probe.description}</PopoverBody>
                        </Popover>
                      </FormText>
                    </Col>
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
                  </Row>
                  <Row className='mb-4'>
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