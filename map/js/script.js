'use strict'

const API_KEY = 'AIzaSyALrxdiCspDE0dDWg2zXaLJsXvyfDn0o0I';
const URL_GEOCODE = `https://maps.googleapis.com/maps/api/geocode/json?`;

const initial_lat = document.getElementById('id_latitude') ? Number(document.getElementById('id_latitude').value) : 45.03;
const initial_lon = document.getElementById('id_longitude') ? Number(document.getElementById('id_longitude').value) : 38.98;
const initial_addr = document.getElementById('id_address') ? document.getElementById('id_address').value : '';
const initial_polygons = [
  { name: 'Polygon 1',
    url: '',
    color: 'grey',
    coords: [
      { lat: 45.06847733742807, lng: 38.926963806152344 },
      { lat: 45.025057738442094, lng: 38.90087127685547 },
      { lat: 45.047620637930166, lng: 38.962669372558594 }
    ] },
  { name: 'Polygon 2',
    url: '',
    color: 'green',
    coords: [
      { lat: 45.02440255437027, lng: 38.961639404296875 },
      { lat: 45.018821046406394, lng: 38.95151138305664 },
      { lat: 45.007777764641794, lng: 38.95305633544922 },
      { lat: 45.012025432715575, lng: 38.97623062133789 }
    ] },
  { name: 'Polygon 3',
    url: '',
    color: 'yellow',
    coords: [
      { lat: 45.05836521419209, lng: 38.95408630371094 },
      { lat: 45.041568346914666, lng: 38.95357131958008 },
      { lat: 45.04308451217348, lng: 38.93571853637695 },
      { lat: 45.03435084946023, lng: 38.96103858947754 },
      { lat: 45.017273901691375, lng: 38.9544939994812 },
      { lat: 45.01985245299228, lng: 38.97816181182861 }
    ] }
];

const app = new Vue({
  el: '#app',
  data: {
    address: '',
    lat: null,
    lng: null,
    map: null,
    marker: null,
    drawingManager: null,
    infoWindow: null,
    polygons: [],
    coords: []
  },
  created: function() {
    this.address = initial_addr;
    this.lat = initial_lat;
    this.lng = initial_lon;
    this.coords = initial_polygons;
  },
  mounted: function() {
    this.initMap(this.lat, this.lng);
  },
  methods: {
    initMap: function (lat = 45.03, lng = 38.98) {
      let {
        map,
        marker,
        drawingManager,
        infoWindow,
        coords,
        polygons
      } = this;

      map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: { lat, lng }
      });
    
      marker = new google.maps.Marker({
        position: { lat, lng },
        draggable: true,    
        map: map
      });

      infoWindow = new google.maps.InfoWindow();

      // // // // Эвенты для полигонов
        const getCoords = arr => arr.map(coord => {
          return { lat: coord.lat(), lng: coord.lng() };
        });

        const updateCoords = arr => {
          if (arr) this.coords = getCoords(arr);
        };

        const deleteNode = (point, path) => {
          if (point.vertex && path.getArray().length > 3) {
            path.removeAt(point.vertex);
            updateCoords(path.getArray());
          };
        }

        const addInfoWindow = (e, polygon) => {
          const nodes = `<p class='info-window-title'>${polygon.name}</p>
                         <a class='info-window-link' href='${polygon.url}'>Редактировать</a>`;

          infoWindow.setContent(nodes);
          infoWindow.setPosition(e.latLng);
          infoWindow.open(map);
        };

        const addListenersPolygon = polygon => {
          const path = polygon.getPath();
          const arr = path.getArray();

          updateCoords(arr);

          google.maps.event.addListener(path ,'set_at', () => updateCoords(arr));
          google.maps.event.addListener(path ,'insert_at', () => updateCoords(arr));
          google.maps.event.addListener(polygon, 'rightclick', point => deleteNode(point, path));
          if (coords.length > 0) google.maps.event.addListener(polygon, 'click', e => addInfoWindow(e, polygon));
        };
      // // // //

      // // // // Вычисление и отрисовка пересечений полигонов
        const createJstsPolygon = (geometryFactory, polygon) => {
          const path = polygon.getPath();
          const coordinates = path.getArray().map(coord => {
            return new jsts.geom.Coordinate(coord.lat(), coord.lng());
          });
          coordinates.push(coordinates[0]);
          const shell = geometryFactory.createLinearRing(coordinates);
          return geometryFactory.createPolygon(shell);
        }

        const drawIntersectionArea = (map, polygon) => {
          const coords = polygon.getCoordinates().map(coord => {
            return { lat: coord.x, lng: coord.y };
          });
        
          const intersectionArea = new google.maps.Polygon({
            paths: coords,
            strokeColor: 'red',
            strokeWeight: 3,
            fillColor: 'red',
            fillOpacity: 0.3,
          });
          intersectionArea.setMap(map);
        }

        const calcPolygonsIntersection = (polygon, polygons) => {
          const geometryFactory = new jsts.geom.GeometryFactory();
          const selectedPolygon = createJstsPolygon(geometryFactory, polygon);

          for (let i = 0; i < polygons.length; i++) {
            if (polygon === polygons[i]) continue;

            const anotherPolygon = createJstsPolygon(geometryFactory, polygons[i]);
            const intersection = selectedPolygon.intersection(anotherPolygon);

            drawIntersectionArea(map, intersection);
          }
        };
      // // // //

    
      if (coords.length && coords[0].coords.length) {
        coords.forEach(poly => {
          const polygon = new google.maps.Polygon({
            name: poly.name,
            url: poly.url ? poly.url : '',
            paths: poly.coords,
            strokeColor: poly.color,
            strokeWeight: 2,
            fillColor: poly.color,
            fillOpacity: 0.3,
            clickable: true,
            editable: coords.length === 1
          });

          polygons.push(polygon);
        });

        polygons.forEach(polygon => {
          polygon.setMap(map);
          addListenersPolygon(polygon);
          calcPolygonsIntersection(polygon, polygons);
        });
      } else {
        drawingManager = new google.maps.drawing.DrawingManager({
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: ['polygon']
          },
          polygonOptions: {
            clickable: true,
            editable: true
          }
        });
        drawingManager.setMap(map);

        google.maps.event.addListener(drawingManager, 'polygoncomplete', (polygon) => {
          addListenersPolygon(polygon);

          drawingManager.setMap(null);
        });
      }
    
      map.addListener('click', (e) => {
        const latLng = e.latLng;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
    
        const string = `latlng=${lat},${lng}`;
              
        fetch(`${URL_GEOCODE}${string}&key=${API_KEY}`)
          .then(res => res.json())
          .then(res => {
            // console.log(res);
            const address = res.results[0].formatted_address;
            const { lat, lng } = res.results[0].geometry.location;

            this.address = address;
            this.lat = lat;
            this.lng = lng;
    
            marker.setMap(null);
            marker = new google.maps.Marker({
              position: { lat, lng },
              map: map
            });
    
            map.panTo(latLng);
          })
      });
    },
    onGeoFeth: function(str) {
      // console.log('ON GEO FETCH', str);

      fetch(`${URL_GEOCODE}${str}&components=administrative_area:Krasnodar|country:RU&key=${API_KEY}`)
        .then(res => res.json())
        .then(res => {
          // console.log('ON GEO FETCH RES', res);

          const address = res.results[0].formatted_address;
          const { lat, lng } = res.results[0].geometry.location;

          this.address = address;
          this.lat = lat;
          this.lng = lng;

          marker.setMap(null);
          marker = new google.maps.Marker({
            position: { lat, lng },
            map: map
          });

          map.setCenter({ lat, lng });
        })
    },
    onAddress: function(e) {
      let str = e.target.value;
      str = `address=${str.replace(/\s+/g, '+')}`;

      this.onGeoFeth(str);
    }
  }
});