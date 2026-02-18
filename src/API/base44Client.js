// JavaScript Example: Reading Entities
// Filterable fields: type, amount, date, category, description, payment_method, client_id, notes
async function fetchTransactionEntities() {
    const response = await fetch(`https://app.base44.com/api/apps/698e766b3ef960b0b1acafa4/entities/Transaction`, {
        headers: {
            'api_key': '0b0eb33590a847c89f9d269875d7756d', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        }
    });
    const data = await response.json();
    console.log(data);
}

// JavaScript Example: Updating an Entity
// Filterable fields: type, amount, date, category, description, payment_method, client_id, notes
async function updateTransactionEntity(entityId, updateData) {
    const response = await fetch(`https://app.base44.com/api/apps/698e766b3ef960b0b1acafa4/entities/Transaction/${entityId}`, {
        method: 'PUT',
        headers: {
            'api_key': '0b0eb33590a847c89f9d269875d7756d', // or use await User.me() to get the API key
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
    });
    const data = await response.json();
    console.log(data);
}