import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app');

document.getElementById('add-btn').addEventListener('click', (event => {
    console.log('Submit pressed');
    
    let addr1 = document.getElementById('addr1_input').value;
    let addr2 = document.getElementById('addr2_input').value;
    
    //build the url from the response that the user typed in 
    let requests = [
        fetch('https://nominatim.openstreetmap.org/search?q=' + addr1 + '&format=jsonv2'),
        fetch('https://nominatim.openstreetmap.org/search?q=' + addr2 + '&format=jsonv2')
    ]
    Promise.all(requests)
    .then((responses) => {
        // need to push each response into an array to convert each of them to json
        let parse_array = [];
        for(let i = 0; i < responses.length; i++){
            parse_array.push(responses[i].json());
        }
        return Promise.all(parse_array); // this returns a promise, it doesn't return a json object
    })
    .then((data) => {
        console.log(data);

        let addr1_data = data[0][0];
        let addr2_data = data[1][0];
        console.log(addr1_data);
        let addr1_latlon = {
            lat: parseFloat(addr1_data.lat),
            lon: parseFloat(addr1_data.lon),
        }
        let addr2_latlon = {
            lat: parseFloat(addr2_data.lat),
            lon: parseFloat(addr2_data.lon),
        }

        const dLat = (addr2_latlon.lat - addr1_latlon.lat) * Math.PI / 180;
        const dLon = (addr2_latlon.lon - addr1_latlon.lon) * Math.PI / 180;

        var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(addr1_latlon.lat * Math.PI/180) * Math.cos(addr2_latlon.lat  * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = 3959 * c; 

        const result = document.getElementById('distance');
        result.textContent = `The distance between the two addresses is ${d.toFixed(2)} miles.`;
    })
    .catch((err) => {
        console.log(err);
    })
}), false);

function displayTableData(incidents) {
    const table = document.getElementById(incidentTable)

    incidents.forEach(element => {
        let row = `
        <tr>
            <td></td>
            <td></td>
            <td></td>
            <td></td>
        </tr>
        `;
    });
}

