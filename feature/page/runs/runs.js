
export function renderRuns() {
    chrome.storage.local.get(["records"], (result) => {
        const records = result.records || [];
        const tbody = document.querySelector("#dataTable tbody");
        tbody.innerHTML = "";

        // Sort newest first
        records.slice().reverse().forEach(record => {
            const date = new Date(record.time).toLocaleString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }).replace(',', '');

            const row = document.createElement("tr");
            row.innerHTML = `
        <td>${date}</td>
        <td>${record.overallWPM || '—'}</td>
        <td>${record.words.length}</td>
      `;
            tbody.appendChild(row);
        });

    });



}