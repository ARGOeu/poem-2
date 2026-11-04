import React from 'react';
import { Alert, Button } from 'reactstrap';

const PageUnavailable = ({ error }) => (
  <div className="m-3 my-4">
    <Alert color="warning" fade={false}>
      <h2 className="alert-heading">Unable to load this page</h2>
      <p>The page could not be loaded. Please try again.</p>
      {error && (
        <details className="mb-3">
          <summary>Error details</summary>
          <div className="mt-2 text-break">
            {error.toString().split('; ').map((detail, index) => (
              <p key={index}>{detail}</p>
            ))}
          </div>
        </details>
      )}
      <Button color="primary" onClick={() => window.location.reload()}>
        Reload page
      </Button>
    </Alert>
  </div>
);

export default PageUnavailable;
