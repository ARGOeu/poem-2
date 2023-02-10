import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WebApi } from './DataManager';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import {
  Button,
  Badge,
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
  faSearch,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import { yupResolver } from '@hookform/resolvers/yup';
import { ErrorMessage } from '@hookform/error-message';
import * as yup from "yup";
import _ from "lodash";


class TablePaginationHelper {
  searchLen = 0
  startIndex = 0

  constructor(fullLen, pageSize, pageIndex) {
    this.fullLen = fullLen
    this.pageNumArray = Array()
    this.pageSize = pageSize
    this.pagesIndex = pageIndex
    this.buildChoices()
    this.buildSlices()
  }

  buildChoices() {
    if (this.fullLen <= 30)
      this.pageNumArray = [30]
    else if (this.fullLen > 30 && this.fullLen <= 50)
      this.pageNumArray = [30, 50]
    else if (this.fullLen > 50 && this.fullLen <= 100)
      this.pageNumArray = [30, 50, 100]
    else if (this.fullLen > 100)
      this.pageNumArray = [30, 50, 100, this.fullLen]

    return this.pageNumArray
  }

  constructSlicesArrays(num, len) {
    let slices = Array()
    let times = Math.trunc(len / num)
    let start = 0
    let end = 0
    for (var i = 0; i < times; i++) {
      start = i * num
      end = start + num
      slices.push([start, end])
    }
    if (end)
      slices.push([end, len])
    return slices
  }

  buildSlices() {
    let pagesAndIndexes = Object()
    let len = this.fullLen

    if (this.searched)
      len = this.searchLen

    if (len <= 30)
      pagesAndIndexes['30'] = [[0, len]]
    else if (len > 30 && len <= 50) {
      pagesAndIndexes['30'] = this.constructSlicesArrays(30, len)
      pagesAndIndexes['50'] = this.constructSlicesArrays(50, len)
    }
    else if (len > 50 && len <= 100) {
      pagesAndIndexes['30'] = this.constructSlicesArrays(30, len)
      pagesAndIndexes['50'] = this.constructSlicesArrays(50, len)
      pagesAndIndexes['100'] = this.constructSlicesArrays(100, len)
    }
    else if (len > 100)
      pagesAndIndexes['30'] = this.constructSlicesArrays(30, len)
      pagesAndIndexes['50'] = this.constructSlicesArrays(50, len)
      pagesAndIndexes['100'] = this.constructSlicesArrays(100, len)

    pagesAndIndexes[len] = [[0, len]]

    this.pagesIndexes = pagesAndIndexes
  }

  calcEndIndex() {
    return this.pageSize + this.startIndex
  }

  set pagesIndexes(slices) {
    this.pagesAndIndexes = slices
  }

  set searchNum(i) {
    this.searchLen = i
  }

  set isSearched(b) {
    this.searched = b
    if (this.searched)
      this.buildSlices()
  }

  get choices() {
    return this.buildChoices()
  }

  get end() {
    let arraySlices = this.pagesAndIndexes[this.pageSize]
    let targetSlice = arraySlices[this.pagesIndex]
    if (targetSlice)
      return targetSlice[1]
    else
      return this.fullLen
  }

  get pageCount() {
    let pages = 1
    let endIndex = this.calcEndIndex()

    if (endIndex >= this.fullLen)
      endIndex = this.fullLen

    if (endIndex - this.startIndex === this.fullLen)
      return pages
    else if (this.searched && this.searchLen <= this.pageSize)
      return pages
    else if (this.searched && this.searchLen > this.pageSize)
      return Math.trunc(this.searchLen / this.pageSize) + 1
    else
      return Math.trunc(this.fullLen / this.pageSize) + 1
  }

  get start() {
    let arraySlices = this.pagesAndIndexes[this.pageSize]
    let targetSlice = arraySlices[this.pagesIndex]
    if (targetSlice)
      return targetSlice[0]
    else
      return 0
  }
}


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
      onSuccess: (retdata) => {
        queryClient.setQueryData(['servicetypes', 'webapi'], retdata);
        queryClient.setQueryData(['public_servicetypes', 'webapi'], retdata);
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
    let pairs = _.orderBy(tmpArray, [service => service.name.toLowerCase()], ['asc'])
    postServiceTypesWebApi([...pairs.map(
      e => Object(
        {
          'name': e.name, 'description': e.description, 'tags': e.tags
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
      tags: ['poem']
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
      description: '',
      tags: ['poem']
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
  let columnNameWidth = longestName(data) * 8 + 10
  columnNameWidth = Math.max(220, columnNameWidth)
  columnNameWidth = Math.min(360, columnNameWidth)

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

  function postServiceTypesWebApi(data, action, title) {
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

  function doSave() {
    let values = getValues('serviceTypes')
    replace(values)
    postServiceTypesWebApi([...values.map(
      e => Object(
        {
          'name': e.name, 'description': e.description, 'tags': e.tags
        }
      ))],
      'changed', 'Change')
    setLookupChanged(initChangedDesc())
  }

  function onSave() {
    setModalMsg(`Are you sure you want to change Service type?`)
    setModalTitle('Change service type')
    setModalFunc(() => doSave)
    setAreYouSureModal(!areYouSureModal);
  }

  function onChange(event, entryid) {
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

  function doDelete() {
    let cleaned = fields.filter(e => !e.checked)
    setValue("serviceTypes", cleaned)
    postServiceTypesWebApi([...cleaned.map(
      e => Object(
        {
          'name': e.name, 'description': e.description, 'tags': e.tags
        }
      ))],
      'deleted', 'Delete')
  }

  function onDelete() {
    let cleaned = fields.filter(e => !e.checked)

    setModalMsg(`Are you sure you want to delete ${fields.length - cleaned.length} Service types?`)
    setModalTitle('Delete service types')
    setModalFunc(() => doDelete)
    setAreYouSureModal(!areYouSureModal);
  }

  function onDescriptionChange (entryid, isChanged) {
    let tmp = JSON.parse(JSON.stringify(lookupChanged))
    if (tmp[entryid] !== isChanged) {
      tmp[entryid] = isChanged
      setLookupChanged(tmp)
    }
  }

  let lookupIndexes = _.fromPairs(fields.map((e, index) => [e.id, index]))

  let fieldsView = fields
  let paginationHelp = new TablePaginationHelper(fieldsView.length, pageSize, pageIndex)

  if (searchService && searchDesc) {
    fieldsView = fields.filter(e => e.name.toLowerCase().includes(searchService.toLowerCase()))
    fieldsView = fieldsView.filter(e => e.description.toLowerCase().includes(searchDesc.toLowerCase()))
  }
  else if (searchDesc)
    fieldsView = fields.filter(e => e.description.toLowerCase().includes(searchDesc.toLowerCase()))
  else if (searchService)
    fieldsView = fields.filter(e => e.name.toLowerCase().includes(searchService.toLowerCase()))

  paginationHelp.searchNum = fieldsView.length
  paginationHelp.isSearched = searchService || searchDesc ? true : false

  fieldsView = fieldsView.slice(paginationHelp.start, paginationHelp.end)

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
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#ECECEC' }}>
                    <td className="align-middle text-center">
                      <FontAwesomeIcon icon={faSearch}/>
                    </td>
                    <td className="align-middle text-center" style={{'width': `${columnNameWidth}px`}}>
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
                          { lookupIndexes[entry.id] + 1 }
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
                              let isDisabled = undefined
                              if (entry.tags && entry.tags.indexOf('topology') !== -1)
                                isDisabled = true
                              else
                                isDisabled = false

                              return (
                                <textarea
                                  {...field}
                                  onChange={(e) => {onDescriptionChange(entry.id, isChanged) ; field.onChange(e)}}
                                  onBlur={(e) => {onDescriptionChange(entry.id, isChanged); field.onBlur(e)}}
                                  disabled={isDisabled}
                                  rows="2"
                                  className={`${isChanged ? 'border border-danger form-control' : 'form-control'}`}
                                />
                              )
                            }}
                          />
                        </td>
                        <td className="text-center align-middle">
                          <Controller
                            name={`serviceTypes.${lookupIndexes[entry.id]}.checked`}
                            control={control}
                            render={ ({field}) => {
                              // with checked=true,false ServiceTypes.test.js fails
                              let isDisabled = undefined
                              if (entry.tags && entry.tags.indexOf('topology') !== -1)
                                isDisabled = true
                              else
                                isDisabled = false

                              return(
                                isDisabled ?
                                  <Badge color="secondary">
                                    topology
                                  </Badge>
                                :
                                  entry.checked ?
                                    <div className="d-flex flex-column align-self-center align-items-center">
                                      <Badge color="success">
                                        poem
                                      </Badge>
                                      <Input {...field}
                                        type="checkbox"
                                        className="mt-2 fw-bold"
                                        disabled={isDisabled}
                                        checked={entry.checked}
                                        onChange={(e) => onChange(e, entry.id)}
                                      />
                                    </div>
                                  :
                                    <div className="d-flex flex-column align-self-center align-items-center">
                                      <Badge color="success">
                                        poem
                                      </Badge>
                                      <Input {...field}
                                        type="checkbox"
                                        disabled={isDisabled}
                                        className="mt-2 fw-bold"
                                        onChange={(e) => onChange(e, entry.id)}
                                      />
                                    </div>
                              )
                            }}
                          />
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
                <PaginationItem disabled={pageIndex === 0}>
                  <PaginationLink aria-label="First" first onClick={() => setPageIndex(0)}/>
                </PaginationItem>
                <PaginationItem disabled={pageIndex === 0}>
                  <PaginationLink aria-label="Previous" previous onClick={() => setPageIndex(pageIndex - 1)}/>
                </PaginationItem>
                {
                  [...Array(paginationHelp.pageCount)].map((e, i) =>
                    <PaginationItem active={pageIndex === i ? true : false} key={i}>
                      <PaginationLink onClick={() => setPageIndex(i)}>
                        { i + 1 }
                      </PaginationLink>
                    </PaginationItem>
                  )
                }
                <PaginationItem disabled={pageIndex === paginationHelp.pageCount - 1}>
                  <PaginationLink aria-label="Next" next onClick={() => setPageIndex(pageIndex + 1)}/>
                </PaginationItem>
                <PaginationItem disabled={pageIndex === paginationHelp.pageCount- 1}>
                  <PaginationLink aria-label="Last" last onClick={() => setPageIndex(paginationHelp.pageCount - 1)}/>
                </PaginationItem>
                <PaginationItem>
                  <select
                    style={{width: '180px'}}
                    className="ms-1 form-control form-select text-primary"
                    aria-label="Number of service types"
                    value={pageSize}
                    onChange={e => {
                      setPageSize(Number(e.target.value))
                      setPageIndex(Math.trunc(paginationHelp.start / e.target.value))
                    }}
                  >
                    {paginationHelp.choices.map(pageSize => (
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


export const ServiceTypesList = (props) => {
  const showtitles = props.showtitles
  const publicView = props.publicView

  const webapi = new WebApi({
    token: props.webapitoken,
    serviceTypes: props.webapiservicetypes
  })

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true),
  );

  const { data: serviceTypesDescriptions, errorServiceTypesDescriptions, isLoading: loadingServiceTypesDescriptions} = useQuery(
    [`${publicView ? "public_" : ""}servicetypes`, 'webapi'], async () => {
      return await webapi.fetchServiceTypes();
    },
    { enabled: publicView || !!userDetails }
  )

  const memoized_columns = React.useMemo(() => {
    let columns = [
      {
        Header: '#',
        accessor: null,
        column_width: '2%'
      },
      {
        Header: <div><Icon i="servicetypes"/>Service type</div>,
        accessor: 'name',
        column_width: `${showtitles ? "20%" : "25%"}`,
        Cell: ({value}) => <span className="fw-bold">{value}</span>,
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Description',
        accessor: 'description',
        column_width: `${showtitles ? "50%" : "70%"}`,
        Filter: DefaultColumnFilter
      },
      {
        Header: 'Source',
        id: 'tags',
        accessor: e =>
          <Badge color={`${e.tags[0] === 'poem' ? 'success' : 'secondary'}`}>
            {e.tags[0]}
          </Badge>,
        column_width: '3%',
        Filter: ''
      }
    ]

    if (showtitles) {
      columns.splice(2, 0, {
        Header: "Title",
        accessor: "title",
        column_width: "25%",
        Filter: DefaultColumnFilter
      })
    }
    return columns
  }, [showtitles])

  if (loadingUserDetails || loadingServiceTypesDescriptions)
    return (<LoadingAnim/>);

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (errorServiceTypesDescriptions)
    return (<ErrorComponent error={errorServiceTypesDescriptions}/>);

  else if (serviceTypesDescriptions && (!userDetails?.is_superuser || publicView)) {
    return (
      <BaseArgoView
        resourcename='Service types'
        infoview={true}>
        <BaseArgoTable
          columns={memoized_columns}
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
