const axios = require('axios');


const ACTIONS = ['--create', '--fetch'];

const API_GATEWAY_ENDPOINT = '<api_gateway_endpoint>';
// 'https://lsgxsq5pnf.execute-api.eu-central-1.amazonaws.com/prod/post'

const action = process.argv[2];
if (!action || !ACTIONS.includes(action)) {
    console.error('No action found: please run this script with --create or --fetch flag');
}

let config;

if (action === '--create') {
    const data = JSON.stringify({
        "post": {
            "title": "My testing post",
            "content": "This is a post about whatever"
        },
        "user": {
            "username": "yagoleonel"
        }
    });

    config = {
        method: 'post',
        url: API_GATEWAY_ENDPOINT,
        headers: {
            'Content-Type': 'application/json'
        },
        data
    };
} else if (action === '--fetch') {
    config = {
        method: 'get',
        url: API_GATEWAY_ENDPOINT,
        headers: {}
    };
    
}

axios(config)
.then(function (response) {
    console.table(response.data);
})
.catch(function (error) {
    console.log(error);
});