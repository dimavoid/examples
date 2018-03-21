const InstitutionsMap = new Vue ({
  el: '#index-map',
  delimiters: ['${', '}'],
  data: {
    position: null,
    map: null,
    restaurants: [],
    shops: [],
    list: [],
    markers: [],
    cluster: null,
    info: null,
    tops: []
  },
  mounted: function() {
    this.position = DEFAULT_POSITION;

    this.initMap();

    fetch(`${API_URL}/api/site/categories/topcategories/`, {
      method: 'GET'
    })
      .then(stat)
      .then(json)
      .then(res => {
        console.log('GET TOPS RES', res);

        const rest = res.find(top => top.codename === 'eat' || top.codename === 'food').id;
        const shops = res.find(top => top.codename === 'products' || top.codename === 'goods').id;

        this.requestTopCategoryList('restaurants', rest)
          .then(() => this.initMarkers())
          .then(() => this.initCluster())
          .then(() => this.initInfo())
  
        this.requestTopCategoryList('shops', shops);
      })
      .catch(res => {
        console.error(`GET TOPS`, res);

        Promise.resolve(res).then(json).then(res => {
          console.log('ERROR GET TOPS', res);
        })
      })
  },
  methods: {
    initMap: function() {
      this.map = new google.maps.Map(document.getElementById('map_restaurant'), {
        center: this.position,
        zoom: 12,
        styles: [{
          featureType: 'poi',
          elementType: 'all',
          stylers: [{ 'visibility': 'off' }]
        }]
      });
    },
    initMarkers: function(list = this.list) {
      this.markers = list.map((item, i) => {
        const marker = new google.maps.Marker({
          position: {
            lat: item.latitude,
            lng: item.longitude
          },
          icon: '/static/img/Bubble_rest.png',
          data: {
            id: item.id,
            name: item.name,
            logo: item.logo,
            min_order_cost: item.min_order_cost
          }
        });

        google.maps.event.addListener(marker, 'click', mark => {
          const list = [ marker ];

          this.info.setContent(this.renderList(list).outerHTML);
          this.info.setPosition(mark.latLng);
          this.info.open(this.map);
        });

        return marker;
      });
    },
    initCluster: function() {
      this.cluster = new MarkerClusterer(this.map, this.markers, {
        gridSize: 50,
        zoomOnClick: false,
        styles: [{ 
          url: '/static/img/cluster.png',
          width: 26,
          height: 31,
          anchor: [-5, -2]
        }]
      });

      google.maps.event.addListener(this.cluster, 'clusterclick', cluster => {
        const list = cluster.getMarkers();

        if (list.length > 10 && this.map.getZoom() < 16) {
          this.map.setZoom(this.map.getZoom() + 1);
          this.map.setCenter(cluster.center_);
        } else {
          this.info.setContent(this.renderList(list).outerHTML);
          this.info.setPosition(cluster.center_);
          this.info.open(this.map);
        }
      });
    },
    initInfo: function() {
      this.info = new google.maps.InfoWindow({
        content: '',
        pixelOffset: {
          width: 0,
          height: -5
        }
      });
    },
    requestTopCategoryList: function(type, id) {
      return fetch(`${API_URL}/api/site/institution/map-list/${id}`)
        .then(stat)
        .then(json)
        .then(res => {
          console.log('REQUEST LIST', res);

          this[type] = _.cloneDeep(res);
        })
        .catch(res => {
          console.error(`REQUEST LIST`, res);

          Promise.resolve(res).then(json).then(res => {
            console.log('ERROR REQUEST LIST', res);
          })
        })
    },
    renderList: function(list) {
      const ul = document.createElement('ul');

      ul.classList.add('infowindow-list');

      const iter = (i = 0) => {
        if (!list[i]) return ul;

        const item = list[i];
        const li = document.createElement('li');
        
        li.classList.add('infowindow-item');
        li.innerHTML = `
          <img class='infowindow-item__logo' src='${ item.data.logo }'>
          <div class='infowindow-item__descr'>
            <a class='infowindow-item__link' href='/institution/${ item.data.id }/menu/' target='_blank'>${ item.data.name }</a>
            <span class='infowindow-item__delivery'>Доставка от  ${ item.data.min_order_cost } ₽</span>
          </div>
        `;

        ul.appendChild(li);

        return iter(i + 1);
      };

      return iter();
    },
    setMarkers: function(e) {
      const type = e.currentTarget.dataset.type;

      this.initMarkers(this[type]);

      this.info.close();
      this.cluster.clearMarkers();
      this.cluster.addMarkers(this.markers);
    }
  }
});