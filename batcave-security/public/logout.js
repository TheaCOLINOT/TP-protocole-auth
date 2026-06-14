function logout () {
  fetch('/admin-page', {
    headers: { Authorization: 'Basic logout:logout' }
  }).then(() => {
    window.location.href = '/auth/register'
  })
}
