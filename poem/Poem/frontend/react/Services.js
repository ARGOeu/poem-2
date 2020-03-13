import React, { Component } from 'react';
import { BaseArgoView, LoadingAnim, Icon } from './UIElements';
import {Link} from 'react-router-dom';
import {Backend} from './DataManager';
import { ProbeVersionLink } from './Metrics';

import './Services.css';

class Services extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      rows: null,
      rowspan: null,
    };

    this.backend = new Backend();
  }

  componentDidMount() {
    this.setState({loading: true});
    this.backend.fetchData('/api/v2/internal/services')
      .then(json =>
        this.setState({
          rows: json.result.rows,
          rowspan: json.result.rowspan,
          loading: false})
      );
  }

  getRowSpan(re, match) {
    var m = re.filter(r => r[0] === match);
    return m.length ? m[0][1] : 1;
  }

  render() {
    const {loading, rows, rowspan} = this.state;

    if (loading) {
      return (<LoadingAnim />)

    }
    else if (!loading && rows) {
      return (
        <BaseArgoView
          resourcename='Services and probes'
          infoview={true}>
          <table className="table table-bordered table-sm">
            <thead className="table-active">
              <tr>
                <th id='argo-th' scope="col">Service category</th>
                <th id='argo-th' scope="col">Service name</th>
                <th id='argo-th' scope="col"><Icon i='serviceflavour'/> Service type</th>
                <th id='argo-th' scope="col"><Icon i='metrics'/> Metric</th>
                <th id='argo-th' scope="col"><Icon i='probes'/> Probe</th>
              </tr>
            </thead>
            <tbody>
              {
                rows.map((e, i) =>
                  <tr key={i}>
                    {
                      e.service_category &&
                        <td id='argo-td' className="table-light" rowSpan={this.getRowSpan(rowspan.service_category, e.service_category)}>
                          {e.service_category}
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
                          <Icon i='serviceflavour'/> {e.service_type}
                        </td>
                    }
                    {
                      e.metric &&
                        <td id='argo-td' className="table-light" rowSpan={this.getRowSpan(rowspan.metric, e.metric)}>
                          <Icon i='metrics'/> <Link to={'/ui/metrics/' + e.metric}>{e.metric}</Link>
                        </td>
                    }
                    {
                      e.probe &&
                        <td id='argo-td' className="table-light" rowSpan={this.getRowSpan(rowspan.probe, e.probe)}>
                          <Icon i='probes'/> <ProbeVersionLink probeversion={e.probe}/>
                        </td>
                    }
                  </tr>
                )
              }
            </tbody>
          </table>
        </BaseArgoView>
      )
    }
    else
      return null
  }
}

export default Services;
