import React, { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "react-query"
import { Link } from "react-router-dom"
import { Backend } from "./DataManager"
import { fetchUserDetails } from "./QueryFunctions"
import { BaseArgoTable, BaseArgoView, ErrorComponent, LoadingAnim, NotifyError, NotifyOk } from "./UIElements"
import { Formik, Form, Field, FieldArray } from "formik"
import {
  FormGroup,
  InputGroup,
  InputGroupText,
  Row,
  Col,
  Button
} from "reactstrap"
import { ParagraphTitle } from "./UIElements"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';


const fetchOverrides = async () => {
  const backend = new Backend()

  return await backend.fetchData("/api/v2/internal/metricconfiguration")
}


export const MetricOverrideList = (props) => {
  const location = props.location

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
    return (<LoadingAnim />)

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


export const MetricOverrideChange = (props) => {
  const addview = props.addview
  const location = props.location
  const history = props.history

  const backend = new Backend()

  const queryClient = useQueryClient()

  const addMutation = useMutation(async (values) => await backend.addObject("/api/v2/internal/metricconfiguration/", values))

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  const { data: userDetails, isLoading: loading } = useQuery(
    'userdetails', () => fetchUserDetails(true)
  );

  const toggleAreYouSure = () => {
    setAreYouSureModal(!areYouSureModal)
  }

  const onSubmitHandle = (values) => {
    let msg = "Are you sure you want to add metric configuration override?"
    let title = "Add metric configuration override"

    setModalMsg(msg)
    setModalTitle(title)
    setFormValues(values)
    setModalFlag("submit")
    toggleAreYouSure()
  }

  const doChange = () => {
    addMutation.mutate(
      {
        name: formValues.name,
        global_attributes: formValues.globalAttributes,
        host_attributes: formValues.hostAttributes,
        metric_parameters: formValues.metricParameters
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries("metricoverride")
          NotifyOk({
            msg: "Metric configuration override successfully added",
            title: "Added",
            callback: () => history.push("/ui/administration/metricoverrides")
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
  }

  if (loading)
    return (<LoadingAnim />)

  else if (!loading)
    return (
      <BaseArgoView
        resourcename="metric configuration override"
        location={location}
        history={false}
        submitperm={userDetails.is_superuser}
        addview={addview}
        modal={true}
        state={{
          areYouSureModal,
          modalTitle,
          modalMsg,
          "modalFunc": modalFlag === "submit" ?
            doChange
          :
            undefined
        }}
        toggle={toggleAreYouSure}
      >
        <Formik
          initialValues={{
            name: "",
            globalAttributes: [{attribute: "", value: ""}],
            hostAttributes: [{hostname: "", attribute: "", value: ""}],
            metricParameters: [{hostname: "", metric: "", parameter: "", value: ""}]
          }}
          onSubmit={(values) => onSubmitHandle(values)}
        >
          { props => (
            <Form data-testid="metric-override-form">
              <FormGroup>
                <Row>
                  <Col md={6}>
                    <InputGroup>
                      <InputGroupText>Name</InputGroupText>
                      <Field
                        type="text"
                        name="name"
                        data-testid="name"
                        className={`form-control form-control-lg ${props.errors.name && 'border-danger'}`}
                      />
                    </InputGroup>
                  </Col>
                </Row>
              </FormGroup>
              <FormGroup>
                <ParagraphTitle title="Global attributes" />
                <FieldArray
                  name="globalAttributes"
                  render={arrayHelpers => (
                    <div>
                      <table className="table table-bordered table-sm">
                        <thead className="table-active">
                          <tr className="align-middle text-center">
                            <th style={{width: "3%"}}>#</th>
                            <th style={{width: "46.5%"}}>Attribute</th>
                            <th style={{width: "46.5%"}}>Value</th>
                            <th style={{width: "4%"}}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            props.values.globalAttributes.map((_, index) =>
                              <tr key={`globalAttributes.${index}.num`}>
                                <td className="align-middle text-center">{index + 1}</td>
                                <td>
                                  <Field
                                    type="text"
                                    id={`globalAttributes.${index}.attribute`}
                                    name={`globalAttributes.${index}.attribute`}
                                    className="form-control"
                                    data-testid={`globalAttributes.${index}.attribute`}
                                  />
                                </td>
                                <td>
                                  <Field
                                    type="text"
                                    className="form-control"
                                    id={`globalAttributes.${index}.value`}
                                    name={`globalAttributes.${index}.value`}
                                    data-testid={`globalAttributes.${index}.value`}
                                  />
                                </td>
                                <td className="align-middle d-flex justify-content-center align-items-center">
                                  <Button
                                    size="sm"
                                    color="light"
                                    type="button"
                                    data-testid={`globalAttributes.${index}.remove`}
                                    onClick={() => {
                                      if (props.values.globalAttributes.length == 1) {
                                        arrayHelpers.push({ attribute: "", value: "" })
                                      }
                                      arrayHelpers.remove(index)
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faTimes} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    color="light"
                                    type="button"
                                    data-testid={`globalAttributes.${index}.add`}
                                    onClick={() => {arrayHelpers.push({ attribute: "", value: "" }) }}
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
                  )}
                />
              </FormGroup>
              <FormGroup>
                <ParagraphTitle title="Host attributes" />
                <FieldArray
                  name="hostAttributes"
                  render={arrayHelpers => (
                    <div>
                      <table className="table table-bordered table-sm">
                        <thead className="table-active">
                          <tr className="align-middle text-center">
                            <th style={{width: "3%"}}>#</th>
                            <th style={{width: "31%"}}>Hostname</th>
                            <th style={{width: "31%"}}>Attribute</th>
                            <th style={{width: "31%"}}>Value</th>
                            <th style={{width: "4%"}}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {
                            props.values.hostAttributes.map((_, index) =>
                              <tr key={`hostAttributes.${index}.num`}>
                                <td className="align-middle text-center">{index + 1}</td>
                                <td>
                                  <Field
                                    type="text"
                                    className="form-control"
                                    id={`hostAttributes.${index}.hostname`}
                                    name={`hostAttributes.${index}.hostname`}
                                    data-testid={`hostAttributes.${index}.hostname`}
                                  />
                                </td>
                                <td>
                                  <Field
                                    type="text"
                                    className="form-control"
                                    id={`hostAttributes.${index}.attribute`}
                                    name={`hostAttributes.${index}.attribute`}
                                    data-testid={`hostAttributes.${index}.attribute`}
                                  />
                                </td>
                                <td>
                                  <Field
                                    type="text"
                                    className="form-control"
                                    id={`hostAttributes.${index}.value`}
                                    name={`hostAttributes.${index}.value`}
                                    data-testid={`hostAttributes.${index}.value`}
                                  />
                                </td>
                                <td className="align-middle d-flex justify-content-center align-items-center">
                                  <Button
                                    size="sm"
                                    color="light"
                                    type="button"
                                    data-testid={`hostAttributes.${index}.remove`}
                                    onClick={() => {
                                      if (props.values.hostAttributes.length == 1) {
                                        arrayHelpers.push({ hostname: "", attribute: "", value: "" })
                                      }
                                      arrayHelpers.remove(index)
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faTimes} />
                                  </Button>
                                  <Button
                                    size="sm"
                                    color="light"
                                    type="button"
                                    data-testid={`hostAttributes.${index}.add`}
                                    onClick={() => {arrayHelpers.push({ hostname: "", attribute: "", value: "" }) }}
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
                  )}
                />
              </FormGroup>
              <FormGroup>
                <ParagraphTitle title="Metrics' parameters" />
                <FieldArray
                  name="metricParameters"
                  render={arrayHelpers => (
                    <div>
                      <table className="table table-bordered table-sm">
                        <thead className="table-active">
                          <tr className="align-middle text-center">
                            <th style={{width: "3%"}}>#</th>
                            <th style={{width: "23.25%"}}>hostname</th>
                            <th style={{width: "23.25%"}}>metric</th>
                            <th style={{width: "23.25%"}}>parameter</th>
                            <th style={{width: "23.25%"}}>value</th>
                            <th style={{width: "4%"}}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          { props.values.metricParameters.map((_, index) =>
                            <tr key={`metricParameters.${index}.num`}>
                              <td className="align-middle text-center">{index + 1}</td>
                              <td>
                                <Field
                                  type="text"
                                  className="form-control"
                                  id={`metricParameters.${index}.hostname`}
                                  name={`metricParameters.${index}.hostname`}
                                  data-testid={`metricParameters.${index}.hostname`}
                                />
                              </td>
                              <td>
                                <Field
                                  type="text"
                                  className="form-control"
                                  id={`metricParameters.${index}.metric`}
                                  name={`metricParameters.${index}.metric`}
                                  data-testid={`metricParameters.${index}.metric`}
                                />
                              </td>
                              <td>
                                <Field
                                  type="text"
                                  className="form-control"
                                  id={`metricParameters.${index}.parameter`}
                                  name={`metricParameters.${index}.parameter`}
                                  data-testid={`metricParameters.${index}.parameter`}
                                />
                              </td>
                              <td>
                                <Field
                                  type="text"
                                  className="form-control"
                                  id={`metricParameters.${index}.value`}
                                  name={`metricParameters.${index}.value`}
                                  data-testid={`metricParameters.${index}.value`}
                                />
                              </td>
                              <td className="align-middle d-flex justify-content-center align-items-center">
                                <Button
                                  size="sm"
                                  color="light"
                                  type="button"
                                  data-testid={`metricParameters.${index}.remove`}
                                  onClick={() => {
                                    if (props.values.metricParameters.length == 1) {
                                      arrayHelpers.push({ hostname: "", metric: "", parameter: "", value: "" })
                                    }
                                    arrayHelpers.remove(index)
                                  }}
                                >
                                  <FontAwesomeIcon icon={faTimes} />
                                </Button>
                                <Button
                                  size="sm"
                                  color="light"
                                  type="button"
                                  data-testid={`metricParameters.${index}.add`}
                                  onClick={() => {arrayHelpers.push({ hostname: "", metric: "", parameter: "", value: "" }) }}
                                >
                                  <FontAwesomeIcon icon={faPlus} />
                                </Button>
                              </td>
                            </tr>
                          ) }
                        </tbody>
                      </table>
                    </div>
                  )}
                />
              </FormGroup>
              {
                (userDetails.is_superuser) &&
                  <div className='submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5'>
                    {
                      !addview ?
                        <Button
                          color='danger'
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
          ) }
        </Formik>
      </BaseArgoView>
    )
  else
    return null
}