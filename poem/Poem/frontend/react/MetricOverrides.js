import React, { useMemo } from "react"
import { useQuery } from "react-query"
import { Link } from "react-router-dom"
import { Backend } from "./DataManager"
import { fetchUserDetails } from "./QueryFunctions"
import { BaseArgoTable, BaseArgoView, ErrorComponent, LoadingAnim } from "./UIElements"


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
          to={`/ui/administration/metricoverride/${e.name}`}
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