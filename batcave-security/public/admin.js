async function loadAuditLogs () {
  const tbody = document.getElementById('audit-body')

  try {
    const response = await fetch('/api/audit-logs')
    if (!response.ok) throw new Error('Accès refusé')

    const logs = await response.json()

    if (logs.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="text-center">Aucun événement enregistré.</td></tr>'
      return
    }

    tbody.innerHTML = logs
      .map(log => {
        const badgeClass =
          log.action === 'FRAUD'
            ? 'bg-danger'
            : log.action === 'LOGIN'
              ? 'bg-success'
              : 'bg-secondary'

        return `<tr>
          <td>${log.username}</td>
          <td><span class="badge ${badgeClass}">${log.action}</span></td>
          <td>${log.ip_address || '—'}</td>
          <td class="text-truncate" style="max-width: 250px" title="${log.user_agent || ''}">${log.user_agent || '—'}</td>
          <td>${log.timestamp}</td>
        </tr>`
      })
      .join('')
  } catch {
    tbody.innerHTML =
      '<tr><td colspan="5" class="text-center text-danger">Impossible de charger les logs.</td></tr>'
  }
}

loadAuditLogs()
