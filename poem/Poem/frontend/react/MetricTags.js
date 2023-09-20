import React, { useState } from "react"
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
  LoadingAnim,
  NotifyError,
  NotifyOk,
  NotifyWarn,
  ParagraphTitle,
  SearchField
} from "./UIElements"
import { Backend } from "./DataManager"
import {
  Form,
  FormGroup,
  InputGroup,
  InputGroupText,
  Row,
  Col,
  Button,
  Badge,
  Input,
  FormFeedback
 } from "reactstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSearch,faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';
import { Controller, useForm, useWatch } from "react-hook-form"
import { ErrorMessage } from '@hookform/error-message'
import { yupResolver } from '@hookform/resolvers/yup'
import * as Yup from "yup"
import { CustomButton, CustomHeadline, CustomInput, CustomProfilesList, CustomSubtitle, CustomTable } from "./CustomPlaceholders"

const validationSchema = Yup.object().shape({
  name: Yup.string().required("This field is required")
})


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
                  { metric }
                </Badge>
              )
          }
        </div>,
      column_width: "75%",
      Filter: DefaultColumnFilter
    }
  ], [])

  if (status === "loading")
    return (<CustomProfilesList />)

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

  const { control, getValues, setValue, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      id: `${tag ? tag.id : ""}`,
      name: `${tag ? tag.name : ""}`,
      metrics4tag: tag?.metrics.length > 0 ? tag.metrics : [""],
      searchItem: ""
    },
    mode: "all",
    resolver: yupResolver(validationSchema)
  })

  const searchItem = useWatch({ control, name: "searchItem" })
  const metrics4tag = useWatch({ control, name: "metrics4tag" })

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
    let formValues = getValues()

    const sendValues = new Object({
      name: formValues.name,
      metrics: formValues.metrics4tag.filter(met => met !== "")
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
      <Form onSubmit={ handleSubmit(onSubmitHandle) } data-testid="form">
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
                      className={ `form-control ${errors?.name && "is-invalid"}` }
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
          <ParagraphTitle title="Metric templates" />
          <table className="table table-bordered table-sm table-hover" style={{width: "95%"}}>
            <thead className="table-active">
              <tr>
                <th className="align-middle text-center" style={{width: "5%"}}>#</th>
                <th style={{width: "85%"}}><Icon i="metrictemplates" />Metric template</th>
                {
                  !publicView && <th className="align-middle text-center" style={{width: "10%"}}>Actions</th>
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
                metrics4tag.filter(
                  filteredRow => filteredRow.toLowerCase().includes(searchItem.toLowerCase())
                ).map((item, index) =>
                  <React.Fragment key={index}>
                    <tr key={index}>
                      <td className="align-middle text-center">
                        { index + 1 }
                      </td>
                      <td>
                        {
                          publicView ?
                            item
                          :
                            <Controller
                              name={ item }
                              control={ control }
                              render={ ({ field }) =>
                                <CustomReactSelect
                                  name={ item }
                                  forwardedRef={ field.ref }
                                  id={ `metric-${index}` }
                                  isClearable={ false }
                                  onChange={ (e) => {
                                    let tmpMetrics = getValues("metrics4tag")
                                    tmpMetrics[index] = e.value
                                    setValue("metrics4tag", tmpMetrics)
                                  } }
                                  options={
                                    allMetrics.map(
                                      met => met.name
                                    ).filter(
                                      met => !metrics4tag.includes(met)
                                    ).map(
                                      option => new Object({ label: option, value: option })
                                  )}
                                  value={ { label: item, value: item } }
                                />
                              }
                            />
                        }
                      </td>
                      {
                        !publicView &&
                          <td>
                            <Button
                              size="sm"
                              color="light"
                              data-testid={`remove-${index}`}
                              onClick={() => {
                                let tmpMetrics = metrics4tag
                                tmpMetrics.splice(index, 1)
                                if (tmpMetrics.length === 0)
                                  tmpMetrics = [""]
                                setValue("metrics4tag", tmpMetrics)
                              }}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </Button>
                            <Button
                              size="sm"
                              color="light"
                              data-testid={`insert-${index}`}
                              onClick={() => {
                                let tmpMetrics = metrics4tag
                                tmpMetrics.splice(index + 1, 0, "")
                                setValue("metrics4tag", tmpMetrics)
                              }}
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
    </BaseArgoView>
  )
}


export const MetricTagsComponent = (props) => {
  const { name } = useParams()
  const publicView = props.publicView
  const addview = props.addview
  const location = useLocation()
  // const navigate = useNavigate()

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
      <>
        <CustomHeadline height="38.4px" width="272px" />
        <Form className='ms-2 mb-1 mt-2 p-3 border placeholder-glow rounded d-flex flex-column'>
          <CustomInput height="37.6px" width="50%" custStyle="mb-3"/>
          <CustomSubtitle height="36.8px" custStyle="mb-2" />
          <CustomTable height="126px" width="95%" />
          {/\/add/.test(window.location.pathname) ? 
            <div className='ms-2 mb-2 mt-5 p-3 border placeholder-glow rounded d-flex justify-content-end'>
              <CustomButton height="37.6px" width="100px" />
            </div> 
            :
            <div className='ms-2 mb-2 mt-5 p-3 border placeholder-glow rounded d-flex justify-content-between'>
              <CustomButton height="37.6px" width="100px" />
              <CustomButton height="37.6px" width="100px" />
            </div>
          }
        </Form>
      </>
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