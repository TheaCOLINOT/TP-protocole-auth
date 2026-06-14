document.getElementById('register-form').onsubmit = async e => {
  e.preventDefault()

  const username = document.getElementById('username').value
  const password = document.getElementById('password').value
  const messageElement = document.getElementById('message')

  const response = await fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })

  const text = await response.text()

  if (response.ok) {
    messageElement.className = 'mt-3 mb-0 text-success'
    messageElement.textContent = text
    document.getElementById('register-form').reset()
  } else {
    messageElement.className = 'mt-3 mb-0 text-danger'
    messageElement.textContent = text
  }
}
