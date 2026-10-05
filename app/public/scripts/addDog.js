document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('image');
  const previewText = document.getElementById('previewText');

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const fileName = fileInput.files.length > 0 ? fileInput.files[0].name : 'No file selected';
      previewText.textContent = fileName;
    });
  }
});
