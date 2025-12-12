<template>
  <form class="bordered-form">
        <h2> Report A Crime </h2>
        <!-- Date & Time -->
        <div class="row">
            <div class="large-12 columns">
            <label>Date
                <input id="event_date" type="datetime-local" placeholder="large-12.columns" />
            </label>
            </div>
        </div>

        <!-- Neighborhood Name -->
        <div class="row">
            <div class="large-12 columns">
            <label>Neighborhood Location
                <select>
                <option value="husker">Husker</option>
                <option value="starbuck">Starbuck</option>
                <option value="hotdog">Hot Dog</option>
                <option value="apollo">Apollo</option>
                </select>
            </label>
            </div>
        </div>

        <!-- Address -->
        <div class="row">
            <div class="large-12 columns">
            <label>Address
                <input type="text" placeholder="1234 Road St." />
            </label>
            </div>
        </div>

        <!-- General Incient Classification -->
        <div class="row">
            <div class="large-12 columns">
            <label>Select Incident Type
                <select>
                <option value="husker">Husker</option>
                <option value="starbuck">Starbuck</option>
                <option value="hotdog">Hot Dog</option>
                <option value="apollo">Apollo</option>
                </select>
            </label>
            </div>
        </div>

        <!-- Incident_Type / Characteristics -->
        <div class="row">
            <div class="large-12 columns">
            <label>Incident Characteristics
                <input type="text" placeholder="theft, vandalism, assault" />
            </label>
            </div>
        </div>

    </br>
    <button type="submit" class="button expanded" style="background-color:  #e84a5f;">Submit</button>
    </form>
</template>

<script>
export default { name: 'ReportPage' }
</script>