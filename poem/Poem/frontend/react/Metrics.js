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
  AutocompleteField,
  NotifyWarn,
  NotifyError,
  NotifyInfo,
  ErrorComponent,
  ModalAreYouSure,
  ParagraphTitle
 } from './UIElements';
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
  PopoverHeader,
  InputGroup,
  InputGroupAddon,
  ButtonToolbar,
  Badge
} from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faMinus, faPlus, faCaretDown } from '@fortawesome/free-solid-svg-icons';
import ReactDiffViewer from 'react-diff-viewer';
import CreatableSelect from 'react-select/creatable';
import { components } from 'react-select';

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
                    readOnly={!addnew || field === 'config' || (values.type === 'Passive' && item.key === 'PASSIVE')}
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
                        readOnly={readonly || (!addnew && field === 'config' && item.key === 'path')}
                        validate={validateConfig}
                      />
                    :
                      <Field
                        type='text'
                        name={`${field}.${index}.value`}
                        id={`${field}.${index}.value`}
                        className={`form-control ${values[field][index].isNew && 'border-success'}`}
                        style={{overflowX : 'auto'}}
                        readOnly={readonly || (!addnew && (field !== 'config' || field === 'config' && item.key === 'path')) || values.type === 'Passive' && item.key === 'PASSIVE'}
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
                  readOnly={!addnew}
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
                  readOnly={!addnew}
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


export const ProbeVersionLink = ({probeversion, publicView=false}) => (
  <Link to={`/ui/${publicView ? 'public_' : ''}probes/` + probeversion.split(' ')[0] + '/history/' + probeversion.split(' ')[1].substring(1, probeversion.split(' ')[1].length - 1)}>
    {probeversion}
  </Link>
)


export function ListOfMetrics(type, imp=false) {
  return class extends Component {
    constructor(props) {
      super(props);

      this.location = props.location;
      this.history = props.history;

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
          search_group: '',
          userDetails: undefined,
          error: null
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
          selectAll: 0,
          userDetails: undefined,
          areYouSureModal: false,
          modalFunc: undefined,
          modalTitle: undefined,
          modalMsg: undefined,
          error: null
        }
      }

      this.backend = new Backend();
      this.publicView = props.publicView
      this.doFilter = this.doFilter.bind(this);
      this.toggleRow = this.toggleRow.bind(this);
      this.importMetrics = this.importMetrics.bind(this);
      this.bulkDeleteMetrics = this.bulkDeleteMetrics.bind(this);
      this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
      this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
      this.onDelete = this.onDelete.bind(this);
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
        selectAll: Object.keys(newSelected).every((k) => !newSelected[k]) ? 0 : 2
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

    toggleAreYouSure() {
      this.setState(prevState =>
        ({areYouSureModal: !prevState.areYouSureModal}));
    };

    toggleAreYouSureSetModal(msg, title, onyes) {
      this.setState(prevState =>
        ({areYouSureModal: !prevState.areYouSureModal,
          modalFunc: onyes,
          modalMsg: msg,
          modalTitle: title,
        }));
    }

    onDelete() {
      let selectedMetrics = this.state.selected;
      // get only those metrics whose value is true
      let mt = Object.keys(selectedMetrics).filter(k => selectedMetrics[k]);
      if (mt.length > 0 ) {
        let msg = `Are you sure you want to delete metric template${mt.length > 1 ? 's' : ''} ${mt.join(', ')}?`
        let title = `Delete metric template${mt.length > 1 ? 's' : ''}`;

        this.toggleAreYouSureSetModal(msg, title,
          () => this.bulkDeleteMetrics(mt));
      } else
        NotifyError({
          msg: 'No metric templates were selected!',
          title: 'Error'
        });
    };

    async importMetrics() {
      let selectedMetrics = this.state.selected;
      // get only those metrics whose value is true
      let mt = Object.keys(selectedMetrics).filter(k => selectedMetrics[k]);
      if (mt.length > 0) {
        let response = await this.backend.importMetrics({'metrictemplates': mt});
        let json = await response.json();
        if ('imported' in json)
          NotifyOk({msg: json.imported, title: 'Imported'})

        if ('warn' in json)
          NotifyInfo({msg: json.warn, title: 'Imported with older probe version'});

        if ('err' in json)
          NotifyWarn({msg: json.err, title: 'Not imported'});

        if ('unavailable' in json)
          NotifyError({msg: json.unavailable, title: 'Unavailable'});

      } else {
        NotifyError({
          msg: 'No metric templates were selected!',
          title: 'Error'});
      };
    }

    async bulkDeleteMetrics(mt) {
      let refreshed_metrics = this.state.list_metric;
      let response = await this.backend.bulkDeleteMetrics({'metrictemplates': mt});
      let json = await response.json();
      if (response.ok) {
        refreshed_metrics = refreshed_metrics.filter(m => !mt.includes(m.name));
        if ('info' in json)
          NotifyOk({msg: json.info, title: 'Deleted'});

        if ('warning' in json)
          NotifyWarn({msg: json.warn, title: 'Deleted'});

        this.setState({
          list_metric: refreshed_metrics,
          selectAll: 0
        });

      } else
        NotifyError({
          msg: `Error deleting metric template${mt.length > 0 ? 's' : ''}`,
          title: `Error: ${response.status} ${response.statusText}`
        });
    };

    async componentDidMount() {
      this.setState({loading: true});

      let response = await this.backend.isTenantSchema();
      try {
        if (!this.publicView) {
          let sessionActive = await this.backend.isActiveSession(response);
          if (sessionActive.active)
            if (type === 'metric') {
              let metrics = await this.backend.fetchData('/api/v2/internal/metric');
              let groups = await this.backend.fetchResult('/api/v2/internal/usergroups');
              let types = await this.backend.fetchData('/api/v2/internal/mtypes');
              this.setState({
                list_metric: metrics,
                list_groups: groups['metrics'],
                list_types: types,
                loading: false,
                search_name: '',
                search_probeversion: '',
                search_group: '',
                search_type: '',
                userDetails: sessionActive.userdetails
              });
            } else {
              let metrictemplates = await this.backend.fetchData(`/api/v2/internal/metrictemplates${imp ? '-import' : ''}`);
              let types = await this.backend.fetchData('/api/v2/internal/mttypes');
              let ostags = await this.backend.fetchData('/api/v2/internal/ostags');
              this.setState({
                list_metric: metrictemplates,
                list_types: types,
                list_ostags: ostags,
                loading: false,
                search_name: '',
                search_probeversion: '',
                search_type: '',
                search_ostag: '',
                userDetails: sessionActive.userdetails
              });
            };
        } else {
          let metrics = await this.backend.fetchData('/api/v2/internal/public_metric');
          let groups = await this.backend.fetchResult('/api/v2/internal/public_usergroups');
          let types = await this.backend.fetchData('/api/v2/internal/public_mtypes');
          this.setState({
            list_metric: metrics,
            list_groups: groups['metrics'],
            list_types: types,
            loading: false,
            search_name: '',
            search_probeversion: '',
            search_group: '',
            search_type: '',
            userDetails: {username: 'Anonymous'}
          });
        }
      } catch(err) {
        this.setState({
          error: err,
          loading: false
        });
      };
    }

    render() {
      let metriclink = undefined;
      if (type === 'metric') {
        if (this.publicView)
          metriclink = '/ui/public_metrics/'
        else
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
            <Link
            to={
              imp ?
                this.state.search_ostag === 'CentOS 6' && e.centos6_probeversion ?
                  `${metriclink}${e.name}/history/${e.centos6_probeversion.split(' ')[1].substring(1, e.centos6_probeversion.split(' ')[1].length - 1)}`
                :
                  (this.state.search_ostag === 'CentOS 7' && e.centos7_probeversion) ?
                    `${metriclink}${e.name}/history/${e.centos7_probeversion.split(' ')[1].substring(1, e.centos7_probeversion.split(' ')[1].length - 1)}`
                  :
                    `${metriclink}${e.name}`
              :
                `${metriclink}${e.name}`
            }
          >
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
          accessor: e => (
            e.probeversion ?
              <ProbeVersionLink
                publicView={this.publicView}
                probeversion={
                  imp ?
                    (this.state.search_ostag === 'CentOS 6' && e.centos6_probeversion) ?
                      e.centos6_probeversion
                    :
                      (this.state.search_ostag === 'CentOS 7' && e.centos7_probeversion) ?
                        e.centos7_probeversion
                      :
                        e.probeversion
                  :
                    e.probeversion
                }
              />
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

      if (type == 'metrictemplate' && this.state.userDetails && this.state.userDetails.is_superuser) {
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
            Header: `${imp ? 'Select all' : 'Delete'}`,
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
          4,
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

      var { loading, list_metric, error } = this.state;

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

      else if (error)
        return (<ErrorComponent error={error}/>);

      else if (!loading && list_metric && this.state.userDetails) {
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
                className='-highlight'
                defaultPageSize={50}
                rowsText='metrics'
                getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
              />
            </BaseArgoView>
          )
        } else {
          if (imp)
            return (
              <>
                <div className="d-flex align-items-center justify-content-between">
                  <h2 className="ml-3 mt-1 mb-4">{`Select metric template${this.state.userDetails.is_superuser ? '(s) to import' : ' for details'}`}</h2>
                  {
                    this.state.userDetails.is_superuser &&
                      <Button
                      className='btn btn-secondary'
                      onClick={() => this.importMetrics()}
                        >
                          Import
                        </Button>
                  }
                </div>
                <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
                  <ReactTable
                    data={list_metric}
                    columns={columns}
                    className='-highlight'
                    defaultPageSize={50}
                    rowsText='metrics'
                    getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
                  />
                </div>
              </>
            )
          else
            return (
              <>
                <ModalAreYouSure
                  isOpen={this.state.areYouSureModal}
                  toggle={this.toggleAreYouSure}
                  title={this.state.modalTitle}
                  msg={this.state.modalMsg}
                  onYes={this.state.modalFunc}
                />
                <div className="d-flex align-items-center justify-content-between">
                  <h2 className="ml-3 mt-1 mb-4">{'Metric templates'}</h2>
                  {
                    <ButtonToolbar>
                      <Link className={`btn btn-secondary ${imp ? '' : 'mr-2'}`} to={this.location.pathname + '/add'} role='button'>Add</Link>
                      {
                        !imp &&
                          <Button
                            className='btn btn-secondary'
                            onClick={() => this.onDelete()}
                          >
                            Delete
                          </Button>
                      }
                    </ButtonToolbar>
                  }
                </div>
                <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
                  <ReactTable
                    data={list_metric}
                    columns={columns}
                    className='-highlight'
                    defaultPageSize={50}
                    rowsText='metrics'
                    getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
                  />
                </div>
              </>
            )
        }
      }
      else
        return null
    }
  }
}


const styles = {
  multiValue: (base, state) => {
    return (state.data.value === 'internal') ? { ...base, backgroundColor: '#d4edda' } : (state.data.value === 'deprecated') ? { ...base, backgroundColor: '#f8d7da' } : base;
  },
};

const DropdownIndicator = props => {
  return (
    <components.DropdownIndicator {...props}>
      <FontAwesomeIcon icon={faCaretDown}/>
    </components.DropdownIndicator>
  );
};


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
    onTagChange=undefined,
    isHistory=false,
    isTenantSchema=false,
    addview=false,
    probeversions=[],
    groups=[],
    metrictemplatelist=[],
    types=[],
    alltags=[],
    tags=[],
    publicView=false
  }) =>
    <>
      <FormGroup>
        <Row className='mb-3'>
          <Col md={6}>
            <InputGroup>
              <InputGroupAddon addonType='prepend'>Name</InputGroupAddon>
              <Field
              type='text'
              name='name'
              className={`form-control ${errors.name && 'border-danger'}`}
              id='name'
              readOnly={isHistory || isTenantSchema}
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
          <Col md={4} className='mt-1'>
            <InputGroup>
              <InputGroupAddon addonType='prepend'>Type</InputGroupAddon>
              {
                (isTenantSchema || isHistory) ?
                  <Field
                    type='text'
                    name='type'
                    className='form-control'
                    id='mtype'
                    readOnly={true}
                  />
                :
                  <Field
                    component='select'
                    name='type'
                    className='form-control custom-select'
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
        <Row>
          <Col md={6}>
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
                (isHistory || isTenantSchema) ?
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
                  Probe name and version&nbsp;
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
                              publicView={publicView}
                            />
                          </PopoverHeader>
                          <PopoverBody>{state.probe.description}</PopoverBody>
                        </Popover>
                      </>
                  }
                </FormText>
          }
          </Col>
          <Col md={4} className='mt-1'>
            <InputGroup>
              <InputGroupAddon addonType='prepend'>Package</InputGroupAddon>
              <Field
                type='text'
                className='form-control'
                value={state.probe.package}
                disabled={true}
              />
            </InputGroup>
            <FormText color='muted'>
              Package which contains probe.
            </FormText>
          </Col>
        </Row>
        {
          (obj === 'metrictemplate' && !isHistory) ?
            <Row className='mb-4 mt-2'>
              <Col md={10}>
                <Label>Tags:</Label>
                <CreatableSelect
                  closeMenuOnSelect={false}
                  isMulti
                  onChange={onTagChange}
                  options={alltags}
                  components={{DropdownIndicator}}
                  defaultValue={tags}
                  styles={styles}
                />
              </Col>
            </Row>
          :
            <Row className='mb-4 mt-2'>
              <Col md={10}>
                <Label>Tags:</Label>
                <div>
                  {
                    state.tags.map((tag, i) =>
                      <Badge className={'mr-1'} key={i} color={tag === 'internal' ? 'success' : tag === 'deprecated' ? 'danger' : 'secondary'}>
                        {tag}
                      </Badge>
                    )
                  }
                </div>
              </Col>
            </Row>
        }
        <Row className='mb-4 mt-2'>
          <Col md={10}>
            <Label for='description'>Description:</Label>
            <Field
              id='description'
              className='form-control'
              component='textarea'
              name='description'
              disabled={isTenantSchema || isHistory}
            />
          </Col>
        </Row>
        {
          obj === 'metric' &&
            <Row className='mb-4'>
              <Col md={3}>
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
                        className='form-control custom-select'
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
        <ParagraphTitle title='Metric configuration'/>
        <h6 className='mt-4 font-weight-bold text-uppercase' hidden={values.type === 'Passive'}>probe executable</h6>
        <Row>
          <Col md={5}>
            <Field
            type='text'
            name='probeexecutable'
            id='probeexecutable'
            className={`form-control ${errors.probeexecutable && 'border-danger'}`}
            hidden={values.type === 'Passive'}
            readOnly={isTenantSchema || isHistory}
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
                readOnly={true}
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
        description1: '',
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
        description2: '',
        probeexecutable2: '',
        parent2: '',
        config2: '',
        attribute2: '',
        dependency2: '',
        parameter2: '',
        flags2: '',
        files2: '',
        fileparameter2: '',
        error: null
      };

      this.backend = new Backend();
    }

    async componentDidMount() {
      this.setState({loading: true});

      let url = undefined;

      if (metrictype === 'metric')
        url = `/api/v2/internal/tenantversion/metric/${this.name}`;

      else
        url = `/api/v2/internal/version/metrictemplate/${this.name}`;

      try {
        let json = await this.backend.fetchData(url);
        let name1 = '';
        let probeversion1 = '';
        let type1 = '';
        let group1 = '';
        let description1 = '';
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
        let description2 = '';
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
            description1 = e.fields.description;
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
              description2 = e.fields.description;
              probeexecutable2 = e.fields.probeexecutable;
              parent2 = e.fields.parent;
              config2 = e.fields.config;
              attribute2 = e.fields.attribute;
              flags2 = e.fields.flags;
              files2 = e.fields.files;
              parameter2 = e.fields.parameter;
              fileparameter2 = e.fields.fileparameter;
          }
        });
        this.setState({
          name1: name1,
          probeversion1: probeversion1,
          type1: type1,
          group1: group1,
          description1: description1,
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
          description2: description2,
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
      } catch(err) {
        this.setState({
          error: err,
          loading: false
        });
      };
    }

    render() {
      var { name1, name2, probeversion1, probeversion2, type1, type2,
        probeexecutable1, probeexecutable2, parent1, parent2, config1,
        config2, attribute1, attribute2, dependency1, dependency2,
        parameter1, parameter2, flags1, flags2, group1, group2, loading,
        description1, description2, error } = this.state;

      if (loading)
        return <LoadingAnim/>;

      else if (error)
        return (<ErrorComponent error={error}/>);

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
              (description1 !== description2) &&
                <DiffElement title='description' item1={description1} item2={description2}/>
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
                <InlineDiffElement title='dependency' item1={dependency1} item2={dependency2}/>
            }
            {
              (!arraysEqual(parameter1, parameter2)) &&
                <InlineDiffElement title='parameter' item1={parameter1} item2={parameter2}/>
            }
            {
              (!arraysEqual(flags1, flags2)) &&
                <InlineDiffElement title='flags' item1={flags1} item2={flags2}/>
            }
          </React.Fragment>
        );
      } else
        return null;
    }
  };
}


export class MetricChange extends Component {
  constructor(props) {
    super(props);

    this.name = props.match.params.name;
    this.addview = props.addview;
    this.location = props.location;
    this.history = props.history;
    this.backend = new Backend();
    this.publicView = props.publicView;

    this.state = {
      metric: {},
      probe: {},
      groups: [],
      probeversions: [],
      allprobeversions: [],
      metrictemplateversions: [],
      loading: false,
      popoverOpen: false,
      write_perm: false,
      areYouSureModal: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined,
      error: null
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

  async doChange(values, actions) {
    let response = await this.backend.changeObject(
      '/api/v2/internal/metric/',
      {
        name: values.name,
        mtype: values.type,
        group: values.group,
        description: values.description,
        parent: values.parent,
        probeversion: values.probeversion,
        probeexecutable: values.probeexecutable,
        config: values.config,
        attribute: values.attributes,
        dependancy: values.dependency,
        flags: values.flags,
        files: values.file_attributes,
        parameter: values.parameter,
        fileparameter: values.file_parameters
      }
    );
    if (response.ok) {
      NotifyOk({
        msg: 'Metric successfully changed',
        title: 'Changed',
        callback: () => this.history.push('/ui/metrics')
      })
    } else {
      let change_msg = '';
      try {
        let json = await response.json();
        change_msg = json.detail;
      } catch(err) {
        change_msg = 'Error changing metric';
      };
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: change_msg
      });
    };
  }

  async doDelete(name) {
    let response = await this.backend.deleteObject(`/api/v2/internal/metric/${name}`);
    if (response.ok) {
      NotifyOk({
        msg: 'Metric successfully deleted',
        title: 'Deleted',
        callback: () => this.history.push('/ui/metrics')
      });
    } else {
      let msg = '';
      try {
        let json = await response.json();
        msg = json.detail;
      } catch(err) {
        msg = 'Error deleting metric';
      }
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    };
  }

  async componentDidMount() {
    this.setState({loading: true});

    try {
      if (!this.addview) {
        if (!this.publicView) {
          let session = await this.backend.isActiveSession();
          let metrics = await this.backend.fetchData(`/api/v2/internal/metric/${this.name}`);
          let metrictemplateversions = await this.backend.fetchData(`/api/v2/internal/version/metrictemplate/${this.name}`);
          if (session.active)
            if (metrics.probeversion) {
              let probe = await this.backend.fetchData(`/api/v2/internal/version/probe/${metrics.probeversion.split(' ')[0]}`);
              let fields = {};
              let probeversions = [];
              probe.forEach((e) => {
                probeversions.push(e.object_repr);
                if (e.object_repr === metrics.probeversion) {
                  fields = e.fields;
                }
              })
              this.setState({
                metric: metrics,
                probe: fields,
                probeversions: probeversions,
                allprobeversions: probe,
                metrictemplateversions: metrictemplateversions,
                groups: session.userdetails.groups.metrics,
                loading: false,
                write_perm: session.userdetails.is_superuser ||
                  session.userdetails.groups.metrics.indexOf(metrics.group) >= 0,
              });
            } else {
              this.setState({
                metric: metrics,
                groups: session.userdetails.groups.metrics,
                loading: false,
                write_perm: session.userdetails.is_superuser ||
                  session.userdetails.groups.metrics.indexOf(metrics.group) >= 0,
              });
            };
        } else {
          let metrics = await this.backend.fetchData(`/api/v2/internal/public_metric/${this.name}`);
          let metrictemplateversions = await this.backend.fetchData(`/api/v2/internal/public_version/metrictemplate/${this.name}`);
          if (metrics.probeversion) {
            let probe = await this.backend.fetchData(`/api/v2/internal/public_version/probe/${metrics.probeversion.split(' ')[0]}`);
            let fields = {};
            let probeversions = [];
            probe.forEach((e) => {
              probeversions.push(e.object_repr);
              if (e.object_repr === metrics.probeversion) {
                fields = e.fields;
              }
            })
            this.setState({
              metric: metrics,
              probe: fields,
              probeversions: probeversions,
              allprobeversions: probe,
              metrictemplateversions: metrictemplateversions,
              groups: [],
              loading: false,
              write_perm: false,
            });
          } else {
            this.setState({
              metric: metrics,
              groups: [],
              loading: false,
              write_perm: false,
            });
          };
        }
      };
    } catch(err) {
      this.setState({
        error: err,
        loading: false
      });
    };
  }

  render() {
    const { metric, probeversions, groups, loading, write_perm, error } = this.state;

    if (!groups.includes(metric.group))
      groups.push(metric.group);

    if (loading)
      return (<LoadingAnim/>)

    else if (error)
      return (<ErrorComponent error={error}/>);

    else if (!loading) {
      return (
        <BaseArgoView
          resourcename='metric'
          location={this.location}
          addview={this.addview}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          publicview={this.publicView}
          submitperm={write_perm}>
          <Formik
            enableReinitialize={true}
            initialValues = {{
              name: metric.name,
              probeversion: metric.probeversion,
              description: metric.description,
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
                  probeversions={probeversions}
                  groups={groups}
                  publicView={this.publicView}
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
      probe: {'package': ''},
      description: '',
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
      loading: false,
      error: null
    };
  }

  async componentDidMount() {
    this.setState({loading: true});

    try {
      let json = await this.backend.fetchData(`/api/v2/internal/tenantversion/metric/${this.name}`);
      json.forEach(async (e) => {
        if (e.version == this.version) {
          let probes = await this.backend.fetchData(`/api/v2/internal/version/probe/${e.fields.probeversion.split(' ')[0]}`);
          let probe = {};
          probes.forEach(p => {
            if (p.object_repr === e.fields.probeversion)
              probe = p.fields;
          });
          this.setState({
            name: e.fields.name,
            probeversion: e.fields.probeversion,
            probe: probe,
            description: e.fields.description,
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
        };
      });
    } catch(err) {
      this.setState({
        error: err,
        loading: false
      });
    };
  }

  render() {
    const { name, probeversion, type, group, probeexecutable, parent, config,
      attribute, dependancy, parameter, flags, files, fileparameter, date_created,
      loading, description, error } = this.state;

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
              probeversion: probeversion,
              type: type,
              group: group,
              description: description,
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
