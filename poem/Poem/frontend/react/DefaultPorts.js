import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  Form,
  Row,
  Col,
  Table,
  Button,
  Input,
  InputGroup,
  FormFeedback,
  Alert
} from 'reactstrap';
import { Backend } from './DataManager';
import {
  ErrorComponent,
  SearchField,
  NotifyOk,
  ModalAreYouSure,
  NotifyError
} from './UIElements';
import {
  faSearch,
  faTimes,
  faPlus,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch
} from 'react-hook-form';
import { ErrorMessage } from '@hookform/error-message';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from "yup";
import { ListViewPlaceholder } from './Placeholders';


const validationSchema = Yup.object().shape({
  defaultPorts: Yup.array().of(
    Yup.object().shape({
      name: Yup.string()
      .required("This field is required")
      .matches(/^[a-zA-Z][A-Za-z0-9\-_]*$/, "Name can contain alphanumeric characters, dash and underscore, but must always begin with a letter")
      .test("unique", "Duplicate", function (value) {
        let arr = this.options.context.ports.map(e => e.name)
        if (arr.indexOf(value) === arr.lastIndexOf(value))
          return true

        else
          return false
      }),
      value: Yup.string().required("This field is required").matches(/^[0-9]*$/, "Value must contain numeric characters")
    })
  )
})


const PortsList = ({ data, publicView }) => {
  const backend = new Backend()

  const queryClient = useQueryClient()

  const mutation = useMutation(async (values) => await backend.addObject("/api/v2/internal/default_ports/", values))

  const [areYouSureModal, setAreYouSureModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('')
  const [modalMsg, setModalMsg] = useState('')
  const [modalFunc, setModalFunc] = useState(undefined)
  const [isDeleted, setIsDeleted] = useState(false)
  const [contextData, setContextData] = useState(new Object())

  const { control, setValue, getValues, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      defaultPorts: data.length > 0 ? data.map(e => { return { name: e.name, value: e.value, new: false } }) : [{ name: "", value: "", new: true }],
      searchPortName: "",
      searchPortValue: ""
    },
    mode: "all",
    resolver: yupResolver(validationSchema),
    context: {
      ports: contextData
    }
  })

  const searchPortName = useWatch({ control, name: "searchPortName" })
  const searchPortValue = useWatch({ control, name: "searchPortValue" })
  const defaultPorts = useWatch({ control, name: "defaultPorts" })

  const { fields, insert, remove } = useFieldArray({ control, name: "defaultPorts" })

  useEffect(() => {
    setValue("defaultPorts", data.length > 0 ? data.map(e => { return { name: e.name, value: e.value } }) : [{ name: "", value: "", new: true }])
  }, [data])

  useEffect(() => {
    setContextData(defaultPorts)
  }, [defaultPorts])

  const toggleModal = () => {
    setAreYouSureModal(!areYouSureModal)
  }

  const onSubmit = () => {
    setModalMsg("Are you sure you want to change default ports?")
    setModalTitle("Change default ports")
    setModalFunc(() => doSave)
    setAreYouSureModal(!areYouSureModal)
  }

  const doSave = () => {
    let sendData = {
      ports: [...getValues("defaultPorts").map((e) => new Object({ name: e.name, value: e.value }))]
    }

    mutation.mutate(sendData, {
      onSuccess: () => {
        queryClient.invalidateQueries("defaultports")
        NotifyOk({
          msg: "Default ports successfully changed",
          title: "Changed"
        })
      },
      onError: (error) => {
        NotifyError({
          msg: error?.message ? error.message : "Error changing default ports",
          title: "Error"
        })
      }
    })

    setIsDeleted(false)
  }

  let fieldsView = fields

  if (searchPortName)
    fieldsView = fields.filter(e => e.name.toLowerCase().includes(searchPortName.toLowerCase()))

  if (searchPortValue)
    fieldsView = fields.filter(e => e.value.toLowerCase().includes(searchPortValue.toLowerCase()))

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
        <h2 className="ms-3 mt-1 mb-4">Default ports</h2>
        <span>
          {
            !publicView &&
              <Button
                color="success"
                disabled={!(isDeleted || [...fields.map(e => e.new)].includes(true))}
                type="submit"
                onClick={(e) => onSubmit(e)}
              >
                Save
              </Button>
          }
        </span>
      </div>
      <div id="argo-contentwrap" className="ms-2 mb-2 mt-2 p-3 border rounded">
        <Form onSubmit={handleSubmit(onSubmit)} className="needs-validation">
          {
            (isDeleted) &&
              <Alert color="warning">
                <center>
                  <FontAwesomeIcon icon={faInfoCircle} size="lg" color="black"/> &nbsp;
                  Some ports have been deleted. To store the change to the DB, click on the save button.
                </center>
              </Alert>
          }
          <Row>
            <Col>
              <Table bordered responsive hover size="sm">
                <thead className="table-active table-bordered align-middle text-center">
                  <tr>
                    <th style={{width: "5%"}}>#</th>
                    {
                      publicView ?
                        <>
                          <th style={{width: `47%`}}>Port name</th>
                          <th style={{width: "47%"}}>Port value</th>
                        </>
                      :
                        <>
                          <th style={{width: `45%`}}>Port name</th>
                          <th style={{width: "45%"}}>Port value</th>
                          <th style={{ width: "5%" }}>Action</th>
                        </>
                    }
                  </tr>
                </thead>
                <tbody style={{ lineHeight: "2.0" }}>
                  <tr style={{ background: "#ECECEC" }}>
                    <td className="align-middle text-center">
                      <FontAwesomeIcon icon={faSearch}/>
                    </td>
                    <td className="align-middle text-center">
                      <Controller
                        name="searchPortName"
                        control={control}
                        render={ ({ field }) =>
                          <SearchField
                            field={field}
                            forwardedRef={field.ref}
                            className="form-control"
                          />
                        }
                      />
                    </td>
                    <td className="align-middle text-center">
                      <Controller
                        name="searchPortValue"
                        control={control}
                        render={ ({field}) =>
                          <SearchField
                            field={field}
                            forwardedRef={field.ref}
                            className="form-control"
                          />
                        }
                      />
                    </td>
                    {
                      !publicView && <td></td>
                    }
                  </tr>
                  {
                    fieldsView.map((entry, index) =>
                      <tr key={entry.id}>
                        <td className="align-middle text-center">
                          { index + 1 }
                        </td>
                        <td className="align-middle text-left">
                          {
                            entry.new ?
                              <InputGroup>
                                <Controller
                                  name={`defaultPorts.${index}.name`}
                                  control={control}
                                  render={({field}) =>
                                    <Input
                                      {...field}
                                      data-testid={`defaultPorts.${index}.name`}
                                      className={`form-control ${errors?.defaultPorts?.[index]?.name ? "is-invalid" : entry.new ? "border border-success" : ""}`}
                                    />
                                  }
                                />
                                <ErrorMessage
                                  errors={errors}
                                  name={`defaultPorts.${index}.name`}
                                  render={({ message }) =>
                                    <FormFeedback invalid="true" className="end-0">
                                      { message }
                                    </FormFeedback>
                                  }
                                />
                              </InputGroup>
                            :
                              <span className="ms-2 fw-bold">{ entry.name }</span>
                          }
                        </td>
                        <td className="align-middle text-left">
                          {
                            entry.new ?
                              <InputGroup>
                                <Controller
                                  name={`defaultPorts.${index}.value`}
                                  control={control}
                                  render={({field}) =>
                                    <Input
                                      {...field}
                                      data-testid={`defaultPorts.${index}.value`}
                                      className={`form-control ${errors?.defaultPorts?.[index]?.value ? "is-invalid" : entry.new ? "border border-success" : ""}`}
                                    />
                                  }
                                />
                                <ErrorMessage
                                  errors={errors}
                                  name={`defaultPorts.${index}.value`}
                                  render={({ message }) =>
                                    <FormFeedback invalid="true" className="end-0">
                                      { message }
                                    </FormFeedback>
                                  }
                                />
                              </InputGroup>
                            :
                              <span className="ms-2">{ entry.value }</span>
                          }
                        </td>
                        {
                          !publicView &&
                            <>
                              <td className="align-middle text-center">
                                <Button
                                  size="sm"
                                  color="light"
                                  type="button"
                                  data-testid={`remove-${index}`}
                                  onClick={() => {
                                    remove(index)
                                    if (!("new" in fields[index]))
                                      setIsDeleted(true)
                                  }}
                                >
                                  <FontAwesomeIcon icon={faTimes} />
                                </Button>
                                <Button
                                  size="sm"
                                  color="light"
                                  type="button"
                                  data-testid={`insert-${index}`}
                                  onClick={() => {
                                    insert(index + 1, { name: "", value: "", new: true })
                                  }}
                                >
                                  <FontAwesomeIcon icon={faPlus} />
                                </Button>
                              </td>
                            </>
                        }
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


export const DefaultPortsList = (props) => {
  const publicView = props.publicView

  const backend = new Backend();

  const { data: defaultPorts, error, status } = useQuery(
    `${publicView ? "public_" : ""}defaultports`, async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? "public_" : ""}default_ports`)
    }
  )

  if (status === 'loading')
    return (
      <ListViewPlaceholder 
        title="Default ports" 
        buttons={
          !publicView && <Button color="success" disabled>Save</Button>
        }
      />
    )

  else if (status === 'error')
    return (<ErrorComponent error={error}/>);

  else if (defaultPorts) {
    return (
      <PortsList 
        data={ defaultPorts } 
        publicView = { publicView }
      />
    )
  }
  else
    return null
}
