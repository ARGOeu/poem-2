import React, { useContext, useEffect, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "react-query"
import { Link, useLocation, useParams, useNavigate } from "react-router-dom"
import { fetchMetricTags, fetchMetricTemplates, fetchUserDetails } from "./QueryFunctions"
import {
  BaseArgoTable,
  BaseArgoView,
  CustomReactSelect,
  DefaultColumnFilter,
  ErrorComponent,
  Icon,
  NotifyError,
  NotifyOk,
  NotifyWarn,
  ParagraphTitle,
  SearchField
} from "./UIElements"
import { Backend } from "./DataManager"
import {
  Badge,
  Button,
  Col,
  Form,
  FormGroup,
  FormFeedback,
  Input,
  InputGroup,
  InputGroupText,
  Row,
  Table
 } from "reactstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSearch,faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form"
import { ErrorMessage } from '@hookform/error-message'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from "yup"
import { 
  ChangeViewPlaceholder,
  InputPlaceholder, 
  ListViewPlaceholder
} from "./Placeholders"

const validationSchema = Yup.object().shape({
  name: Yup.string().required("This field is required")
})


const MetricTagsContext = React.createContext()


export const MetricTagsList = (props) => {
  const location = useLocation();
  const publicView = props.publicView

  const { data: tags, error, status } = useQuery(
    `${publicView ? "public_" : ""}metrictags`,
    () => fetchMetricTags(publicView)
  )

  const columns = React.useMemo(() => [
    {
      Header: "#",
      accessor: null,
      column_width: "5%"
    },
    {
      Header: "Name",
      accessor: "name",
      Cell: row =>
        <Link to={`/ui/${publicView ? "public_" : ""}metrictags/${row.value}`}>{row.value}</Link>,
      column_width: "20%",
      Filter: DefaultColumnFilter
    },
    {
      Header: "Metrics",
      accessor: "metrics",
      Cell: row =>
        <div>
          {
            row.value.length === 0 ?
              <Badge pill color="dark">none</Badge>
            :
              row.value.map((metric, i) =>
                <Badge pill className="me-1" key={ i } color="info">
                  { metric.name }
                </Badge>
              )
          }
        </div>,
      column_width: "75%",
      Filter: DefaultColumnFilter
    }
  ], [])

  if (status === "loading")
    return (
      <ListViewPlaceholder 
        resourcename="metric tag" 
      />
    )

  else if (status === "error")
    return (<ErrorComponent error={error} />)

  else if (tags)
    return (
      <BaseArgoView
        resourcename="metric tag"
        location={location}
        listview={true}
        addnew={!publicView}
      >
        <BaseArgoTable
          data={tags}
          columns={columns}
          page_size={20}
          resourcename="metric tags"
          filter={true}
        />
      </BaseArgoView>
    )
}


const MetricsList = () => {
  const context = useContext(MetricTagsContext)

  const { control, getValues, setValue, resetField } = useFormContext()

  const { fields, insert, remove } = useFieldArray({ control, name: "view_metrics4tag" })

  const onRemove = (index) => {
    let tmp_metrics4tag = [ ...context.metrics4tag ]
    let origIndex = tmp_metrics4tag.findIndex(e => e.name == getValues(`view_metrics4tag.${index}.name`))
    tmp_metrics4tag.splice(origIndex, 1)
    resetField("metrics4tag")
    setValue("metrics4tag", tmp_metrics4tag)
    remove(index)
  }

  const onInsert = (index) => {
    let tmp_metrics4tag = [ ...context.metrics4tag ]
    let origIndex = tmp_metrics4tag.findIndex(e => e.name == getValues(`view_metrics4tag.${index}.name`))
    let new_element = { name: "" }
    tmp_metrics4tag.splice(origIndex + 1, 0, new_element)
    resetField("metrics4tag")
    setValue("metrics4tag", tmp_metrics4tag)
    insert(index + 1, new_element)
  }

  return (
    <table className="table table-bordered table-sm table-hover" style={{width: "95%"}}>
      <thead className="table-active">
        <tr>
          <th className="align-middle text-center" style={{width: "5%"}}>#</th>
          <th style={{width: "85%"}}><Icon i="metrictemplates" />Metric template</th>
          {
            !context.publicView && <th className="align-middle text-center" style={{width: "10%"}}>Actions</th>
          }
        </tr>
      </thead>
      <tbody>
        <tr style={{background: "#ECECEC"}}>
          <td className="align-middle text-center">
            <FontAwesomeIcon icon={faSearch} />
          </td>
          <td>
            <Controller
              name="searchItem"
              control={ control }
              render={ ({ field }) =>
                <SearchField
                  field={ field }
                  forwardedRef={ field.ref }
                  data-testid="search_items"
                  className="form-control"
                />
              }
            />
          </td>
        </tr>
        {
          fields.map((item, index) =>
            <React.Fragment key={index}>
              <tr key={index}>
                <td className="align-middle text-center">
                  { index + 1 }
                </td>
                <td>
                  {
                    context.publicView ?
                      item.name
                    :
                      <Controller
                        name={ `view_metrics4tag.${index}.name` }
                        control={ control }
                        key={ item.id }
                        render={ ({ field }) =>
                          <CustomReactSelect
                            forwardedRef={ field.ref }
                            id={ `metric-${index}` }
                            isClearable={ false }
                            onChange={ (e) => {
                              let origIndex = getValues("metrics4tag").findIndex(met => met.name == getValues(`view_metrics4tag.${index}.name`) )
                              setValue(`metrics4tag.${origIndex}.name`, e.value)
                              setValue(`view_metrics4tag.${index}.name`, e.value)
                            } }
                            options={
                              context.allMetrics.map(
                                met => met.name
                              ).filter(
                                met => !context.metrics4tag.map(met => met.name).includes(met)
                              ).map(
                                option => new Object({ label: option, value: option })
                            )}
                            value={ { label: field.value, value: field.value } }
                          />
                        }
                      />
                  }
                </td>
                {
                  !context.publicView &&
                    <td>
                      <Button
                        size="sm"
                        color="light"
                        data-testid={`remove-${index}`}
                        onClick={() => onRemove(index)}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </Button>
                      <Button
                        size="sm"
                        color="light"
                        data-testid={`insert-${index}`}
                        onClick={() => onInsert(index)}
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </Button>
                    </td>
                }
              </tr>
            </React.Fragment>
          )
        }
      </tbody>
    </table>
  )
}


const MetricTagsForm = ({
  name=undefined,
  tag=undefined,
  allMetrics=undefined,
  publicView=false,
  addview=false,
  location=undefined
}) => {

  const backend = new Backend()
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);

  const changeMutation = useMutation(async (values) => await backend.changeObject('/api/v2/internal/metrictags/', values));
  const addMutation = useMutation(async (values) => await backend.addObject('/api/v2/internal/metrictags/', values));
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/metrictags/${name}`))

  const default_metrics4tag = tag?.metrics.length > 0 ? tag.metrics : [{ name: "" }]

  const methods = useForm({
    defaultValues: {
      id: `${tag ? tag.id : ""}`,
      name: `${tag ? tag.name : ""}`,
      metrics4tag: default_metrics4tag,
      view_metrics4tag: default_metrics4tag,
      searchItem: ""
    },
    mode: "all",
    resolver: yupResolver(validationSchema)
  })

  const { control } = methods

  const searchItem = useWatch({ control, name: "searchItem" })
  const metrics4tag = useWatch({ control, name: "metrics4tag" })
  const view_metrics4tag = useWatch({ control, name: "view_metrics4tag" })

  useEffect(() => {
    if (view_metrics4tag.length === 0) {
      methods.setValue("view_metrics4tag", [{ name: "" }])
    }
  }, [view_metrics4tag])

  useEffect(() => {
    if (metrics4tag.length === 0) {
      methods.setValue("metrics4tag", [{ name: "" }])
    }
  }, [metrics4tag])

  useEffect(() => {
    methods.setValue("view_metrics4tag", metrics4tag.filter(e => e.name.toLowerCase().includes(searchItem.toLowerCase())))
  }, [searchItem])

  const toggleAreYouSure = () => {
    setAreYouSureModal(!areYouSureModal)
  }

  const onSubmitHandle = () => {
    let msg = `Are you sure you want to ${addview ? "add" : "change"} metric tag?`
    let title = `${addview ? "Add" : "Change "}metric tag`

    setModalMsg(msg)
    setModalTitle(title)
    setModalFlag('submit')
    toggleAreYouSure()
  }

  const doChange = () => {
    let formValues = methods.getValues()

    const sendValues = new Object({
      name: formValues.name,
      metrics: formValues.metrics4tag.map(met => met.name).filter(met => met !== "")
    })

    if (addview)
      addMutation.mutate(sendValues, {
        onSuccess: async (response) => {
          queryClient.invalidateQueries("public_metrictags")
          queryClient.invalidateQueries("metrictags")
          queryClient.invalidateQueries("metric")
          queryClient.invalidateQueries("public_metric")
          queryClient.invalidateQueries("metrictemplate")
          queryClient.invalidateQueries("public_metrictemplate")
          NotifyOk({
            msg: "Metric tag successfully added",
            title: "Added",
            callback: () => navigate("/ui/metrictags")
          })
          if (response && "detail" in response) {
            let msgs = response.detail.split("\n")
            msgs.forEach(msg => NotifyWarn({ title: "Warning", msg: msg }))
          }
        },
        onError: (error) => {
          NotifyError({
            title: "Error",
            msg: error.message ? error.message : "Error adding metric tag"
          })
        }
      })

    else
      changeMutation.mutate({ ...sendValues, id: formValues.id }, {
        onSuccess: (response) => {
          queryClient.invalidateQueries("public_metrictags")
          queryClient.invalidateQueries("metrictags")
          queryClient.invalidateQueries("metric")
          queryClient.invalidateQueries("public_metric")
          queryClient.invalidateQueries("metrictemplate")
          queryClient.invalidateQueries("public_metrictemplate")
          NotifyOk({
            msg: "Metric tag successfully changed",
            title: "Changed",
            callback: () => navigate("/ui/metrictags")
          })
          if ("detail" in response) {
            let msgs = response.detail.split("\n")
            msgs.forEach(msg => NotifyWarn({ title: "Warning", msg: msg }))
          }
        },
        onError: (error) => {
          NotifyError({
            title: "Error",
            msg: error.message ? error.message: "Error changing metric tag"
          })
        }
      })
  }

  const doDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries("public_metrictags")
        queryClient.invalidateQueries("metrictags")
        queryClient.invalidateQueries("metric")
        queryClient.invalidateQueries("public_metric")
        queryClient.invalidateQueries("metrictemplate")
        queryClient.invalidateQueries("public_metrictemplate")
        NotifyOk({
          msg: "Metric tag successfully deleted",
          title: "Deleted",
          callback: () => navigate("/ui/metrictags")
        })
      },
      onError: (error) => {
        NotifyError({
          title: "Error",
          msg: error.message ? error.message : "Error deleting metric tag"
        })
      }
    })
  }

  return (
    <BaseArgoView
      resourcename={ publicView ? "Metric tag details" : "metric tag" }
      location={ location }
      history={ false }
      publicview={ publicView }
      addview={ addview }
      modal={ true }
      state={{
        areYouSureModal,
        modalTitle,
        modalMsg,
        modalFunc: modalFlag === "submit" ?
          doChange
        :
          modalFlag === "delete" ?
            doDelete
          :
            undefined
      }}
      toggle={toggleAreYouSure}
    >
      <FormProvider { ...methods }>
        <Form onSubmit={ methods.handleSubmit(onSubmitHandle) } data-testid="form">
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
                        disabled={ publicView }
                        className={ `form-control ${methods.formState.errors?.name && "is-invalid"}` }
                      />
                    }
                  />
                  <ErrorMessage
                    errors={ methods.formState.errors }
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
            <ParagraphTitle title="Metric templates" />
            <MetricTagsContext.Provider value={{
              publicView: publicView,
              searchItem: searchItem,
              metrics4tag: metrics4tag,
              allMetrics: allMetrics
            }}>
              <MetricsList />
            </MetricTagsContext.Provider>
          </FormGroup>
          {
            !publicView &&
              <div className="submit-row d-flex align-items-center justify-content-between bg-light p-3 mt-5">
                {
                  !addview ?
                    <Button
                      color="danger"
                      onClick={() => {
                        setModalMsg("Are you sure you want to delete metric tag?")
                        setModalTitle("Delete metric tag")
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
                  color="success"
                  id="submit-button"
                  type="submit"
                >
                  Save
                </Button>
              </div>
          }
        </Form>
      </FormProvider>
    </BaseArgoView>
  )
}


export const MetricTagsComponent = (props) => {
  const { name } = useParams()
  const publicView = props.publicView
  const addview = props.addview
  const location = useLocation()

  const backend = new Backend()

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    "userdetails", () => fetchUserDetails(false),
    { enabled: !publicView }
  )

  const { data: tag, error: errorTag, isLoading: loadingTag } = useQuery(
    [`${publicView ? "public_" : ""}metrictags`, name], async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? "public_" : ""}metrictags/${name}`)
    },
    { enabled: !addview }
  )

  const { data: allMetrics, error: errorAllMetrics, isLoading: loadingAllMetrics } = useQuery(
    "metrictemplate", () => fetchMetricTemplates(publicView),
    { enabled: !publicView }
  )

  if (loadingUserDetails || loadingTag || loadingAllMetrics)
    return (
      <ChangeViewPlaceholder
        resourcename={ publicView ? "Metric tag details" : "metric tag" }
        infoview={ publicView }
      >
        <FormGroup>
          <Row>
            <Col md={6}>
              <InputPlaceholder />
            </Col>
          </Row>
        </FormGroup>
        <FormGroup>
          <ParagraphTitle title="Metric templates" />
          <Table className="placeholder rounded" style={{ height: "500px" }} />
        </FormGroup>
      </ChangeViewPlaceholder>
    )

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails} />)

  else if (errorTag)
    return (<ErrorComponent error={errorTag} />)

  else if (errorAllMetrics)
    return (<ErrorComponent error={errorAllMetrics} />)

  else if ((addview || tag ) && (publicView || (allMetrics && userDetails))) {
    return (
      <MetricTagsForm
        name={ name }
        tag={ tag ? tag : undefined }
        allMetrics={ allMetrics }
        publicView={ publicView }
        addview={ addview }
        location={ location }
        history={ history }
      />
    )
  } else
    return null
}