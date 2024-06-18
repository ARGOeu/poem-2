import React, { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "react-query"
import { Link, useLocation, useParams, useNavigate } from "react-router-dom"
import { Backend } from "./DataManager"
import { fetchUserDetails } from "./QueryFunctions"
import {
  BaseArgoTable,
  BaseArgoView,
  ErrorComponent,
  NotifyError,
  NotifyOk
} from "./UIElements"
import {
  Button,
  ButtonDropdown,
  Col,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Form,
  FormGroup,
  FormFeedback,
  Input,
  InputGroup,
  InputGroupText,
  Row,
  Table
} from "reactstrap"
import { ParagraphTitle } from "./UIElements"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch
} from "react-hook-form"
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from "yup";
import { ErrorMessage } from "@hookform/error-message"
import { 
  ChangeViewPlaceholder, 
  InputPlaceholder, 
  ListViewPlaceholder 
} from "./Placeholders"
import { downloadJSON } from './FileDownload';

const hostnameRegex = /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9])([_][A-Za-z0-9.\-_]*)*$/

const validationSchema = Yup.object().shape({
  name: Yup.string()
    .required("Name field is required")
    .matches(/^[a-zA-Z][A-Za-z0-9\-_]*$/, "Name can contain alphanumeric characters, dash and underscore, but must always begin with a letter"),
  globalAttributes: Yup.array().of(
    Yup.object().shape({
      attribute: Yup.string().matches(
        /^[a-zA-Z][A-Za-z0-9\-_.]*$/, {
          excludeEmptyString: true,
          message: "Attribute can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter"
        }
      ).when("value", {
        is: (value) => !!value,
        then: (schema) => schema.matches(/^[a-zA-Z][A-Za-z0-9\-_.]*$/, "Attribute can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter")
      }),
      value: Yup.string().when("attribute", {
        is: (value) => !!value,
        then: (schema) => schema.required("Attribute value is required")
      })
    }, [[ "attribute", "value" ]])
  ),
  hostAttributes: Yup.array().of(
    Yup.object().shape({
      hostname: Yup.string()
        .when(["attribute", "value"], {
          is: (attribute, value) => !!value || !!attribute,
          then: (schema) => schema.matches(hostnameRegex, "Invalid hostname"),
          otherwise: (schema) => schema.matches(
            hostnameRegex, {
              excludeEmptyString: true,
              message: "Invalid hostname"
            }
          )
        }),
      attribute: Yup.string().when(["hostname", "value"], {
        is: (hostname, value) => !!hostname || !!value,
        then: (schema) => schema.matches(/^[a-zA-Z][A-Za-z0-9\-_.]*$/, "Attribute can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter")
      }),
      value: Yup.string().when(["hostname", "attribute"], {
        is: (hostname, attribute) => !!hostname || !!attribute,
        then: (schema) => schema.required("Attribute value is required")
      })
    }, [
      [ "hostname", "attribute" ],
      [ "hostname", "value" ],
      [ "attribute", "value" ]
    ] )
  ),
  metricParameters: Yup.array().of(
    Yup.object().shape({
      hostname: Yup.string().when(["metric", "parameter", "value"], {
        is: (metric, parameter, value) => !!metric || !!parameter || !!value,
        then: (schema) => schema.matches(hostnameRegex, "Invalid hostname"),
        otherwise: (schema) => schema.matches(
          hostnameRegex, {
            excludeEmptyString: true,
            message: "Invalid hostname"
          }
        )
      }),
      metric: Yup.string().when(["hostname", "parameter", "value"], {
        is: (hostname, parameter, value) => !!hostname || !!parameter || !!value,
        then: (schema) => schema.matches(/^[a-zA-Z][A-Za-z0-9\-_.]*$/, "Metric name can contain alphanumeric characters, dash, underscore and dot, but must always begin with a letter")
      }),
      parameter: Yup.string().when(["hostname", "metric", "value"], {
        is: (hostname, metric, value) => !!hostname || !!metric || !!value,
        then: (schema) => schema.matches(/^\S+$/, "Parameter cannot contain white space")
      }),
      value: Yup.string().when(["hostname", "metric", "parameter"], {
        is: (hostname, metric, parameter) => !!hostname || !!metric || !!parameter,
        then: (schema) => schema.required("Parameter value is required")
      })
    }, [
      [ "hostname", "metric" ],
      [ "hostname", "parameter" ],
      [ "hostname", "value" ],
      [ "metric", "parameter" ],
      [ "metric", "value" ],
      [ "parameter", "value" ]
    ])
  )
})


const fetchOverrides = async () => {
  const backend = new Backend()

  return await backend.fetchData("/api/v2/internal/metricconfiguration")
}


export const MetricOverrideList = () => {
  const location = useLocation()

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    "userdetails", () => fetchUserDetails(true)
  )

  const { data: confs, error: errorConfs, isLoading: loadingConfs } = useQuery(
    "metricoverride", () => fetchOverrides(),
    { enabled: !!userDetails }
  )

  const columns = useMemo(() => [
    {
      Header: "#",
      accessor: null,
      column_width: "2%"
    },
    {
      Header: "Name",
      id: "name",
      accessor: e =>
        <Link
          to={`/ui/administration/metricoverrides/${e.name}`}
        >
          {e.name}
        </Link>
    }
  ])

  if (loadingUserDetails || loadingConfs)
    return (
      <ListViewPlaceholder
        resourcename="metric configuration override"
      />
    )

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails} />)

  else if (errorConfs)
    return (<ErrorComponent error={errorConfs} />)

  else if (confs) {
    return (
      <BaseArgoView
        resourcename="metric configuration override"
        location={location}
        listview={true}
      >
        <BaseArgoTable
          data={confs}
          columns={columns}
          page_size={10}
          resourcename="metric configuration overrides"
        />
      </BaseArgoView>
    )
  } else {
    return null
  }
}


const MetricOverrideForm = ({
  name=undefined,
  override=undefined,
  isSuperuser=false,
  addview=false,
  location=undefined,
}) => {
  const backend = new Backend()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const addMutation = useMutation(async (values) => await backend.addObject("/api/v2/internal/metricconfiguration/", values))
  const changeMutation = useMutation(async (values) => await backend.changeObject("/api/v2/internal/metricconfiguration/", values))
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/metricconfiguration/${name}`))

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const hiddenFileInput = React.useRef(null);

  const { control, handleSubmit, setValue, getValues, trigger, formState: { errors } } = useForm({
    defaultValues: {
      id: override ? override.id : undefined,
      name: override ? override.name : "",
      globalAttributes: override ? override.global_attributes : [{ attribute: "", value: "" }],
      hostAttributes: override ? override.host_attributes : [{ hostname: "", attribute: "", value: "" }],
      metricParameters: override ? override.metric_parameters : [{ hostname: "", metric: "", parameter: "", value: "" }]
    },
    mode: "all",
    resolver: yupResolver(validationSchema)
  })

  const globalAttributes = useWatch({ control, name: "globalAttributes" })
  const hostAttributes = useWatch({ control, name: "hostAttributes" })
  const metricParameters = useWatch({ control, name: "metricParameters" })

  const { fields: attrFields, insert: attrInsert, remove: attrRemove } = useFieldArray({
    control,
    name: "globalAttributes"
  })

  const { fields: hostAttrFields, insert: hostAttrInsert, remove: hostAttrRemove } = useFieldArray({
    control,
    name: "hostAttributes"
  })

  const { fields: mpFields, insert: mpInsert, remove: mpRemove } = useFieldArray({
    control,
    name: "metricParameters"
  })

  useEffect(() => {
    if (attrFields.length == 0)
      setValue("globalAttributes", [{ attribute: "", value: "" }])

    trigger("globalAttributes")
  }, [globalAttributes])

  useEffect(() => {
    if (hostAttrFields.length == 0)
      setValue("hostAttributes", [{ hostname: "", attribute: "", value: "" }])

    trigger("hostAttributes")
  }, [hostAttributes])

  useEffect(() => {
    if (mpFields.length == 0)
      setValue("metricParameters", [{ hostname: "", metric: "", parameter: "", value: "" }])

    trigger("metricParameters")
  }, [metricParameters])

  const toggleAreYouSure = () => {
    setAreYouSureModal(!areYouSureModal)
  }

  const onSubmitHandle = () => {
    let msg = `Are you sure you want to ${addview ? "add" : "change"} metric configuration override?`
    let title = `${addview ? "Add" : "Change"} metric configuration override`

    setModalMsg(msg)
    setModalTitle(title)
    setModalFlag("submit")
    toggleAreYouSure()
  }

  const doChange = () => {
    let formValues = getValues()

    let sendValues = {
      name: formValues.name,
      global_attributes: formValues.globalAttributes,
      host_attributes: formValues.hostAttributes,
      metric_parameters: formValues.metricParameters
    }
    if (addview) {
      addMutation.mutate(
        sendValues, {
          onSuccess: () => {
            queryClient.invalidateQueries("metricoverride")
            NotifyOk({
              msg: "Metric configuration override successfully added",
              title: "Added",
              callback: () => navigate("/ui/administration/metricoverrides")
            })
          },
          onError: (error) => {
            NotifyError({
              title: "Error",
              msg: error.message ? error.message : "Error adding metric configuration override"
            })
          }
        }
      )
    } else {
      changeMutation.mutate(
        { id: formValues.id, ...sendValues }, {
          onSuccess: () => {
            queryClient.invalidateQueries("metricoverride")
            NotifyOk({
              msg: "Metric configuration override successfully changed",
              title: "Changed",
              callback: () => navigate("/ui/administration/metricoverrides")
            })
          },
          onError: (error) => {
            NotifyError({
              title: "Error",
              msg: error.message ? error.message : "Error changing metric configuration override"
            })
          }
        }
      )
    }
  }

  const doDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries("metricoverride")
        NotifyOk({
          msg: "Metric configuration override successfully deleted",
          title: "Deleted",
          callback: () => navigate("/ui/administration/metricoverrides")
        })
      },
      onError: (error) => {
        NotifyError({
          title: "Error",
          msg: error.message ? error.message : "Error deleting metric configuration override"
        })
      }
    })
  }

  const handleFileRead = (e) => {
    let jsonData = JSON.parse(e.target.result);
    setValue('globalAttributes', jsonData.global_attributes);
    setValue('hostAttributes', jsonData.host_attributes);
    setValue('metricParameters', jsonData.metric_parameters);
  }

  const handleFileChosen = (file) => {
    var reader = new FileReader();
    reader.onload = handleFileRead;
    reader.readAsText(file);
  }

  return (
    <BaseArgoView
      resourcename="metric configuration override"
      location={ location }
      history={ false }
      submitperm={ isSuperuser }
      addview={ addview }
      modal={ true }
      state={{
        areYouSureModal,
        modalTitle,
        modalMsg,
        "modalFunc": modalFlag === "submit" ?
          doChange
        :
          modalFlag === "delete" ?
            doDelete
          :
            undefined
      }}
      toggle={ toggleAreYouSure }
      extra_button={
        <ButtonDropdown isOpen={dropdownOpen} toggle={ () => setDropdownOpen(!dropdownOpen) }>
          <DropdownToggle caret color='secondary'>JSON</DropdownToggle>
          <DropdownMenu>
            <DropdownItem
              onClick={() => {
                let valueSave = JSON.parse(JSON.stringify(getValues()));
                const jsonContent = {
                  global_attributes: valueSave.globalAttributes,
                  host_attributes: valueSave.hostAttributes,
                  metric_parameters: valueSave.metricParameters
                }
                let filename = `${name}.json`
                downloadJSON(jsonContent, filename)
              }}
              disabled={ addview }
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
            type='file'
            data-testid='file_input'
            ref={ hiddenFileInput }
            onChange={(e) => { handleFileChosen(e.target.files[0]) }}
            style={{ display: 'none' }}
          />
        </ButtonDropdown>
      }
    >
      <Form onSubmit={ handleSubmit(onSubmitHandle) } data-testid="metric-override-form">
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputGroup>
                <InputGroupText>Name</InputGroupText>
                <Controller
                  name="name"
                  control={ control }
                  render={ ({ field }) =>
                    <Input
                      { ...field }
                      data-testid="name"
                      className={ `form-control form-control-lg ${ errors?.name && "is-invalid" }` }
                    />
                  }
                />
                <ErrorMessage
                  errors={ errors }
                  name="name"
                  render={ ({ message }) =>
                    <FormFeedback invalid="true" className="end-0">
                      { message }
                    </FormFeedback>
                  }
                />
              </InputGroup>
            </Col>
          </Row>
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title="Global attributes" />
          <div>
            <table className="table table-bordered table-sm">
              <thead className="table-active">
                <tr className="align-middle text-center">
                  <th style={{ width: "3%" }}>#</th>
                  <th style={{ width: "46.5%" }}>Attribute</th>
                  <th style={{ width: "46.5%" }}>Value</th>
                  <th style={{ width: "4%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {
                  attrFields.map((entry, index) =>
                    <tr key={ entry.id }>
                      <td className="align-middle text-center">{ index + 1 }</td>
                      <td>
                        <Controller
                          name={ `globalAttributes.${index}.attribute` }
                          control={ control }
                          render={ ({ field }) =>
                            <Input
                              { ...field }
                              data-testid={ `globalAttributes.${index}.attribute` }
                              className={ `form-control ${errors?.globalAttributes?.[index]?.attribute && "is-invalid"}` }
                            />
                          }
                        />
                        <ErrorMessage
                          errors={ errors }
                          name={ `globalAttributes.${index}.attribute` }
                          render={ ({ message }) =>
                            <FormFeedback invalid="true" className="end-0">
                              { message }
                            </FormFeedback>
                          }
                        />
                      </td>
                      <td>
                        <Controller
                          name={ `globalAttributes.${index}.value` }
                          control={ control }
                          render={ ({ field }) =>
                            <Input
                              { ...field }
                              data-testid={ `globalAttributes.${index}.value` }
                              className={ `form-control ${ errors?.globalAttributes?.[index]?.value && "is-invalid" }` }
                            />
                          }
                        />
                        <ErrorMessage
                          errors={ errors }
                          name={ `globalAttributes.${index}.value` }
                          render={ ({ message }) =>
                            <FormFeedback invalid="true" className="end-0">
                              { message }
                            </FormFeedback>
                          }
                        />
                      </td>
                      <td className="align-middle d-flex justify-content-center align-items-center">
                        <Button
                          size="sm"
                          color="light"
                          type="button"
                          data-testid={ `globalAttributes.${index}.remove` }
                          onClick={() => {
                            attrRemove(index)
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </Button>
                        <Button
                          size="sm"
                          color="light"
                          type="button"
                          data-testid={ `globalAttributes.${index}.add` }
                          onClick={() => {
                            attrInsert(index + 1, { attribute: "", value: "" })
                          }}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </Button>
                      </td>
                    </tr>
                  )
                }
              </tbody>
            </table>
          </div>
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title="Host attributes" />
          <div>
            <table className="table table-bordered table-sm">
              <thead className="table-active">
                <tr className="align-middle text-center">
                  <th style={{ width: "3%" }}>#</th>
                  <th style={{ width: "31%" }}>Hostname</th>
                  <th style={{ width: "31%" }}>Attribute</th>
                  <th style={{ width: "31%" }}>Value</th>
                  <th style={{ width: "4%" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {
                  hostAttrFields.map((entry, index) =>
                    <tr key={ entry.id }>
                      <td className="align-middle text-center">{ index + 1 }</td>
                      <td>
                        <Controller
                          name={ `hostAttributes.${index}.hostname` }
                          control={ control }
                          render={ ({ field }) =>
                            <Input
                              { ...field }
                              className={ `form-control ${ errors?.hostAttributes?.[index]?.hostname && "is-invalid" }` }
                              data-testid={ `hostAttributes.${index}.hostname` }
                            />
                          }
                        />
                        <ErrorMessage
                          errors={ errors }
                          name={ `hostAttributes.${index}.hostname` }
                          render={ ({ message }) =>
                            <FormFeedback invalid="true" className="end-0">
                              { message }
                            </FormFeedback>
                          }
                        />
                      </td>
                      <td>
                        <Controller
                          name={ `hostAttributes.${index}.attribute` }
                          control={ control }
                          render={ ({ field }) =>
                            <Input
                              { ...field }
                              className={ `form-control ${ errors?.hostAttributes?.[index]?.attribute && "is-invalid" }` }
                              data-testid={ `hostAttributes.${index}.attribute` }
                            />
                          }
                        />
                        <ErrorMessage
                          errors={ errors }
                          name={ `hostAttributes.${index}.attribute` }
                          render={ ({ message }) =>
                            <FormFeedback invalid="true" className="end-0">
                              { message }
                            </FormFeedback>
                          }
                        />
                      </td>
                      <td>
                        <Controller
                          name={ `hostAttributes.${index}.value` }
                          control={ control }
                          render={ ({ field }) =>
                            <Input
                              { ...field }
                              className={ `form-control ${ errors?.hostAttributes?.[index]?.value && "is-invalid" }` }
                              data-testid={ `hostAttributes.${index}.value` }
                            />
                          }
                        />
                        <ErrorMessage
                          errors={ errors }
                          name={ `hostAttributes.${index}.value` }
                          render={ ({ message }) =>
                            <FormFeedback invalid="true" className="end-0">
                              { message }
                            </FormFeedback>
                          }
                        />
                      </td>
                      <td className="align-middle d-flex justify-content-center align-items-center">
                        <Button
                          size="sm"
                          color="light"
                          type="button"
                          data-testid={ `hostAttributes.${index}.remove` }
                          onClick={() => {
                            hostAttrRemove(index)
                          }}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </Button>
                        <Button
                          size="sm"
                          color="light"
                          type="button"
                          data-testid={ `hostAttributes.${index}.add` }
                          onClick={() => {
                            hostAttrInsert(index + 1, { hostname: "", attribute: "", value: "" })
                          }}
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </Button>
                      </td>
                    </tr>
                  )
                }
              </tbody>
            </table>
          </div>
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title="Metrics' parameters" />
          <div>
            <table className="table table-bordered table-sm">
              <thead className="table-active">
                <tr className="align-middle text-center">
                  <th style={{ width: "3%" }}>#</th>
                  <th style={{ width: "23.25%" }}>hostname</th>
                  <th style={{ width: "23.25%" }}>metric</th>
                  <th style={{ width: "23.25%" }}>parameter</th>
                  <th style={{ width: "23.25%" }}>value</th>
                  <th style={{ width: "4%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                { mpFields.map((entry, index) =>
                  <tr key={ entry.id }>
                    <td className="align-middle text-center">{ index + 1 }</td>
                    <td>
                      <Controller
                        name={ `metricParameters.${index}.hostname` }
                        control={ control }
                        render={ ({ field }) =>
                          <Input
                            { ...field }
                            className={ `form-control ${ errors?.metricParameters?.[index]?.hostname && "is-invalid" }` }
                            data-testid={ `metricParameters.${index}.hostname` }
                          />
                        }
                      />
                      <ErrorMessage
                        errors={ errors }
                        name={ `metricParameters.${index}.hostname` }
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                    </td>
                    <td>
                      <Controller
                        name={ `metricParameters.${index}.metric` }
                        control={ control }
                        render={ ({ field }) =>
                          <Input
                            { ...field }
                            className={ `form-control ${ errors?.metricParameters?.[index]?.metric && "is-invalid" }` }
                            data-testid={ `metricParameters.${index}.metric` }
                          />
                        }
                      />
                      <ErrorMessage
                        errors={ errors }
                        name={ `metricParameters.${index}.metric` }
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                    </td>
                    <td>
                      <Controller
                        name={ `metricParameters.${index}.parameter` }
                        control={ control }
                        render={ ({ field }) =>
                          <Input
                            { ...field }
                            className={ `form-control ${ errors?.metricParameters?.[index]?.parameter && "is-invalid" }` }
                            data-testid={ `metricParameters.${index}.parameter` }
                          />
                        }
                      />
                      <ErrorMessage
                        errors={ errors }
                        name={ `metricParameters.${index}.parameter` }
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                    </td>
                    <td>
                      <Controller
                        name={ `metricParameters.${index}.value` }
                        control={ control }
                        render={ ({ field }) =>
                          <Input
                            { ...field }
                            className={ `form-control ${ errors?.metricParameters?.[index]?.value && "is-invalid" }` }
                            data-testid={ `metricParameters.${index}.value` }
                          />
                        }
                      />
                      <ErrorMessage
                        errors={ errors }
                        name={ `metricParameters.${index}.value` }
                        render={ ({ message }) =>
                          <FormFeedback invalid="true" className="end-0">
                            { message }
                          </FormFeedback>
                        }
                      />
                    </td>
                    <td className="align-middle d-flex justify-content-center align-items-center">
                      <Button
                        size="sm"
                        color="light"
                        type="button"
                        data-testid={ `metricParameters.${index}.remove` }
                        onClick={() => {
                          mpRemove(index)
                        }}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </Button>
                      <Button
                        size="sm"
                        color="light"
                        type="button"
                        data-testid={ `metricParameters.${index}.add` }
                        onClick={() => {
                          mpInsert(index + 1, { hostname: "", metric: "", parameter: "", value: "" })
                        }}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </Button>
                    </td>
                  </tr>
                ) }
              </tbody>
            </table>
          </div>
        </FormGroup>
        {
          (isSuperuser) &&
            <div className='submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5'>
              {
                !addview ?
                  <Button
                    color='danger'
                    onClick={() => {
                      setModalMsg("Are you sure you want to delete metric configuration override?")
                      setModalTitle("Delete metric configuration override")
                      setModalFlag("delete")
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
    </BaseArgoView>
  )
}


export const MetricOverrideChange = (props) => {
  const { name } = useParams()
  const addview = props.addview
  const location = useLocation()

  const backend = new Backend()

  const { data: userDetails, isLoading: loading } = useQuery(
    'userdetails', () => fetchUserDetails(true)
  );

  const { data: override, error: errorOverride, isLoading: loadingOverride } = useQuery(
    ["metricoverride", name], async () => { return await backend.fetchData(`/api/v2/internal/metricconfiguration/${name}`)},
    { enabled: !addview && !!userDetails }
  )

  if (loading || loadingOverride)
    return (
      <ChangeViewPlaceholder
        resourcename="metric configuration override"
        addview={ addview }
      >
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputPlaceholder width="100%" />
            </Col>
          </Row>
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title="Global attributes" />
          <Table className="placeholder rounded" style={{ height: "200px" }} />
          <ParagraphTitle title="Host attributes" />
          <Table className="placeholder rounded" style={{ height: "200px" }} />
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title="Metrics' parameters" />
          <Table className="placeholder rounded" style={{ height: "200px" }} />
        </FormGroup>
      </ChangeViewPlaceholder>
    )

  else if (errorOverride)
    return (<ErrorComponent error={errorOverride} />)

  else if (userDetails && ((!loading && addview) || override))
    return (
      <MetricOverrideForm
        name={ name }
        override={ override }
        isSuperuser={ userDetails.is_superuser }
        addview={ addview }
        location={ location }
      />
    )
  else
    return null
}