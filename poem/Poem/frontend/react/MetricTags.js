import React, { useState } from "react"
import { useQuery } from "react-query"
import { Link } from "react-router-dom"
import { fetchMetricTags } from "./QueryFunctions"
import {
  BaseArgoTable,
  BaseArgoView,
  DefaultColumnFilter,
  ErrorComponent,
  Icon,
  LoadingAnim,
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
  Col
 } from "reactstrap"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSearch } from '@fortawesome/free-solid-svg-icons';


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

  const [searchItem, setSearchItem] = useState('');

  const backend = new Backend()

  const { data: tag, error: errorTag, isLoading: loadingTag } = useQuery(
    [`${publicView ? "public_" : ""}metrictags`, name], async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? "public_" : ""}metrictags/${name}`)
    }
  )

  const { data: metrics, error: errorMetrics, isLoading: loadingMetrics } = useQuery(
    `${publicView ? "public_" : ""}metrics4tags`, async () => {
      return await backend.fetchData(`/api/v2/internal/${publicView ? "public_" : ""}metrics4tags/${name}`)
    }
  )

  if (loadingTag || loadingMetrics)
    return (<LoadingAnim/>)

  else if (errorTag)
    return (<ErrorComponent error={errorTag} />)

  else if (errorMetrics)
    return (<ErrorComponent error={errorMetrics} />)

  else if (tag && metrics) {
    return (
      <BaseArgoView
        resourcename={publicView ? "Metric tag details" : "metric tag"}
        publicview={publicView}
        location={location}
        history={false}
      >
        <Formik
          initialValues={{
            id: `${tag ? tag.id : ""}`,
            name: `${tag ? tag.name: ""}`,
            metrics4tag: metrics
          }}
        >
          {
            props => (
              <Form>
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
                          required={true}
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
                        <th style={{width: "95%"}}><Icon i="metrictemplates" />Metric template</th>
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
                              <td>{ item }</td>
                            </tr>
                          </React.Fragment>
                        )
                      }
                    </tbody>
                  </table>
                </FormGroup>
              </Form>
            )
          }
        </Formik>
      </BaseArgoView>
    )
  } else
    return null
}