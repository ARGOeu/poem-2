import React, { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "react-query"
import { Link } from "react-router-dom"
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
import { Field, Formik } from "formik"
import {
  Form,
  FormGroup,
  InputGroup,
  InputGroupText,
  Row,
  Col,
  Button
 } from "reactstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSearch,faPlus, faTimes } from '@fortawesome/free-solid-svg-icons';


export const MetricTagsList = (props) => {
  const location = props.location
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
      column_width: "95%",
      Filter: DefaultColumnFilter
    }
  ], [])

  if (status === "loading")
    return (<LoadingAnim />)

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


export const MetricTagsComponent = (props) => {
  const name = props.match.params.name
  const publicView = props.publicView
  const location = props.location
  const history = props.history

  const [searchItem, setSearchItem] = useState('');
  const [areYouSureModal, setAreYouSureModal] = useState(false);
  const [modalFlag, setModalFlag] = useState(undefined);
  const [modalTitle, setModalTitle] = useState(undefined);
  const [modalMsg, setModalMsg] = useState(undefined);
  const [formValues, setFormValues] = useState(undefined);

  const backend = new Backend()
  const queryClient = useQueryClient()

  const changeMutation = useMutation(async (values) => await backend.changeObject('/api/v2/internal/metrictags/', values));
  const deleteMutation = useMutation(async () => await backend.deleteObject(`/api/v2/internal/metrictags/${name}`))

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    "userdetails", () => fetchUserDetails(false),
    { enabled: !publicView }
  )

  const { data: tag, error: errorTag, isLoading: loadingTag } = useQuery(
    [`${publicView ? "public_" : ""}metrictags`, name], async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? "public_" : ""}metrictags/${name}`)
    }
  )

  const { data: metrics, error: errorMetrics, isLoading: loadingMetrics } = useQuery(
    [`${publicView ? "public_" : ""}metrics4tags`, name], async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? "public_" : ""}metrics4tags/${name}`)
    }
  )

  const { data: allMetrics, error: errorAllMetrics, isLoading: loadingAllMetrics } = useQuery(
    "metrictemplate", () => fetchMetricTemplates(publicView),
    { enabled: !publicView }
  )

  const toggleAreYouSure = () => {
    setAreYouSureModal(!areYouSureModal)
  }

  const onSubmitHandle = (values) => {
    let msg = "Are you sure you want to change metric tag?"
    let title = "Change metric tag"

    setFormValues(values);
    setModalMsg(msg);
    setModalTitle(title);
    setModalFlag('submit');
    toggleAreYouSure();
  }

  const doChange = () => {
    const sendValues = new Object({
      id: formValues.id,
      name: formValues.name,
      metrics: formValues.metrics4tag
    })

    changeMutation.mutate(sendValues, {
      onSuccess: (response) => {
        queryClient.invalidateQueries("public_metrictags")
        queryClient.invalidateQueries(["public_metrics4tags", name])
        queryClient.invalidateQueries("metrictags")
        queryClient.invalidateQueries(["metrics4tags", name])
        NotifyOk({
          msg: "Metric tag successfully changed",
          title: "Changed",
          callback: () => history.push("/ui/metrictags")
        })
        if ("detail" in response)
          NotifyWarn({
            title: "Warning",
            msg: response.detail
          })
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
        queryClient.invalidateQueries(["public_metrics4tags", name])
        queryClient.invalidateQueries("metrictags")
        queryClient.invalidateQueries(["metrics4tags", name])
        NotifyOk({
          msg: "Metric tag successfully deleted",
          title: "Deleted",
          callback: () => history.push("/ui/metrictags")
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

  if (loadingUserDetails || loadingTag || loadingMetrics || loadingAllMetrics)
    return (<LoadingAnim/>)

  else if (errorUserDetails)
    return (<ErrorComponent error={errorUserDetails} />)

  else if (errorTag)
    return (<ErrorComponent error={errorTag} />)

  else if (errorMetrics)
    return (<ErrorComponent error={errorMetrics} />)

  else if (errorAllMetrics)
    return (<ErrorComponent error={errorAllMetrics} />)

  else if (tag && metrics && (publicView || (allMetrics && userDetails))) {
    return (
      <BaseArgoView
        resourcename={publicView ? "Metric tag details" : "metric tag"}
        location={location}
        history={false}
        publicview={publicView}
        modal={true}
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
        <Formik
          initialValues={{
            id: `${tag ? tag.id : ""}`,
            name: `${tag ? tag.name: ""}`,
            metrics4tag: metrics ? metrics : [],
          }}
        >
          {
            props => (
              <Form data-testid="form">
                <FormGroup>
                  <Row>
                    <Col md={6}>
                      <InputGroup>
                        <InputGroupText>Name</InputGroupText>
                        <Field
                          type="text"
                          name="name"
                          data-testid="name"
                          disabled={publicView}
                          className="form-control"
                          id="name"
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
                          <Field
                            type="text"
                            name="search_items"
                            data-testid="search_items"
                            className="form-control"
                            onChange={(e) => setSearchItem(e.target.value)}
                            component={SearchField}
                          />
                        </td>
                      </tr>
                      {
                        props.values.metrics4tag.filter(
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
                                    <CustomReactSelect
                                      name={ item }
                                      id={ `metric-${index}` }
                                      isClearable={ false }
                                      onChange={ (e) => {
                                        let tmpMetrics = props.values.metrics4tag
                                        tmpMetrics[index] = e.value
                                        props.setFieldValue("metrics4tag", tmpMetrics)
                                      } }
                                      options={ allMetrics.map(met => met.name).filter(met => !metrics.includes(met)).map(option => new Object({ label: option, value: option }))  }
                                      value={ { label: item, value: item } }
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
                                        let tmpMetrics = props.values.metrics4tag
                                        tmpMetrics.splice(index, 1)
                                        props.setFieldValue("metrics4tag", tmpMetrics)
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faTimes} />
                                    </Button>
                                    <Button
                                      size="sm"
                                      color="light"
                                      data-testid={`insert-${index}`}
                                      onClick={() => {
                                        let tmpMetrics = props.values.metrics4tag
                                        tmpMetrics.splice(index + 1, 0, "")
                                        props.setFieldValue("metrics4tag", tmpMetrics)
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
                      <Button
                        color="success"
                        onClick={() => onSubmitHandle(props.values)}
                      >
                        Save
                      </Button>
                    </div>
                }
              </Form>
            )
          }
        </Formik>
      </BaseArgoView>
    )
  } else
    return null
}