import React from "react"
import { useQuery } from "react-query"
import { Link } from "react-router-dom"
import { fetchMetricTags } from "./QueryFunctions"
import {
  BaseArgoTable,
  BaseArgoView,
  DefaultColumnFilter,
  ErrorComponent,
  LoadingAnim
} from "./UIElements"


export const MetricsTagsList = (props) => {
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
        <Link to={`/ui/metrictags/${row.value}`}>{row.value}</Link>,
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