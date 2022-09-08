import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Backend } from './DataManager';
import {
  Button,
  ButtonGroup,
  Col,
  Form,
  Input,
  Row,
  Table,
} from 'reactstrap';
import {
  LoadingAnim,
  BaseArgoView,
  ErrorComponent,
  Icon,
  BaseArgoTable,
  DefaultColumnFilter
} from './UIElements';
import {
  fetchUserDetails,
} from './QueryFunctions';
import {
  faSave,
  faSearch,
  faPlus,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
import _ from 'lodash';



const ServiceTypesCRUDTable = ({data}) => {
  const { control, getValues, handleSubmit, formState: {errors} } = useForm({
    defaultValues: {
      serviceTypes: data,
      searchService: '',
      searchDesc: ''
    }
  })

  function longestName(data) {
    let tmpArray = new Array()
    data.forEach(entry => tmpArray.push(entry.name.length))
    return Math.max(...tmpArray)
  }
  let maxNamePx = longestName(data) * 8 + 10

  const watchedServiceTypes = useWatch({control, name: "serviceTypes"})
  const searchService = useWatch({control, name: "searchService"})
  const searchDesc = useWatch({control, name: "searchDesc"})

  const { fields, update } = useFieldArray({
    control,
    name: "serviceTypes"
  })
  const controlledFields = fields.map((field, index) => {
    return {
      ...field,
      ...watchedServiceTypes[index]
    }
  })

  const [checkedFieldIds, setCheckFieldIds] = useState(
    _.fromPairs(fields.map(e => [e.id, false]))
  )
  useEffect(() => {
    setCheckFieldIds(_.fromPairs(
      fields.map(e => [e.id, checkedFieldIds[e.id] ? true : false]))
    )
  }, [fields])

  const onSave = (id) => {
  }

  const onCheck = (id) => {
    checkedFieldIds[id] = !checkedFieldIds[id]
    setCheckFieldIds(checkedFieldIds)
  }

  const onSubmit = data => {
    console.log('VRDEL DEBUG', getValues("serviceTypes"))
  }

  let fieldsView = controlledFields
  if (searchService)
    fieldsView = controlledFields.filter(e => e.name.includes(searchService))

  if (searchDesc)
    fieldsView = controlledFields.filter(e => e.description.includes(searchDesc))

  return (
    <>
      <div className="d-flex align-items-center justify-content-between">
        <h2 className="ms-3 mt-1 mb-4">Service types</h2>
        <span>
          <Button
            color="danger"
            disabled={!_.valuesIn(checkedFieldIds).includes(true)}
            className="me-3">
            Delete selected
          </Button>
          <Link className="btn btn-secondary" to="/servicetypes/add" role="button">Add</Link>
        </span>
      </div>
      <div id="argo-contentwrap" className="ms-2 mb-2 mt-2 p-3 border rounded">
        <Form onSubmit={ handleSubmit(onSubmit) } className="needs-validation">
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
                      <tr key={entry.id}>
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
                            <Input type="checkbox" className="fw-bold" checked={checkedFieldIds[entry.id]} onChange={() => onCheck(entry.id)}/>
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
