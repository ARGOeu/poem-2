import React, { useEffect, useState } from 'react';
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
  faSearch,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";



const ServiceTypesCRUDTable = ({data}) => {
  const { control, handleSubmit, formState: {errors} } = useForm({
    defaultValues: {
      serviceTypes: data,
      searchService: '',
      searchDesc: ''
    }
  })

  const searchService = useWatch({control, name: "searchService"})
  const searchDesc = useWatch({control, name: "searchDesc"})

  const { fields, insert, remove } = useFieldArray({
    control,
    name: "serviceTypes"
  })
  let fieldsView = fields

  const onSubmit = data => {
    console.log('VRDEL DEBUG', data)
  }

  if (searchService)
    fieldsView = fields.filter(e => e.name.includes(searchService))

  if (searchDesc)
    fieldsView = fields.filter(e => e.name.includes(searchDesc))

  return (
    <Form onSubmit={ handleSubmit(onSubmit) } className="needs-validation">
      <Row>
        <Col>
          <Table responsive hover size="sm">
            <thead className="table-active align-middle text-center">
              <tr>
                <th>
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
              <tr style={{ background: '#ECECEC' }}>
                <td className="align-middle text-center">
                  <FontAwesomeIcon icon={faSearch}/>
                </td>
                <td className="align-middle text-center">
                  <Controller
                    name="searchService"
                    control={control}
                    render={ ({field}) =>
                      <Input
                        {...field}
                        className='form-control'
                        // onChange={(e) => field.onChange(searchHandler('searchService', e.target.value))}
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
                    <td>
                      {index + 1}
                    </td>
                    <td>
                      <Controller
                        name={`serviceTypes.${index}.name`}
                        control={control}
                        render={ ({field}) =>
                          <Input
                            {...field}
                            className='form-control'
                          />
                        }
                      />
                    </td>
                    <td>
                      <Controller
                        name={`serviceTypes.${index}.description`}
                        control={control}
                        render={ ({field}) =>
                          <Input
                            {...field}
                            className='form-control'
                          />
                        }
                      />
                    </td>
                    <td className="text-center align-middle">
                      <ButtonGroup size='sm'>
                        <Button className="fw-bold" color="success" onClick={() => insert(index + 1, {name: '', description: ''})}>
                          +
                        </Button>
                        <Button className="fw-bold" color="danger" onClick={() => remove(index)}>
                          -
                        </Button>
                      </ButtonGroup>
                    </td>
                  </tr>
                )
              }
            </tbody>
          </Table>
        </Col>
      </Row>
      <Row>
        <Col className="position-relative text-center">
          <Button className="mt-4 mb-3" color="success" type="submit">
            Submit
          </Button>
        </Col>
      </Row>
    </Form>
  )
}


export const ServiceTypesList = (props) => {
  const publicView = props.publicView;

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
      <BaseArgoView
        resourcename='Services types'
        infoview={true}>
        <ServiceTypesCRUDTable data={serviceTypesDescriptions}/>
      </BaseArgoView>
    )
  else
    return null
}
