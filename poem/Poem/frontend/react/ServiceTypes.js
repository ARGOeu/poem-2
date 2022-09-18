import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WebApi } from './DataManager';
import { useQuery, useQueryClient, useMutation } from 'react-query';
import {
  Button,
  Col,
  Form,
  Input,
  InputGroup,
  Label,
  Row,
  Table,
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
import _ from 'lodash-es';


const ServiceTypesListAdded = ({data, setCallback, webapi}) => {
  const [addedServices, setAddedServices] = useState(data)

  const { control, setValue } = useForm({
    defaultValues: {
      serviceTypes: addedServices,
    }
  })

  useEffect(() => {
    setAddedServices(data)
    setValue("serviceTypes", data)
  }, [data])

  const { fields, remove, update } = useFieldArray({
    control,
    name: "serviceTypes"
  })


  return (
    <div id="argo-contentwrap" className="ms-2 mb-2 mt-2 p-3 border rounded">
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
            <th>
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {
            fields.map((entry, index) =>
              <tr key={entry.id} data-testid={`rows-serviceTypes.${index}`}>
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
                <td>
                  <Button className="fw-bold" color="danger" onClick={() => {
                    let tmp = [...addedServices]
                    tmp = tmp.splice(index, 1)
                    console.log('VRDEL DEBUG', tmp)
                    setAddedServices(tmp)
                    setCallback(tmp)
                    remove(index)
                  }}>
                    <FontAwesomeIcon icon={faTimes}/>
                  </Button>
                </td>
              </tr>
            )
          }
        </tbody>
      </Table>
    </div>
  )
}


export const ServiceTypesBulkAdd = ({data, webapi}) => {
  const [addedServices, setAddedServices] = useState([])

  const { control, setValue, getValues, handleSubmit, formState: {errors} } = useForm({
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
  }

  function toggleModal() {
    setAreYouSureModal(!areYouSureModal)
  }

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
              <Label for="name">
                Name
              </Label>
              <InputGroup>
                <Controller
                  name="name"
                  control={control}
                  rules={{required: true}}
                  render={ ({field}) =>
                    <Input
                      {...field}
                      className="form-control"
                    />
                  }
                />
              </InputGroup>
            </Col>
            <Col sm={{size: 7}}>
              <Label for="description">
                Description
              </Label>
              <InputGroup>
                <Controller
                  name="description"
                  control={control}
                  rules={{required: true}}
                  render={ ({field}) =>
                    <textarea
                      {...field}
                      rows="3"
                      className="form-control"
                    />
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
      <ServiceTypesListAdded data={addedServices} setCallback={setAddedServices}/>
    </>
  )
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
  const [modalCallbackArg, setModalCallbackArg] = React.useState(undefined)

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

  const { fields, update } = useFieldArray({
    control,
    name: "serviceTypes"
  })

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

  const doSave = (entryid) => {
    let values = getValues('serviceTypes')
    let index = fields.findIndex(field => field.id === entryid)
    update(index, {
      name: values[index].name,
      description: values[index].description,
      checked: values[index].checked
    })
    postServiceTypesWebApi([...values.map(
      e => Object(
        {
          'name': e.name, 'description': e.description
        }
      ))],
      'changed', 'Change')
  }

  const onSave = (entryid) => {
    setModalMsg(`Are you sure you want to change Service type?`)
    setModalTitle('Change service type')
    setModalFunc(() => doSave)
    setModalCallbackArg(entryid)
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

  let fieldsView = fields
  if (searchService)
    fieldsView = fields.filter(e => e.name.includes(searchService))

  if (searchDesc)
    fieldsView = fields.filter(e => e.description.includes(searchDesc))

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
        <h2 className="ms-3 mt-1 mb-4">Service types</h2>
        <span>
          <Button
            color="danger"
            disabled={![...fields.map(e => e.checked)].includes(true)}
            onClick={() => onDelete()}
            className="me-3">
            Delete selected
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
                    <th style={{'width': '98px'}}>
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
                          <Input
                            {...field}
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
                          <Input
                            {...field}
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
                          <Button className="fw-bold" color="light" onClick={() => onSave(entry.id)}>
                            <FontAwesomeIcon icon={faSave}/>
                          </Button>
                          <Button color="light" className="ms-1">
                            <Controller
                              name={`serviceTypes.${index}.checked`}
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
        </Form>
      </div>
    </>
  )
}


export const ServiceTypesList = (props) => {
  const publicView = props.publicView;

  const webapi = new WebApi({
    token: props.webapitoken,
    serviceTypes: props.webapiservicetypes
  })

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true),
    { enabled: !publicView }
  );

  const { data: serviceTypesDescriptions, errorServiceTypesDescriptions, isLoading: loadingServiceTypesDescriptions} = useQuery(
    `${publicView ? 'public_' : ''}servicetypes`, async () => {
      return await webapi.fetchServiceTypes();
    }
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
