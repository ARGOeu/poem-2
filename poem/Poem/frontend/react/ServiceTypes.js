import React, { useState, useEffect, useContext } from 'react';
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
  ButtonDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';
import {
  BaseArgoTable,
  BaseArgoView,
  DefaultColumnFilter,
  ErrorComponent,
  Icon,
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
import PapaParse from 'papaparse';
import { downloadCSV } from './FileDownload';
import { 
  ChangeViewPlaceholder,
  InputPlaceholder, 
  ListViewPlaceholder,
  TextAreaPlaceholder
} from './Placeholders';

const BulkAddContext = React.createContext()


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
  name: yup.string()
    .matches(/^[A-Za-z0-9\\.\-_]+$/g, {message: 'Name can only contain alphanumeric characters, punctuations, underscores and minuses', excludeEmptyString: false})
    .test("duplicate", "Service type with this name already exists", function (value) {
      let arr = this.options.context.serviceTypes.map(stype => stype.name)
      if (arr.indexOf(value) === -1)
        return true

      else
        return false
    })
    .test("duplicates", "Service type with this name already added", function (value) {
      let arr = this.options.context.addedServices.map(service => service.name)
      if (arr.indexOf(value) === -1)
        return true

      else
        return false
    }),
  title: yup.string().when("$showtitles", (showtitles, schema) => {
    if (showtitles)
      return schema.required("Title cannot be empty.")
        .test("duplicate", "Service type with this title already exists", function (value) {
          let arr = this.options.context.serviceTypes.map(service => service.title)
          if (arr.indexOf(value) === -1)
            return true

          else
            return false
        })
        .test("dupllicates", "Service type with this title already added", function (value) {
          let arr = this.options.context.addedServices.map(service => service.title)
          if (arr.indexOf(value) === -1)
            return true

          else
            return false
        })

    return
  }),
  description: yup.string().required('Description cannot be empty.')
}).required();


const ServiceTypesListAdded = ({ data, ...props }) => {
  const context = useContext(BulkAddContext)
  const showtitles = props.showtitles

  const { control, setValue, getValues, reset } = useForm({
    defaultValues: {
      serviceTypes: data,
    }
  })

  const queryClient = useQueryClient();
  const webapiAddMutation = useMutation(async (values) => await context.webapi.addServiceTypes(values));

  const [areYouSureModal, setAreYouSureModal] = React.useState(false)
  const [modalTitle, setModalTitle] = React.useState('')
  const [modalMsg, setModalMsg] = React.useState('')
  const [modalFunc, setModalFunc] = React.useState(undefined)

  function toggleModal() {
    setAreYouSureModal(!areYouSureModal)
  }

  const { fields, remove } = useFieldArray({
    control,
    name: "serviceTypes"
  })

  useEffect(() => {
    setValue("serviceTypes", data)
  }, [data])

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
    let tmpArray = [...getValues('serviceTypes'), ...context.serviceTypes]
    let pairs = _.orderBy(tmpArray, [service => service.name.toLowerCase()], ['asc'])
    postServiceTypesWebApi([...pairs.map(
      e => Object(
        {
          'name': e.name, 'title': e.title, 'description': e.description, 'tags': e.tags
        }
      ))],
      'added', 'Add')
  }

  const onSubmit = (event) => {
    event.preventDefault()
    setModalMsg(`Are you sure you want to add ${getValues('serviceTypes').length} service types?`)
    setModalTitle('Add service types')
    setModalFunc(() => doSave)
    setAreYouSureModal(!areYouSureModal);
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
      <div id="argo-contentwrap" className="ms-2 mb-2 mt-2 p-3 border rounded">
        <ParagraphTitle title='Service types prepared for submission'/>
        <Table bordered responsive hover size="sm">
          <thead className="table-active table-bordered align-middle text-center">
            <tr>
              <th style={{'width': '54px'}}>
                #
              </th>
              <th>
                { `Service name${showtitles ? " and title" : ""}` }
              </th>
              <th>
                Service description
              </th>
              <th style={{'width': '62px'}}>
                Action
              </th>
            </tr>
          </thead>
          {
            fields.length === 0 ?
              <tbody>
                <tr key="0" data-testid="addrow-0">
                  <td colSpan="4" className="table-light text-muted text-center p-3 fs-3">
                    Empty data
                  </td>
                </tr>
              </tbody>
            :
              <tbody>
                {
                  fields.map((entry, index) =>
                    <tr key={entry.id} data-testid={`addrow-${index}`}>
                      <td className="align-middle text-center">
                        {index + 1}
                      </td>
                      <td className="align-middle text-left fw-bold">
                        {
                          showtitles ?
                            <div>
                              <p className="fw-bold m-0">{ entry.name }</p>
                              <p className="m-0 fw-normal"><small>{ entry.title }</small></p>
                            </div>
                          :
                            <span className="ms-2">{ entry.name }</span>
                        }
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
                        <Button
                          size="sm"
                          className="fw-bold"
                          color="danger"
                          data-testid={ `row-remove-${index}` }
                          onClick={() => {
                            remove(index)
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes}/>
                        </Button>
                      </td>
                    </tr>
                  )
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
    </>
  )
}


const ServiceTypesAddForm = (props) => {
  const context = useContext(BulkAddContext)

  const showtitles = props.showtitles

  const [addedServices, setAddedServices] = useState([])

  const { control, handleSubmit, reset, formState: {errors} } = useForm({
    resolver: yupResolver(validationSchema),
    context: { 
      showtitles: showtitles, 
      serviceTypes: context.serviceTypes,
      addedServices: addedServices
    },
    defaultValues: {
      name: "",
      title: "",
      description: "",
      tags: ['poem']
    }
  })

  const onSubmit = data => {
    let tmpArray = [ ...addedServices ]
    tmpArray.push(data)
    setAddedServices(tmpArray)
    reset({
      name: "",
      title: "",
      description: "",
      tags: ['poem']
    })
  }

  const DescriptionInputGroup = <>
    <Label className="fw-bold" for="description">
      Description:
    </Label>
    <InputGroup>
      <Controller
        name="description"
        control={ control }
        render={ ({ field }) =>
          <textarea
            { ...field }
            id="description"
            rows="3"
            className={`form-control ${ errors?.description && "is-invalid" }`}
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
  </>

  return (
    <>
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
                      {...field}
                      id="name"
                      className={`form-control ${errors?.name && "is-invalid" }`}
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
            {
              showtitles ?
                <Col sm={{size: 7}}>
                  <Label className="fw-bold" for="title">
                    Title:
                  </Label>
                  <InputGroup>
                    <Controller
                      name="title"
                      control={ control }
                      render={ ({ field }) =>
                        <Input
                          { ...field }
                          id="title"
                          className={ `form-control ${errors?.title && "is-invalid"}` }
                        />
                      }
                    />
                    <ErrorMessage
                      errors={errors}
                      name="title"
                      render={({ message }) =>
                        <FormFeedback invalid="true" className="end-0">
                          { message }
                        </FormFeedback>
                      }
                    />
                  </InputGroup>
                </Col>
              :
                <>
                  <Col sm={{ size: 7 }}>
                    { DescriptionInputGroup }
                  </Col>
                  <Col sm={{size: 1}} className="text-center">
                    <Button className="mt-5" color="success" type="submit">
                      Add new
                    </Button>
                  </Col>
                </>
            }
          </Row>
          {
            showtitles &&
              <Row className="mt-3">
                <Col sm={{ size: 11 }}>
                  { DescriptionInputGroup }
                </Col>
                <Col sm={{size: 1}} className="text-center">
                  <Button className="mt-5" color="success" type="submit">
                    Add new
                  </Button>
                </Col>
              </Row>
          }
        </Form>
      </div>
      <ServiceTypesListAdded data={ addedServices } { ...props } />
    </>
  )
}


export const ServiceTypesBulkAdd = (props) => {
  const webapi = new WebApi({
    token: props.webapitoken,
    serviceTypes: props.webapiservicetypes
  })
  
  const showtitles = props.showtitles

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true)
  );

  const { data: serviceTypes, errorServiceTypes, isLoading: loadingServiceTypes } = useQuery(
    'servicetypes', async () => {
      return await webapi.fetchServiceTypes();
    },
    { enabled: !!userDetails }
  )

  if (loadingUserDetails || loadingServiceTypes)
    return (
      <ChangeViewPlaceholder>
        <Row>
          <Col sm={{size: 4}}>
            <Label className="fw-bold">Name:</Label>
            <InputPlaceholder />
          </Col>
          {
            showtitles ?
              <Col sm={{size: 7}}>
                <Label className="fw-bold">Title:</Label>
                <InputPlaceholder />
              </Col>
            :
              <>
                <Col sm={{ size: 7 }}>
                  <Label className="fw-bold">Description:</Label>
                  <TextAreaPlaceholder />
                </Col>
              </>
          }
        </Row>
        {
          showtitles &&
            <Row className="mt-3">
              <Col sm={{ size: 11 }}>
                <Label className="fw-bold">Description:</Label>
                <TextAreaPlaceholder />
                <Col sm={{size: 1}} className="text-center">
                  <Button className="mt-5" color="success" disabled>
                    Add new
                  </Button>
                </Col>
              </Col>
            </Row>
        }
        <ParagraphTitle title='Service types prepared for submission'/>
        <Table className="placeholder rounded" style={{ height: "400px" }} />
      </ChangeViewPlaceholder>
    );

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails}/>);

  else if (errorServiceTypes)
    return (<ErrorComponent error={errorServiceTypes}/>);

  else if (userDetails && serviceTypes) {
    return (
      <BulkAddContext.Provider value={{
        userDetails: userDetails,
        serviceTypes: serviceTypes,
        webapi: webapi
      }}>
        <ServiceTypesAddForm { ...props } />
      </BulkAddContext.Provider>
    )
  }
  else
    return null
}


const ServiceTypesBulkDeleteChange = ({data, webapi, ...props}) => {
  const showtitles = props.showtitles
  const tenantName = props.tenantName
  const devel = props.devel

  const updatedData = data.map( e => {
    return {
      ...e,
      isChecked: false
    }
  })

  const [areYouSureModal, setAreYouSureModal] = React.useState(false)
  const [modalTitle, setModalTitle] = React.useState('')
  const [modalMsg, setModalMsg] = React.useState('')
  const [modalFunc, setModalFunc] = React.useState(undefined)

  const [pageSize, setPageSize] = useState(30)
  const [pageIndex, setPageIndex] = useState(0)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const hiddenFileInput = React.useRef(null)

  const queryClient = useQueryClient();
  const webapiAddMutation = useMutation(async (values) => await webapi.addServiceTypes(values));

  function toggleModal() {
    setAreYouSureModal(!areYouSureModal)
  }

  const { control, setValue, getValues, handleSubmit, resetField } = useForm({
    defaultValues: {
      serviceTypes: updatedData,
      searchService: '',
      searchDesc: '',
      selectAll: false,
      modified: false
    }
  })

  function longestName(data) {
    let tmpArray = new Array()
    data.forEach(entry => tmpArray.push(entry.name.length))
    return Math.max(...tmpArray)
  }

  const sortServiceTypes = (a, b) => {
    if ( a.name < b.name )
      return -1;
    if ( a.name > b.name )
      return 1;

    return 0;
  }

  let columnNameWidth = longestName(data) * 8 + 10
  columnNameWidth = Math.max(220, columnNameWidth)
  columnNameWidth = Math.min(360, columnNameWidth)

  const searchService = useWatch({control, name: "searchService"})
  const searchDesc = useWatch({control, name: "searchDesc"})
  const serviceTypes = useWatch({ control, name: "serviceTypes" })
  const modified = useWatch({ control, name: "modified" })

  const { fields } = useFieldArray({
    control,
    name: "serviceTypes"
  })

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
    postServiceTypesWebApi([...serviceTypes.map(
      e => Object({
          name: e.name, title: e.title, description: e.description, tags: e.tags
        })
      )],
      'changed', 'Change')
  }

  function onSave() {
    setModalMsg(`Are you sure you want to change service type?`)
    setModalTitle('Change service type')
    setModalFunc(() => doSave)
    setAreYouSureModal(!areYouSureModal);
  }

  function doDelete() {
    let cleaned = getValues("serviceTypes").filter(e => !e.isChecked)
    setValue("serviceTypes", cleaned)
    postServiceTypesWebApi([...cleaned.map(
      e => Object({
          name: e.name, title: e.title, description: e.description, tags: e.tags
        })
      )],
      'deleted', 'Delete')
  }

  function onDelete() {
    let cleaned = getValues("serviceTypes").filter(e => !e.isChecked)

    setModalMsg(`Are you sure you want to delete ${fields.length - cleaned.length} service types?`)
    setModalTitle('Delete service types')
    setModalFunc(() => doDelete)
    setAreYouSureModal(!areYouSureModal);
  }

  let lookupIndices = _.fromPairs(fields.map((e, index) => [e.id, index]))

  let fieldsView = fields
  let paginationHelp = new TablePaginationHelper(fieldsView.length, pageSize, pageIndex)

  if (searchDesc)
    fieldsView = fieldsView.filter(e => e.description.toLowerCase().includes(searchDesc.toLowerCase()))

  if (searchService)
    fieldsView = fieldsView.filter(e => e.name.toLowerCase().includes(searchService.toLowerCase()) || e.title.toLowerCase().includes(searchService.toLowerCase()))

  paginationHelp.searchNum = fieldsView.length
  paginationHelp.isSearched = searchService || searchDesc ? true : false

  fieldsView = fieldsView.slice(paginationHelp.start, paginationHelp.end)

  let n = Math.ceil(pageSize / 2)

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
            disabled={![...serviceTypes.map(e => e.isChecked)].includes(true)}
            onClick={() => onDelete()}
            className="me-3">
            Delete selected
          </Button>
          <Button
            color="success"
            disabled={ !modified }
            onClick={ () => onSave() }
            className="me-3">
            Save
          </Button>
          <Link className="btn btn-secondary me-3" to="/ui/servicetypes/add" role="button">Add</Link>
          <ButtonDropdown isOpen={ dropdownOpen } toggle={ () => setDropdownOpen(!dropdownOpen) }>
            <DropdownToggle caret color="secondary">CSV</DropdownToggle>
            <DropdownMenu>
              <DropdownItem
                onClick={ () => {
                  let csvContent = []
                  getValues("serviceTypes").sort(sortServiceTypes).forEach((servtype) => 
                    csvContent.push({ name: servtype.name, title: servtype.title, description: servtype.description })
                  )
                  const content = PapaParse.unparse(csvContent)
                  let filename = `${tenantName}-service-types${devel ? "-devel" : ""}.csv`
                  downloadCSV(content, filename)
                }}
              >
                Export
              </DropdownItem>
              <DropdownItem
                onClick={ () => { hiddenFileInput.current.click() } }
              >
                Import
              </DropdownItem>
            </DropdownMenu>
            <input
              type="file"
              data-testid="file_input"
              ref={ hiddenFileInput }
              onChange={ (e) => {
                PapaParse.parse(e.target.files[0], {
                  header: true,
                  complete: (results) => {
                    var imported = results.data
                    // remove entries without keys if there are any
                    imported = imported.filter(obj => {
                        return "name" in obj && "title" in obj && "description" in obj
                    })
                    imported = imported.map( e => {
                      return {
                        ...e,
                        isChecked: false,
                        tags: ["poem"]
                      }
                    })
                    resetField("serviceTypes")
                    setValue("serviceTypes", imported.sort(sortServiceTypes))
                    setValue("modified", true)
                  }
                })
              }}
              style={{ display: "none" }}
            />
          </ButtonDropdown>
        </span>
      </div>
      <div id="argo-contentwrap" className="ms-2 mb-2 mt-2 p-3 border rounded">
        <Form onSubmit={handleSubmit(() => {})} className="needs-validation">
          <Row>
            <Col>
              <Table bordered responsive hover size="sm">
                <thead className="table-active table-bordered align-middle text-center">
                  <tr>
                    <th style={{'width': '54px'}}>
                      #
                    </th>
                    <th>
                      { `Service name${showtitles ? " and title" : ""}` }
                    </th>
                    <th>
                      Service description
                    </th>
                    <th style={{'width': '60px'}}>
                      Source
                    </th>
                    <th style={{ width: "60px" }}>
                      Select
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
                    <td className="align-middle text-center">
                      <Controller
                        name="selectAll"
                        control={ control }
                        render={ ({ field }) => 
                          <Input
                            { ...field }
                            type="checkbox"
                            data-testid="checkbox-all"
                            className="mt-2"
                            onChange={ e => {
                              let fieldsIDs = fieldsView.map(e => e.id)
                              fields.forEach(element => {
                                if (fieldsIDs.includes(element.id) && element.tags?.indexOf("topology") === -1 ) {
                                  setValue(`serviceTypes.${lookupIndices[element.id]}.isChecked`, e.target.checked)
                                }
                              })
                            } }
                            checked={ field.checked }
                          />
                        }
                      />
                    </td>
                  </tr>
                  {
                    fieldsView.length > 0 ?
                      fieldsView.map((entry, index) =>
                        <tr key={entry.id} data-testid={`st-rows-${index}`}>
                          <td className="align-middle text-center">
                            { index + 1 }
                          </td>
                          <td className="align-middle text-left fw-bold">
                            {
                              showtitles ?
                                <div>
                                  <p className="fw-bold m-0">{ entry.name }</p>
                                  <p className="fw-normal m-0"><small>{ entry.title }</small></p>
                                </div>
                              :
                                <span className="ms-2">{ entry.name }</span>
                            }
                          </td>
                          <td>
                            <Controller
                              name={`serviceTypes.${lookupIndices[entry.id]}.description`}
                              control={control}
                              render={ ({field}) =>
                                <textarea
                                  {...field}
                                  data-testid={ `description-${index}` }
                                  disabled={ entry.tags?.indexOf("topology") !== -1 }
                                  rows="2"
                                  className={ `form-control ${serviceTypes[lookupIndices[entry.id]]?.description !== updatedData[lookupIndices[entry.id]]?.description && 'border border-danger'}` }
                                  onChange={e => {
                                    setValue(`serviceTypes.${lookupIndices[entry.id]}.description`, e.target.value)
                                    setValue("modified", true)
                                  }}
                                />
                              }
                            />
                          </td>
                          <td className="text-center align-middle">
                            <Badge color={`${entry.tags?.indexOf("topology") !== -1 ? "secondary" : "success"}`}>
                              { entry.tags[0] }
                            </Badge>
                          </td>
                          <td className="text-center align-middle">
                            <Controller
                              name={`serviceTypes.${lookupIndices[entry.id]}.isChecked`}
                              control={control}
                              render={ ({field}) =>
                                <Input
                                  { ...field }
                                  type="checkbox"
                                  data-testid={`checkbox-${index}`}
                                  className="mt-2"
                                  disabled={ entry.tags?.indexOf("topology") !== -1 }
                                  onChange={ e => setValue(`serviceTypes.${lookupIndices[entry.id]}.isChecked`, e.target.checked)}
                                  checked={ getValues(`serviceTypes.${lookupIndices[entry.id]}.isChecked`) }
                                />
                              }
                            />
                          </td>
                        </tr>
                      )
                    :
                      [...Array(pageSize)].map((e, i) => {
                        return (
                          <tr key={ i }>
                            {
                              i === n - 1 ?
                                <td colSpan={ 5 } style={{height: '49px'}} className='align-middle text-center text-muted'>{`No service types`}</td>
                              :
                                [...Array( 5 )].map((e, j) =>
                                  <td style={{height: '49px'}} key={j} className='align-middle'>{''}</td>
                  )
                            }
                          </tr>
                        )
                      })
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

  const columns = React.useMemo(() => [
    {
      Header: '#',
      accessor: null,
      column_width: '2%'
    },
    {
      Header: <div><Icon i="servicetypes"/>{ `Service name${showtitles ? " and title" : ""}` }</div>,
      accessor: "name",
      column_width: "25%",
      Cell: (row) => {
        let original = row.cell.row.original
        if (showtitles)
          return(
            <div>
              <p className="fw-bold m-0">{ original.name }</p>
              <p className="m-0"><small>{ original.title }</small></p>
            </div>
          )
        else
          return (
            <span className="fw-bold">{ original.name }</span>
          )
      },
      filter: (rows, id, filterValue) => {
        return rows.filter(row =>
          row.values.name.toLowerCase().includes(filterValue.toLowerCase()) || row.original.title.toLowerCase().includes(filterValue.toLowerCase())
        )
      },
      Filter: DefaultColumnFilter
    },
    {
      Header: 'Description',
      accessor: 'description',
      column_width: "70%",
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
  ], [showtitles])

  if (loadingUserDetails || loadingServiceTypesDescriptions)
    return (
      <ListViewPlaceholder
        title="Service types"
        infoview={ true }
      />
    );

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
