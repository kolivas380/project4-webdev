# St. Paul Crime Data Web Application

## Overview
This project visualizes crime incidents within the city of St. Paul, Minnesota. The application is designed to help residents, city planners, or law enforcement better understand crime patterns across neighborhoods. The project includes a map that allows users to easily visualize crime hotspots and a table for easier analysis. 

This tool can be useful for individuals deciding where to live, as well as for analytical and planning purposes within public safety organizations.

## Usage Instructions
1. Start the API server locally.
2. In the input field labeled “Enter URL”, enter the localhost API endpoint (including the port number).
3. Once connected, the application will retrieve and display the 1,000 most recent crime incidents in a table.
4. Use the filtering controls to narrow incidents by:
   - Neighborhood
   - Date
   - Crime type
5. View crime distribution on the interactive map, which displays markers for each neighborhood. Clicking a marker shows a popup with the total number of incidents in that area.
6. Add a new crime incident using the submission form at the bottom of the page. Submitted incidents are stored in the database and reflected in the application.

## Installation Instructions
1. Fork this repository to your own GitHub account.
2. Install **Node.js** (LTS version recommended):  
   https://nodejs.org/
3. Clone your forked repository:
   ```bash
   git clone https://github.com/your-username/repository-name.git
   cd repository-name
4. Once you are in the directory of your repository, install Express and Vue.
    ```bash
    npm install -g @vue/cli
    npm install express
5. When you are ready to run the application, run:
   ```bash
   npm run dev 

  

