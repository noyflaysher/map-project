'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnClearAll = document.querySelector('.sidebar__btn-clear');
const btnSort = document.querySelector('.sidebar__btn-sort');
// const btnEdit = document.querySelector('.btnWorkout--edit');
// const btnDel = document.querySelector('.btnWorkout--del');

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); //unique number
  clickes = 0;
  constructor(coords, distance, duration) {
    this.coords = coords; //[lat,lng]
    this.distance = distance; //in km
    this.duration = duration; //in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
    this.speed;
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

//////////////////Application Atchitecture///////////////

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    //Get user's position
    this._getPosition();

    //Get data from local storage
    this._getLocalStorage();

    //Attached event handlet
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopUp.bind(this));
    containerWorkouts.addEventListener(
      'dblclick',
      this._removeWorkout.bind(this)
    );
    btnClearAll.addEventListener('click', this._deleteAll.bind(this));
    btnSort.addEventListener('click', this._sortWorkout.bind(this));
    // btnSort.addEventListener('click', function () {
    //   console.log('sorted');
    // });
  }

  _getPosition() {
    if (navigator.geolocation)
      //Ask for your position
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          //failor
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    //success
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(latitude, longitude);
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // console.log(this.#mapEvent);

    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    //Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e, coords = null) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();

    //Get data from the form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = !coords ? this.#mapEvent.latlng : coords;
    let workout;

    //If activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      //Check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
      // console.log(workout);
    }

    //If activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      //Check if data is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    const workoutID = workout.id;
    // if (this.#workouts.find(work => work.id === workoutID)) {
    //   //
    // }
    //Add new object to the workout array
    this.#workouts.push(workout);

    //Render workout on map as marker
    this._renderWorkoutMarker(workout);

    //Render workout on list
    this._renderWorkout(workout);

    //Hide form + clear input field
    this._hideForm();

    //Set local storage to all workout
    this._setLocalStorage();

    //Eventlistener

    //delete workout
    // btnDel.addEventListener('click', function () {
    //   console.log('del clicked');
    // });
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
      <h2 class="workout__title">${workout.description}</h2>
        <button class="btnWorkout--edit" id="btn-edit"></button>
        <button class="btnWorkout btnWorkout--del" id="btn-del">delete</button>
        
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    // console.log(workout.type);

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);

    const btnEdit = document.querySelector('.btnWorkout--edit');
    const btnDel = document.querySelector('.btnWorkout--del');
    // console.log(btnEdit);
    // console.log(btnDel);

    btnDel.addEventListener('click', this._removeWorkout.bind(this));

    btnEdit.addEventListener('click', this._editWorkout.bind(this, workout));
  }

  _moveToPopUp(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    console.log(workout);
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _removeWorkout(e) {
    console.log(this.#workouts);

    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    const index = this.#workouts.findIndex(work => work.id === workout.id);

    console.log(index);
    containerWorkouts.removeChild(workoutEl);

    this.#workouts.splice(index, 1);

    localStorage.removeItem('workouts');

    location.reload();

    this._setLocalStorage();

    const leafContainer = document.querySelector('leaflet-pane');

    console.log(this.#workouts);
  }

  _sortWorkout() {
    //Create sort array
    const newWorkout = this.#workouts
      .slice()
      .sort((b, a) => b.distance - a.distance);

    localStorage.removeItem('workouts');
    location.reload();

    this.#workouts = newWorkout;

    this._setLocalStorage();

    console.log(this.#workouts);
  }

  _deleteAll(e) {
    localStorage.removeItem('workouts');
    this.#workouts = [];
    location.reload();

    this._setLocalStorage();
  }

  _editWorkout(workout) {
    this._showForm();

    console.log(workout);

    form.addEventListener(
      'submit',
      this._newWorkout.bind(this, workout.coords)
    );
    const distanceEdit = inputDistance.value;
    const durationEdit = inputDuration.value;
    const cadenceEdit = inputCadence.value;

    console.log(
      `dis: ${distanceEdit}, duration: ${durationEdit}, cadence: ${cadenceEdit}`
    );

    // form.removeEventListener('click', this._newWorkout.bind(this));
    // form.addEventListener(
    //   'submit',
    //   this._newWorkout(e.target.closest('workout'))
    // );
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;
    this.#workouts = data;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
