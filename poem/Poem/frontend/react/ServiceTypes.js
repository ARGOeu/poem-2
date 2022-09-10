import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Backend } from './DataManager';
import {
  Button,
  Col,
  Form,
  Input,
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
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";



const ServiceTypesCRUDTable = ({data}) => {
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

  const onSave = (entryid) => {
    let values = getValues('serviceTypes')
    let index = fields.findIndex(field => field.id === entryid)
    update(index, {
      name: values[index].name,
      description: values[index].description,
      checked: values[index].checked
    })
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
    NotifyOk({
      msg: 'Service types successfully deleted',
      title: 'Deleted',
      callback: null
    });
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
          <Link className="btn btn-secondary" to="/servicetypes/add" role="button">Add</Link>
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
  const location = props.location;

  const backend = new Backend();

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    'userdetails', () => fetchUserDetails(true),
    { enabled: !publicView }
  );

  const { data: serviceTypesDescriptions, errorServiceTypesDescriptions, isLoading: loadingServiceTypesDescriptions} = useQuery(
    `${publicView ? 'public_' : ''}servicetypedesc`, async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? 'public_' : ''}servicetypesdesc`);
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
      <ServiceTypesCRUDTable data={serviceTypesDescriptions}/>
    )
  else
    return null
}
