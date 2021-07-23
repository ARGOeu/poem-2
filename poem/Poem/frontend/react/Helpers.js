export function downloadFile(content, filename) {
  const link = document.createElement('a');
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  link.setAttribute('href', URL.createObjectURL(blob));
  link.setAttribute('download', filename)
  link.click();
  link.remove();
}