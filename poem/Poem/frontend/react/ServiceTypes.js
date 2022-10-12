import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WebApi } from './DataManager';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import {
  Button,
  Col,
  Form,
  FormFeedback,
  Input,
  InputGroup,
  Label,
  Row,
  Table,
  PaginationItem,
  PaginationLink,
  Pagination,
} from 'reactstrap';
import {
  BaseArgoTable,
  BaseArgoView,
  DefaultColumnFilter,
  ErrorComponent,
  Icon,
  LoadingAnim,
  ModalAreYouSure,
  NotifyError,
  NotifyOk,
  ParagraphTitle,
  SearchField,
} from './UIElements';
import {
  fetchUserDetails,
} from './QueryFunctions';
import {
  faSave,
  faSearch,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import { ErrorMessage } from '@hookform/error-message';
import * as yup from "yup";
import _ from "lodash";


const validationSchema = yup.object().shape({
  name: yup.string().matches(/^[A-Za-z0-9\\.\-_]+$/g, {message: 'Name can only contain alphanumeric characters, punctuations, underscores and minuses', excludeEmptyString: false}),
  description: yup.string().required('Description can not be empty.')
}).required();


const ServiceTypesListAdded = ({data, setCallback, webapi, userDetails,
  serviceTypesDescriptions, ...modal}) => {
  const { control, setValue, getValues, reset } = useForm({
    defaultValues: {
      serviceTypes: data,
    }
  })

  const queryClient = useQueryClient();
  const webapiAddMutation = useMutation(async (values) => await webapi.addServiceTypes(values));

  const { fields, remove } = useFieldArray({
    control,
    name: "serviceTypes"
  })

  useEffect(() => {
    setValue("serviceTypes", data)
  }, [data])

  const {setModalMsg, setModalTitle,
    setModalFunc, setAreYouSureModal,
    areYouSureModal} = modal

  const resetFields = () => {
    reset({
      serviceTypes: Array()
    })
  }

  const postServiceTypesWebApi = (data, action, title) => {
    webapiAddMutation.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries('servicetypes');
        queryClient.invalidateQueries('public_servicetypes');
        NotifyOk({
          msg: 'Service types successfully ' + action,
          title: title,
          callback: () => resetFields()
        });
      },
      onError: (error) => {
        NotifyError({
          title: 'Web API error',
          msg: error.message ? error.message : 'Web API error adding service types'
        })
      }
    })
  }

  const doSave = () => {
    let tmpArray = [...getValues('serviceTypes'), ...serviceTypesDescriptions]
    let pairs = _.orderBy(tmpArray, ['name'], ['asc'])
    postServiceTypesWebApi([...pairs.map(
      e => Object(
        {
          'name': e.name, 'description': e.description
        }
      ))],
      'added', 'Add')
  }

  const onSubmit = (event) => {
    event.preventDefault()
    setModalMsg(`Are you sure you want to add ${data.length} Service types?`)
    setModalTitle('Add service types')
    setModalFunc(() => doSave)
    setAreYouSureModal(!areYouSureModal);
  }

  if (userDetails?.is_superuser && serviceTypesDescriptions) {
    return (
      <div id="argo-contentwrap" className="ms-2 mb-2 mt-2 p-3 border rounded">
        <ParagraphTitle title='Service types prepared for submission'/>
        <Table bordered responsive hover size="sm">
          <thead className="table-active table-bordered align-middle text-center">
            <tr>
              <th style={{'width': '54px'}}>
                #
              </th>
              <th>
                Name of service
              </th>
              <th>
                Description of service
              </th>
              <th style={{'width': '62px'}}>
                Action
              </th>
            </tr>
          </thead>
          {
            fields.length === 0 ?
              <tbody>
                <tr key="0" data-testid="rows-add-serviceTypes.0">
                  <td colSpan="4" className="table-light text-muted text-center p-3 fs-3">
                    Empty data
                  </td>
                </tr>
              </tbody>
            :
              <tbody>
                {
                  fields.map((entry, index) =>
                    <tr key={entry.id} data-testid={`rows-add-serviceTypes.${index}`}>
                      <td className="align-middle text-center">
                        {index + 1}
                      </td>
                      <td className="align-middle text-left fw-bold">
                        <span className="ms-2">{ entry.name }</span>
                      </td>
                      <td>
                        <Controller
                          name={`serviceTypes.${index}.description`}
                          control={control}
                          render={ ({field}) =>
                            <textarea
                              {...field}
                              rows="2"
                              className="form-control"
                            />
                          }
                        />
                      </td>
                      <td className="text-center align-middle">
                        <Button size="sm" className="fw-bold" color="danger" onClick={() => {
                          let tmp = [...fields]
                          tmp = tmp.filter((e, i) => i !== index)
                          setCallback(tmp)
                          remove(index)
                        }}>
                          <FontAwesomeIcon icon={faTimes}/>
                        </Button>
                      </td>
                    </tr>)
                }
              </tbody>
          }
        </Table>
        {
          fields.length > 0 ?
            <div className="submit-row d-flex justify-content-end bg-light p-3">
              <Button color="success" type="submit" onClick={(e) => onSubmit(e)}>
                Save
              </Button>
            </div>
          :
            ''
        }
      </div>
    )
  }
  else
    return null
}


export const ServiceTypesBulkAdd = (props) => {
  const [addedServices, setAddedServices] = useState([])

  const webapi = new WebApi({
    token: props.webapitoken,
    serviceTypes: props.webapiservicetypes
  })

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true)
  );

  const { data: serviceTypesDescriptions, errorServiceTypesDescriptions, isLoading: loadingServiceTypesDescriptions} = useQuery(
    'servicetypes', async () => {
      return await webapi.fetchServiceTypes();
    },
    { enabled: !!userDetails }
  )

  const { control, handleSubmit, reset, formState: {errors} } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {
      name: '',
      description: '',
    }
  })

  const [areYouSureModal, setAreYouSureModal] = React.useState(false)
  const [modalTitle, setModalTitle] = React.useState('')
  const [modalMsg, setModalMsg] = React.useState('')
  const [modalFunc, setModalFunc] = React.useState(undefined)
  const [modalCallbackArg, setModalCallbackArg] = React.useState(undefined)

  const onSubmit = data => {
    let tmpArray = [...addedServices]
    tmpArray.push(data)
    setAddedServices(tmpArray)
    reset({
      name: '',
      description: ''
    })
  }

  function toggleModal() {
    setAreYouSureModal(!areYouSureModal)
  }

  if (loadingUserDetails || loadingServiceTypesDescriptions)
    return (<LoadingAnim/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (errorServiceTypesDescriptions)
    return (<ErrorComponent error={errorServiceTypesDescriptions}/>);

  if (userDetails?.is_superuser && serviceTypesDescriptions) {
    return (
      <>
        <ModalAreYouSure
          isOpen={areYouSureModal}
          toggle={toggleModal}
          title={modalTitle}
          msg={modalMsg}
          onYes={modalFunc}
          callbackOnYesArg={modalCallbackArg}
        />
        <div className="d-flex align-items-center justify-content-between">
          <h2 className="ms-3 mt-1 mb-4">Add service types</h2>
        </div>
        <div id="argo-contentwrap" className="ms-2 mb-2 mt-2 p-3 border rounded">
          <Form onSubmit={handleSubmit(onSubmit)} className="needs-validation">
            <Row>
              <Col sm={{size: 4}}>
                <Label className="fw-bold" for="name">
                  Name:
                </Label>
                <InputGroup>
                  <Controller
                    name="name"
                    control={control}
                    render={ ({field}) =>
                      <Input
                        data-testid="input-name"
                        {...field}
                        className={`form-control ${errors && errors.name ? "is-invalid" : ""}`}
                      />
                    }
                  />
                  <ErrorMessage
                    errors={errors}
                    name="name"
                    render={({ message }) =>
                      <FormFeedback invalid="true" className="end-0">
                        { message }
                      </FormFeedback>
                    }
                  />
                </InputGroup>
              </Col>
              <Col sm={{size: 7}}>
                <Label className="fw-bold" for="description">
                  Description:
                </Label>
                <InputGroup>
                  <Controller
                    name="description"
                    control={control}
                    render={ ({field}) =>
                      <textarea
                        {...field}
                        rows="3"
                        data-testid="input-description"
                        className={`form-control ${errors && errors.description ? "is-invalid" : ""}`}
                      />
                    }
                  />
                  <ErrorMessage
                    errors={errors}
                    name="description"
                    render={({ message }) =>
                      <FormFeedback invalid="true" className="end-0">
                        { message }
                      </FormFeedback>
                    }
                  />
                </InputGroup>
              </Col>
              <Col sm={{size: 1}} className="text-center">
                <Button className="mt-3" color="success" type="submit">
                  Add new
                </Button>
              </Col>
            </Row>
          </Form>
        </div>
        <ServiceTypesListAdded data={addedServices} setCallback={setAddedServices} webapi={webapi}
          userDetails={userDetails} serviceTypesDescriptions={serviceTypesDescriptions}
          areYouSureModal={areYouSureModal} setAreYouSureModal={setAreYouSureModal}
          setModalMsg={setModalMsg} setModalCallbackArg={setModalCallbackArg}
          setModalFunc={setModalFunc} setModalTitle={setModalTitle}/>
      </>
    )
  }
  else
    return null
}


const ServiceTypesBulkDeleteChange = ({data, webapi}) => {
  const dataWithChecked = data.map(e => {
    return {
      ...e,
      checked: false
    }
  })

  const [areYouSureModal, setAreYouSureModal] = React.useState(false)
  const [modalTitle, setModalTitle] = React.useState('')
  const [modalMsg, setModalMsg] = React.useState('')
  const [modalFunc, setModalFunc] = React.useState(undefined)

  const [pageSize, setPageSize] = useState(30)
  const [pageIndex, setPageIndex] = useState(0)
  const [pageCount, setStatePageCount] = useState(undefined)

  const queryClient = useQueryClient();
  const webapiAddMutation = useMutation(async (values) => await webapi.addServiceTypes(values));

  function toggleModal() {
    setAreYouSureModal(!areYouSureModal)
  }

  const { control, setValue, getValues, handleSubmit, formState: {errors} } = useForm({
    defaultValues: {
      serviceTypes: dataWithChecked,
      searchService: '',
      searchDesc: '',
    }
  })

  function longestName(data) {
    let tmpArray = new Array()
    data.forEach(entry => tmpArray.push(entry.name.length))
    return Math.max(...tmpArray)
  }
  let maxNamePx = longestName(data) * 8 + 10


  const searchService = useWatch({control, name: "searchService"})
  const searchDesc = useWatch({control, name: "searchDesc"})

  const { fields, update, replace } = useFieldArray({
    control,
    name: "serviceTypes"
  })

  function initChangedDesc() {
    return _.fromPairs(fields.map((e) => [e.id, false]))
  }
  const [lookupChanged, setLookupChanged] = React.useState(initChangedDesc())

  const postServiceTypesWebApi = (data, action, title) => {
    webapiAddMutation.mutate(data, {
      onSuccess: () => {
        queryClient.invalidateQueries('servicetypes');
        queryClient.invalidateQueries('public_servicetypes');
        NotifyOk({
          msg: 'Service types successfully ' + action,
          title: title,
          callback: null
        });
      },
      onError: (error) => {
        NotifyError({
          title: 'Web API error',
          msg: error.message ? error.message : 'Web API error adding service types'
        })
      }
    })
  }

  const doSave = () => {
    let values = getValues('serviceTypes')
    replace(values)
    postServiceTypesWebApi([...values.map(
      e => Object(
        {
          'name': e.name, 'description': e.description
        }
      ))],
      'changed', 'Change')
    setLookupChanged(initChangedDesc())
  }

  const onSave = () => {
    setModalMsg(`Are you sure you want to change Service type?`)
    setModalTitle('Change service type')
    setModalFunc(() => doSave)
    setAreYouSureModal(!areYouSureModal);
  }

  const onChange = (event, entryid) => {
    let value = event.target.checked ? true : false
    let values = getValues('serviceTypes')
    let index = fields.findIndex(field => field.id === entryid)
    setValue(`serviceTypes.${index}.checked`, value)
    update(index, {
      name: values[index].name,
      description: values[index].description,
      checked: value
    })
  }

  const doDelete = () => {
    let cleaned = fields.filter(e => !e.checked)
    setValue("serviceTypes", cleaned)
    postServiceTypesWebApi([...cleaned.map(
      e => Object(
        {
          'name': e.name, 'description': e.description
        }
      ))],
      'deleted', 'Delete')
  }

  const onDelete = () => {
    let cleaned = fields.filter(e => !e.checked)

    setModalMsg(`Are you sure you want to delete ${fields.length - cleaned.length} Service types?`)
    setModalTitle('Delete service types')
    setModalFunc(() => doDelete)
    setAreYouSureModal(!areYouSureModal);
  }

  let lookupIndexes = _.fromPairs(fields.map((e, index) => [e.id, index]))

  let fieldsView = fields

  if (searchService && searchDesc) {
    fieldsView = fields.filter(e => e.name.toLowerCase().includes(searchService.toLowerCase()))
    fieldsView = fieldsView.filter(e => e.description.toLowerCase().includes(searchDesc.toLowerCase()))
  }

  else if (searchDesc)
    fieldsView = fields.filter(e => e.description.toLowerCase().includes(searchDesc.toLowerCase()))

  else if (searchService)
    fieldsView = fields.filter(e => e.name.toLowerCase().includes(searchService.toLowerCase()))

  const onDescriptionChange = (entryid, isChanged) => {
    let tmp = JSON.parse(JSON.stringify(lookupChanged))
    if (tmp[entryid] !== isChanged) {
      tmp[entryid] = isChanged
      setLookupChanged(tmp)
    }
  }

  return (
    <>
      <ModalAreYouSure
        isOpen={areYouSureModal}
        toggle={toggleModal}
        title={modalTitle}
        msg={modalMsg}
        onYes={modalFunc}
      />
      <div className="d-flex align-items-center justify-content-between">
        <h2 className="ms-3 mt-1 mb-4">Service types</h2>
        <span>
          <Button
            color="danger"
            disabled={![...fields.map(e => e.checked)].includes(true)}
            onClick={() => onDelete()}
            className="me-3">
            Delete selected
          </Button>
          <Button
            color="success"
            disabled={!_.valuesIn(lookupChanged).includes(true)}
            onClick={() => onSave()}
            className="me-3">
            Save
          </Button>
          <Link className="btn btn-secondary" to="/ui/servicetypes/add" role="button">Add</Link>
        </span>
      </div>
      <div id="argo-contentwrap" className="ms-2 mb-2 mt-2 p-3 border rounded">
        <Form onSubmit={handleSubmit((data) => {})} className="needs-validation">
          <Row>
            <Col>
              <Table bordered responsive hover size="sm">
                <thead className="table-active table-bordered align-middle text-center">
                  <tr>
                    <th style={{'width': '54px'}}>
                      #
                    </th>
                    <th>
                      Name of service
                    </th>
                    <th>
                      Description of service
                    </th>
                    <th style={{'width': '60px'}}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#ECECEC' }}>
                    <td className="align-middle text-center">
                      <FontAwesomeIcon icon={faSearch}/>
                    </td>
                    <td className="align-middle text-center" style={{'width': `${maxNamePx}px`}}>
                      <Controller
                        name="searchService"
                        control={control}
                        render={ ({field}) =>
                          <SearchField
                            field={field}
                            forwardedRef={field.ref}
                            className='form-control'
                          />
                        }
                      />
                    </td>
                    <td className="align-middle text-center">
                      <Controller
                        name="searchDesc"
                        control={control}
                        render={ ({field}) =>
                          <SearchField
                            field={field}
                            forwardedRef={field.ref}
                            className='form-control'
                          />
                        }
                      />
                    </td>
                    <td className="align-middle text-center">
                    </td>
                  </tr>
                  {
                    fieldsView.map((entry, index) =>
                      <tr key={entry.id} data-testid={`rows-serviceTypes.${index}`}>
                        <td className="align-middle text-center">
                          {index + 1}
                        </td>
                        <td className="align-middle text-left fw-bold">
                          <span className="ms-2">{ entry.name }</span>
                        </td>
                        <td>
                          <Controller
                            name={`serviceTypes.${lookupIndexes[entry.id]}.description`}
                            control={control}
                            render={ ({field}) => {
                              let formval = getValues('serviceTypes')[lookupIndexes[entry.id]].description
                              let initval = fields[lookupIndexes[entry.id]].description
                              let isChanged = formval !== initval

                              return (
                                <textarea
                                  {...field}
                                  onChange={(e) => {onDescriptionChange(entry.id, isChanged) ; field.onChange(e)}}
                                  onBlur={(e) => {onDescriptionChange(entry.id, isChanged); field.onBlur(e)}}
                                  rows="2"
                                  className={`${isChanged ? 'border border-danger form-control' : 'form-control'}`}
                                />
                              )
                            }}
                          />
                        </td>
                        <td className="text-center align-middle">
                          <Button color="light" className="ms-1">
                            <Controller
                              name={`serviceTypes.${lookupIndexes[entry.id]}.checked`}
                              control={control}
                              render={ ({field}) => {
                                // with checked=true,false ServiceTypes.test.js fails
                                return (
                                  entry.checked ?
                                    <Input {...field} type="checkbox" className="fw-bold" checked={entry.checked} onChange={(e) => onChange(e, entry.id)}/>
                                  :
                                    <Input {...field} type="checkbox" className="fw-bold" onChange={(e) => onChange(e, entry.id)}/>
                                )
                              }}
                            />
                          </Button>
                        </td>
                      </tr>
                    )
                  }
                </tbody>
              </Table>
            </Col>
          </Row>
          <Row>
            <Col className="d-flex justify-content-center align-self-center">
              <Pagination className="mt-2">
                <PaginationItem disabled={true}>
                  <PaginationLink aria-label="First" first onClick={() => {}}/>
                </PaginationItem>
                <PaginationItem disabled={true}>
                  <PaginationLink aria-label="Previous" previous onClick={() => {}}/>
                </PaginationItem>
                {
                  [...Array([])].map((e, i) =>
                    <PaginationItem active={true} key={i}>
                      <PaginationLink onClick={() => {}}>
                        0
                      </PaginationLink>
                    </PaginationItem>
                  )
                }
                <PaginationItem disabled={false}>
                  <PaginationLink aria-label="Next" next onClick={() => {}}/>
                </PaginationItem>
                <PaginationItem disabled={true}>
                  <PaginationLink aria-label="Last" last onClick={() => {}}/>
                </PaginationItem>
                <PaginationItem>
                  <select
                    style={{width: '180px'}}
                    className="form-control custom-select text-primary"
                    aria-label="Number of service types"
                    value={0}
                    onChange={e => {
                      setPageSize(Number(e.target.value))
                      setStatePageCount(fields, e.target.value)
                      setPageIndex(0)
                      setValue('serviceTypes', fields.slice(0, Number(e.target.value)))
                      console.log('VRDEL DEBUG', fields.slice(0, Number(e.target.value)))
                    }}
                  >
                    {[30, 50, 100, fields.length].map(pageSize => (
                      <option label={`${pageSize} service types`} key={pageSize} value={pageSize}>
                        {pageSize} service types
                      </option>
                    ))}
                  </select>
                </PaginationItem>
              </Pagination>
            </Col>
          </Row>
        </Form>
      </div>
    </>
  )
}


export const ServiceTypesListPublic = (props) => {
  const webapi = new WebApi({
    token: props.webapitoken,
    serviceTypes: props.webapiservicetypes
  })

  const { data: serviceTypesDescriptions, errorServiceTypesDescriptions, isLoading: loadingServiceTypesDescriptions} = useQuery(
    'public_servicetypes', async () => {
      return await webapi.fetchServiceTypes();
    },
  )

  const columns = React.useMemo(
    () => [
      {
        Header: '#',
        accessor: null,
        column_width: '2%'
      },
      {
        Header: <div><Icon i="servicetypes"/> Service type</div>,
        accessor: 'name',
        column_width: '25%',
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Description',
        accessor: 'description',
        column_width: '73%',
        Filter: DefaultColumnFilter
      }
    ], []
  )

  if (loadingServiceTypesDescriptions)
    return (<LoadingAnim/>);

  else if (errorServiceTypesDescriptions)
    return (<ErrorComponent error={errorServiceTypesDescriptions}/>);

  else if (serviceTypesDescriptions) {
    return (
      <BaseArgoView
        resourcename='Services types'
        infoview={true}>
        <BaseArgoTable
          columns={columns}
          data={serviceTypesDescriptions}
          filter={true}
          resourcename='service types'
          page_size={15}
        />
      </BaseArgoView>
    )
  }
  else
    return null
}


export const ServiceTypesList = (props) => {
  const webapi = new WebApi({
    token: props.webapitoken,
    serviceTypes: props.webapiservicetypes
  })

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true),
  );

  const { data: serviceTypesDescriptions, errorServiceTypesDescriptions, isLoading: loadingServiceTypesDescriptions} = useQuery(
    'servicetypes', async () => {
      return await webapi.fetchServiceTypes();
    },
    { enabled: !!userDetails }
  )

  const columns = React.useMemo(
    () => [
      {
        Header: '#',
        accessor: null,
        column_width: '2%'
      },
      {
        Header: <div><Icon i="servicetypes"/> Service type</div>,
        accessor: 'name',
        column_width: '25%',
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Description',
        accessor: 'description',
        column_width: '73%',
        Filter: DefaultColumnFilter
      }
    ], []
  )

  if (loadingUserDetails || loadingServiceTypesDescriptions)
    return (<LoadingAnim/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (errorServiceTypesDescriptions)
    return (<ErrorComponent error={errorServiceTypesDescriptions}/>);

  else if (serviceTypesDescriptions && !userDetails?.is_superuser) {
    return (
      <BaseArgoView
        resourcename='Services types'
        infoview={true}>
        <BaseArgoTable
          columns={columns}
          data={serviceTypesDescriptions}
          filter={true}
          resourcename='service types'
          page_size={15}
        />
      </BaseArgoView>
    )
  }
  else if (serviceTypesDescriptions &&  userDetails?.is_superuser)
    return (
      <ServiceTypesBulkDeleteChange data={serviceTypesDescriptions} webapi={webapi} {...props}/>
    )
  else
    return null
}
