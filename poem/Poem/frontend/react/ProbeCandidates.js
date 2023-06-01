import React, { useMemo } from "react";
import { useQuery } from "react-query";
import { fetchUserDetails } from "./QueryFunctions";
import { Backend } from "./DataManager";
import { BaseArgoTable, BaseArgoView, ErrorComponent, LoadingAnim } from "./UIElements";
import { Badge } from "reactstrap";
import { Link } from "react-router-dom";


const fetchCandidates = async () => {
  const backend = new Backend()

  return await backend.fetchData("/api/v2/internal/probecandidates")
}


export const ProbeCandidateList = (props) => {
  const location = props.location

  const { data: userDetails, error: errorUserDetails, isLoading: loadingUserDetails } = useQuery(
    "userDetails", () => fetchUserDetails(true)
  )

  const { data: probeCandidates, error: errorProbeCandidates, isLoading: loadingProbeCandidates } = useQuery(
    "probecandidate", () => fetchCandidates(),
    { enabled: !!userDetails }
  )

  const columns = useMemo(() => [
    {
      Header: "#",
      accessor: null,
      column_width: "5%"
    },
    {
      Header: "Name",
      id: "name",
      column_width: "20%",
      accessor: e => 
        <Link to={`/ui/administration/probecandidates/${e.id}`}>
          { e.name }
        </Link>
    },
    {
      Header: "Description",
      accessor: "description",
      column_width: "58%"
    },
    {
      Header: "Created",
      accessor: "created",
      column_width: "12%"
    },
    {
      Header: "Status",
      accessor: "status",
      column_width: "5%",
      Cell: row =>
        <div style={{ textAlign: "center" }}>
          {
            row.value === "submitted" ?
              <Badge color="info" className="fw-normal">{ row.value }</Badge>
            :
              row.value === "testing" ?
                <Badge color="warning" className="fw-normal">{ row.value }</Badge>
              :
                row.value === "deployed" ?
                  <Badge color="success" className="fw-normal">{ row.value }</Badge>
                :
                  <Badge color="secondary" className="fw-normal">{ row.value }</Badge>
          }
        </div>
    }
  ])

  if (loadingUserDetails || loadingProbeCandidates)
    return (<LoadingAnim />)

  else if (errorUserDetails)
    return (<ErrorComponent error={ errorUserDetails } />)
  
  else if (errorProbeCandidates)
    return (<ErrorComponent error={ errorProbeCandidates } />)

  else if (probeCandidates && userDetails?.is_superuser)
    return (
      <BaseArgoView
        resourcename="Select probe candidate to change"
        location={ location }
        infoview={ true }
      >
        <BaseArgoTable
          data={ probeCandidates }
          columns={ columns }
          page_size={ 10 }
          resourcename="probe candidates"
        />
      </BaseArgoView>
    )

  else
    return null
}