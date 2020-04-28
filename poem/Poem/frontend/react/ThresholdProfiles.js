import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { Backend, WebApi } from './DataManager';
import {
    LoadingAnim,
    BaseArgoView,
    AutocompleteField,
    NotifyOk,
    FancyErrorMessage,
    HistoryComponent,
    DiffElement,
    ProfileMainInfo,
    NotifyError
} from './UIElements';
import ReactTable from 'react-table';
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


export const ThresholdsProfilesHistory = HistoryComponent('thresholdsprofile');


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
            }),
          crit1: Yup.string()
            .matches(/^[@]?(~|[-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .required('Required'),
          crit2: Yup.string()
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.')
            .test('greater-than',
            'Should be greater than lower critical limit',
            function(value) {
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
  rules.forEach((r => {
    let thresholds_strings = r.thresholds.split(' ');
    let thresholds = [];
    thresholds_strings.forEach((s => {
      let label = '';
      let value = '';
      let uom = '';
      let warn1 = '';
      let warn2 = '';
      let crit1 = '';
      let crit2 = '';
      let min = '';
      let max = '';
      let tokens = s.split('=')
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
    r.thresholds = thresholds;
  }));
  return rules;
}


const ThresholdsProfilesForm = ({
  values,
  errors,
  setFieldValue,
  historyview=false,
  groups_list=undefined,
  metrics_list=undefined,
  write_perm=false,
  onSelect,
  state,
  toggleWarningPopOver,
  toggleCriticalPopOver
}) => (
  <>
    <ProfileMainInfo
      values={values}
      errors={errors}
      grouplist={
        write_perm ?
          groups_list
        :
          [values.groupname]
      }
      fieldsdisable={historyview}
      profiletype='thresholds'
    />
    <FormGroup>
      <h4 className="mt-4 p-1 pl-3 text-light text-uppercase rounded" style={{"backgroundColor": "#416090"}}>Thresholds rules</h4>
      <Row>
        <Col md={12}>
          <FieldArray
          name='rules'
          render={arrayHelpers => (
            <div>
              {values.rules && values.rules.length > 0 ? (
                values.rules.map((rule, index) =>
                  <React.Fragment key={`fragment.rules.${index}`}>
                    <Card className={`mt-${index === 0 ? '1' : '4'}`}>
                      <CardHeader className='p-1 font-weight-bold text-uppercase'>
                        <div className='d-flex align-items-center justify-content-between no-gutters'>
                          Rule {index + 1}
                          {
                            !historyview &&
                              <Button
                                size='sm'
                                color='danger'
                                type='button'
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
                                    className='form-control'
                                    disabled={true}
                                  />
                                </InputGroup>
                              :
                                <AutocompleteField
                                  req={
                                    errors.rules &&
                                    errors.rules.length > index &&
                                    errors.rules[index] &&
                                    errors.rules[index].metric
                                  }
                                  setFieldValue={setFieldValue}
                                  lists={metrics_list}
                                  icon='metrics'
                                  field={`rules[${index}].metric`}
                                  val={values.rules[index].metric}
                                  onselect_handler={onSelect}
                                  label='Metric'
                                />
                            }
                            {
                              (
                                errors.rules &&
                                errors.rules.length > index &&
                                errors.rules[index] &&
                                errors.rules[index].metric
                                ) &&
                                FancyErrorMessage(errors.rules[index].metric)
                            }
                          </Col>
                        </Row>
                        <Row className='mt-2'>
                          <Col md={12}>
                            <InputGroup>
                              <InputGroupAddon addonType='prepend'>Host</InputGroupAddon>
                              <Field
                                name={`rules.${index}.host`}
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
                                  <table className='table table-bordered table-sm'>
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
                                              <Popover placement='bottom' isOpen={state.popoverWarningOpen} target='warning-popover' toggle={toggleWarningPopOver} trigger='hover'>
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
                                              <Popover placement='bottom' isOpen={state.popoverCriticalOpen} target='critical-popover' toggle={toggleCriticalPopOver} trigger='hover'>
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
                                          values.rules &&
                                          values.rules.length > index &&
                                          values.rules[index] &&
                                          values.rules[index].thresholds &&
                                          values.rules[index].thresholds.length > 0
                                          ) ?
                                          values.rules[index].thresholds.map((t, i) =>
                                            <tr key={`rule-${index}-threshold-${i}`}>
                                              <td className='align-middle text-center'>
                                                {i + 1}
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  values.rules[index].thresholds[i].label
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        errors.rules &&
                                                        errors.rules.length > index &&
                                                        errors.rules[index] &&
                                                        errors.rules[index].thresholds &&
                                                        errors.rules[index].thresholds.length > i &&
                                                        errors.rules[index].thresholds[i] &&
                                                        errors.rules[index].thresholds[i].label
                                                      ) &&
                                                        'border-danger'
                                                    }`
                                                    }
                                                    name={`rules[${index}].thresholds[${i}].label`}
                                                    id={`values.rules.${index}.thresholds.${i}.label`}
                                                  />
                                              }
                                                {
                                                (
                                                  errors.rules &&
                                                  errors.rules.length > index &&
                                                  errors.rules[index] &&
                                                  errors.rules[index].thresholds &&
                                                  errors.rules[index].thresholds.length > i &&
                                                  errors.rules[index].thresholds[i] &&
                                                  errors.rules[index].thresholds[i].label
                                                ) &&
                                                  FancyErrorMessage(errors.rules[index].thresholds[i].label)
                                              }
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  values.rules[index].thresholds[i].value
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        errors.rules &&
                                                        errors.rules.length > index &&
                                                        errors.rules[index] &&
                                                        errors.rules[index].thresholds &&
                                                        errors.rules[index].thresholds.length > i &&
                                                        errors.rules[index].thresholds[i] &&
                                                        errors.rules[index].thresholds[i].value
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.value`}
                                                    id={`values.rules.${index}.thresholds.${i}.value`}
                                                  />
                                              }
                                                {
                                                (
                                                  errors.rules &&
                                                  errors.rules.length > index &&
                                                  errors.rules[index] &&
                                                  errors.rules[index].thresholds &&
                                                  errors.rules[index].thresholds.length > i &&
                                                  errors.rules[index].thresholds[i] &&
                                                  errors.rules[index].thresholds[i].value
                                                ) &&
                                                  FancyErrorMessage(errors.rules[index].thresholds[i].value)
                                              }
                                              </td>
                                              <td style={{width: '6%'}}>
                                                {
                                                historyview ?
                                                  values.rules[index].thresholds[i].uom
                                                :
                                                  <Field
                                                    component='select'
                                                    className='form-control custom-select'
                                                    name={`rules.${index}.thresholds.${i}.uom`}
                                                    id={`values.rules.${index}.thresholds.${i}.uom`}
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
                                                  values.rules[index].thresholds[i].warn1
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        errors.rules &&
                                                        errors.rules.length > index &&
                                                        errors.rules[index] &&
                                                        errors.rules[index].thresholds &&
                                                        errors.rules[index].thresholds.length > i &&
                                                        errors.rules[index].thresholds[i] &&
                                                        errors.rules[index].thresholds[i].warn1
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.warn1`}
                                                    id={`values.rules.${index}.thresholds.${i}.warn1`}
                                                  />
                                              }
                                                {
                                                (
                                                  errors.rules &&
                                                  errors.rules.length > index &&
                                                  errors.rules[index] &&
                                                  errors.rules[index].thresholds &&
                                                  errors.rules[index].thresholds.length > i &&
                                                  errors.rules[index].thresholds[i] &&
                                                  errors.rules[index].thresholds[i].warn1
                                                ) &&
                                                  FancyErrorMessage(errors.rules[index].thresholds[i].warn1)
                                              }
                                              </td>
                                              <td>
                                              :
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  values.rules[index].thresholds[i].warn2
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        errors.rules &&
                                                        errors.rules.length > index &&
                                                        errors.rules[index] &&
                                                        errors.rules[index].thresholds &&
                                                        errors.rules[index].thresholds.length > i &&
                                                        errors.rules[index].thresholds[i] &&
                                                        errors.rules[index].thresholds[i].warn2
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.warn2`}
                                                    id={`values.rules.${index}.thresholds.${i}.warn2`}
                                                  />
                                              }
                                                {
                                                (
                                                  errors.rules &&
                                                  errors.rules.length > index &&
                                                  errors.rules[index] &&
                                                  errors.rules[index].thresholds &&
                                                  errors.rules[index].thresholds.length > i &&
                                                  errors.rules[index].thresholds[i] &&
                                                  errors.rules[index].thresholds[i].warn2
                                                ) &&
                                                  FancyErrorMessage(errors.rules[index].thresholds[i].warn2)
                                              }
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  values.rules[index].thresholds[i].crit1
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        errors.rules &&
                                                        errors.rules.length > index &&
                                                        errors.rules[index] &&
                                                        errors.rules[index].thresholds &&
                                                        errors.rules[index].thresholds.length > i &&
                                                        errors.rules[index].thresholds[i] &&
                                                        errors.rules[index].thresholds[i].crit1
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.crit1`}
                                                    id={`values.rules.${index}.thresholds.${i}.crit1`}
                                                  />
                                              }
                                                {
                                                (
                                                  errors.rules &&
                                                  errors.rules.length > index &&
                                                  errors.rules[index] &&
                                                  errors.rules[index].thresholds &&
                                                  errors.rules[index].thresholds.length > i &&
                                                  errors.rules[index].thresholds[i] &&
                                                  errors.rules[index].thresholds[i].crit1
                                                ) &&
                                                  FancyErrorMessage(errors.rules[index].thresholds[i].crit1)
                                              }
                                              </td>
                                              <td>
                                              :
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  values.rules[index].thresholds[i].crit2
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        errors.rules &&
                                                        errors.rules.length > index &&
                                                        errors.rules[index] &&
                                                        errors.rules[index].thresholds &&
                                                        errors.rules[index].thresholds.length > i &&
                                                        errors.rules[index].thresholds[i] &&
                                                        errors.rules[index].thresholds[i].crit2
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.crit2`}
                                                    id={`values.rules.${index}.thresholds.${i}.crit2`}
                                                  />
                                              }
                                                {
                                                (
                                                  errors.rules &&
                                                  errors.rules.length > index &&
                                                  errors.rules[index] &&
                                                  errors.rules[index].thresholds &&
                                                  errors.rules[index].thresholds.length > i &&
                                                  errors.rules[index].thresholds[i] &&
                                                  errors.rules[index].thresholds[i].crit2
                                                ) &&
                                                  FancyErrorMessage(errors.rules[index].thresholds[i].crit2)
                                              }
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  values.rules[index].thresholds[i].min
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        errors.rules &&
                                                        errors.rules.length > index &&
                                                        errors.rules[index] &&
                                                        errors.rules[index].thresholds &&
                                                        errors.rules[index].thresholds.length > i &&
                                                        errors.rules[index].thresholds[i] &&
                                                        errors.rules[index].thresholds[i].min
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.min`}
                                                    id={`values.rules.${index}.thresholds.${i}.min`}
                                                  />
                                              }
                                                {
                                                (
                                                  errors.rules &&
                                                  errors.rules.length > index &&
                                                  errors.rules[index] &&
                                                  errors.rules[index].thresholds &&
                                                  errors.rules[index].thresholds.length > i &&
                                                  errors.rules[index].thresholds[i] &&
                                                  errors.rules[index].thresholds[i].min
                                                ) &&
                                                  FancyErrorMessage(errors.rules[index].thresholds[i].min)
                                              }
                                              </td>
                                              <td>
                                                {
                                                historyview ?
                                                  values.rules[index].thresholds[i].max
                                                :
                                                  <Field
                                                    type='text'
                                                    className={`form-control ${
                                                      (
                                                        errors.rules &&
                                                        errors.rules.length > index &&
                                                        errors.rules[index] &&
                                                        errors.rules[index].thresholds &&
                                                        errors.rules[index].thresholds.length > i &&
                                                        errors.rules[index].thresholds[i] &&
                                                        errors.rules[index].thresholds[i].max
                                                      ) &&
                                                        'border-danger'
                                                    }`}
                                                    name={`rules.${index}.thresholds.${i}.max`}
                                                    id={`values.rules.${index}.thresholds.${i}.max`}
                                                  />
                                              }
                                                {
                                                (
                                                  errors.rules &&
                                                  errors.rules.length > index &&
                                                  errors.rules[index] &&
                                                  errors.rules[index].thresholds &&
                                                  errors.rules[index].thresholds.length > i &&
                                                  errors.rules[index].thresholds[i] &&
                                                  errors.rules[index].thresholds[i].max
                                                ) &&
                                                  FancyErrorMessage(errors.rules[index].thresholds[i].max)
                                              }
                                              </td>
                                              {
                                              !historyview &&
                                                <td className='align-middle d-flex justify-content-center align-items-center'>
                                                  <Button
                                                    size='sm'
                                                    color='light'
                                                    type='button'
                                                    onClick={() => {
                                                      thresholdHelpers.remove(i);
                                                      if (values.rules[index].thresholds.length === 1) {
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
                      ((index + 1) === values.rules.length && !historyview) &&
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


export class ThresholdsProfilesList extends Component {
  constructor(props) {
    super(props);
    this.location = props.location;
    this.backend = new Backend();
    this.publicView = props.publicView

    if (this.publicView)
      this.apiUrl = '/api/v2/internal/public_thresholdsprofiles'
    else
      this.apiUrl = '/api/v2/internal/thresholdsprofiles'

    this.state = {
      loading: false,
      list_thresholdsprofiles: null,
      write_perm: false
    };
  }

  async componentDidMount() {
    this.setState({loading: true});

    let profiles = await this.backend.fetchData(this.apiUrl);
    if (!this.publicView) {
      let session = await this.backend.isActiveSession();
      this.setState({
        list_thresholdsprofiles: profiles,
        loading: false,
        write_perm: session.userdetails.is_superuser || session.userdetails.groups.thresholdsprofiles.length > 0
      });
    } else {
      this.setState({
        list_thresholdsprofiles: profiles,
        loading: false
      });
    };
  }

  render() {
    const columns = [
      {
        Header: 'Name',
        id: 'name',
        maxWidth: 350,
        accessor: e =>
          <Link to={`/ui/${this.publicView ? 'public_' : ''}thresholdsprofiles/` + e.apiid}>
            {e.name}
          </Link>
      },
      {
        Header: 'Description',
        accessor: 'description',
      },
      {
        Header: 'Group',
        accessor: 'groupname',
        className: 'text-center',
        maxWidth: 150,
      }
    ];
    const { loading, list_thresholdsprofiles, write_perm } = this.state;

    if (loading)
      return <LoadingAnim/>

    else if (!loading && list_thresholdsprofiles) {
      return (
        <BaseArgoView
          resourcename='thresholds profile'
          location={this.location}
          listview={true}
          addnew={!this.publicView}
          addperm={write_perm}
          publicview={this.publicView}
        >
          <ReactTable
            data={list_thresholdsprofiles}
            columns={columns}
            className='-highlight'
            defaultPageSize={12}
            rowsText='profiles'
            getTheadThProps={() => ({className: 'table-active font-weight-bold p-2'})}
          />
        </BaseArgoView>
      );
    } else
      return null;
  }
}


export class ThresholdsProfilesChange extends Component {
  constructor(props) {
    super(props);

    this.profile = props.match.params.apiid;
    this.addview = props.addview;
    this.history = props.history;
    this.location = props.location;
    this.tenant_name = props.tenantname;
    this.webapithresholds = props.webapithresholds;
    this.token = props.webapitoken;
    this.backend = new Backend();
    this.webapi = new WebApi({
      token: this.token,
      thresholdsProfiles: this.webapithresholds
    })
    this.publicView = props.publicView;

    this.state = {
      thresholds_profile: {
        'apiid': '',
        'name': '',
        'groupname': ''
      },
      thresholds_rules : [],
      groups_list: [],
      metrics_list: [],
      write_perm: false,
      areYouSureModal: false,
      loading: false,
      modalFunc: undefined,
      modalTitle: undefined,
      modalMsg: undefined,
      popoverWarningOpen: false,
      popoverCriticalOpen: false
    };

    this.toggleAreYouSure = this.toggleAreYouSure.bind(this);
    this.toggleAreYouSureSetModal = this.toggleAreYouSureSetModal.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.toggleWarningPopOver = this.toggleWarningPopOver.bind(this);
    this.toggleCriticalPopOver = this.toggleCriticalPopOver.bind(this);
    this.thresholdsToString = this.thresholdsToString.bind(this);
    this.onSubmitHandle = this.onSubmitHandle.bind(this);
    this.doChange = this.doChange.bind(this);
    this.doDelete = this.doDelete.bind(this);
  }

  toggleAreYouSureSetModal(msg, title, onyes) {
    this.setState(prevState =>
      ({areYouSureModal: !prevState.areYouSureModal,
        modalFunc: onyes,
        modalMsg: msg,
        modalTitle: title,
      }));
  }

  toggleAreYouSure() {
    this.setState(prevState =>
      ({areYouSureModal: !prevState.areYouSureModal}));
  }

  toggleWarningPopOver() {
    this.setState({
      popoverWarningOpen: !this.state.popoverWarningOpen
    });
  }

  toggleCriticalPopOver() {
    this.setState({
      popoverCriticalOpen: !this.state.popoverCriticalOpen
    });
  }

  onSelect(field, value) {
    let thresholds_rules = this.state.thresholds_rules;
    let index = field.split('[')[1].split(']')[0]
    if (thresholds_rules.length == index) {
      thresholds_rules.push({'metric': '', thresholds: [], 'host': '', 'endpoint_group': ''})
    }
    thresholds_rules[index].metric = value;
    this.setState({
      thresholds_rules: thresholds_rules
    });
  }

  thresholdsToString(rules) {
    rules.forEach((r => {
      let thresholds = [];
      if (!r.host)
        delete r.host;
      if (!r.endpoint_group)
        delete r.endpoint_group;
      r.thresholds.forEach((t => {
        let thresholds_string = undefined;
        thresholds_string = t.label + '=' + t.value + t.uom + ';' + t.warn1 + ':' + t.warn2 + ';' + t.crit1 + ':' + t.crit2;
        if (t.min && t.max)
          thresholds_string = thresholds_string + ';' + t.min + ';' + t.max;
        thresholds.push(thresholds_string)
      }));
      let th = thresholds.join(' ');
      r.thresholds = th;
    }));
    return rules;
  }

  onSubmitHandle(values, actions) {
    let msg = undefined;
    let title = undefined;

    if (this.addview) {
      msg = 'Are you sure you want to add thresholds profile?';
      title = 'Add thresholds profile';
    } else {
      msg = 'Are you sure you want to change thresholds profile?';
      title = 'Change thresholds profile';
    }

    this.toggleAreYouSureSetModal(msg, title,
      () => this.doChange(values, actions));
  }

  async doChange(values, actions) {
    let values_send = JSON.parse(JSON.stringify(values));
    if (this.addview) {
      let response = await this.webapi.addThresholdsProfile({
        name: values_send.name,
        rules: this.thresholdsToString(values_send.rules)
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
        };
        NotifyError({
          title: `Web API error: ${response.status} ${response.statusText}`,
          msg: add_msg
        });
      } else {
        let r = await response.json();
        let r_internal = await this.backend.addObject(
          '/api/v2/internal/thresholdsprofiles/',
          {
            apiid: r.data.id,
            name: values_send.name,
            groupname: values.groupname,
            rules: values_send.rules
          }
        );
        if (r_internal.ok)
          NotifyOk({
            msg: 'Thresholds profile successfully added',
            title: 'Added',
            callback: () => this.history.push('/ui/thresholdsprofiles')
          })
        else {
          let add_msg = '';
          try {
            let json = await r_internal.json();
            add_msg = json.detail;
          } catch(err) {
            add_msg = 'Internal API error adding thresholds profile';
          };
          NotifyError({
            title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
            msg: add_msg
          });
        };
      };
    } else {
      let response = await this.webapi.changeThresholdsProfile({
        id: values_send.id,
        name: values_send.name,
        rules: this.thresholdsToString(values_send.rules)
      });
      if (!response.ok) {
        let change_msg = '';
        try {
          let json = response.json();
          let msg_list = [];
          json.errors.forEach(e => msg_list.push(e.details));
          change_msg = msg_list.join(' ');
        } catch(err) {
          change_msg = 'Web API error changing thresholds profile';
        };
        NotifyError({
          title: `Web API error: ${response.status} ${response.statusText}`,
          msg: change_msg
        });
      } else {
        let r = await response.json();
        let r_internal = await this.backend.changeObject(
          '/api/v2/internal/thresholdsprofiles/',
          {
            apiid: values_send.id,
            name: values_send.name,
            groupname: values.groupname,
            rules: values_send.rules
          }
        );
        if (r_internal.ok)
          NotifyOk({
            msg: 'Thresholds profile successfully changed',
            title: 'Changed',
            callback: () => this.history.push('/ui/thresholdsprofiles')
          })
        else {
          let change_msg = '';
          try {
            let json = await r_internal.json();
            change_msg = json.detail;
          } catch(err) {
            change_msg = 'Internal API error changing thresholds profile';
          };
          NotifyError({
            title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
            msg: change_msg
          });
        };
      };
    }
  }

  async doDelete(profileId) {
    let response = await this.webapi.deleteThresholdsProfile(profileId);
    if (!response.ok) {
      let msg = '';
      try {
        let json = await response.json();
        let msg_list = [];
        json.errors.forEach(e => msg_list.push(e.details));
        msg = msg_list.join(' ');
      } catch(err) {
        msg = 'Web API error deleting thresholds profile';
      };
      NotifyError({
        title: `Web API error: ${response.status} ${response.statusText}`,
        msg: msg
      });
    } else {
      let r_internal = await this.backend.deleteObject(`/api/v2/internal/thresholdsprofiles/${profileId}`);
      if (r_internal)
        NotifyOk({
          msg: 'Thresholds profile successfully deleted',
          title: 'Deleted',
          callback: () => this.history.push('/ui/thresholdsprofiles')
        })
      else {
        let msg = '';
        try {
          let json = await r_internal.json();
          msg = json.detail;
        } catch(err) {
          msg = 'Internal API error deleting thresholds profile';
        };
        NotifyError({
          title: `Internal API error: ${r_internal.status} ${r_internal.statusText}`,
          msg: msg
        });
      };
    };
  }

  async componentDidMount() {
    this.setState({loading: true});

    if (this.publicView) {
      let json = await this.backend.fetchData(`/api/v2/internal/public_thresholdsprofiles/${this.profile}`);
      let thresholdsprofile = await this.webapi.fetchThresholdsProfile(json.apiid);
      this.setState({
        thresholds_profile: {
          'apiid': thresholdsprofile.id,
          'name': thresholdsprofile.name,
          'groupname': json['groupname']
        },
        thresholds_rules: thresholdsToValues(thresholdsprofile.rules),
        groups_list: [],
        metrics_list: await this.backend.fetchListOfNames('/api/v2/internal/public_metricsall'),
        write_perm: false,
        loading: false
      });
    }
    else {
      let sessionActive = await this.backend.isActiveSession();
      let metricsall = await this.backend.fetchListOfNames('/api/v2/internal/metricsall');
      let json = await this.backend.fetchData(`/api/v2/internal/thresholdsprofiles/${this.profile}`);
      if (this.addview) {
        this.setState({
          loading: false,
          groups_list: sessionActive.userdetails.groups.thresholdsprofiles,
          metrics_list: metricsall,
          write_perm: sessionActive.userdetails.is_superuser ||
            sessionActive.userdetails.groups.thresholdsprofiles.length > 0,
        });
      } else {
        let thresholdsprofile = await this.webapi.fetchThresholdsProfile(json.apiid);
        this.setState({
          thresholds_profile: {
            'apiid': thresholdsprofile.id,
            'name': thresholdsprofile.name,
            'groupname': json['groupname']
          },
          thresholds_rules: thresholdsToValues(thresholdsprofile.rules),
          groups_list: sessionActive.userdetails.groups.thresholdsprofiles,
          metrics_list: metricsall,
          write_perm: sessionActive.userdetails.is_superuser ||
            sessionActive.userdetails.groups.thresholdsprofiles.indexOf(json['groupname']) >= 0,
          loading: false
        });
      };
    }
  }

  render() {
    const { thresholds_profile, thresholds_rules, metrics_list, groups_list, loading, write_perm } = this.state;

    if (loading)
      return <LoadingAnim/>;

    else if (!loading && thresholds_profile) {
      return (
        <BaseArgoView
          resourcename='thresholds profile'
          location={this.location}
          modal={true}
          state={this.state}
          toggle={this.toggleAreYouSure}
          submitperm={write_perm}
          addview={this.publicView ? !this.publicView : this.addview}
          publicview={this.publicView}
        >
          <Formik
            initialValues = {{
              id: thresholds_profile.apiid,
              name: thresholds_profile.name,
              groupname: thresholds_profile.groupname,
              rules: thresholds_rules
            }}
            validationSchema={ThresholdsSchema}
            onSubmit = {(values, actions) => this.onSubmitHandle(values, actions)}
            render = {props => (
              <Form>
                <ThresholdsProfilesForm
                  {...props}
                  groups_list={groups_list}
                  metrics_list={metrics_list}
                  write_perm={write_perm}
                  onSelect={this.onSelect}
                  state={this.state}
                  toggleWarningPopOver={this.toggleWarningPopOver}
                  toggleCriticalPopOver={this.toggleCriticalPopOver}
                />
                {
                  write_perm &&
                    <div className='submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5'>
                      {
                        !this.addview ?
                          <Button
                            color='danger'
                            onClick={() => {
                              this.toggleAreYouSureSetModal(
                                'Are you sure you want to delete thresholds profile?',
                                'Delete thresholds profile',
                                () => this.doDelete(props.values.id)
                              )
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
          />
        </BaseArgoView>
      );
    } else
      return null;
  }
}


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


export class ThresholdsProfileVersionCompare extends Component {
  constructor(props) {
    super(props);

    this.version1 = props.match.params.id1;
    this.version2 = props.match.params.id2;
    this.profile = props.match.params.apiid;

    this.state = {
      loading: false,
      name1: '',
      groupname1: '',
      rules1: [],
      name2: '',
      groupname2: '',
      rules2: []
    };

    this.backend = new Backend();
  }

  async componentDidMount() {
    let json = await this.backend.fetchData(`/api/v2/internal/tenantversion/thresholdsprofile/${this.profile}`);
    let name1 = '';
    let groupname1 = '';
    let rules1 = [];
    let name2 = '';
    let groupname2 = '';
    let rules2 = [];

    json.forEach((e) => {
      if (e.version == this.version1) {
        name1 = e.fields.name;
        groupname1 = e.fields.groupname;
        rules1 = e.fields.rules;
      } else if (e.version == this.version2) {
        name2 = e.fields.name;
        groupname2 = e.fields.groupname;
        rules2 = e.fields.rules;
      }
    });

    this.setState({
      name1: name1,
      groupname1: groupname1,
      rules1: rules1,
      name2: name2,
      groupname2: groupname2,
      rules2: rules2,
      loading: false
    });
  }

  render() {
    const { name1, name2, groupname1, groupname2, rules1, rules2, loading } = this.state;

    if (loading)
      return (<LoadingAnim/>);

    else if (!loading && name1 && name2) {
      return (
        <React.Fragment>
          <div className='d-flex align-items-center justify-content-between'>
            <h2 className='ml-3 mt-1 mb-4'>{`Compare ${name2} versions`}</h2>
          </div>
          {
            (name1 !== name2) &&
              <DiffElement title='name' item1={name1} item2={name2}/>
          }
          {
            (groupname1 !== groupname2) &&
              <DiffElement title='group name' item1={groupname1} item2={groupname2}/>
          }
          {
            (!arraysEqual(rules1, rules2)) &&
              <ListDiffElement title='rules' item1={rules1} item2={rules2}/>
          }
        </React.Fragment>
      );
    } else
      return null;
  }
}


export class ThresholdsProfileVersionDetail extends Component {
  constructor(props) {
    super(props);

    this.profile = props.match.params.apiid;
    this.version = props.match.params.version;

    this.backend = new Backend();

    this.state = {
      name: '',
      groupname: '',
      rules: [],
      date_created: '',
      loading: false
    };
  }

  async componentDidMount() {
    this.setState({loading: true});

    let json = await this.backend.fetchData(`/api/v2/internal/tenantversion/thresholdsprofile/${this.profile}`);
    json.forEach((e) => {
      if (e.version == this.version)
        this.setState({
          name: e.fields.name,
          groupname: e.fields.groupname,
          rules: thresholdsToValues(e.fields.rules),
          date_created: e.date_created,
          loading: false
        });
    });
  }

  render() {
    const { name, groupname, rules, date_created, loading } = this.state;

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
              groupname: groupname,
              rules: rules
            }}
            render = {props => (
              <Form>
                <ThresholdsProfilesForm
                  {...props}
                  historyview={true}
                />
              </Form>
            )}
          />
        </BaseArgoView>
      );
    } else
      return null;
  }
}
