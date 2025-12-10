<script setup>
import { reactive, ref, onMounted } from 'vue'

let crime_url = ref('');
let dialog_err = ref(false);
let map = reactive(
    {
        leaflet: null,
        center: {
            lat: 44.955139,
            lng: -93.102222,
            address: ''
        },
        zoom: 12,
        bounds: {
            nw: {lat: 45.008206, lng: -93.217977},
            se: {lat: 44.883658, lng: -92.993787}
        },
        neighborhood_markers: [
            {location: [44.942068, -93.020521], marker: null},
            {location: [44.977413, -93.025156], marker: null},
            {location: [44.931244, -93.079578], marker: null},
            {location: [44.956192, -93.060189], marker: null},
            {location: [44.978883, -93.068163], marker: null},
            {location: [44.975766, -93.113887], marker: null},
            {location: [44.959639, -93.121271], marker: null},
            {location: [44.947700, -93.128505], marker: null},
            {location: [44.930276, -93.119911], marker: null},
            {location: [44.982752, -93.147910], marker: null},
            {location: [44.963631, -93.167548], marker: null},
            {location: [44.973971, -93.197965], marker: null},
            {location: [44.949043, -93.178261], marker: null},
            {location: [44.934848, -93.176736], marker: null},
            {location: [44.913106, -93.170779], marker: null},
            {location: [44.937705, -93.136997], marker: null},
            {location: [44.949203, -93.093739], marker: null}
        ]
    }
);

let crimes = ref([]);
let visibleCrimes = ref([]);
let neighborhoods = ref([]);
let codes = ref([]);

// Vue callback for once <template> HTML has been added to web page
onMounted(() => {
    // Create Leaflet map (set bounds and valied zoom levels)
    map.leaflet = L.map('leafletmap').setView([map.center.lat, map.center.lng], map.zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 11,
        maxZoom: 18
    }).addTo(map.leaflet);
    map.leaflet.setMaxBounds([[44.883658, -93.217977], [45.008206, -92.993787]]);

    // Get boundaries for St. Paul neighborhoods
    let district_boundary = new L.geoJson();
    district_boundary.addTo(map.leaflet);
    fetch('data/StPaulDistrictCouncil.geojson')
    .then((response) => {
        return response.json();
    })
    .then((result) => {
        result.features.forEach((value) => {
            district_boundary.addData(value);
        });
    })
    .catch((error) => {
        console.log('Error:', error);
    });

    map.leaflet.on('moveend', async () => {
            const center = map.leaflet.getCenter();
            let {lat,lng} = clampLatLng(center.lat, center.lng);

            map.center.lat = lat;
            map.center.lng = lng;

            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
            const result = await fetch(url, {
                headers: { 'User-Agent': 'stpaul-crime-project/1.0 (student@email.com)'}
                });
            const json_data = await result.json();
            
            if(json_data && json_data.display_name) {
            locationInput.value = json_data.display_name;
        } else {
            locationInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
    });
});


// FUNCTIONS
// Function called once user has entered REST API URL
async function initializeCrimes() {
        const baseUrl = crime_url.value.replace(/\/+$/, "");
        console.log("FETCHING FROM:", baseUrl);

        //Get codes
        const codes_res = await fetch(`${baseUrl}/codes`);
        const codes_json = await codes_res.json();
        codes.value = codes_json.rows;  // IMPORTANT FIX

        //Get incidents
        const incidents_res = await fetch(`${baseUrl}/incidents?limit=1000`);
        const incidents_json = await incidents_res.json();

        console.log("Raw incidents:", incidents_json);

        crimes.value = incidents_json.map(c => ({
            case_number: c.case_number,
            date: c.date,
            time: c.time,
            code: c.code,
            incident: c.incident,
            police_grid: c.police_grid,
            neighborhood_number: c.neighborhood_number,
            block: c.block
        }));
        visibleCrimes.value = crimes.value;
        console.log("Mapped crimes length:", crimes.value.length);
}

let locationInput = ref('');

function clampLatLng(lat, lng){
    const minLat = map.bounds.se.lat;
    const maxLat = map.bounds.nw.lat;
    const minLng = map.bounds.nw.lng;
    const maxLng = map.bounds.se.lng;

    const clampedLat = Math.min(Math.max(lat, minLat), maxLat);
    const clampedLng = Math.min(Math.max(lng, minLng), maxLng);
    return { lat: clampedLat, lng: clampedLng };
}
async function getLocation() {
    const selectedLatLngValues = locationInput.value.trim();
    if(!selectedLatLngValues) return;

    let lat;
    let lng;

    const formattedValues = selectedLatLngValues.split(',');
    if(formattedValues.length === 2 && !isNaN(parseFloat(formattedValues[0]))&& !isNaN(parseFloat(formattedValues[1]))) {
            lat = parseFloat(formattedValues[0]);
            lng = parseFloat(formattedValues[1]);
    }
    else {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(selectedLatLngValues)}&format=jsonv2`;

        const result = await fetch(url, {
                headers: { 'User-Agent': 'stpaul-crime-project/1.0 (student@email.com)'}
                });
        const json_data = await result.json();

        if(!json_data.length) {
            console.log("No geocode result");
            return;
        }
        lat = parseFloat(json_data[0].lat);
        lng = parseFloat(json_data[0].lon);
    }

    const { lat: cLat, lng: cLng } = clampLatLng(lat, lng);
    map.center.lat = cLat;
    map.center.lng = cLng;

    if(map.leaflet) {
        const zoom = Math.max(map.zoom, 14)
        map.zoom = zoom;
        map.leaflet.setView([cLat, cLng], zoom);
    }
}

// Function called when user presses 'OK' on dialog box
function closeDialog() {
    let dialog = document.getElementById('rest-dialog');
    let url_input = document.getElementById('dialog-url');
    if (crime_url.value !== '' && url_input.checkValidity()) {
        dialog_err.value = false;
        dialog.close();
        initializeCrimes();
    }
    else {
        dialog_err.value = true;
    }
}
</script>

<template>
    <!-- St Paul Crime API Input -->
    <dialog id="rest-dialog" open>
        <h1 class="dialog-header">St. Paul Crime REST API</h1>
        <label class="dialog-label">URL: </label>
        <input id="dialog-url" class="dialog-input" type="url" v-model="crime_url" placeholder="http://localhost:8000" />
        <p class="dialog-error" v-if="dialog_err">Error: must enter valid URL</p>
        <br/>
        <button class="button" type="button" @click="closeDialog">OK</button>
    </dialog>
    <div class="grid-container ">
        <div class="grid-x grid-padding-x">
            <div id="leafletmap" class="cell auto"></div>
        </div>
    </div>

    <!-- Lat/Lon Input Box -->
    <div>
    <dialog id="location-dialog" open>
        <h1 class="dialog-header">St. Paul Crime Latitude and Longitude</h1>
        <label class="dialog-label">Location: </label>
        <input id="dialog-url" class="dialog-input" type="url" v-model="locationInput" placeholder="Enter a location" />
        <p class="dialog-error" v-if="dialog_err">Error: must enter an address</p>
        <br/>
        <button class="button" type="button" @click="() => { getLocation(); closeDialog(); } ">Go</button>
    </dialog>
    </div>


    <!-- Crime Table -->
     <div id="crime-table-container">
        <h2>Crime Incidents</h2>
    <table id="crime-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Neighborhood</th>
                <th>Incident</th>
                <th>Grid</th>
                <th></th>
            </tr>
        </thead>
        <tbody>
            <tr v-for="c in visibleCrimes" :key="c.case_number">
            <td>{{c.date}} </td>
            <td>{{c.neighborhood_number}}</td>
            <td>{{c.incident}}</td>
            <td>{{c.police_grid}}</td>
            <td><button>Delete</button></td>
            </tr>
        </tbody>
    </table>
     </div>
</template>

<style scoped>
#rest-dialog {
    width: 20rem;
    margin-top: 1rem;
    z-index: 1000;
}

#leafletmap {
    height: 500px;
}

.dialog-header {
    font-size: 1.2rem;
    font-weight: bold;
}

.dialog-label {
    font-size: 1rem;
}

.dialog-input {
    font-size: 1rem;
    width: 100%;
}

.dialog-error {
    font-size: 1rem;
    color: #D32323;
}
#location-dialog {
    position: relative;
}
td {
    color:#D32323;
}

#crime-table {
    width: 100%;
}

#crime-table-container {
    max-width: 90%;
    margin: 2rem auto;
    padding: 1rem;
}
</style>
