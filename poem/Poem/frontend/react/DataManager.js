export class Backend {
  fetchServices() {
    return fetch('/api/v2/internal/services')
      .then(response => response.json())
  }
}

class WebApi {

}
