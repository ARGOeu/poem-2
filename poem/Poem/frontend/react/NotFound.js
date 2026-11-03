import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = ({ homePath = '/ui/home' }) =>
  <div className="m-3 my-4 p-4 border rounded bg-light">
    <h2>Page not found</h2>
    <p>This page is unavailable or you do not have permission to view it.</p>
    <Link className="btn btn-primary" to={homePath}>Go to home page</Link>
  </div>

export default NotFound;

