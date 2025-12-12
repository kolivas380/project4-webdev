import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import ReportPage from './pages/ReportPage.vue';
import MapPage from './pages/MapPage.vue';


const routes = [
  { path: '/', component: MapPage },
  { path: '/report', component: ReportPage }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

createApp(App).use(router).mount('#app');
