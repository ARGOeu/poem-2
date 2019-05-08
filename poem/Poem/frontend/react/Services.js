import React, { Component } from 'react';

import './Services.css';

class Services extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      rows: null,
      rowspan: null,
    }
  }

  componentDidMount() {
    this.setState({loading: true})
    fetch('/api/v2/internal/services')
      .then(response => response.json())
      .then(json =>
        this.setState({
          rows: json.result.rows, 
          rowspan: json.result.rowspan, 
          loading: false})
      )
  }

  getRowSpan(re, match) {
    var m = re.filter(r => r[0] === match);
    if (m.length) {
      return m[0][1]
    }
    else {
      return 1 
    }
  }

  render() {
    const {loading, rows, rowspan} = this.state

    return (
      (loading)
      ?
        <div>Loading...</div>
      :
        <table className="table table-bordered table-sm">
          <thead className="table-active">
            <tr>
              <th id='argo-th' scope="col">Service area</th>
              <th id='argo-th' scope="col">Service name</th>
              <th id='argo-th' scope="col">Service type</th>
              <th id='argo-th' scope="col">Metric</th>
              <th id='argo-th' scope="col">Probe</th>
            </tr>
          </thead>
          <tbody>
            {
              rows && rows.map((e, i) =>
                <tr key={i}>
                  {
                    e.service_area && 
                      <td id='argo-td' className="table-light" rowSpan={this.getRowSpan(rowspan.service_area, e.service_area)}>
                        {e.service_area}
                      </td>
                  }
                  {
                    e.service_name && 
                      <td id='argo-td' className="table-light" rowSpan={this.getRowSpan(rowspan.service_name, e.service_name)}>
                        {e.service_name}
                      </td>
                  }
                  {
                    e.service_type && 
                      <td id='argo-td' className="table-light" rowSpan={this.getRowSpan(rowspan.service_type, e.service_type)}>
                        {e.service_type}
                      </td>
                  }
                  {
                    e.metric && 
                      <td id='argo-td' className="table-light" rowSpan={this.getRowSpan(rowspan.metric, e.metric)}>
                        {e.metric}
                      </td>
                  }
                  {
                    e.probe && 
                      <td id='argo-td' className="table-light" rowSpan={this.getRowSpan(rowspan.probe, e.probe)}>
                        {e.probe}
                      </td>
                  }
                </tr>
              )
            }
          </tbody>
        </table>
    )

  }
}

export default Services;
