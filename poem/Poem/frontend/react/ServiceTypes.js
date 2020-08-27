import React, { useState, useEffect } from 'react';
import { Backend } from './DataManager';
import { LoadingAnim, ErrorComponent } from './UIElements';

export const ServiceTypesList = (props) => {
  const location = props.location;
  const backend = new Backend();
  const [loading, setLoading] = useState(false);
  const [serviceTypesDescriptions, setServiceTypesDescriptions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const fetchData = async () => {
        let json = await backend.fetchData('/api/v2/internal/servicetypesdesc');
        setServiceTypesDescriptions(json);
        setLoading(false);
      }
      fetchData();
    }
    catch (err) {
      setError(err)
      setLoading(false)
    }
  }, [])

  if (loading)
    return (<LoadingAnim/>);

  else if (error)
    return (<ErrorComponent error={error}/>);

  return (
    "I'm ServiceTypes"
  )
}
