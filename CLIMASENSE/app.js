/* app.js
 - Usa a API de Geocoding + Weather (gratuita) para obter clima atual e previsão.
*/

const API_KEY = 'ee9f999657cf9ad752584485d3f2fb6c';

// Elementos do DOM
const form = document.getElementById('search-form');
const input = document.getElementById('city-input');
const errorEl = document.getElementById('error');

const cityEl = document.querySelector('.city');
const dateEl = document.querySelector('.date');
const tempEl = document.getElementById('temperature');
const descEl = document.getElementById('description');
const feelsEl = document.getElementById('feels-like');
const precipEl = document.getElementById('precipitation');
const forecastEl = document.getElementById('forecast');
const searchButton = document.querySelector('.search-button');

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function hideError() {
  errorEl.hidden = true;
}

function formatDate(dt) {
  return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getDayName(dt) {
  return dt.toLocaleDateString('pt-BR', { weekday: 'short' });
}

async function fetchGeo(city) {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro na requisição de geocoding');
  const data = await res.json();
  return data; // array
}

async function fetchWeather(lat, lon) {
  // API Weather (gratuita) - retorna clima atual e previsão de 5 dias
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=pt_br&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro ao buscar dados do tempo');
  return res.json();
}

function renderCurrent(cityName, country, current) {
  cityEl.textContent = `${cityName}, ${country || ''}`.trim();
  dateEl.textContent = formatDate(new Date());
  tempEl.textContent = `${Math.round(current.main.temp)}°`;
  descEl.textContent = current.weather && current.weather[0] ? capitalize(current.weather[0].description) : '--';
  feelsEl.textContent = `${Math.round(current.main.feels_like)}°`;
  const pop = current.pop ? Math.round(current.pop * 100) : 0;
  precipEl.textContent = `${pop}%`;
}

function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function renderForecast(list) {
  forecastEl.innerHTML = '';

  // Agrupar por dia
  const days = {};
  list.forEach(item => {
    const dt = new Date(item.dt * 1000);
    const dateKey = dt.toLocaleDateString('pt-BR');
    if (!days[dateKey]) {
      days[dateKey] = [];
    }
    days[dateKey].push(item);
  });

  // Pegar os próximos 3 dias
  const dayKeys = Object.keys(days).slice(0, 3);
  dayKeys.forEach(dateKey => {
    const dayItems = days[dateKey];
    const dt = new Date(dayItems[0].dt * 1000);
    
    // Encontrar min e max do dia
    const temps = dayItems.map(item => item.main.temp);
    const min = Math.round(Math.min(...temps));
    const max = Math.round(Math.max(...temps));
    
    // Média de precipitação
    const pops = dayItems.map(item => item.pop || 0);
    const pop = Math.round((pops.reduce((a, b) => a + b) / pops.length) * 100);

    const div = document.createElement('div');
    div.className = 'day';
    div.innerHTML = `
      <p class="day-name">${getDayName(dt)}</p>
      <p class="day-temp">${max}° / ${min}°</p>
      <p class="day-precip">${pop}%</p>
    `;
    forecastEl.appendChild(div);
  });
}

function setLoading(isLoading) {
  if (isLoading) {
    searchButton.disabled = true;
    searchButton.textContent = 'Buscando...';
  } else {
    searchButton.disabled = false;
    searchButton.textContent = 'Buscar';
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = input.value.trim();
  if (!city) {
    showError('Por favor, digite o nome de uma cidade.');
    return;
  }

  hideError();
  setLoading(true);

  try {
    // Buscar coordenadas
    const geo = await fetchGeo(city);
    if (!geo || geo.length === 0) {
      showError('Cidade não encontrada. Tente outro nome.');
      setLoading(false);
      return;
    }

    const place = geo[0];
    const lat = place.lat;
    const lon = place.lon;
    const name = place.name;
    const country = place.country;

    // Buscar clima
    const weather = await fetchWeather(lat, lon);

    // Pegar o primeiro item da lista como "atual"
    const current = weather.list[0];

    // Popular o DOM
    renderCurrent(name, country, current);
    renderForecast(weather.list);

    hideError();
  } catch (err) {
    console.error('Erro:', err);
    showError('Ocorreu um erro ao buscar os dados. Tente novamente mais tarde.');
  } finally {
    setLoading(false);
  }
});