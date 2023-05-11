import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { Backend, WebApi } from './DataManager';
import {
  LoadingAnim,
  BaseArgoView,
  NotifyOk,
  DiffElement,
  ProfileMain,
  NotifyError,
  ErrorComponent,
  ParagraphTitle,
  ProfilesListTable,
  CustomReactSelect
} from './UIElements';
import {
  Row,
  Col,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Button,
  Popover,
  PopoverBody,
  PopoverHeader,
  Label,
  Form,
  Input,
  FormFeedback
} from 'reactstrap';
import * as Yup from 'yup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faPlus, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import ReactDiffViewer from 'react-diff-viewer';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  fetchUserDetails,
  fetchAllMetrics,
  fetchBackendThresholdsProfiles,
  fetchMetricProfiles
} from './QueryFunctions';
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { ErrorMessage } from '@hookform/error-message';


const ThresholdsProfilesChangeContext = React.createContext()


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
            .matches(/^([-](?=\.?\d))?(\d+)?(\.\d+)?$/, 'Must be a number.'),
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
})


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


const RulesThresholds = ({ index }) => {
  const context = useContext(ThresholdsProfilesChangeContext)

  const { control, setValue, formState: { errors } } = useFormContext()

  const { fields, remove, insert, append } = useFieldArray({ control, name: `rules.${index}.thresholds` })

  const [popoverWarningOpen, setPopoverWarningOpen] = useState(false);
  const [popoverCriticalOpen, setPopoverCriticalOpen] = useState(false);

  const options = ["", "s", "us", "ms", "B", "KB", "MB", "TB", "%", "c"]

  function toggleWarningPopOver() {
    setPopoverWarningOpen(!popoverWarningOpen);
  }

  function toggleCriticalPopOver() {
    setPopoverCriticalOpen(!popoverCriticalOpen);
  }

  return (
    <div>
      <table className='table table-bordered table-sm' data-testid={`rules.${index}.thresholds`}>
        <thead className='table-active'>
          <tr className='align-middle text-center'>
            <th style={{width: '4%'}}>#</th>
            <th style={{width: '13%'}}>Label</th>
            <th colSpan={2} style={{width: '13%'}}>Value</th>
            {
              context.readonly ?
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
              context.readonly ?
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
              !context.readonly &&
                <th style={{width: '8%'}}>Action</th>
            }
          </tr>
        </thead>
        <tbody>
          {
            fields.length > 0 ?
              // eslint-disable-next-line @getify/proper-arrows/params
              fields.map((_t, i) =>
                <tr key={ _t.id }>
                  <td className='align-middle text-center'>
                    { i + 1 }
                  </td>
                  <td>
                    {
                      context.readonly ?
                        _t.label
                      :
                        <Controller
                          name={ `rules.${index}.thresholds.${i}.label` }
                          control={ control }
                          render={ ({ field }) =>
                            <Input
                              { ...field }
                              data-testid={ `rules.${index}.thresholds.${i}.label` }
                              className={ `form-control ${errors?.rules?.[index]?.thresholds?.[i]?.label && "is-invalid"}` }
                            />
                          }
                        />
                    }
                    {
                      <ErrorMessage
                        errors={ errors }
                        name={ `rules.${index}.thresholds.${i}.label` }
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                    }
                  </td>
                  <td>
                    {
                      context.readonly ?
                        _t.value
                      :
                        <Controller
                          name={ `rules.${index}.thresholds.${i}.value` }
                          control={ control }
                          render={ ({ field }) =>
                            <Input
                              { ...field }
                              data-testid={ `rules.${index}.thresholds.${i}.value` }
                              className={ `form-control ${errors?.rules?.[index]?.thresholds?.[i]?.value && "is-invalid"}` }
                            />
                          }
                        />
                    }
                    {
                      <ErrorMessage
                        errors={ errors }
                        name={ `rules.${index}.thresholds.${i}.value` }
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                    }
                  </td>
                  <td style={{width: '6%'}}>
                    {
                      context.readonly ?
                        _t.uom
                      :
                        <Controller
                          name={ `rules.${index}.thresholds.${i}.uom` }
                          control={ control }
                          render={ ({ field }) =>
                            <CustomReactSelect
                              forwardedRef={ field.ref }
                              onChange={ e => setValue(`rules.${index}.thresholds.${i}.uom`, e.value) }
                              options={ options.map(option => new Object({ label: option, value: option })) }
                              value={ field.value ? { label: field.value, value: field.value } : undefined }
                            />
                          }
                        />
                    }
                  </td>
                  <td>
                    {
                      context.readonly ?
                        _t.warn1
                      :
                        <Controller
                          name={ `rules.${index}.thresholds.${i}.warn1` }
                          control={ control }
                          render={ ({ field }) =>
                            <Input
                              { ...field }
                              data-testid={ `rules.${index}.thresholds.${i}.warn1` }
                              className={ `form-control ${errors?.rules?.[index]?.thresholds?.[i]?.warn1 && "is-invalid"}` }
                            />
                          }
                        />
                    }
                    {
                      <ErrorMessage
                        errors={ errors }
                        name={ `rules.${index}.thresholds.${i}.warn1` }
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                    }
                  </td>
                  <td>
                    :
                  </td>
                  <td>
                    {
                      context.readonly ?
                        _t.warn2
                      :
                        <>
                          <Controller
                            name={ `rules.${index}.thresholds.${i}.warn2` }
                            control={ control }
                            render={ ({ field }) =>
                              <Input
                                { ...field }
                                data-testid={ `rules.${index}.thresholds.${i}.warn2` }
                                className={ `form-control ${errors?.rules?.[index]?.thresholds?.[i]?.warn2 && "is-invalid"}` }
                              />
                            }
                          />
                          <ErrorMessage
                            errors={ errors }
                            name={ `rules.${index}.thresholds.${i}.warn2` }
                            render={ ({ message }) =>
                              <FormFeedback invalid="true" className="end-0">
                                { message }
                              </FormFeedback>
                            }
                          />
                        </>
                    }
                  </td>
                  <td>
                    {
                      context.readonly ?
                        _t.crit1
                      :
                        <>
                          <Controller
                            name={ `rules.${index}.thresholds.${i}.crit1` }
                            control={ control }
                            render={ ({ field }) =>
                              <Input
                                { ...field }
                                data-testid={ `rules.${index}.thresholds.${i}.crit1` }
                                className={ `form-control ${errors?.rules?.[index]?.thresholds?.[i]?.crit1 && "is-invalid" }` }
                              />
                            }
                          />
                          <ErrorMessage
                            errors={ errors }
                            name={ `rules.${index}.thresholds.${i}.warn2` }
                            render={ ({ message }) =>
                              <FormFeedback invalid="true" className="end-0">
                                { message }
                              </FormFeedback>
                            }
                          />
                        </>
                    }
                  </td>
                  <td>
                    :
                  </td>
                  <td>
                    {
                      context.readonly ?
                        _t.crit2
                      :
                        <>
                          <Controller
                            name={ `rules.${index}.thresholds.${i}.crit2` }
                            control={ control }
                            render={ ({ field }) =>
                              <Input
                                { ...field }
                                data-testid={ `rules.${index}.thresholds.${i}.crit2` }
                                className={ `form-control ${errors?.rules?.[index]?.thresholds?.[i]?.crit2 && "is-invalid" }` }
                              />
                            }
                          />
                          <ErrorMessage
                            errors={ errors }
                            name={ `rules.${index}.thresholds.${i}.crit2` }
                            render={ ({ message }) =>
                              <FormFeedback invalid="true" className="end-0">
                                { message }
                              </FormFeedback>
                            }
                          />
                        </>
                    }
                  </td>
                  <td>
                    {
                      context.readonly ?
                        _t.min
                      :
                        <>
                          <Controller
                            name={ `rules.${index}.thresholds.${i}.min` }
                            control={ control }
                            render={ ({ field }) =>
                              <Input
                                { ...field }
                                data-testid={ `rules.${index}.thresholds.${i}.min` }
                                className={ `form-control ${ errors?.rules?.[index]?.thresholds?.[i]?.min }` }
                              />
                            }
                          />
                          <ErrorMessage
                            errors={ errors }
                            name={ `rules.${index}.thresholds.${i}.min` }
                            render={ ({ message }) =>
                              <FormFeedback invalid="true" className="end-0">
                                { message }
                              </FormFeedback>
                            }
                          />
                        </>
                    }
                  </td>
                  <td>
                    {
                      context.readonly ?
                        _t.max
                      :
                        <>
                          <Controller
                            name={ `rules.${index}.thresholds.${i}.max` }
                            control={ control }
                            render={ ({ field }) =>
                              <Input
                                { ...field }
                                data-testid={ `rules.${index}.thresholds.${i}.max` }
                                className={ `form-control ${ errors?.rules?.[index]?.thresholds?.[i]?.max }` }
                              />
                            }
                          />
                          <ErrorMessage
                            errors={ errors }
                            name={ `rules.${index}.thresholds.${i}.max` }
                            render={ ({ message }) =>
                              <FormFeedback invalid="true" className="end-0">
                                { message }
                              </FormFeedback>
                            }
                          />
                        </>
                    }
                  </td>
                  {
                    !context.readonly &&
                      <td className='align-middle d-flex justify-content-center align-items-center'>
                        <Button
                          size='sm'
                          color='light'
                          type='button'
                          data-testid={`rules.${index}.thresholds.${i}.remove`}
                          onClick={() => {
                            remove(i)
                            if (fields.length === 1) {
                              append({
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
                          data-testid={`rules.${index}.thresholds.${i}.add`}
                          onClick={() => insert(i + 1, {
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
  )
}


const Rules = () => {
  function getEndpoints(metric, key) {
    function onlyUnique(value, index, self) {
      return self.indexOf(value) === index
    }

    let servicetypes = new Array();
    context.metricProfiles.forEach(profile => {
      profile.services.forEach(service => {
        if (service.metrics.includes(metric))
          servicetypes.push(service.service)
      })
    })

    let endpoints = new Array();
    context.topologyEndpoints.forEach(endpoint => {
      if (servicetypes.includes(endpoint.service))
        endpoints.push(endpoint[key])
    })

    return endpoints.filter(onlyUnique).sort()
  }

  const context = useContext(ThresholdsProfilesChangeContext)

  const { control, getValues, setValue, clearErrors, formState: { errors } } = useFormContext()

  const { fields, remove, append, update } = useFieldArray({ control, name: "rules" })

  return (
    // eslint-disable-next-line @getify/proper-arrows/params
    fields.map((_rule, index) =>
      <React.Fragment key={ _rule.id }>
        <Card className={`mt-${index === 0 ? '1' : '4'}`} data-testid={`rules.${index}`}>
          <CardHeader className='p-1 fw-bold text-uppercase'>
            <div className='d-flex align-items-center justify-content-between g-0'>
              Rule {index + 1}
              {
                !context.readonly &&
                  <Button
                    size='sm'
                    color='danger'
                    type='button'
                    data-testid={`rules.${index}.remove`}
                    onClick={
                      () => (context.write_perm) && remove(index)
                    }
                  >
                    <FontAwesomeIcon icon={faTimes}/>
                  </Button>
              }
            </div>
          </CardHeader>
          <CardBody className='p-1'>
            <Row className='d-flex align-items-center g-0'>
              <Col md={12}>
                <Controller
                  name={ `rules.${index}.metric` }
                  control={ control }
                  render={ ({ field }) =>
                    context.readonly ?
                      <>
                        <Label for={`rules.${index}.metric`}>Metric</Label>
                        <Input
                          { ...field }
                          id={ `rules.${index}.metric` }
                          data-testid={ `rules.${index}.metric` }
                          className='form-control'
                          disabled={ true }
                        />
                      </>
                    :
                      <CustomReactSelect
                        forwardedRef={ field.ref }
                        onChange={ (e) => {
                          update(index, {
                            metric: e.value,
                            host: null,
                            endpoint_group: null,
                            thresholds: getValues(`rules.${index}.thresholds`)
                          })
                          clearErrors(`rules.${index}.metric`)
                        } }
                        options={
                          context.metrics_list.map(metric => new Object({
                            label: metric,  value: metric
                          }))
                        }
                        label="Metric"
                        value={ field.value ? { label: field.value, value: field.value } : undefined }
                        error={ errors?.rules?.[index]?.metric }
                      />
                  }
                />
                <ErrorMessage
                  errors={ errors }
                  name={ `rules.${index}.metric` }
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </Col>
            </Row>
            <Row className='mt-2'>
              <Col md={12}>
                <Controller
                  name={ `rules.${index}.host` }
                  control={ control }
                  render={ ({ field }) => 
                    context.readonly ?
                      <>
                        <Label for={ `rules.${index}.host` }>Host</Label>
                        <Input
                          { ...field }
                          data-testid={ `rules.${index}.host` }
                          className='form-control'
                          disabled={ true }
                        />
                      </>
                    :
                      <CustomReactSelect
                        forwardedRef={ field.ref }
                        options={ getEndpoints(getValues(`rules.${index}.metric`), "hostname").map(hostname => new Object({
                          label: hostname, value: hostname
                        })) }
                        onChange={ e => setValue(`rules.${index}.host`, e.value) }
                        label="Host"
                        value={ field.value ? { label: field.value, value: field.value } : undefined }
                      />
                  }
                />
              </Col>
            </Row>
            <Row className='mt-2'>
              <Col md={12}>
                <Controller
                  name={ `rules.${index}.endpoint_group` }
                  control={ control }
                  render={ ({ field }) => 
                    context.readonly ?
                      <>
                        <Label for={`rules.${index}.endpoint_group`}>Group</Label>
                        <Input
                          { ...field }
                          id={ `rules.${index}.endpoint_group` }
                          data-testid={ `rules.${index}.endpoint_group` }
                          className='form-control'
                          disabled={ true }
                        />
                      </>
                    :
                      <CustomReactSelect
                        forwardedRef={ field.ref }
                        options={ getEndpoints(getValues(`rules.${index}.metric`), "group").map(group => new Object({
                          label: group, value: group
                        })) }
                        onChange={ e => setValue(`rules.${index}.endpoint_group`, e.value)}
                        label="Group"
                        value={ field.value ? { label: field.value, value: field.value } : undefined }
                      />
                  }
                />
              </Col>
            </Row>
          </CardBody>
          <CardFooter>
            <Row className='mt-2'>
              <Col md={12}>
                <h6 className="text-uppercase rounded">Thresholds</h6>
                <RulesThresholds
                  index={ index }
                />
              </Col>
            </Row>
          </CardFooter>
        </Card>
        {
          ((index + 1) === fields.length && !context.readonly) &&
            <Button
              color='success'
              className='mt-4'
              onClick={() => append({
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
}


const ThresholdsProfilesForm = ({
  initialValues=undefined,
  doChange=undefined,
  doDelete=undefined,
  ...props
}) => {
  const name = props.match.params.name;
  const addview = props.addview;
  const location = props.location;
  const publicView = props.publicView;

  const context = useContext(ThresholdsProfilesChangeContext)

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [onYes, setOnYes] = useState('')
  const [formValues, setFormValues] = useState(undefined);

  const methods = useForm({
    defaultValues: initialValues,
    mode: "all",
    resolver: yupResolver(ThresholdsSchema)
  })

  const { control } = methods

  const rules = useWatch({ control, name: "rules" })

  function toggleAreYouSure() {
    setAreYouSureModal(!areYouSureModal)
  }

  function onSubmitHandle(values) {
    let msg = `Are you sure you want to ${addview ? 'add' : 'change'} thresholds profile?`;
    let title = `${addview ? 'Add' : 'Change'} thresholds profile`

    setModalMsg(msg)
    setModalTitle(title)
    setFormValues(values)
    setOnYes("submit")
    toggleAreYouSure()
  }

  const onYesCallback = () => {
    if (onYes === "submit")
      doChange(formValues)

    else if (onYes === "delete")
      doDelete(methods.getValues("id"))
  }

  return (
    <BaseArgoView
      resourcename={
        context.historyview ?
          `${name} (${initialValues.date_created})`
        :
          publicView ? 
            "Thresholds profile details" 
          : "thresholds profile"
      }
      location={location}
      history={!publicView}
      submitperm={context.write_perm}
      addview={publicView ? !publicView : addview}
      publicview={publicView}
      infoview={ context.historyview }
      modal={true}
      state={{areYouSureModal, 'modalFunc': onYesCallback, modalTitle, modalMsg}}
      toggle={toggleAreYouSure}
    >
      <FormProvider { ...methods } >
        <Form onSubmit={ methods.handleSubmit(val => onSubmitHandle(val)) }>
          <ProfileMain
            {...props}
            grouplist={
              context.write_perm ?
                context.groups_list
              :
                [ methods.getValues("groupname") ]
            }
            fieldsdisable={ context.readonly }
            profiletype='thresholds'
            addview={ addview }
          />
          <ParagraphTitle title='Thresholds rules'/>
          <Row>
            <Col md={12}>
              <div>
                { rules.length > 0 ? (
                  <Rules />
                )
                :
                  !context.readonly &&
                    <Button
                      color='success'
                      onClick={() => methods.setValue("rules", [{
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
                      }])}
                    >
                      Add a rule
                    </Button>
                }
              </div>
            </Col>
          </Row>
          {
            (context.write_perm && !context.readonly) &&
              <div className='submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5'>
                {
                  !addview ?
                    <Button
                      color='danger'
                      onClick={() => {
                        setModalMsg('Are you sure you want to delete thresholds profile?')
                        setModalTitle('Delete thresholds profile')
                        setOnYes("delete")
                        toggleAreYouSure()
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
      </FormProvider>
    </BaseArgoView>
  )
}


const fetchTopologyEndpoints = async ( webapi ) => {
  return await webapi.fetchReportsTopologyEndpoints()
}


export const ThresholdsProfilesList = (props) => {
  const location = props.location;
  const publicView = props.publicView;
  const webapitoken = props.webapitoken;
  const webapithresholds = props.webapithresholds;

  const queryClient = useQueryClient();

  const { data: userDetails, error: errorUserDetails, status: statusUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true)
  );

  const { data: thresholdsProfiles, error: errorThresholdsProfiles, status: statusThresholdsProfiles } = useQuery(
    [`${publicView ? 'public_' : ''}thresholdsprofile`, 'backend'],
    () => fetchBackendThresholdsProfiles(publicView),
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
        <Link
          to={`/ui/${publicView ? 'public_' : ''}thresholdsprofiles/${e.name}`}
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
      column_width: '8%',
      Cell: row =>
        <div style={{textAlign: 'center'}}>
          {row.value}
        </div>
    }
  ], [publicView, queryClient, webapithresholds, webapitoken]);

  if (statusUserDetails === 'loading' || statusThresholdsProfiles === 'loading')
    return (<LoadingAnim/>);

  else if (statusThresholdsProfiles === 'error')
    return (<ErrorComponent error={errorThresholdsProfiles}/>);

  else if (statusUserDetails === 'error')
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (thresholdsProfiles) {
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
          data={thresholdsProfiles}
          columns={columns}
          type='thresholds'
        />
      </BaseArgoView>
    );
  } else
    return null;
};


export const ThresholdsProfilesChange = (props) => {
  const profile_name = props.match.params.name;
  const addview = props.addview;
  const history = props.history;
  const publicView = props.publicView;
  const webapitoken = props.webapitoken
  const webapithresholds = props.webapithresholds;
  const webapimetric = props.webapimetric;
  const webapireports = props.webapireports;

  const backend = new Backend();
  const webapi = new WebApi({
    token: webapitoken,
    thresholdsProfiles: webapithresholds,
    metricProfiles: webapimetric,
    reportsConfigurations: webapireports
  });

  const queryClient = useQueryClient();

  const webapiAddMutation = useMutation(async (values) => await webapi.addThresholdsProfile(values));
  const backendAddMutation = useMutation(async (values) => await backend.addObject('/api/v2/internal/thresholdsprofiles/', values));
  const webapiChangeMutation = useMutation(async (values) => await webapi.changeThresholdsProfile(values));
  const backendChangeMutation = useMutation(async (values) => await backend.changeObject('/api/v2/internal/thresholdsprofiles/', values));
  const webapiDeleteMutation = useMutation(async (profileId) => await webapi.deleteThresholdsProfile(profileId));
  const backendDeleteMutation = useMutation(async (profileId) => await backend.deleteObject(`/api/v2/internal/thresholdsprofiles/${profileId}`));

  const { data: userDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true),
    { enabled: !publicView }
  );

  const { data: backendTP, error: errorBackendTP, isLoading: loadingBackendTP } = useQuery(
    [`${publicView ? 'public_' : ''}thresholdsprofile`, "backend", profile_name],
    async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}thresholdsprofiles/${profile_name}`);
    },
    {
      enabled: !addview && (!publicView ? !!userDetails : true),
      initialData: () => {
        return queryClient.getQueryData(
          [`${publicView ? 'public_' : ''}thresholdsprofile`, "backend"]
        )?.find(
          profile => profile.name === profile_name
        )
      }
    }
  )

  const { data: webApiTP, error: errorWebApiTP, isLoading: loadingWebApiTP } = useQuery(
    [`${publicView ? 'public_' : ''}thresholdsprofile`, "webapi", profile_name],
    async () => {
      return webapi.fetchThresholdsProfile(backendTP.apiid)
    },
    {
      enabled: !!backendTP,
      initialData: () => {
        return queryClient.getQueryData([`${publicView ? "public_" : ""}thresholdsprofile`, "webapi"])?.find(profile => profile.id === backendTP.apiid)
      }
    }
  )

  const { data: allMetrics, error: errorAllMetrics, isLoading: loadingAllMetrics } = useQuery(
    'metricsall', () => fetchAllMetrics(publicView),
    { enabled: !publicView }
  );

  const { data: topologyEndpoints, error: errorTopologyEndpoints, isLoading: loadingTopologyEndpoints } = useQuery(
    'topologyendpoints', () => fetchTopologyEndpoints(webapi),
    { enabled: !publicView }
  )

  const { data: metricProfiles, error: errorMetricProfiles, isLoading: loadingMetricProfiles } = useQuery(
    ['metricprofile', 'webapi'], () => fetchMetricProfiles(webapi),
    { enabled: !publicView }
  )

  const { data: reports, error: errorReports, isLoading: loadingReports } = useQuery(
    ["report", "webapi"], async () => webapi.fetchReports(),
    { enabled: !publicView && !addview && !!userDetails }
  )

  function thresholdsToString(rules) {
    rules.forEach((rule => {
      let thresholds = [];
      if (!rule.host)
        delete rule.host;
      if (!rule.endpoint_group)
        delete rule.endpoint_group;
      rule.thresholds.forEach((thresh => {
        let thresholds_string = undefined;
        if (!thresh.value)
          thresh.value = '0'
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

  function getAssociatedReports (profileId) {
    let reportsNames = new Array()
    reports.forEach(report => {
      report.profiles.forEach(profile => {
        if (profile.type === "thresholds" && profile.id === profileId)
          reportsNames.push(report.info.name)
      })
    })

    return reportsNames
  }

  function doChange(formValues) {
    let values_send = JSON.parse(JSON.stringify(formValues));
    if (addview) {
      webapiAddMutation.mutate(
        { name: values_send.name, rules: thresholdsToString(values_send.rules) }, {
          onSuccess: (data) => {
            backendAddMutation.mutate({
              apiid: data.data.id,
              name: values_send.name,
              groupname: formValues.groupname,
              rules: values_send.rules
            }, {
              onSuccess: () => {
                queryClient.invalidateQueries('thresholdsprofile');
                queryClient.invalidateQueries('public_thresholdsprofile');
                NotifyOk({
                  msg: 'Thresholds profile successfully added',
                  title: 'Added',
                  callback: () => history.push('/ui/thresholdsprofiles')
                })
              },
              onError: (error) => {
                NotifyError({
                  title: 'Internal API error',
                  msg: error.message ? error.message : 'Internal API error adding thresholds profile'
                })
              }
            })
          },
          onError: (error) => {
            NotifyError({
              title: 'Web API error',
              msg: error.message ? error.message : 'Web API error adding thresholds profile'
            })
          }
        }
      )
    } else {
      webapiChangeMutation.mutate({
        id: values_send.id, name: profile_name, rules: thresholdsToString(values_send.rules)
      }, {
        onSuccess: () => {
          backendChangeMutation.mutate({
            apiid: values_send.id,
            name: profile_name,
            groupname: formValues.groupname,
            rules: values_send.rules
          }, {
            onSuccess: () => {
              queryClient.invalidateQueries('thresholdsprofile');
              queryClient.invalidateQueries('public_thresholdsprofile');
              NotifyOk({
                msg: 'Thresholds profile successfully changed',
                title: 'Changed',
                callback: () => history.push('/ui/thresholdsprofiles')
              })
            },
            onError: (error) => {
              NotifyError({
                title: 'Internal API error',
                msg: error.message ? error.message : 'Internal API error changing thresholds profile'
              })
            }
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Web API error',
            msg: error.message ? error.message : 'Web API error changing thresholds profile'
          })
        }
      })
    }
  }

  function doDelete(profileId) {
    let reportsWithThreshold = getAssociatedReports(profileId)
    if (reportsWithThreshold.length === 0)
      webapiDeleteMutation.mutate(profileId, {
        onSuccess: () => {
          backendDeleteMutation.mutate(profileId, {
            onSuccess: () => {
              queryClient.invalidateQueries('thresholdsprofile');
              queryClient.invalidateQueries('public_thresholdsprofile');
              NotifyOk({
                msg: 'Thresholds profile successfully deleted',
                title: 'Deleted',
                callback: () => history.push('/ui/thresholdsprofiles')
              })
            },
            onError: (error) => {
              NotifyError({
                title: 'Internal API error',
                msg: error.message ? error.message : 'Internal API error deleting thresholds profile'
              })
            }
          })
        },
        onError: (error) => {
          NotifyError({
            title: 'Web API error',
            msg: error.message ? error.message : 'Web API error deleting thresholds profile'
          })
        }
      })

    else
      NotifyError({
        title: "Unable to delete",
        msg: `Thresholds profile is associated with report${reportsWithThreshold.length > 1 ? "s" : ""}: ${reportsWithThreshold.join(", ")}`
      })
  }

  const loading = loadingBackendTP || loadingWebApiTP || loadingUserDetails || loadingAllMetrics || loadingMetricProfiles || loadingTopologyEndpoints || loadingReports

  if (loading)
    return (<LoadingAnim/>);

  else if (errorBackendTP)
    return (<ErrorComponent error={errorBackendTP}/>);

  else if (errorWebApiTP)
    return (<ErrorComponent error={webApiTP} />)

  else if (errorAllMetrics)
    return (<ErrorComponent error={errorAllMetrics}/>);

  else if (errorMetricProfiles)
    return (<ErrorComponent error={errorMetricProfiles} />)

  else if (errorTopologyEndpoints)
    return ( <ErrorComponent error={errorTopologyEndpoints} /> )

  else if (errorReports)
    return (<ErrorComponent error={errorReports} />)

  else if ((addview || (backendTP && webApiTP)) && (publicView || (allMetrics && topologyEndpoints && metricProfiles))) {
    let write_perm = userDetails ?
      addview ?
        userDetails.is_superuser || userDetails.groups.thresholdsprofiles.length > 0
      :
        userDetails.is_superuser || userDetails.groups.thresholdsprofiles.indexOf(backendTP.groupname) >= 0
    :
      false;

    let groups_list = userDetails ?
      userDetails.groups.thresholdsprofiles
    :
      [];

    return (
      <ThresholdsProfilesChangeContext.Provider value={{
          groups_list: groups_list,
          metrics_list: allMetrics,
          write_perm: write_perm,
          metricProfiles: metricProfiles,
          topologyEndpoints: topologyEndpoints,
          readonly: publicView
      }}>
        <ThresholdsProfilesForm
          { ...props }
          initialValues={{
            id: webApiTP ? webApiTP.id : '',
            name: webApiTP ? webApiTP.name : '',
            groupname: backendTP ? backendTP.groupname : '',
            rules: webApiTP ? thresholdsToValues(webApiTP.rules) : []
          }}
          doChange={ doChange }
          doDelete={ doDelete }
        />
      </ThresholdsProfilesChangeContext.Provider>
    )
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
    <div id='argo-contentwrap' className='ms-2 mb-2 mt-2 p-3 border rounded'>
      <h6 className='mt-4 fw-bold text-uppercase'>{title}</h6>
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


const fetchThresholdsProfilesVersions = async (name) => {
  const backend = new Backend();

  return await backend.fetchData(`/api/v2/internal/tenantversion/thresholdsprofile/${name}`);
}


export const ThresholdsProfileVersionCompare = (props) => {
  const version1 = props.match.params.id1;
  const version2 = props.match.params.id2;
  const name = props.match.params.name;

  const { data: versions, error: error, status: status } = useQuery(
    ['thresholdsprofile', 'version', name], () => fetchThresholdsProfilesVersions(name)
  )

  if (status === 'loading')
    return (<LoadingAnim/>);

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (versions) {
    var profile1 = undefined;
    var profile2 = undefined;

    versions.forEach(e => {
      if (e.version == version1)
        profile1 = e.fields;

      else if (e.version == version2)
        profile2 = e.fields;
    })

    if (profile1 && profile2)
      return (
        <React.Fragment>
          <div className='d-flex align-items-center justify-content-between'>
            <h2 className='ms-3 mt-1 mb-4'>{`Compare ${name} versions`}</h2>
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

  const { data: versions, error: error, status: status } = useQuery(
    ['thresholdsprofile', 'version', name], () => fetchThresholdsProfilesVersions(name)
  )

  if (status === 'loading')
    return (<LoadingAnim/>);

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (versions) {
    var profile = undefined;

    versions.forEach((e) => {
      if (e.version == version)
        profile = {
          name: e.fields.name,
          groupname: e.fields.groupname,
          rules: thresholdsToValues(e.fields.rules),
          date_created: e.date_created
        }
    })

    if (profile)
      return (
        <ThresholdsProfilesChangeContext.Provider value={{
          readonly: true,
          historyview: true
        }}>
          <ThresholdsProfilesForm
            initialValues={{
              name: profile.name,
              groupname: profile.groupname,
              rules: profile.rules,
              date_created: profile.date_created
            }}
            { ...props }
          />
        </ThresholdsProfilesChangeContext.Provider>
      )
    } else
      return null;
};
