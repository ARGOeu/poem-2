import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Backend, WebApi } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  FancyErrorMessage,
  DiffElement,
  ProfileMainInfo,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  ProfilesListTable,
  _AutocompleteField
} from './UIElements';
import {
  Formik,
  Form,
  Field,
  FieldArray
} from 'formik';
import {
  FormGroup,
  Row,
  Col,
  InputGroup,
  InputGroupAddon,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Popover,
  PopoverBody,
  PopoverHeader
} from 'reactstrap';
import * as Yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import ReactDiffViewer from 'react-diff-viewer';
import { useQuery, queryCache } from 'react-query';


const ThresholdsAutocomplete = ({lists=[], index, onSelect, ...props}) => {
  let err = undefined;
  if (
    props.errors.rules &&
    props.errors.rules.length > index &&
    props.errors.rules[index] &&
    props.errors.rules[index].metric
  )
    err = props.errors.rules[index].metric
  return (
    <_AutocompleteField
      lists={lists}
      field={`rules[${index}].metric`}
      onselect_handler={onSelect}
      icon='metrics'
      label='Metric'
      val={props.values.rules[index].metric}
      err={err}
      setFieldValue={props.setFieldValue}
    />
  )
}

const ThresholdsSchema = Yup.object().shape({
  name: Yup.string().required('Required'),
  groupname: Yup.string().required('Required'),
  rules: Yup.array()
    .of(Yup.object().shape({
      metric: Yup.string().required('Required'),
      thresholds: Yup.array()
        .of(Yup.object().shape({
          label: Yup.string()
            .matches(/^[a-zA-Z][A-Za-z0-9]*$/, 'Label can contain alphanumeric characters, but must always begin with a letter.')
            .required('Required'),
          value: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .required('Required'),
          warn1: Yup.string()
            .matches(/^[@]?(~|[-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .required('Required'),
          warn2: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .test('greater-than',
            'Should be greater than lower warning limit',
            function(value) {
              if (this.parent.warn1) {
                const lowerLimit = this.parent.warn1.charAt(0) === '@' ?
                  this.parent.warn1.substr(1) :
                  this.parent.warn1;
                if (!lowerLimit || !value) {
                  return true;
                } else {
                  if (lowerLimit === '~')
                    return true;
                  else
                    if (!isNaN(Number(lowerLimit)) && !isNaN(Number(value)))
                      return Number(lowerLimit) <= Number(value);
                    else
                      return true;
                }
              } else
                return true;
            }),
          crit1: Yup.string()
            .matches(/^[@]?(~|[-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .required('Required'),
          crit2: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .test('greater-than',
            'Should be greater than lower critical limit',
            function(value) {
              if (this.parent.crit1) {
                const lowerLimit = this.parent.crit1.charAt(0) === '@' ?
                  this.parent.crit1.substr(1) :
                  this.parent.crit1;
                if (!lowerLimit || !value) {
                  return true;
                } else {
                  if (lowerLimit === '~')
                    return true;
                  else
                    if (!isNaN(Number(lowerLimit)) && !isNaN(Number(value)))
                      return Number(lowerLimit) <= Number(value);
                    else
                      return true;
                }
              } else {
                return true;
              }
            }),
          min: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.'),
          max: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .test('greater-than-min',
            'Should be greater than min value.',
            function(value) {
              const lowerLimit = this.parent.min;
              if (!lowerLimit) {
                return true;
              } else {
                if (!isNaN(Number(lowerLimit)) && !isNaN(Number(value)))
                  return Number(lowerLimit) < Number(value);
                else
                  return true;
              }
            }
            )
        }))
    }))
});

function getUOM(value) {
  if (!isNaN(value.charAt(value.length - 1))) {
    return '';
  }

  if (value.endsWith('us'))
    return 'us';

  if (value.endsWith('ms'))
    return 'ms';

  if (value.endsWith('s'))
    return 's';

  if (value.endsWith('%'))
    return '%';

  if (value.endsWith('KB'))
    return 'KB';

  if (value.endsWith('MB'))
    return 'MB';

  if (value.endsWith('TB'))
    return ('TB');

  if (value.endsWith('B'))
    return 'B';

  if (value.endsWith('c'))
    return 'c';
}


function thresholdsToValues(rules) {
  rules.forEach((rule => {
    if (typeof rule.thresholds === 'string' || rule.thresholds instanceof String) {
      let thresholds_strings = rule.thresholds.split(' ');
      let thresholds = [];
      thresholds_strings.forEach((string => {
        let label = '';
        let value = '';
        let uom = '';
        let warn1 = '';
        let warn2 = '';
        let crit1 = '';
        let crit2 = '';
        let min = '';
        let max = '';
        let tokens = string.split('=')
        if (tokens.length === 2) {
          label = tokens[0];
          let subtokens = tokens[1].split(';');
          if (subtokens.length > 0) {
            uom = getUOM(subtokens[0]);
            value = subtokens[0].replace(uom, '');
            if (subtokens.length > 1) {
              for (let i = 1; i < subtokens.length; i++) {
                if (i === 1) {
                  let warn = subtokens[i].split(':');
                  if (warn.length > 1) {
                    warn1 = warn[0];
                    warn2 = warn[1];
                  } else {
                    warn1 = '0';
                    warn2 = subtokens[i];
                  }
                } else if (i === 2) {
                  let crit = subtokens[i].split(':');
                  if (crit.length > 1) {
                    crit1 = crit[0];
                    crit2 = crit[1];
                  } else {
                    crit1 = '0';
                    crit2 = subtokens[i];
                  }
                } else if (i === 3) {
                  min = subtokens[i];
                } else if (i === 4) {
                  max = subtokens[i];
                }
              }
            }
          }
        }
        thresholds.push({
          label: label,
          value: value,
          uom: uom,
          warn1: warn1,
          warn2: warn2,
          crit1: crit1,
          crit2: crit2,
          min: min,
          max: max
        });
      }));
      rule.thresholds = thresholds;
    }
  }));
  return rules;
}


const ThresholdsProfilesForm = ({
  historyview=false,
  groups_list=undefined,
  metrics_list=undefined,
  write_perm=false,
  addview=false,
  popoverWarningOpen,
  popoverCriticalOpen,
  toggleWarningPopOver,
  toggleCriticalPopOver,
  ...props
}) => (
  <>
    <ProfileMainInfo
      values={props.values}
      errors={props.errors}
      grouplist={
        write_perm ?
          groups_list
        :
          [props.values.groupname]
      }
      fieldsdisable={historyview}
      profiletype='thresholds'
      addview={addview}
    />
    <FormGroup>
      <ParagraphTitle title='Thresholds rules'/>
      <Row>
        <Col md={12}>
          <FieldArray
          name='rules'
          render={arrayHelpers => (
            <div>
              {props.values.rules && props.values.rules.length > 0 ? (
                // eslint-disable-next-line @getify/proper-arrows/params
                props.values.rules.map((_rule, index) =>
                  <React.Fragment key={`fragment.rules.${index}`}>
                    <Card className={`mt-${index === 0 ? '1' : '4'}`} data-testid={`rules.${index}`}>
                      <CardHeader className='p-1 font-weight-bold text-uppercase'>
                        <div className='d-flex align-items-center justify-content-between no-gutters'>
                          Rule {index + 1}
                          {
                            !historyview &&
                              <Button
                                size='sm'
                                color='danger'
                                type='button'
                                data-testid={`rules.${index}.remove`}
                                onClick={
                                  () => (write_perm) && arrayHelpers.remove(index)
                                }
                              >
                                <FontAwesomeIcon icon={faTimes}/>
                              </Button>
                          }
                        </div>
                      </CardHeader>
                      <CardBody className='p-1'>
                        <Row className='d-flex align-items-center no-gutters'>
                          <Col md={12}>
                            {
                              historyview ?
                                <InputGroup>
                                  <InputGroupAddon addonType='prepend'>Metric</InputGroupAddon>
                                  <Field
                                    name={`rules.${index}.metric`}
                                    data-testid={`rules.${index}.metric`}
                                    className='form-control'
                                    disabled={true}
                                  />
                                </InputGroup>
                              :
                                <ThresholdsAutocomplete
                                  {...props}
                                  lists={metrics_list}
                                  index={index}
                                />
                            }
                          </Col>
                        </Row>
                        <Row className='mt-2'>
                          <Col md={12}>
                            <InputGroup>
                              <InputGroupAddon addonType='prepend'>Host</InputGroupAddon>
                              <Field
                                name={`rules.${index}.host`}
                                data-testid={`rules.${index}.host`}
                                className='form-control'
                                disabled={historyview}
                              />
                            </InputGroup>
                          </Col>
                        </Row>
                        <Row className='mt-2'>
                          <Col md={12}>
                            <InputGroup>
                              <InputGroupAddon addonType='prepend'>Endpoint group</InputGroupAddon>
                              <Field
                                name={`rules.${index}.endpoint_group`}
                                data-testid={`rules.${index}.endpoint_group`}
                                className='form-control'
                                disabled={historyview}
                              />
                            </InputGroup>
                          </Col>
                        </Row>
                      </CardBody>
                      <CardFooter>
                        <Row className='mt-2'>
                          <Col md={12}>
                            <h6 className="text-uppercase rounded">Thresholds</h6>
                            <FieldArray
                              name={`rules.${index}.thresholds`}
                              render={thresholdHelpers => (
                                <div>
                                  <table className='table table-bordered table-sm' data-testid={`rules.${index}.thresholds`}>
                                    <thead className='table-active'>
                                      <tr className='align-middle text-center'>
                                        <th style={{width: '4%'}}>#</th>
                                        <th style={{width: '13%'}}>Label</th>
                                        <th colSpan={2} style={{width: '13%'}}>Value</th>
                                        {
                                          historyview ?
                                            <th colSpan={3} style={{width: '13%'}}>Warning</th>
                                          :
                                            <th colSpan={3} style={{width: '13%'}}>
                                              Warning <FontAwesomeIcon id='warning-popover' icon={faInfoCircle} style={{color: '#416090'}}/>
                                              <Popover placement='bottom' isOpen={popoverWarningOpen} target='warning-popover' toggle={toggleWarningPopOver} trigger='hover'>
                                                <PopoverHeader>Warning range</PopoverHeader>
                                                <PopoverBody>
                                                  <p>Defined in format: <code>@&#123;floor&#125;:&#123;ceil&#125;</code></p>
                                                  <p><code>@</code> - optional - negates the range (value should belong outside limits)</p>
                                                  <p><code>&#123;floor&#125;</code>: integer/float or <code>~</code> that defines negative infinity</p>
                                                  <p><code>&#123;ceil&#125;</code>: integer/float or empty (defines positive infinity)</p>
                                                </PopoverBody>
                                              </Popover>
                                            </th>
                                        }
                                        {
                                          historyview ?
                                            <th colSpan={3} style={{width: '13%'}}>Critical</th>
                                          :
                                            <th colSpan={3} style={{width: '13%'}}>
                                              Critical <FontAwesomeIcon id='critical-popover' icon={faInfoCircle} style={{color: '#416090'}}/>
                                              <Popover placement='bottom' isOpen={popoverCriticalOpen} target='critical-popover' toggle={toggleCriticalPopOver} trigger='hover'>
                                                <PopoverHeader>Critical range</PopoverHeader>
                                                <PopoverBody>
                                                  <p>Defined in format: <code>@&#123;floor&#125;:&#123;ceil&#125;</code></p>
                                                  <p><code>@</code> - optional - negates the range (value should belong outside limits)</p>
                                                  <p><code>&#123;floor&#125;</code>: integer/float or <code>~</code> that defines negative infinity</p>
                                                  <p><code>&#123;ceil&#125;</code>: integer/float or empty (defines positive infinity)</p>
                                                </PopoverBody>
                                              </Popover>
                                            </th>
                                        }
                                        <th style={{width: '12%'}}>min</th>
                                        <th style={{width: '12%'}}>max</th>
                                        {
                                          !historyview &&
                                            <th style={{width: '8%'}}>Action</th>
                                        }
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {
                                        (
                                          props.values.rules &&
                                          props.values.rules.length > index &&
                                          props.values.rules[index] &&
                                          props.values.rules[index].thresholds &&
                                          props.values.rules[index].thresholds.length > 0
                                          ) ?
                                          // eslint-disable-next-line @getify/proper-arrows/params
                                          props.values.rules[index].thresholds.map((_t, i) =>
                                            <tr key={`rule-${index}-threshold-${i}`}>
                                              <td className='align-middle text-center'>
                                                {i + 1}
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  props.values.rules[index].thresholds[i].label
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        props.errors.rules &&
                                                        props.errors.rules.length > index &&
                                                        props.errors.rules[index] &&
                                                        props.errors.rules[index].thresholds &&
                                                        props.errors.rules[index].thresholds.length > i &&
                                                        props.errors.rules[index].thresholds[i] &&
                                                        props.errors.rules[index].thresholds[i].label
                                                      ) &&
                                                        'border-danger'
                                                    }`
                                                    }
                                                    name={`rules[${index}].thresholds[${i}].label`}
                                                    id={`values.rules.${index}.thresholds.${i}.label`}
                                                    data-testid={`values.rules.${index}.thresholds.${i}.label`}
                                                  />
                                              }
                                                {
                                                (
                                                  props.errors.rules &&
                                                  props.errors.rules.length > index &&
                                                  props.errors.rules[index] &&
                                                  props.errors.rules[index].thresholds &&
                                                  props.errors.rules[index].thresholds.length > i &&
                                                  props.errors.rules[index].thresholds[i] &&
                                                  props.errors.rules[index].thresholds[i].label
                                                ) &&
                                                  FancyErrorMessage(props.errors.rules[index].thresholds[i].label)
                                              }
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  props.values.rules[index].thresholds[i].value
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        props.errors.rules &&
                                                        props.errors.rules.length > index &&
                                                        props.errors.rules[index] &&
                                                        props.errors.rules[index].thresholds &&
                                                        props.errors.rules[index].thresholds.length > i &&
                                                        props.errors.rules[index].thresholds[i] &&
                                                        props.errors.rules[index].thresholds[i].value
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.value`}
                                                    id={`values.rules.${index}.thresholds.${i}.value`}
                                                    data-testid={`values.rules.${index}.thresholds.${i}.value`}
                                                  />
                                              }
                                                {
                                                (
                                                  props.errors.rules &&
                                                  props.errors.rules.length > index &&
                                                  props.errors.rules[index] &&
                                                  props.errors.rules[index].thresholds &&
                                                  props.errors.rules[index].thresholds.length > i &&
                                                  props.errors.rules[index].thresholds[i] &&
                                                  props.errors.rules[index].thresholds[i].value
                                                ) &&
                                                  FancyErrorMessage(props.errors.rules[index].thresholds[i].value)
                                              }
                                              </td>
                                              <td style={{width: '6%'}}>
                                                {
                                                historyview ?
                                                  props.values.rules[index].thresholds[i].uom
                                                :
                                                  <Field
                                                    component='select'
                                                    className='form-control custom-select'
                                                    name={`rules.${index}.thresholds.${i}.uom`}
                                                    id={`values.rules.${index}.thresholds.${i}.uom`}
                                                    data-testid={`values.rules.${index}.thresholds.${i}.uom`}
                                                  >
                                                    <option key='option-0' value=''></option>
                                                    <option key='option-1' value='s'>s</option>
                                                    <option key='option-2' value='us'>us</option>
                                                    <option key='option-3' value='ms'>ms</option>
                                                    <option key='option-4' value='B'>B</option>
                                                    <option key='option-5' value='KB'>KB</option>
                                                    <option key='option-6' value='MB'>MB</option>
                                                    <option key='option-7' value='TB'>TB</option>
                                                    <option key='option-8' value='%'>%</option>
                                                    <option key='option-9' value='c'>c</option>
                                                  </Field>
                                              }
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  props.values.rules[index].thresholds[i].warn1
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        props.errors.rules &&
                                                        props.errors.rules.length > index &&
                                                        props.errors.rules[index] &&
                                                        props.errors.rules[index].thresholds &&
                                                        props.errors.rules[index].thresholds.length > i &&
                                                        props.errors.rules[index].thresholds[i] &&
                                                        props.errors.rules[index].thresholds[i].warn1
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.warn1`}
                                                    id={`values.rules.${index}.thresholds.${i}.warn1`}
                                                    data-testid={`values.rules.${index}.thresholds.${i}.warn1`}
                                                  />
                                              }
                                                {
                                                (
                                                  props.errors.rules &&
                                                  props.errors.rules.length > index &&
                                                  props.errors.rules[index] &&
                                                  props.errors.rules[index].thresholds &&
                                                  props.errors.rules[index].thresholds.length > i &&
                                                  props.errors.rules[index].thresholds[i] &&
                                                  props.errors.rules[index].thresholds[i].warn1
                                                ) &&
                                                  FancyErrorMessage(props.errors.rules[index].thresholds[i].warn1)
                                              }
                                              </td>
                                              <td>
                                              :
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  props.values.rules[index].thresholds[i].warn2
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        props.errors.rules &&
                                                        props.errors.rules.length > index &&
                                                        props.errors.rules[index] &&
                                                        props.errors.rules[index].thresholds &&
                                                        props.errors.rules[index].thresholds.length > i &&
                                                        props.errors.rules[index].thresholds[i] &&
                                                        props.errors.rules[index].thresholds[i].warn2
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.warn2`}
                                                    id={`values.rules.${index}.thresholds.${i}.warn2`}
                                                    data-testid={`values.rules.${index}.thresholds.${i}.warn2`}
                                                  />
                                              }
                                                {
                                                (
                                                  props.errors.rules &&
                                                  props.errors.rules.length > index &&
                                                  props.errors.rules[index] &&
                                                  props.errors.rules[index].thresholds &&
                                                  props.errors.rules[index].thresholds.length > i &&
                                                  props.errors.rules[index].thresholds[i] &&
                                                  props.errors.rules[index].thresholds[i].warn2
                                                ) &&
                                                  FancyErrorMessage(props.errors.rules[index].thresholds[i].warn2)
                                              }
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  props.values.rules[index].thresholds[i].crit1
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        props.errors.rules &&
                                                        props.errors.rules.length > index &&
                                                        props.errors.rules[index] &&
                                                        props.errors.rules[index].thresholds &&
                                                        props.errors.rules[index].thresholds.length > i &&
                                                        props.errors.rules[index].thresholds[i] &&
                                                        props.errors.rules[index].thresholds[i].crit1
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.crit1`}
                                                    id={`values.rules.${index}.thresholds.${i}.crit1`}
                                                    data-testid={`values.rules.${index}.thresholds.${i}.crit1`}
                                                  />
                                              }
                                                {
                                                (
                                                  props.errors.rules &&
                                                  props.errors.rules.length > index &&
                                                  props.errors.rules[index] &&
                                                  props.errors.rules[index].thresholds &&
                                                  props.errors.rules[index].thresholds.length > i &&
                                                  props.errors.rules[index].thresholds[i] &&
                                                  props.errors.rules[index].thresholds[i].crit1
                                                ) &&
                                                  FancyErrorMessage(props.errors.rules[index].thresholds[i].crit1)
                                              }
                                              </td>
                                              <td>
                                              :
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  props.values.rules[index].thresholds[i].crit2
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        props.errors.rules &&
                                                        props.errors.rules.length > index &&
                                                        props.errors.rules[index] &&
                                                        props.errors.rules[index].thresholds &&
                                                        props.errors.rules[index].thresholds.length > i &&
                                                        props.errors.rules[index].thresholds[i] &&
                                                        props.errors.rules[index].thresholds[i].crit2
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.crit2`}
                                                    id={`values.rules.${index}.thresholds.${i}.crit2`}
                                                    data-testid={`values.rules.${index}.thresholds.${i}.crit2`}
                                                  />
                                              }
                                                {
                                                (
                                                  props.errors.rules &&
                                                  props.errors.rules.length > index &&
                                                  props.errors.rules[index] &&
                                                  props.errors.rules[index].thresholds &&
                                                  props.errors.rules[index].thresholds.length > i &&
                                                  props.errors.rules[index].thresholds[i] &&
                                                  props.errors.rules[index].thresholds[i].crit2
                                                ) &&
                                                  FancyErrorMessage(props.errors.rules[index].thresholds[i].crit2)
                                              }
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  props.values.rules[index].thresholds[i].min
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        props.errors.rules &&
                                                        props.errors.rules.length > index &&
                                                        props.errors.rules[index] &&
                                                        props.errors.rules[index].thresholds &&
                                                        props.errors.rules[index].thresholds.length > i &&
                                                        props.errors.rules[index].thresholds[i] &&
                                                        props.errors.rules[index].thresholds[i].min
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.min`}
                                                    id={`values.rules.${index}.thresholds.${i}.min`}
                                                    data-testid={`values.rules.${index}.thresholds.${i}.min`}
                                                  />
                                              }
                                                {
                                                (
                                                  props.errors.rules &&
                                                  props.errors.rules.length > index &&
                                                  props.errors.rules[index] &&
                                                  props.errors.rules[index].thresholds &&
                                                  props.errors.rules[index].thresholds.length > i &&
                                                  props.errors.rules[index].thresholds[i] &&
                                                  props.errors.rules[index].thresholds[i].min
                                                ) &&
                                                  FancyErrorMessage(props.errors.rules[index].thresholds[i].min)
                                              }
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  props.values.rules[index].thresholds[i].max
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        props.errors.rules &&
                                                        props.errors.rules.length > index &&
                                                        props.errors.rules[index] &&
                                                        props.errors.rules[index].thresholds &&
                                                        props.errors.rules[index].thresholds.length > i &&
                                                        props.errors.rules[index].thresholds[i] &&
                                                        props.errors.rules[index].thresholds[i].max
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.max`}
                                                    id={`values.rules.${index}.thresholds.${i}.max`}
                                                    data-testid={`values.rules.${index}.thresholds.${i}.max`}
                                                  />
                                              }
                                                {
                                                (
                                                  props.errors.rules &&
                                                  props.errors.rules.length > index &&
                                                  props.errors.rules[index] &&
                                                  props.errors.rules[index].thresholds &&
                                                  props.errors.rules[index].thresholds.length > i &&
                                                  props.errors.rules[index].thresholds[i] &&
                                                  props.errors.rules[index].thresholds[i].max
                                                ) &&
                                                  FancyErrorMessage(props.errors.rules[index].thresholds[i].max)
                                              }
                                              </td>
                                              {
                                              !historyview &&
                                                <td className='align-middle d-flex justify-content-center align-items-center'>
                                                  <Button
                                                    size='sm'
                                                    color='light'
                                                    type='button'
                                                    data-testid={`values.rules.${index}.thresholds.${i}.remove`}
                                                    onClick={() => {
                                                      thresholdHelpers.remove(i);
                                                      if (props.values.rules[index].thresholds.length === 1) {
                                                        thresholdHelpers.push({
                                                          label: '',
                                                          value: '',
                                                          uom: '',
                                                          warn1: '',
                                                          warn2: '',
                                                          crit1: '',
                                                          crit2: '',
                                                          min: '',
                                                          max: ''
                                                        });
                                                      }
                                                    }}
                                                  >
                                                    <FontAwesomeIcon icon={faTimes}/>
                                                  </Button>
                                                  <Button
                                                    size='sm'
                                                    color='light'
                                                    type='button'
                                                    data-testid={`values.rules.${index}.thresholds.${i}.add`}
                                                    onClick={() => thresholdHelpers.push({
                                                      label: '',
                                                      value: '',
                                                      uom: '',
                                                      warn1: '',
                                                      warn2: '',
                                                      crit1: '',
                                                      crit2: '',
                                                      min: '',
                                                      max: ''
                                                    })}
                                                  >
                                                    <FontAwesomeIcon icon={faPlus}/>
                                                  </Button>
                                                </td>
                                            }
                                            </tr>
                                        )
                                        :
                                        null
                                      }
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            />
                          </Col>
                        </Row>
                      </CardFooter>
                    </Card>
                    {
                      ((index + 1) === props.values.rules.length && !historyview) &&
                        <Button
                          color='success'
                          className='mt-4'
                          onClick={() => arrayHelpers.push({
                            metric: '',
                            thresholds: [
                              {
                                label: '',
                                value: '',
                                uom: '',
                                warn1: '',
                                warn2: '',
                                crit1: '',
                                crit2: '',
                                min: '',
                                max: ''
                              }
                            ],
                            host: '',
                            endpoint_group: ''
                          })}
                        >
                          Add new rule
                        </Button>
                    }
                  </React.Fragment>
                )
              )
              :
                !historyview &&
                  <Button
                    color='success'
                    onClick={() => arrayHelpers.push({
                      metric: '',
                      thresholds: [
                        {
                          label: '',
                          value: '',
                          uom: '',
                          warn1: '',
                          warn2: '',
                          crit1: '',
                          crit2: '',
                          min: '',
                          max: ''
                        }
                      ],
                      host: '',
                      endpoint_group: ''
                    })}
                  >
                    Add a rule
                  </Button>
              }
            </div>
          )}
        />
        </Col>
      </Row>
    </FormGroup>
  </>
)


export const ThresholdsProfilesList = (props) => {
  const location = props.location;
  const backend = new Backend();
  const publicView = props.publicView

  const apiUrl = `/api/v2/internal/${publicView ? 'public_' : ''}thresholdsprofiles`;

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails} = useQuery(
    `session_userdetails`, async () => {
      let sessionActive = await backend.isActiveSession();
      if (sessionActive.active)
        return sessionActive.userdetails;
    }
  );

  const { data: listThresholdsProfiles, error: errorListThresholdsProfiles, isLoading: loadingListThresholdsProfiles } = useQuery(
    'thresholdsprofiles_listview', async () => {
      let profiles = await backend.fetchData(apiUrl);

      return profiles;
    },
    {
      enabled: !publicView ? !!userDetails : true
    }
  )

  const columns = React.useMemo(() => [
    {
      Header: '#',
      accessor: null,
      column_width: '2%'
    },
    {
      Header: 'Name',
      id: 'name',
      accessor: e =>
        <Link to={`/ui/${publicView ? 'public_' : ''}thresholdsprofiles/${e.name}`}>
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
      column_width: '8%',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>
    }
  ], [publicView]);

  if (loadingUserDetails || loadingListThresholdsProfiles)
    return (<LoadingAnim/>);

  else if (errorListThresholdsProfiles)
    return (<ErrorComponent error={errorListThresholdsProfiles}/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (!loadingUserDetails && !loadingListThresholdsProfiles && listThresholdsProfiles) {
    return (
      <BaseArgoView
        resourcename='thresholds profile'
        location={location}
        listview={true}
        addnew={!publicView}
        addperm={publicView ? false : userDetails.is_superuser || userDetails.groups.thresholdsprofiles.length > 0}
        publicview={publicView}
      >
        <ProfilesListTable
          data={listThresholdsProfiles}
          columns={columns}
          type='thresholds'
        />
      </BaseArgoView>
    );
  } else
    return null;
};


export const ThresholdsProfilesChange = (props) => {
  const name = props.match.params.name;
  const addview = props.addview;
  const history = props.history;
  const location = props.location;
  const publicView = props.publicView;
  const querykey =`thresholdsprofile_${name}_${publicView ? 'publicview' : 'changeview'}`;

  const backend = new Backend();
  const webapi = new WebApi({
    token: props.webapitoken,
    thresholdsProfiles: props.webapithresholds
  });


  const { data: userDetails, isLoading: loadingUserDetails } = useQuery(
    'session_userdetails', async () => {
      let sessionActive = await backend.isActiveSession();
      if (sessionActive.active)
        return sessionActive.userdetails;
    }
  );

  const { data: thresholdsProfile, error: errorThresholdsProfile, isLoading: loadingThresholdsProfile } = useQuery(
    `${querykey}`, async () => {
      if (!addview) {
        let json = await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}thresholdsprofiles/${name}`);
        let thresholdsprofile = await webapi.fetchThresholdsProfile(json.apiid);
        let tp = {
          'apiid': thresholdsprofile.id,
          'name': thresholdsprofile.name,
          'groupname': json['groupname'],
          'rules': thresholdsToValues(thresholdsprofile.rules)
        };
        return tp;
      }
    },
    { enabled: !publicView ? !addview && userDetails : true }
  );

  const { data: allMetrics, error: errorAllMetrics, isLoading: loadingAllMetrics } = useQuery(
    `thresholdsprofile_${publicView ? 'public_' : ''}_allmetrics`, async () => {
      let metrics = await backend.fetchListOfNames(`/api/v2/internal/${publicView ? 'public_' : ''}metricsall`);
      return metrics;
    }
  );

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);
  const [profileId, setProfileId] = useState(undefined);
  const [popoverWarningOpen, setPopoverWarningOpen] = useState(false);
  const [popoverCriticalOpen, setPopoverCriticalOpen] = useState(false);

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal);
  }

  function toggleWarningPopOver() {
    setPopoverWarningOpen(!popoverWarningOpen);
  }

  function toggleCriticalPopOver() {
    setPopoverCriticalOpen(!popoverCriticalOpen);
  }

  function onSelect(field, value) {
    if (!addview) {
      let modifiedThresholdsProfile = thresholdsProfile;
      let thresholds_rules = modifiedThresholdsProfile.rules;
      let index = field.split('[')[1].split(']')[0]
      if (thresholds_rules.length == index) {
        thresholds_rules.push({'metric': '', thresholds: [], 'host': '', 'endpoint_group': ''})
      }
      thresholds_rules[index].metric = value;
      modifiedThresholdsProfile.rules = thresholds_rules;

      queryCache.setQueryData(`${querykey}`, () => modifiedThresholdsProfile);
    }
  }

  function thresholdsToString(rules) {
    rules.forEach((rule => {
      let thresholds = [];
      if (!rule.host)
        delete rule.host;
      if (!rule.endpoint_group)
        delete rule.endpoint_group;
      rule.thresholds.forEach((thresh => {
        let thresholds_string = undefined;
        thresholds_string = thresh.label + '=' + thresh.value + thresh.uom + ';' + thresh.warn1 + ':' + thresh.warn2 + ';' + thresh.crit1 + ':' + thresh.crit2;
        if (thresh.min && thresh.max)
          thresholds_string = thresholds_string + ';' + thresh.min + ';' + thresh.max;
        thresholds.push(thresholds_string)
      }));
      let th = thresholds.join(' ');
      rule.thresholds = th;
    }));
    return rules;
  }

  function onSubmitHandle(values) {
    let msg = `Are you sure you want to ${addview ? 'add' : 'change'} thresholds profile?`;
    let title = `${addview ? 'Add' : 'Change'} thresholds profile`;

    setModalMsg(msg);
    setModalTitle(title);
    setFormValues(values);
    setModalFlag('submit');
    toggleAreYouSure();
  }

  async function doChange() {
    let values_send = JSON.parse(JSON.stringify(formValues));
    if (addview) {
      let response = await webapi.addThresholdsProfile({
        name: values_send.name,
        rules: thresholdsToString(values_send.rules)
      });
      if (!response.ok) {
        let add_msg = '';
        try {
          let json = await response.json();
          let msg_list = [];
          json.errors.forEach(e => msg_list.push(e.details));
          add_msg = msg_list.join(' ');
        } catch(err) {
          add_msg = 'Web API error adding thresholds profile';
        }
        NotifyError({
          title: `Web API error: ${response.status} ${response.statusText}`,
          msg: add_msg
        });
      } else {
        let r = await response.json();
        let r_internal = await backend.addObject(
          '/api/v2/internal/thresholdsprofiles/',
          {
            apiid: r.data.id,
            name: values_send.name,
            groupname: formValues.groupname,
            rules: values_send.rules
          }
        );
        if (r_internal.ok)
          NotifyOk({
            msg: 'Thresholds profile successfully added',
            title: 'Added',
            callback: () => history.push('/ui/thresholdsprofiles')
          })
        else {
          let add_msg = '';
          try {
            let json = await r_internal.json();
            add_msg = json.detail;
          } catch(err) {
            add_msg = 'Internal API error adding thresholds profile';
          }
          NotifyError({
            title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
            msg: add_msg
          });
        }
      }
    } else {
      let response = await webapi.changeThresholdsProfile({
        id: values_send.id,
        name: name,
        rules: thresholdsToString(values_send.rules)
      });
      if (!response.ok) {
        let change_msg = '';
        try {
          let json = await response.json();
          let msg_list = [];
          json.errors.forEach(e => msg_list.push(e.details));
          change_msg = msg_list.join(' ');
        } catch(err) {
          change_msg = 'Web API error changing thresholds profile';
        }
        NotifyError({
          title: `Web API error: ${response.status} ${response.statusText}`,
          msg: change_msg
        });
      } else {
        let r_internal = await backend.changeObject(
          '/api/v2/internal/thresholdsprofiles/',
          {
            apiid: values_send.id,
            name: name,
            groupname: formValues.groupname,
            rules: values_send.rules
          }
        );
        if (r_internal.ok)
          NotifyOk({
            msg: 'Thresholds profile successfully changed',
            title: 'Changed',
            callback: () => history.push('/ui/thresholdsprofiles')
          })
        else {
          let change_msg = '';
          try {
            let json = await r_internal.json();
            change_msg = json.detail;
          } catch(err) {
            change_msg = 'Internal API error changing thresholds profile';
          }
          NotifyError({
            title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
            msg: change_msg
          });
        }
      }
    }
  }

  async function doDelete() {
    let response = await webapi.deleteThresholdsProfile(profileId);
    if (!response.ok) {
      let msg = '';
      try {
        let json = await response.json();
        let msg_list = [];
        json.errors.forEach(e => msg_list.push(e.details));
        msg = msg_list.join(' ');
      } catch(err) {
        msg = 'Web API error deleting thresholds profile';
      }
      NotifyError({
        title: `Web API error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    } else {
      let r_internal = await backend.deleteObject(`/api/v2/internal/thresholdsprofiles/${profileId}`);
      if (r_internal.ok)
        NotifyOk({
          msg: 'Thresholds profile successfully deleted',
          title: 'Deleted',
          callback: () => history.push('/ui/thresholdsprofiles')
        })
      else {
        let msg = '';
        try {
          let json = await r_internal.json();
          msg = json.detail;
        } catch(err) {
          msg = 'Internal API error deleting thresholds profile';
        }
        NotifyError({
          title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
          msg: msg
        });
      }
    }
  }

  if (loadingThresholdsProfile || loadingUserDetails || loadingAllMetrics)
    return (<LoadingAnim/>);

  else if (errorThresholdsProfile)
    return (<ErrorComponent error={errorThresholdsProfile}/>);

  else if (errorAllMetrics)
    return (<ErrorComponent error={errorAllMetrics}/>);

  else if (!loadingThresholdsProfile && !loadingUserDetails && !loadingAllMetrics && allMetrics) {
    let write_perm = userDetails ?
      addview ?
        userDetails.is_superuser || userDetails.groups.thresholdsprofiles.length > 0
      :
        userDetails.is_superuser || userDetails.groups.thresholdsprofiles.indexOf(thresholdsProfile.groupname) >= 0
    :
      false;

    let groups_list = userDetails ?
      userDetails.groups.thresholdsprofiles
    :
      [];

    return (
      <BaseArgoView
        resourcename={publicView ? 'Thresholds profile details' : 'thresholds profile'}
        location={location}
        history={!publicView}
        submitperm={write_perm}
        addview={publicView ? !publicView : addview}
        publicview={publicView}
        modal={true}
        state={{
          areYouSureModal,
          modalTitle,
          modalMsg,
          'modalFunc': modalFlag === 'submit' ?
            doChange
          :
            modalFlag === 'delete' ?
              doDelete
            :
              undefined
        }}
        toggle={toggleAreYouSure}
      >
        <Formik
          initialValues = {{
            id: thresholdsProfile ? thresholdsProfile.apiid : '',
            name: thresholdsProfile ? thresholdsProfile.name : '',
            groupname: thresholdsProfile ? thresholdsProfile.groupname : '',
            rules: thresholdsProfile ? thresholdsProfile.rules : []
          }}
          validationSchema={ThresholdsSchema}
          onSubmit = {(values) => onSubmitHandle(values)}
          enableReinitialize={true}
        >
          {props => (
            <Form>
              <ThresholdsProfilesForm
                {...props}
                groups_list={groups_list}
                metrics_list={allMetrics}
                write_perm={write_perm}
                onSelect={onSelect}
                popoverWarningOpen={popoverWarningOpen}
                popoverCriticalOpen={popoverCriticalOpen}
                toggleWarningPopOver={toggleWarningPopOver}
                toggleCriticalPopOver={toggleCriticalPopOver}
                historyview={publicView}
                addview={addview}
              />
              {
                (write_perm && !publicView) &&
                  <div className='submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5'>
                    {
                      !addview ?
                        <Button
                          color='danger'
                          onClick={() => {
                            setModalMsg('Are you sure you want to delete thresholds profile?');
                            setModalTitle('Delete thresholds profile');
                            setModalFlag('delete');
                            setProfileId(props.values.id);
                            toggleAreYouSure();
                          }}
                        >
                          Delete
                        </Button>
                      :
                        <div></div>
                    }
                    <Button
                      color='success'
                      id='submit-button'
                      type='submit'
                    >
                      Save
                    </Button>
                  </div>
              }
            </Form>
          )}
        </Formik>
      </BaseArgoView>
    );
  } else
    return null;
};


const ListDiffElement = ({title, item1, item2}) => {
  let list1 = [];
  let list2 = [];
  for (let i = 0; i < item1.length; i++) {
    let strng = `metric: ${item1[i]['metric']},\n`;
    if ('host' in item1[i])
      strng += `host: ${item1[i]['host']},\n`;

    if ('endpoint_group' in item1[i])
      strng += `endpoint_group: ${item1[i]['endpoint_group']},\n`;

    strng += `thresholds: ${item1[i]['thresholds']}`;
    list1.push(strng);
  }

  for (let i = 0; i < item2.length; i++) {
    let strng = `metric: ${item2[i]['metric']},\n`;
    if ('host' in item2[i])
      strng += `host: ${item2[i]['host']},\n`;

    if ('endpoint_group' in item2[i])
      strng += `endpoint_group: ${item2[i]['endpoint_group']},\n`;

    strng += `thresholds: ${item2[i]['thresholds']}`;
    list2.push(strng);
  }

  return (
    <div id='argo-contentwrap' className='ml-2 mb-2 mt-2 p-3 border rounded'>
      <h6 className='mt-4 font-weight-bold text-uppercase'>{title}</h6>
      <ReactDiffViewer
        oldValue={list2.join('\n')}
        newValue={list1.join('\n')}
        showDiffOnly={true}
        splitView={true}
        hideLineNumbers={true}
      />
    </div>
  )
};


function arraysEqual(arr1, arr2) {
  if(arr1.length !== arr2.length)
      return false;
  for(var i = arr1.length; i--;) {
      if(arr1[i]['metric'] !== arr2[i]['metric'] ||
      arr1[i]['thresholds'] !== arr2[i]['thresholds'] ||
      arr1[i]['host'] !== arr2[i]['host'] ||
      arr1[i]['endpoint_group'] !== arr2[i]['endpoint_group'])
          return false;
  }

  return true;
}


export const ThresholdsProfileVersionCompare = (props) => {
  const version1 = props.match.params.id1;
  const version2 = props.match.params.id2;
  const name = props.match.params.name;

  const [loading, setLoading] = useState(false);
  const [profile1, setProfile1] = useState(undefined);
  const [profile2, setProfile2] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    const backend = new Backend();
    setLoading(true);
    fetchVersions();

    async function fetchVersions() {
      try {
        let json = await backend.fetchData(`/api/v2/internal/tenantversion/thresholdsprofile/${name}`);

        json.forEach((e) => {
          if (e.version == version1)
            setProfile1(e.fields);

          else if (e.version == version2)
            setProfile2(e.fields);
        });
      } catch(err) {
        setError(err);
      }
      setLoading(false);
    }
  }, [name, version1, version2]);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && profile1 && profile2) {
    return (
      <React.Fragment>
        <div className='d-flex align-items-center justify-content-between'>
          <h2 className='ml-3 mt-1 mb-4'>{`Compare ${name} versions`}</h2>
        </div>
        {
          (profile1.name !== profile2.name) &&
            <DiffElement title='name' item1={profile1.name} item2={profile2.name}/>
        }
        {
          (profile1.groupname !== profile2.groupname) &&
            <DiffElement title='group name' item1={profile1.groupname} item2={profile2.groupname}/>
        }
        {
          (!arraysEqual(profile1.rules, profile2.rules)) &&
            <ListDiffElement title='rules' item1={profile1.rules} item2={profile2.rules}/>
        }
      </React.Fragment>
    );
  } else
    return null;
};


export const ThresholdsProfileVersionDetail = (props) => {
  const name = props.match.params.name;
  const version = props.match.params.version;

  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const backend = new Backend();
    setLoading(true);
    fetchProfile();

    async function fetchProfile() {
      try {
        let json = await backend.fetchData(`/api/v2/internal/tenantversion/thresholdsprofile/${name}`);
        json.forEach((e) => {
          if (e.version == version)
            setProfile({
              name: e.fields.name,
              groupname: e.fields.groupname,
              rules: thresholdsToValues(e.fields.rules),
              date_created: e.date_created
            });
        });
      } catch(err) {
        setError(err);
      }

      setLoading(false);
    }
  }, [name, version]);

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  else if (!loading && profile) {
    return (
      <BaseArgoView
        resourcename={`${name} (${profile.date_created})`}
        infoview={true}
      >
        <Formik
          initialValues = {{
            name: profile.name,
            groupname: profile.groupname,
            rules: profile.rules
          }}
        >
          {props => (
            <Form>
              <ThresholdsProfilesForm
                {...props}
                historyview={true}
              />
            </Form>
          )}
        </Formik>
      </BaseArgoView>
    );
  } else
    return null;
};
