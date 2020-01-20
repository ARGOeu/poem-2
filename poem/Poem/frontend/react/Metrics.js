import React, { Component } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import { 
  LoadingAnim, 
  BaseArgoView, 
  NotifyOk, 
  FancyErrorMessage, 
  DropdownFilterComponent,
  HistoryComponent,
  DiffElement,
  AutocompleteField
 } from './UIElements';
import ReactTable from 'react-table';
import { Formik, Form, Field, FieldArray } from 'formik';
import {
  Alert,
  FormGroup,
  Row,
  Col,
  Label,
  FormText,
  Button,
  Popover,
  PopoverBody,
  PopoverHeader,
  InputGroup,
  InputGroupAddon
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import { NotificationManager } from 'react-notifications';
import ReactDiffViewer from 'react-diff-viewer';

export const MetricList = ListOfMetrics('metric');
export const MetricHistory = HistoryComponent('metric');

export const MetricVersonCompare = CompareMetrics('metric');


const DefaultFilterComponent = ({value, onChange, field}) => (
  <input 
    type='text'
    placeholder={'Search by ' + field}
    value={value}
    onChange={onChange}
    style={{width: '100%'}}
  />
)


function validateConfig(value) {
  let error;
  if (!value) {
    error = 'Required';
  }
  return error;
}


const InlineDiffElement = ({title, item1, item2}) => {
  let n = Math.max(item1.length, item2.length);

  let elem1 = [];
  for (let i = 0; i < item1.length; i++) {
    elem1.push('key: ' + item1[i]['key'] + ', value: ' + item1[i]['value'])
  }

  let elem2 = [];
  for (let i = 0; i < item2.length; i++) {
    elem2.push('key: ' + item2[i]['key'] + ', value: ' + item2[i]['value'])
  }

  if (item1.length > item2.length) {
    for (let i = item2.length; i < item1.length; i++) {
      elem2.push(' ');
    }
  } else if (item2.length > item1.length) {
    for (let i = item1.length; i < item2.length; i++) {
      elem1.push(' ');
    }
  }

  const elements = [];
  for (let i = 0; i < n; i++) {
    elements.push(
      <ReactDiffViewer
        oldValue={elem2[i]}
        newValue={elem1[i]}
        showDiffOnly={true}
        splitView={false}
        hideLineNumbers={true}
        disableWordDiff={true}
        key={'diff-' + i}
      />
    )
  }

  return (
    <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
      <h6 className='mt-4 font-weight-bold text-uppercase'>{title}</h6>
      {elements}
    </div>
    )

}


function arraysEqual(arr1, arr2) {
    if(arr1.length !== arr2.length)
        return false;
    for(var i = arr1.length; i--;) {
        if(arr1[i]['key'] !== arr2[i]['key'] || arr1[i]['value'] !== arr2[i]['value'])
            return false;
    }

    return true;
}


const InlineFields = ({values, errors, field, addnew=false, readonly=false}) => (
  <div>
    <h6 className='mt-4 font-weight-bold text-uppercase' hidden={values.type === 'Passive' && field !== 'flags'}>{field.replace('_', ' ')}</h6>
    <FieldArray
      name={field}
      render={arrayHelpers => (
        (values[field] && values[field].length > 0) ? (
          values[field].map((item, index) => (
            <React.Fragment key={`fragment.${field}.${index}`}>
              <Row>
                <Col md={5}>
                  {(index === 0) && <Label hidden={values.type === 'Passive' && field !== 'flags'} for={`${field}.0.key`}>Key</Label>}
                </Col>
                <Col md={5}>
                  {(index === 0) && <Label hidden={values.type === 'Passive' && field !== 'flags'} for={`${field}.0.value`}>Value</Label>}
                </Col>
              </Row>
              <Row>
                <Col md={5}>
                  <Field 
                    type='text'
                    name={`${field}.${index}.key`} 
                    id={`${field}.${index}.key`}
                    className={`form-control ${values[field][index].isNew && 'border-success'}`}
                    disabled={!addnew || field === 'config' || (values.type === 'Passive' && item.key === 'PASSIVE')}
                    hidden={values.type === 'Passive' && field !== 'flags'}
                  />
                </Col>
                <Col md={5}>
                  {
                    values.type === 'Active' && field === 'config' ?
                      <Field 
                        type='text'
                        name={`${field}.${index}.value`} 
                        id={`${field}.${index}.value`} 
                        className={`form-control ${(errors.config && errors.config[index]) && 'border-danger'}`}
                        disabled={readonly || (!addnew && field === 'config' && item.key === 'path')}
                        validate={validateConfig}
                      />
                    :
                      <Field
                        type='text'
                        name={`${field}.${index}.value`} 
                        id={`${field}.${index}.value`} 
                        className={`form-control ${values[field][index].isNew && 'border-success'}`}
                        disabled={readonly || (!addnew && (field !== 'config' || field === 'config' && item.key === 'path')) || values.type === 'Passive' && item.key === 'PASSIVE'}
                        hidden={values.type === 'Passive' && field !== 'flags'}
                      />
                  }                  
                  {
                    errors.config && field === 'config' &&
                      errors.config[index] &&
                        FancyErrorMessage(errors.config[index].value)
                  }
                </Col>
                <Col md={2}>
                  {
                    (addnew && field !== 'config' && (values[field][0]['key'] !== '' || values[field][0]['value'] !== '' || values[field].length > 1)) &&
                      <Button 
                        hidden={
                          (
                            values.type === 'Passive' && 
                            field !== 'flags'
                          ) 
                          || (
                            field === 'flags' && 
                            values.type === 'Passive' && (
                              values[field][index]['key'] === 'PASSIVE'
                              || (values[field][index]['key'] === '' &&
                                values[field][index]['value'] === ''
                              )
                            )
                            )
                          }
                        size='sm' 
                        color='danger'
                        type='button' 
                        onClick={() => {
                          arrayHelpers.remove(index)
                          if (values[field].length === 1) {
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
                (addnew && field !== 'config' && index === values[field].length - 1) &&
                <Row className={values.type === 'Passive' ? 'mt-0' : 'mt-2'}>
                  <Col md={2}>
                    <Button 
                      hidden={values.type === 'Passive' && field !== 'flags'}
                      size='sm'
                      color='success'
                      type='button' 
                      onClick={() => arrayHelpers.push({key: '', value: '', isNew: true})}
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
          list_ostags: null,
          search_name: '',
          search_probeversion: '',
          search_ostag: '',
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

      if (this.state.search_ostag) {
        list_metric = list_metric.filter(row =>
          `${row.ostag.join(', ')}`.includes(this.state.search_ostag)
        )
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
        Promise.all([this.backend.fetchData('/api/v2/internal/metric'),
          this.backend.fetchResult('/api/v2/internal/usergroups'),
          this.backend.fetchData('/api/v2/internal/mtypes')
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
            this.backend.fetchData('/api/v2/internal/metrictemplates'),
            this.backend.fetchData('/api/v2/internal/mttypes'),
            this.backend.fetchData('/api/v2/internal/ostags')
        ]).then(([metrictemplates, types, ostags]) =>
            this.setState({
              list_metric: metrictemplates,
              list_types: types,
              list_ostags: ostags,
              loading: false,
              search_name: '',
              search_probeversion: '',
              search_type: '',
              search_ostag: ''
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

      if (imp && localStorage.getItem('authIsSuperuser') === 'true') {
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

      if (imp) {
        columns.splice(
          4,
          0,
          {
            Header: 'OS',
            minWidth: 30,
            accessor: 'ostag',
            Cell: row =>
              <div style={{textAlign: 'center'}}>
                {row.value.join(', ')}
              </div>,
            filterable: true,
            Filter: (
              <DropdownFilterComponent
                value={this.state.ostag}
                onChange={e => this.setState({search_ostag: e.target.value})}
                data={this.state.list_ostags}
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

      if (this.state.search_ostag) {
        list_metric = list_metric.filter(row =>
          `${row.ostag.join(', ')}`.toLowerCase().includes(this.state.search_ostag.toLowerCase())
        )
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
                  <h2 className="ml-3 mt-1 mb-4">{`Select metric template${localStorage.getItem('authIsSuperuser') === 'true'  ? '(s) to import' : ' for details'}`}</h2>
                  {
                    localStorage.getItem('authIsSuperuser') === 'true' &&
                      <Button 
                      className='btn btn-secondary'
                      disabled={!this.state.search_ostag}
                      onClick={() => this.importMetrics()}
                        >
                          Import
                        </Button>
                  }
                </div>
                <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
                  {
                    !this.state.search_ostag &&
                      <Alert color='danger'>
                        <center>
                          <FontAwesomeIcon icon={faInfoCircle} size='lg' color='black'/> &nbsp;
                          You should choose OS for import.
                        </center>
                      </Alert>
                  }
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


export const MetricForm = 
  ({
    values=undefined, 
    errors={
      name: undefined, 
      probeversion: undefined, 
      probeexecutable: undefined
    },
    setFieldValue=undefined, 
    handleChange, 
    obj='', 
    state=undefined, 
    togglePopOver=undefined, 
    onSelect=undefined, 
    isHistory=false, 
    isTenantSchema=false,
    addview=false, 
    probeversions=[], 
    groups=[], 
    metrictemplatelist=[], 
    types=[],
  }) => 
  <>
    <FormGroup>
      <Row className='mb-3'>
        <Col md={4}>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
            <Field
              type='text'
              name='name'
              className={`form-control ${errors.name && 'border-danger'}`}
              id='name'
              disabled={isHistory || isTenantSchema}
            />
          </InputGroup>
          {
            errors.name &&
              FancyErrorMessage(errors.name)
          }
          <FormText color='muted'>
            Metric name.
          </FormText>
        </Col>
        <Col md={4}>
            {
              values.type === 'Passive' ?
                <InputGroup>
                  <InputGroupAddon addonType='prepend'>Probe</InputGroupAddon>
                  <input 
                    type='text'
                    className='form-control'
                    disabled={true}
                    id='passive-probeversion'
                  />
                </InputGroup>
              :
                (isTenantSchema || isHistory) ?
                  <InputGroup>
                    <InputGroupAddon addonType='prepend'>Probe</InputGroupAddon>
                    <Field
                      type='text'
                      name='probeversion'
                      className='form-control'
                      id='probeversion'
                      disabled={true}
                    />
                  </InputGroup>
                :
                  <AutocompleteField
                    setFieldValue={setFieldValue}
                    lists={probeversions}
                    icon='probes'
                    field='probeversion'
                    val={values.probeversion}
                    onselect_handler={onSelect}
                    req={errors.probeversion}
                    label='Probe'
                  />
            }
          {
            errors.probeversion &&
              FancyErrorMessage(errors.probeversion)
          }
          {
            values.type === 'Active' &&
              <FormText color='muted'>
                Probe name and version 
                {
                  !isHistory &&
                    <>
                      <FontAwesomeIcon 
                        id='probe-popover' 
                        hidden={`state.${obj}.mtype` === 'Passive' || addview} 
                        icon={faInfoCircle} 
                        style={{color: '#416090'}}
                      />
                      <Popover 
                        placement='bottom' 
                        isOpen={state.popoverOpen} 
                        target='probe-popover' 
                        toggle={togglePopOver} 
                        trigger='click'
                      >
                        <PopoverHeader>
                          <ProbeVersionLink
                            probeversion={obj === 'metric' ? state.metric.probeversion : state.metrictemplate.probeversion}
                          />
                        </PopoverHeader>
                        <PopoverBody>{state.probe.description}</PopoverBody>
                      </Popover>
                    </>
                }
              </FormText>
          }
        </Col>
        <Col md={2}>
          <InputGroup>
            <InputGroupAddon addonType='prepend'>Type</InputGroupAddon>
            {
              (isTenantSchema || isHistory) ?
                <Field
                  type='text'
                  name='type'
                  className='form-control'
                  id='mtype'
                  disabled={true}
                />
              :
                <Field
                  component='select'
                  name='type'
                  className='form-control'
                  id='mtype'
                  onChange={e => {
                    handleChange(e);
                    if (e.target.value === 'Passive') {
                      let ind = values.flags.length;
                      if (ind === 1 && values.flags[0].key === '') {
                        setFieldValue('flags[0].key', 'PASSIVE');
                        setFieldValue('flags[0].value', '1');
                      } else {
                        setFieldValue(`flags[${ind}].key`, 'PASSIVE')
                        setFieldValue(`flags[${ind}].value`, '1')
                      }
                    } else if (e.target.value === 'Active') {
                      let ind = undefined;
                      values.flags.forEach((e, index) => {
                        if (e.key === 'PASSIVE') {
                          ind = index;
                        }
                      });
                      if (values.flags.length === 1)
                        values.flags.splice(ind, 1, {'key': '', 'value': ''})
                      else
                        values.flags.splice(ind, 1)
                    }
                  }}
                >
                  {
                    types.map((name, i) =>
                      <option key={i} value={name}>{name}</option>
                    )
                  }
                </Field>
            }
          </InputGroup>
          <FormText color='muted'>
            Metric is of given type.
          </FormText>
        </Col>
      </Row>
      {
        obj === 'metric' &&
          <Row className='mb-4'>
            <Col md={2}>
              <InputGroup>
                <InputGroupAddon addonType='prepend'>Group</InputGroupAddon>
                {
                  isHistory ?
                    <Field
                      type='text'
                      name='group'
                      className='form-control'
                      disabled={true}
                      id='group'
                    />
                  :
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
                }
              </InputGroup>
              <FormText color='muted'>
                Metric is member of selected group.
              </FormText>
            </Col>
          </Row>
      }
    </FormGroup>
    <FormGroup>
      <h4 className="mt-2 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Metric configuration</h4>
      <h6 className='mt-4 font-weight-bold text-uppercase' hidden={values.type === 'Passive'}>probe executable</h6>
      <Row>
        <Col md={5}>
          <Field
            type='text'
            name='probeexecutable'
            id='probeexecutable'
            className={`form-control ${errors.probeexecutable && 'border-danger'}`}
            hidden={values.type === 'Passive'}
            disabled={isTenantSchema || isHistory}
          />
          {
            errors.probeexecutable &&
              FancyErrorMessage(errors.probeexecutable)
          }
        </Col>
      </Row>
      <InlineFields values={values} errors={errors} field='config' addnew={!isTenantSchema && !isHistory} readonly={obj === 'metrictemplate' && isTenantSchema || isHistory}/>
      <InlineFields values={values} errors={errors} field='attributes' addnew={!isTenantSchema && !isHistory}/>
      <InlineFields values={values} errors={errors} field='dependency' addnew={!isTenantSchema && !isHistory}/>
      <InlineFields values={values} errors={errors} field='parameter' addnew={!isTenantSchema && !isHistory}/>
      <InlineFields values={values} errors={errors} field='flags' addnew={!isTenantSchema && !isHistory}/>
      <InlineFields values={values} errors={errors} field='file_attributes' addnew={!isTenantSchema && !isHistory}/>
      <InlineFields values={values} errors={errors} field='file_parameters' addnew={!isTenantSchema && !isHistory}/>
      <h6 className='mt-4 font-weight-bold text-uppercase'>parent</h6>
      <Row>
        <Col md={5}>
          {
            (isTenantSchema || isHistory) ?
              <Field 
                type='text'
                name='parent'
                id='parent'
                className='form-control'
                disabled={true}
              />
            :
              <>
                <AutocompleteField
                  setFieldValue={setFieldValue}
                  lists={metrictemplatelist}
                  field='parent'
                  val={values.parent}
                  icon='metrics'
                  className={`form-control ${errors.parent && 'border-danger'}`}
                  onselect_handler={onSelect}
                  req={errors.parent}
                />
                {
                  errors.parent &&
                    FancyErrorMessage(errors.parent)
                }
              </>
          }
        </Col>
      </Row>
    </FormGroup>
  </>


export function CompareMetrics(metrictype) {
  return class extends Component {
    constructor(props) {
      super(props);

      this.version1 = props.match.params.id1;
      this.version2 = props.match.params.id2;
      this.name = props.match.params.name;

      this.state = {
        loading: false,
        name1: '',
        probeversion1: '',
        type1: '',
        group1: '',
        probeexecutable1: '',
        parent1: '',
        config1: '',
        attribute1: '',
        dependency1: '',
        parameter1: '',
        flags1: '',
        files1: '',
        fileparameter1: '',
        name2: '',
        probeversion2: '',
        type2: '',
        group2: '',
        probeexecutable2: '',
        parent2: '',
        config2: '',
        attribute2: '',
        dependency2: '',
        parameter2: '',
        flags2: '',
        files2: '',
        fileparameter2: '',
      };

      this.backend = new Backend();
    };

    componentDidMount() {
      this.setState({loading: true});

      let url = undefined;

      if (metrictype === 'metric')
        url = `/api/v2/internal/tenantversion/metric/${this.name}`;

      else 
        url = `/api/v2/internal/version/metrictemplate/${this.name}`;

      this.backend.fetchData(url)
        .then(json => {
          let name1 = '';
          let probeversion1 = '';
          let type1 = '';
          let group1 = '';
          let probeexecutable1 = '';
          let parent1 = '';
          let config1 = '';
          let attribute1 = '';
          let dependency1 = '';
          let flags1 = '';
          let files1 = '';
          let parameter1 = '';
          let fileparameter1 = '';
          let name2 = '';
          let probeversion2 = '';
          let type2 = '';
          let group2 = '';
          let probeexecutable2 = '';
          let parent2 = '';
          let config2 = '';
          let attribute2 = '';
          let dependency2 = '';
          let flags2 = '';
          let files2 = '';
          let parameter2 = '';
          let fileparameter2 = '';

          json.forEach((e) => {
            if (e.version == this.version1) {
              name1 = e.fields.name;
              probeversion1 = e.fields.probeversion;
              type1 = e.fields.mtype;
              if (metrictype === 'metric') {
                group1 = e.fields.group;
                dependency1 = e.fields.dependancy; 
              } else
                dependency1 = e.fields.dependency;
              probeexecutable1 = e.fields.probeexecutable; 
              parent1 = e.fields.parent; 
              config1 = e.fields.config; 
              attribute1 = e.fields.attribute; 
              parameter1 = e.fields.parameter; 
              flags1 = e.fields.flags; files1 = e.fields.files; 
              fileparameter1 = e.fields.fileparameter; 
            } else if (e.version == this.version2) {
                name2 = e.fields.name;
                probeversion2 = e.fields.probeversion;
                type2 = e.fields.mtype;
                if (metrictype === 'metric') {
                  group2 = e.fields.group;
                  dependency2 = e.fields.dependancy;
                } else
                  dependency2 = e.fields.dependency;
                probeexecutable2 = e.fields.probeexecutable;
                parent2 = e.fields.parent;
                config2 = e.fields.config;
                attribute2 = e.fields.attribute;
                flags2 = e.fields.flags;
                files2 = e.fields.files;
                parameter2 = e.fields.parameter;
                fileparameter2 = e.fields.fileparameter;
            };
          });
          this.setState({
            name1: name1,
            probeversion1: probeversion1,
            type1: type1,
            group1: group1,
            probeexecutable1: probeexecutable1,
            parent1: parent1,
            config1: config1,
            attribute1: attribute1,
            dependency1: dependency1,
            parameter1: parameter1,
            flags1: flags1,
            files1: files1,
            fileparameter1: fileparameter1,
            name2: name2,
            probeversion2: probeversion2,
            type2: type2,
            group2: group2,
            probeexecutable2: probeexecutable2,
            parent2: parent2,
            config2: config2,
            attribute2: attribute2,
            dependency2: dependency2,
            parameter2: parameter2,
            flags2: flags2,
            files2: files2,
            fileparameter2: fileparameter2,
            loading: false
          });
        });
    };

    render() {
      var { name1, name2, probeversion1, probeversion2, type1, type2, 
        probeexecutable1, probeexecutable2, parent1, parent2, config1, 
        config2, attribute1, attribute2, dependency1, dependency2,
        parameter1, parameter2, flags1, flags2, files1, files2, 
        fileparameter1, fileparameter2, group1, group2, loading } = this.state;
      
      if (loading)
        return <LoadingAnim/>;

      else if (!loading && name1 && name2) {
        return (
          <React.Fragment>
            <div className='d-flex align-items-center justify-content-between'>
              <h2 className='ml-3 mt-1 mb-4'>{`Compare ${this.name}`}</h2>
            </div>
            {
              (name1 !== name2) &&
                <DiffElement title='name' item1={name1} item2={name2}/>
            }
            {
              (probeversion1 !== probeversion2) &&
                <DiffElement title='probe version' item1={probeversion1} item2={probeversion2}/>
            }
            {
              (type1 !== type2) &&
                <DiffElement title='type' item1={type1} item2={type2}/>
            }
            {
              (group1 && group2 && group1 !== group2) &&
                <DiffElement title='group' item1={group1} item2={group2}/> 
            }
            {
              (probeexecutable1 !== probeexecutable2) &&
                <DiffElement title='probe executable' item1={probeexecutable1} item2={probeexecutable2}/>
            }
            {
              (parent1 !== parent2) &&
                <DiffElement title='parent' item1={parent1} item2={parent2}/>
            }
            {
              (!arraysEqual(config1, config2)) &&
                <InlineDiffElement title='config' item1={config1} item2={config2}/>
            }
            {
              (!arraysEqual(attribute1, attribute2)) &&
                <InlineDiffElement title='attribute' item1={attribute1} item2={attribute2}/>
            }
            {
              (!arraysEqual(dependency1, dependency2)) &&
                <InlineDiffElement title='dependency' item1={dependency1} item2={dependency1}/>
            }
            {
              (!arraysEqual(parameter1, parameter2)) &&
                <InlineDiffElement title='parameter' item1={parameter1} item2={parameter2}/>
            }
            {
              (!arraysEqual(flags1, flags2)) &&
                <InlineDiffElement title='flags' item1={flags1} item2={flags2}/>
            }
            {
              (!arraysEqual(files1, files2)) &&
                <InlineDiffElement title='file attributes' item1={files1} item2={files2}/>
            }
            {
              (!arraysEqual(fileparameter1, fileparameter2)) &&
                <InlineDiffElement title='file parameters' item1={fileparameter1} item2={fileparameter2}/>
            }
          </React.Fragment>
        );
      } else
        return null;
    };
  };
};


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
    let msg = 'Are you sure you want to change metric?';
    let title = 'Change metric';

    this.toggleAreYouSureSetModal(msg, title, 
      () => this.doChange(values, actions))
  }

  doChange(values, actions) {
    this.backend.changeObject(
      '/api/v2/internal/metric/',
      {
        name: values.name,
        group: values.group,
        config: values.config
      }
    ).then(() => NotifyOk({
        msg: 'Metric successfully changed',
        title: 'Changed',
        callback: () => this.history.push('/ui/metrics')
      }))
      .catch(err => alert('Something went wrong: ' + err))
  }

  doDelete(name) {
    this.backend.deleteObject(`/api/v2/internal/metric/${name}`)
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
      Promise.all([
        this.backend.fetchData(`/api/v2/internal/metric/${this.name}`),
        this.backend.fetchData('/api/v2/internal/groups/metrics')
      ]).then(([metrics, usergroups]) => {
        metrics.probeversion ? 
          this.backend.fetchData(`/api/v2/internal/version/probe/${metrics.probeversion.split(' ')[0]}`)
            .then(probe => {
              let fields = {};
              probe.forEach((e) => {
                if (e.object_repr === metrics.probeversion) {
                  fields = e.fields;
                }
              })
              this.setState({
                metric: metrics,
                probe: fields,
                groups: usergroups,
                loading: false,
                write_perm: localStorage.getItem('authIsSuperuser') === 'true' || usergroups.indexOf(metrics.group) >= 0,
              })
            })
          :
            this.setState({
              metric: metrics,
              groups: usergroups,
              loading: false,
              write_perm: localStorage.getItem('authIsSuperuser') === 'true' || usergroups.indexOf(metrics.group) >= 0,
            })
      })
    }
  }

  render() {
    const { metric, groups, loading, write_perm } = this.state;

    if (!groups.includes(metric.group))
      groups.push(metric.group);

    if (loading)
      return (<LoadingAnim/>)
    
    else if (!loading) {
      return (
        <BaseArgoView
          resourcename='metric'
          location={this.location}
          addview={this.addview}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}>
          <Formik
            initialValues = {{
              name: metric.name,
              probeversion: metric.probeversion,
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
                <MetricForm
                  {...props}
                  obj='metric'
                  isTenantSchema={true}
                  state={this.state}
                  togglePopOver={this.togglePopOver}
                  groups={groups}
                />
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


export class MetricVersionDetails extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.version = props.match.params.version;

    this.backend = new Backend();

    this.state = {
      name: '',
      probeversion: '',
      mtype: '',
      group: '',
      probeexecutable: '',
      parent: '',
      config: [],
      attribute: [],
      dependancy: [],
      parameter: [],
      flags: [],
      files: [],
      fileparameter: [],
      loading: false
    };
  }

  componentDidMount() {
    this.setState({loading: true});

    this.backend.fetchData(`/api/v2/internal/tenantversion/metric/${this.name}`)
      .then((json) => {
        json.forEach((e) => {
          if (e.version == this.version)
            this.setState({
              name: e.fields.name,
              probeversion: e.fields.probeversion,
              type: e.fields.mtype,
              group: e.fields.group,
              probeexecutable: e.fields.probeexecutable,
              parent: e.fields.parent,
              config: e.fields.config,
              attribute: e.fields.attribute,
              dependancy: e.fields.dependancy,
              parameter: e.fields.parameter,
              flags: e.fields.flags,
              files: e.fields.files,
              fileparameter: e.fields.fileparameter,
              date_created: e.date_created,
              loading: false
            });
        });
      })
  }

  render() {
    const { name, probeversion, type, group, probeexecutable, parent, config, 
      attribute, dependancy, parameter, flags, files, fileparameter, date_created,
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
              probeversion: probeversion,
              type: type,
              group: group,
              probeexecutable: probeexecutable,
              parent: parent,
              config: config,
              attributes: attribute,
              dependency: dependancy,
              parameter: parameter,
              flags: flags,
              files: files,
              fileparameter: fileparameter
            }}
            render = {props => (
              <Form>
                <MetricForm
                  {...props}
                  obj='metric'
                  state={this.state}
                  isHistory={true}
                />
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