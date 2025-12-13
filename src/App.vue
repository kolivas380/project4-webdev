<script setup>
import { reactive, ref, onMounted, computed } from 'vue'

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
        neighborhood_markers: {
            1: { name: "Highwood Hills", lat: 44.942068, lng: -93.020521 },
            2: { name: "Greater East Side", lat: 44.977413, lng: -93.025156 },
            3: { name: "West Side", lat: 44.931244, lng: -93.079578 },
            4: { name: "Dayton's Bluff", lat: 44.956192, lng: -93.060189 },
            5: { name: "Payne-Phalen", lat: 44.978883, lng: -93.068163 },
            6: { name: "North End", lat: 44.975766, lng: -93.113887 },
            7: { name: "Frogtown", lat: 44.959639, lng: -93.121271 },
            8: { name: "Summit-University", lat: 44.947700, lng: -93.128505 },
            9: { name: "West Seventh/Fort Road", lat: 44.930276, lng: -93.119911 },
            10: { name: "Como Park", lat: 44.982752, lng: -93.147910 },
            11: { name: "Hamline Midway", lat: 44.963631, lng: -93.167548 },
            12: { name: "Saint Anthony Park", lat: 44.973971, lng: -93.197965 },
            13: { name: "Union Park", lat: 44.949043, lng: -93.178261 },
            14: { name: "Macalester-Groveland", lat: 44.934848, lng: -93.176736 },
            15: { name: "Highland Park", lat: 44.913106, lng: -93.170779 },
            16: { name: "Summit Hill", lat: 44.937705, lng: -93.136997 },
            17: { name: "Downtown", lat: 44.949203, lng: -93.093739 }
        }
    }
);

const crime = reactive({
  case_number: "",
  date: "",
  time: "",
  code: "",
  incident: "",
  police_grid: "",
  neighborhood_number: "",
  block: ""
})

async function submitCrime() {
  
  
    // Should fail if not all inputs are filled
    if (!crime.case_number || !crime.date || !crime.time || !crime.code || 
      !crime.incident || !crime.police_grid || !crime.neighborhood_number || !crime.block) {
        alert("Please fill in all fields");
        return;
    }

    
    try {
    const response = await fetch("http://localhost:8000/new-incident", {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(crime)
    })

    if (!response.ok) {
      throw new Error("Failed to submit crime")
    }
  

    // Reset form
    crime.case_number = "";
    crime.date = "";
    crime.time = "";
    crime.code = "";
    crime.incident = "";
    crime.police_grid = "";
    crime.neighborhood_number = "";
    crime.block = "";

    alert("Crime submitted successfully!")
  } catch (err) {
    console.error(err)
    alert("Error submitting crime")
  }
}



let crimes = ref([]);
let visibleCrimes = ref([]);
let codes = ref([]);
let activeCrimeMarker = ref(null);
let locationInput = ref('');
let geocodedData = [];

// Vue callback for once <template> HTML has been added to web page
onMounted(async () => {
    // Create Leaflet map (set bounds and valid zoom levels)
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

    // Add markers for St. Paul neighborhoods
    Object.entries(map.neighborhood_markers).forEach(([key, neighborhood]) => {
        neighborhood.marker = L.marker([neighborhood.lat, neighborhood.lng], {icon: L.icon({
            iconUrl: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
            iconSize: [30, 30]
        })})
            .bindPopup(`<b>${neighborhood.name}<br>Crimes: 0</b>`)
            .addTo(map.leaflet);
    });

    map.leaflet.on('moveend', async () => {
            const center = map.leaflet.getCenter();
            let {lat,lng} = clampLatLng(center.lat, center.lng);

            map.center.lat = lat;
            map.center.lng = lng;

            const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
            const result = await fetch(url, {
                headers: { 'User-Agent': 'stpaul-crime-project/1.0 (oliv1819@stthomas.edu)'}
                });
            const json_data = await result.json();
            
            if(json_data && json_data.display_name) {
            locationInput.value = json_data.display_name;
        } else {
            locationInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
    });
});

//Function for filtering
const filteredNeighborhoods = ref([]);
const defaultMaxIncidents = ref(50);
const filterByNeighborhood = computed(() => {
    return crimes.value
        .reduce((acc, c) => {
        //switch to neighborhood_name
            if(c.neighborhood_number.name && !acc.includes(c.neighborhood_number.name)) {
                acc.push(c.neighborhood_number.name);
            }
        return acc;
    }, [])
    .sort()
});

// FUNCTIONS
// Function called once user has entered REST API URL
async function initializeCrimes() {
        const baseUrl = crime_url.value.replace(/\/+$/, "");
        console.log("FETCHING FROM:", baseUrl);

        //Get codes
        const codes_res = await fetch(`${baseUrl}/codes`);
        const codes_json = await codes_res.json();
        codes.value = codes_json.rows;  

        //Get incidents
        const incidents_res = await fetch(`${baseUrl}/incidents?limit=1000`);
        const incidents_json = await incidents_res.json();
        geocodedData = await fetch('crimes_geocoded.json').then(res => res.json());

        console.log("Raw incidents:", incidents_json);

        crimes.value = incidents_json.map(c => {
            const geo = geocodedData.find(g => g.case_number === c.case_number) || {};
            return {
                case_number: c.case_number,
                date: c.date,
                time: c.time,
                code: c.code,
                incident: c.incident,
                police_grid: c.police_grid,
                neighborhood_number: c.neighborhood_number,
                block: c.block,
                lat: c.lat || geo.lat || null,
                lng: c.lng || geo.lng || null
            };
        });

        visibleCrimes.value = crimes.value.slice();
        neighborhoodCounts();
        console.log("Mapped crimes length:", crimes.value.length);
    } 

function neighborhoodCounts(singleNeighborhoodNumber = null) {
    const counts = {};
    
    visibleCrimes.value.forEach(c => {
        if (c.neighborhood_number) {
            counts[c.neighborhood_number] = (counts[c.neighborhood_number] || 0) + 1;
        }
    });

    const update = (key, obj) => {
        const count = counts[key] || 0;
        obj.marker?.setPopupContent(
            `<b>${obj.name}<br>Crimes: ${count}</b>`
        );
    };

    if (singleNeighborhoodNumber) {
        const n = map.neighborhood_markers[singleNeighborhoodNumber];
        if (n) update(singleNeighborhoodNumber, n);
    } else {
        Object.entries(map.neighborhood_markers).forEach(([key, n]) => update(key, n));
    }
}

function deleteCrime(case_number, neighborhood_number = null) {
    visibleCrimes.value = visibleCrimes.value.filter(c => c.case_number !== case_number);

    if (activeCrimeMarker.value && activeCrimeMarker.value.case_number === case_number) {
        map.leaflet.removeLayer(activeCrimeMarker.value);
        activeCrimeMarker.value = null;
    }

    if (neighborhood_number) {
        neighborhoodCounts(neighborhood_number);
    } else {
        neighborhoodCounts();
    }

    const baseUrl = crime_url.value.replace(/\/+$/, "");
    fetch(`${baseUrl}/remove-incident?case_number=${case_number}`, { method: 'DELETE' })
        .then(res => {
            if (!res.ok) console.error('Delete failed', res.status);
        })
        .catch(err => console.error(err));
}

function showCrimeOnMap(crime) {
    if (!crime.lat || !crime.lng) {
        alert('No geolocation available for this crime');
        return;
    }

    if (activeCrimeMarker.value) {
        map.leaflet.removeLayer(activeCrimeMarker.value);
        activeCrimeMarker.value = null;
    }

    const marker = L.marker([crime.lat, crime.lng], {
        icon: L.icon({
            iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
            iconSize: [25, 25]
        })
    });

    marker.case_number = crime.case_number;

    marker.bindPopup(`
        <b>Incident: </b>${crime.incident}<br>
        <b>Date: </b>${crime.date}<br>
        <b>Time: </b>${crime.time}<br>
        <b><button class="delete-btn">Delete</button></b>
    `);

    marker.on('popupopen', (e) => {
        const popupEl = e.popup.getElement();
        if (!popupEl) return;
        const btn = popupEl.querySelector('.delete-btn');
        if (btn) {
            btn.onclick = async () => {
                await deleteCrime(crime.case_number, crime.neighborhood_number);
                map.leaflet.removeLayer(marker);
                activeCrimeMarker.value = null;
            };
        }
    });

    // Add marker to map and open popup
    marker.addTo(map.leaflet);
    marker.openPopup();
    map.leaflet.setView([crime.lat, crime.lng], 16);

    activeCrimeMarker.value = marker;
    document.getElementById('leafletmap').scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
    });
}

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
                headers: { 'User-Agent': 'stpaul-crime-project/1.0 (oliv1819@stthomas.edu)'}
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
    <h2>Find the distance between you and another location!</h2>
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
        <input id="location-input" class="dialog-input" type="text" v-model="locationInput" placeholder="Enter a location or lat/lng" />
        <p class="dialog-error" v-if="!locationInput && dialog_err">Error: must enter an address or lat/lng</p>
        <br/>
        <button class="button" type="button" @click="getLocation">Go</button>
    </dialog>
    </div>

    <!-- Filter box -->
     <div id="filter-box-container">
        <h2 style="color: black;">Filter</h2>
        <div id="neighborhood-list">
            <label v-for="name in filterByNeighborhood" :key="name" class="neighborhood-item" >
                <input type="checkbox" :value="name" v-model="selectedNeighborhoods"/>
                {{ name }}
            </label>
        </div>
        <div id="filters">
        <div id="filter-box-container">
            <label for="max-incidents">Max Incidents to display:</label>
             <select id="max-incidents" v-model.number="maxIncidents">
            <option v-for="n in maxIncidentOptions" :key="n" :value="n">
        {{ n }}
      </option>
    </select>
        </div>
     </div>
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
                <th>Show On Map</th>
                <th>Delete</th>
            </tr>
        </thead>
        <tbody>
            <!-- change this to use filtered crimes -->
            <tr v-for="c in visibleCrimes" :key="c.case_number">
                <td>{{ c.date }}</td>
                <td>{{ map.neighborhood_markers[c.neighborhood_number]?.name || 'Unknown' }}</td>
                <td>{{ c.incident }}</td>
                <td>{{ c.police_grid }}</td>
                <td><button class="delete-btn" @click="showCrimeOnMap(c)">Show</button></td>
                <td><button class="delete-btn" @click="deleteCrime(c.case_number, c.neighborhood_number)">Delete</button></td>
            </tr>
        </tbody>
    </table>
     </div>


    <!-- FORM FOR ADDING CRIME -->
    <form class="bordered-form" @submit.prevent="submitCrime">
        <h2> Report A Crime </h2>

        <!-- Date -->
        <div class="row">
            <div class="large-12 columns">
            <label>Date
                <input v-model="crime.date" type="date" placeholder="large-12.columns" />
            </label>
            </div>
        </div>


        <!-- Time -->
        <div class="row">
            <div class="large-12 columns">
            <label> Time
                <input v-model="crime.time" type="time" placeholder="large-12.columns" />
            </label>
            </div>
        </div>


         <!-- Case Number -->
        <div class="row">
            <div class="large-12 columns">
            <label>Case Number
                <input v-model="crime.case_number" type="text"/>
            </label>
            </div>
        </div>

        <!-- Incident Code -->
        <div class="row">
            <div class="large-12 columns">
            <label>Incident Code
                <input v-model="crime.code" type="number" step="1"/>
            </label>
            </div>
        </div>


        <!-- Incident Text -->
        <div class="row">
            <div class="large-12 columns">
            <label>Incident type
                <input v-model="crime.incident" type="text"/>
            </label>
            </div>
        </div>


        <!-- Neighborhood Number -->
        <div class="row">
            <div class="large-12 columns">
            <label>Neighborhood Number
                <input v-model="crime.neighborhood_number" type="number" step="1"/>
            </label>
            </div>
        </div>


        <!-- Police Grid-->
        <div class="row">
            <div class="large-12 columns">
            <label>Police Grid number
                <input v-model="crime.police_grid" type="number" step="1"/>
            </label>
            </div>
        </div>



        <!-- Block Address -->
        <div class="row">
            <div class="large-12 columns">
            <label>Block Address
                <input v-model="crime.block" type="text" placeholder="1234 Road St." />
            </label>
            </div>
        </div>


        </br>
        <button @click="submitCrime" type="button" class="button expanded" style="background-color:  #e84a5f;">Submit</button>
    </form>



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

#filter-box-container {
    max-width: 90%;
    margin: 2rem auto;
    padding: 1rem;
    background-color: white;
}
#crime-table-container {
    width: 100%;
}
</style>
<style>
.delete-btn {
    padding: 8px 14px;
    background-color: #D32323;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}
</style>
