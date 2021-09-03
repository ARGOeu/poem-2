export function downloadJSON(content, filename) {
  return downloadFile(content, filename, 'json')
}


export function downloadCSV(content, filename) {
  return downloadFile(content, filename, 'csv')
}


function downloadFile(content, filename, type) {
  const link = document.createElement('a');
  if (type === 'json') {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    link.setAttribute('href', URL.createObjectURL(blob));
  } else{
    link.setAttribute('href', encodeURI(`data:text/csv;charset=utf8,\ufeff${content}`));
  }
  link.setAttribute('download', filename)
  link.click();
  link.remove();
}