import React, { useState, useEffect } from 'react';
import { Backend } from './DataManager';
import { Link } from 'react-router-dom';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  FancyErrorMessage,
  DiffElement,
  AutocompleteField,
  NotifyWarn,
  NotifyError,
  NotifyInfo,
  ErrorComponent,
  ModalAreYouSure,
  ParagraphTitle, DefaultColumnFilter, SelectColumnFilter, BaseArgoTable
 } from './UIElements';
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
import { useQuery, queryCache } from 'react-query';


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


export const ListOfMetrics = (props) => {
  const location = props.location;
  const type = props.type;
  const publicView = props.publicView;

  const [selected, setSelected] = useState({});
  const [selectAll, setSelectAll] = useState(0);
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalVar, setModalVar] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);

  const backend = new Backend();

  const { data: listMetrics, error: listMetricsError, isLoading: listMetricsLoading } = useQuery(
    `${type}_listview`, async () => {
      let metrics =await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}${type === 'metrics' ? 'metric' : type}`);
      return metrics;
    },
    { retry: false }
  );

  const { data: listTypes, error: listTypesError, isLoading: listTypesLoading } = useQuery(
    `${type}_listview_mtypes`, async () => {
      let types = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}mt${type=='metrictemplates' ? 't' : ''}ypes`);
      return types;
    }
  );

  const { data: listTags, error: listTagsError, isLoading: listTagsLoading } = useQuery(
    `${type}_listview_tags`, async () => {
      let tags = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metrictags`);
      return tags;
    }
  );

  const { data: listOSGroups, error: listOSGroupsError, isLoading: listOSGroupsLoading } = useQuery(
    `${type}_listview_osgroups`, async () => {
      if (type === 'metrics') {
        let groups = await backend.fetchResult(`/api/v2/internal/${publicView ? 'public_' : ''}usergroups`);
        return groups['metrics'];
      } else {
        let ostags = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}ostags`);
        return ostags;
      }
    }
  );

  const { data: isTenantSchema, isLoading: isTenantSchemaLoading } = useQuery(
    `${type}_listview_schema`, async () => {
      let schema = backend.isTenantSchema();
      return schema;
    }
  );

  const { data: userDetails, error: userDetailsError, isLoading: userDetailsLoading } = useQuery(
    `${type}_listview_userdetails`, async () => {
      let userdetails = { username: 'Anonymous' };
      let schema = backend.isTenantSchema();
      if (!publicView) {
        let sessionActive = await backend.isActiveSession(schema);
        if (sessionActive.active)
          userdetails = sessionActive.userdetails;
      }
      return userdetails;
    }
  );

  function toggleRow(name) {
    const newSelected = Object.assign({}, selected);
    newSelected[name] = !selected[name];
    setSelected(newSelected);
    setSelectAll(Object.keys(newSelected).every((k) => !newSelected[k]) ? 0 : 2);
  }

  function toggleSelectAll(instance) {
    var list_metric = [];

    instance.filteredFlatRows.forEach(row => list_metric.push(row.original));

    let newSelected = {};
    if (selectAll === 0) {
      list_metric.forEach(x => {
        newSelected[x.name] = true;
      });
    }

    setSelected(newSelected);
    setSelectAll(selectAll === 0 ? 1 : 0);
  }

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onDelete() {
    let selectedMetrics = selected;
    // get only those metrics whose value is true
    let mt = Object.keys(selectedMetrics).filter(k => selectedMetrics[k]);
    if (mt.length > 0 ) {
      setModalMsg(`Are you sure you want to delete metric template${mt.length > 1 ? 's' : ''} ${mt.join(', ')}?`);
      setModalTitle(`Delete metric template${mt.length > 1 ? 's' : ''}`);
      setModalVar(mt);
      toggleAreYouSure();
    } else
      NotifyError({
        msg: 'No metric templates were selected!',
        title: 'Error'
      });
  }

  async function importMetrics() {
    let selectedMetrics = selected;
    // get only those metrics whose value is true
    let mt = Object.keys(selectedMetrics).filter(k => selectedMetrics[k]);
    if (mt.length > 0) {
      let response = await backend.importMetrics({'metrictemplates': mt});
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
    }
  }

  async function bulkDeleteMetrics(mt) {
    //let refreshed_metrics = listMetrics;
    let response = await backend.bulkDeleteMetrics({'metrictemplates': mt});
    let json = await response.json();
    if (response.ok) {
      //refreshed_metrics = refreshed_metrics.filter(m => !mt.includes(m.name));
      if ('info' in json)
        NotifyOk({msg: json.info, title: 'Deleted'});

      if ('warning' in json)
        NotifyWarn({msg: json.warning, title: 'Deleted'});

      queryCache.setQueryData(`${type}_listview`, (oldData) => oldData.filter(m => !mt.includes(m.name)));
      setSelectAll(0);

    } else
      NotifyError({
        msg: `Error deleting metric template${mt.length > 0 ? 's' : ''}`,
        title: `Error: ${response.status} ${response.statusText}`
      });
  };

  let metriclink = `/ui/${(type === 'metrictemplates' && isTenantSchema && !publicView) ? 'administration/' : ''}${publicView ? 'public_' : ''}${type}/`;

  const columns = [
    {
      Header: 'Name',
      accessor: 'name',
      column_width: '39%',
      Cell: row =>
        <Link to={`${metriclink}${row.value}`}>
          {row.value}
        </Link>,
      Filter: DefaultColumnFilter
    },
    {
      Header: 'Probe version',
      column_width: '20%',
      accessor: 'probeversion',
      Cell: row => (
        <div style={{textAlign: 'center'}}>
          {
            (row.value) ?
              <ProbeVersionLink
                publicView={publicView}
                probeversion={row.value}
              />
            :
              ""
              }
        </div>
      ),
      Filter: DefaultColumnFilter
    },
    {
      Header: 'Type',
      column_width: `${isTenantSchema ? '12%' : '18%'}`,
      accessor: 'mtype',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>,
      filterList: listTypes,
      Filter: SelectColumnFilter
    },
    {
      Header: 'Tag',
      column_width: `${isTenantSchema ? '12%' : '18%'}`,
      accessor: 'tags',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {
            row.value.length === 0 ?
              <Badge color='dark'>none</Badge>
            :
              row.value.map((tag, i) =>
                <Badge className={'mr-1'} key={i} color={tag === 'internal' ? 'success' : tag === 'deprecated' ? 'danger' : 'secondary'}>
                  {tag}
                </Badge>
              )
          }
        </div>,
      filterList: listTags,
      Filter: SelectColumnFilter
    }
  ];

  if (type == 'metrictemplates' && userDetails && userDetails.is_superuser) {
    columns.splice(
      0,
      0,
      {
        id: 'checkbox',
        accessor: null,
        Cell: (row) => {
          let original = row.cell.row.original;
          return (
            <div style={{display: 'flex', justifyContent: 'center'}}>
              <input
                type='checkbox'
                className='checkbox'
                checked={selected[original.name] === true}
                onChange={() => toggleRow(original.name)}
              />
            </div>
          );
        },
        Header: `${isTenantSchema ? 'Select all' : 'Delete'}`,
        Filter: (instance) => (
          <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
            <input
              type='checkbox'
              className='checkbox'
              checked={selectAll === 1}
              ref={input => {
                if (input) {
                  input.indeterminate = selectAll === 2;
                }
              }}
              onChange={() => toggleSelectAll(instance)}
            />
          </div>
        ),
        column_width: '5%'
      }
    );
  } else {
    columns.splice(
      0,
      0,
      {
        Header: '#',
        id: 'row',
        column_width: '5%'
      }
    );
  };

  if (type === 'metrics') {
    columns.splice(
      4,
      0,
      {
        Header: 'Group',
        column_width: '12%',
        accessor: 'group',
        Cell: row =>
          <div style={{textAlign: 'center'}}>
            {row.value}
          </div>,
        filterList: listOSGroups,
        Filter: SelectColumnFilter
      }
    );
  } else {
    if (isTenantSchema) {
      columns.splice(
        4,
        0,
        {
          Header: 'OS',
          column_width: '12%',
          accessor: 'ostag',
          Cell: row =>
            <div style={{textAlign: 'center'}}>
              {row.value.join(', ')}
            </div>,
          filterList: listOSGroups,
          Filter: SelectColumnFilter
        }
      );
    };
  };

  const memoized_columns = React.useMemo(() => columns);

  if (listMetricsLoading || listTypesLoading || listTagsLoading || listOSGroupsLoading || isTenantSchemaLoading || userDetailsLoading)
    return (<LoadingAnim />);

  else if (listMetricsError)
    return (<ErrorComponent error={listMetricsError.message}/>);

  else if (listTypesError)
    return (<ErrorComponent error={listTypesError.message}/>);

  else if (listTagsError)
    return (<ErrorComponent error={listTagsError.message}/>);

  else if (listOSGroupsError)
    return (<ErrorComponent error={listOSGroupsError.message}/>);

  else if (userDetailsError)
    return (<ErrorComponent error={userDetailsError.message}/>);

  else if (!listMetricsLoading && !listTypesLoading && !listTagsLoading && !listOSGroupsLoading && !isTenantSchemaLoading && !userDetailsLoading && listMetrics) {
    if (type === 'metrics') {
      return (
        <BaseArgoView
          resourcename='metric'
          location={location}
          listview={true}
          addnew={false}
        >
          <BaseArgoTable
            data={listMetrics}
            columns={memoized_columns}
            page_size={50}
            resourcename='metrics'
            filter={true}
          />
        </BaseArgoView>
      )
    } else {
      if (isTenantSchema)
        return (
          <>
            <div className="d-flex align-items-center justify-content-between">
              <h2 className="ml-3 mt-1 mb-4">{`Select metric template${userDetails.is_superuser ? '(s) to import' : ' for details'}`}</h2>
              {
                userDetails.is_superuser &&
                  <Button
                  className='btn btn-secondary'
                  onClick={() => importMetrics()}
                    >
                      Import
                    </Button>
              }
            </div>
            <div id="argo-contentwrap" className="ml-2 mb-2 mt-2 p-3 border rounded">
              <BaseArgoTable
                data={listMetrics}
                columns={memoized_columns}
                page_size={50}
                resourcename='metrics'
                filter={true}
                selectable={true}
              />
            </div>
          </>
        );
      else
        return (
          <>
            <ModalAreYouSure
              isOpen={areYouSureModal}
              toggle={toggleAreYouSure}
              title={modalTitle}
              msg={modalMsg}
              onYes={() => bulkDeleteMetrics(modalVar)}
            />
            <div className="d-flex align-items-center justify-content-between">
              <h2 className="ml-3 mt-1 mb-4">{'Select metric template to change'}</h2>
              {
                <ButtonToolbar>
                  <Link className={'btn btn-secondary mr-2'} to={location.pathname + '/add'} role='button'>Add</Link>
                  {
                    !isTenantSchema &&
                      <Button
                        className='btn btn-secondary'
                        onClick={() => onDelete()}
                      >
                        Delete
                      </Button>
                  }
                </ButtonToolbar>
              }
            </div>
            <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
              <BaseArgoTable
                data={listMetrics}
                columns={memoized_columns}
                page_size={50}
                resourcename='metric templates'
                filter={true}
                selectable={true}
              />
            </div>
          </>
        );
    };
  } else
    return null;
};


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
    obj_label='',
    obj=undefined,
    probe=undefined,
    popoverOpen=undefined,
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
              readOnly={isHistory || isTenantSchema || publicView}
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
                (isTenantSchema || isHistory || publicView) ?
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
                (isHistory || isTenantSchema || publicView) ?
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
                          hidden={`${obj}.mtype` === 'Passive' || addview}
                          icon={faInfoCircle}
                          style={{color: '#416090'}}
                        />
                        <Popover
                          placement='bottom'
                          isOpen={popoverOpen}
                          target='probe-popover'
                          toggle={togglePopOver}
                          trigger='click'
                        >
                          <PopoverHeader>
                            <ProbeVersionLink
                              probeversion={obj.probeversion}
                              publicView={publicView}
                            />
                          </PopoverHeader>
                          <PopoverBody>{probe.description}</PopoverBody>
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
                value={values.type === 'Active' ? probe.package : ''}
                disabled={true}
              />
            </InputGroup>
            <FormText color='muted'>
              Package which contains probe.
            </FormText>
          </Col>
        </Row>
        {
          (obj_label === 'metrictemplate' && (!isHistory && !isTenantSchema && !publicView)) ?
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
                    tags.length === 0 ?
                      <Badge color='dark'>none</Badge>
                    :
                      (obj_label === 'metrictemplate' && !isHistory) ?
                        tags.map((tag, i) =>
                          <Badge className={'mr-1'} key={i} color={tag.value === 'internal' ? 'success' : tag.value === 'deprecated' ? 'danger' : 'secondary'}>
                            {tag.value}
                          </Badge>
                        )
                      :
                        tags.map((tag, i) =>
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
              disabled={isTenantSchema || isHistory || publicView}
            />
          </Col>
        </Row>
        {
          obj_label === 'metric' &&
            <Row className='mb-4'>
              <Col md={3}>
                <InputGroup>
                  <InputGroupAddon addonType='prepend'>Group</InputGroupAddon>
                  {
                    (isHistory || publicView) ?
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
            readOnly={isTenantSchema || isHistory || publicView}
          />
            {
            errors.probeexecutable &&
              FancyErrorMessage(errors.probeexecutable)
          }
          </Col>
        </Row>
        <InlineFields values={values} errors={errors} field='config' addnew={!isTenantSchema && !isHistory} readonly={obj_label === 'metrictemplate' && isTenantSchema || isHistory || publicView}/>
        <InlineFields values={values} errors={errors} field='attributes' addnew={!isTenantSchema && !isHistory && !publicView}/>
        <InlineFields values={values} errors={errors} field='dependency' addnew={!isTenantSchema && !isHistory && !publicView}/>
        <InlineFields values={values} errors={errors} field='parameter' addnew={!isTenantSchema && !isHistory && !publicView}/>
        <InlineFields values={values} errors={errors} field='flags' addnew={!isTenantSchema && !isHistory && !publicView}/>
        <h6 className='mt-4 font-weight-bold text-uppercase'>parent</h6>
        <Row>
          <Col md={5}>
            {
            (isTenantSchema || isHistory || publicView) ?
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


export const CompareMetrics = (props) => {
  const version1 = props.match.params.id1;
  const version2 = props.match.params.id2;
  const name = props.match.params.name;
  const publicView = props.publicView;
  const type = props.type;

  const [loading, setLoading] = useState(false);
  const [metric1, setMetric1] = useState(undefined);
  const [metric2, setMetric2] = useState(undefined);
  const [error, setError] = useState(undefined);

  const backend = new Backend();

  useEffect(() => {
    setLoading(true);

    async function fetchData() {
      try {
        let url = `/api/v2/internal/${publicView ? 'public_' : ''}${type === 'metric' ? 'tenant' : ''}version/${type}/${name}`;
        let json = await backend.fetchData(url);

        json.forEach((e) => {
          if (e.version == version1)
            setMetric1(e.fields);

          if (e.version == version2)
            setMetric2(e.fields);
        });
      } catch(err) {
        setError(err)
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && metric1 && metric2) {
    return (
      <React.Fragment>
        <div className='d-flex align-items-center justify-content-between'>
          <h2 className='ml-3 mt-1 mb-4'>{`Compare ${name}`}</h2>
        </div>
        {
          (metric1.name !== metric2.name) &&
            <DiffElement title='name' item1={metric1.name} item2={metric2.name}/>
        }
        {
          (metric1.probeversion !== metric2.probeversion) &&
            <DiffElement title='probe version' item1={metric1.probeversion} item2={metric2.probeversion}/>
        }
        {
          (metric1.type !== metric2.type) &&
            <DiffElement title='type' item1={metric1.type} item2={metric2.type}/>
        }
        {
          (!arraysEqual(metric1.tags, metric2.tags)) &&
            <DiffElement title='tags' item1={metric1.tags} item2={metric2.tags}/>
        }
        {
          (type === 'metric' && metric1.group !== metric2.group) &&
            <DiffElement title='group' item1={metric1.group} item2={metric2.group}/>
        }
        {
          (metric1.description !== metric2.description) &&
            <DiffElement title='description' item1={metric1.description} item2={metric2.description}/>
        }
        {
          (metric1.probeexecutable !== metric2.probeexecutable) &&
            <DiffElement title='probe executable' item1={metric1.probeexecutable} item2={metric2.probeexecutable}/>
        }
        {
          (metric1.parent !== metric2.parent) &&
            <DiffElement title='parent' item1={metric1.parent} item2={metric2.parent}/>
        }
        {
          (!arraysEqual(metric1.config, metric2.config)) &&
            <InlineDiffElement title='config' item1={metric1.config} item2={metric2.config}/>
        }
        {
          (!arraysEqual(metric1.attribute, metric2.attribute)) &&
            <InlineDiffElement title='attribute' item1={metric1.attribute} item2={metric2.attribute}/>
        }
        {
          (type === 'metrictemplate' && !arraysEqual(metric1.dependency, metric2.dependency)) &&
            <InlineDiffElement title='dependency' item1={metric1.dependency} item2={metric2.dependency}/>
        }
        {
          (type === 'metric' && !arraysEqual(metric1.dependancy, metric2.dependancy)) &&
            <InlineDiffElement title='dependency' item1={metric1.dependancy} item2={metric2.dependancy}/>
        }
        {
          (!arraysEqual(metric1.parameter, metric2.parameter)) &&
            <InlineDiffElement title='parameter' item1={metric1.parameter} item2={metric2.parameter}/>
        }
        {
          (!arraysEqual(metric1.flags, metric2.flags)) &&
            <InlineDiffElement title='flags' item1={metric1.flags} item2={metric2.flags}/>
        }
      </React.Fragment>
    );
  } else
    return null;
};


export const MetricChange = (props) => {
  const name = props.match.params.name;
  const location = props.location;
  const history = props.history;
  const publicView = props.publicView;
  const querykey = `metric_${name}_${publicView ? 'publicview' : 'changeview'}`;

  const backend = new Backend();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  const { data: metric, error: metricError, isLoading: metricLoading } = useQuery(
    `${querykey}_metric`, async () => {
      let metric = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}metric/${name}`);
      return metric;
    }
  );

  const { data: session, error: sessionError, isLoading: sessionLoading } = useQuery(
    `${querykey}_session`, async () => {
      let session = await backend.isActiveSession();
      return session;
    }
  );

  const { data: probe, error: probeError, isLoading: probeLoading } = useQuery(
    `${querykey}_probe`, async () => {
      let probe = {};
      let probes = [];
      if (metric.probeversion)
        probes = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}version/probe/${metric.probeversion.split(' ')[0]}`);
        probes.forEach((p) => {
          if (p.object_repr === metric.probeversion)
            probe = p.fields;
        });

      return probe;
    },
    { enabled: metric }
  );

  function togglePopOver() {
    setPopoverOpen(!popoverOpen);
  }

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function onSubmitHandle(values, actions) {
    setModalMsg('Are you sure you want to change metric?');
    setModalTitle('Change metric');
    setFormValues(values);
    setModalFlag('submit');
    toggleAreYouSure();
  }

  async function doChange() {
    let response = await backend.changeObject(
      '/api/v2/internal/metric/',
      {
        name: formValues.name,
        mtype: formValues.type,
        group: formValues.group,
        description: formValues.description,
        parent: formValues.parent,
        probeversion: formValues.probeversion,
        probeexecutable: formValues.probeexecutable,
        config: formValues.config,
        attribute: formValues.attributes,
        dependancy: formValues.dependency,
        flags: formValues.flags,
        files: formValues.files,
        parameter: formValues.parameter,
        fileparameter: formValues.file_parameters
      }
    );
    if (response.ok) {
      NotifyOk({
        msg: 'Metric successfully changed',
        title: 'Changed',
        callback: () => history.push('/ui/metrics')
      })
    } else {
      let change_msg = '';
      try {
        let json = await response.json();
        change_msg = json.detail;
      } catch(err) {
        change_msg = 'Error changing metric';
      }
      NotifyError({
        title: `Error: ${response.status} ${response.statusText}`,
        msg: change_msg
      });
    }
  }

  async function doDelete() {
    let response = await backend.deleteObject(`/api/v2/internal/metric/${name}`);
    if (response.ok) {
      NotifyOk({
        msg: 'Metric successfully deleted',
        title: 'Deleted',
        callback: () => history.push('/ui/metrics')
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
    }
  }

  if (metricLoading || sessionLoading || probeLoading)
    return (<LoadingAnim/>);

  else if (metricError)
    return (<ErrorComponent error={metricError}/>);

  else if (sessionError)
    return (<ErrorComponent error={sessionError}/>);

  else if (probeError)
    return (<ErrorComponent error={probeError}/>);

  else {
    var groups = [];
    var writePerm = false;
    if (session.active) {
      groups = session.userdetails.groups.metrics;
      writePerm = session.userdetails.is_superuser || session.userdetails.groups.metrics.indexOf(metric.group) >= 0;
    }

    if (!groups.includes(metric.group))
      groups.push(metric.group);


    return (
      <React.Fragment>
        <ModalAreYouSure
          isOpen={areYouSureModal}
          toggle={toggleAreYouSure}
          title={modalTitle}
          msg={modalMsg}
          onYes={modalFlag === 'submit' ? doChange : modalFlag === 'delete' ? doDelete : undefined}
        />
        <BaseArgoView
          resourcename={(publicView) ? 'Metric details' : 'metric'}
          location={location}
          history={!publicView}
          publicview={publicView}
          submitperm={writePerm}>
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
              files: metric.files,
              file_attributes: metric.files,
              file_parameters: metric.fileparameter
            }}
            onSubmit = {(values, actions) => onSubmitHandle(values, actions)}
            render = {props => (
              <Form>
                <MetricForm
                  {...props}
                  obj_label='metric'
                  obj={metric}
                  probe={probe}
                  tags={metric.tags}
                  isTenantSchema={true}
                  popoverOpen={popoverOpen}
                  togglePopOver={togglePopOver}
                  groups={groups}
                  publicView={publicView}
                />
                {
                  (writePerm) &&
                    <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                      <Button
                        color="danger"
                        onClick={() => {
                          setModalMsg('Are you sure you want to delete metric?')
                          setModalTitle('Delete metric')
                          setModalFlag('delete');
                          toggleAreYouSure();
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
      </React.Fragment>
    );
  }
};


export const MetricVersionDetails = (props) => {
  const name = props.match.params.name;
  const version = props.match.params.version;

  const backend = new Backend();

  const [loading, setLoading] = useState(false);
  const [metric, setMetric] = useState(null);
  const [probe, setProbe] = useState({'package': ''})
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);

    async function fetchData() {
      try {
        let json = await backend.fetchData(`/api/v2/internal/tenantversion/metric/${name}`);
        json.forEach(async (e) => {
          if (e.version == version) {
            let probes = await backend.fetchData(`/api/v2/internal/version/probe/${e.fields.probeversion.split(' ')[0]}`);
            probes.forEach(p => {
              if (p.object_repr === e.fields.probeversion)
                setProbe(p.fields);
            });
            let m = e.fields;
            m.date_created = e.date_created;
            setMetric(m);
          }
        });
      } catch(err) {
        setError(err)
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && metric) {
    return (
      <BaseArgoView
        resourcename={`${name} (${metric.date_created})`}
        infoview={true}
      >
        <Formik
          initialValues = {{
            name: name,
            probeversion: metric.probeversion,
            type: metric.mtype,
            group: metric.group,
            description: metric.description,
            probeexecutable: metric.probeexecutable,
            parent: metric.parent,
            config: metric.config,
            attributes: metric.attribute,
            dependency: metric.dependancy,
            parameter: metric.parameter,
            flags: metric.flags,
            files: metric.files,
            fileparameter: metric.fileparameter
          }}
          render = {props => (
            <Form>
              <MetricForm
                {...props}
                obj_label='metric'
                isHistory={true}
                probe={probe}
                tags={metric.tags}
              />
            </Form>
          )}
          />
      </BaseArgoView>
    );
  } else
    return null;
};
